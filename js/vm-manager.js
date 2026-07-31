/* global V86 */
'use strict';

/**
 * VMManager — thin wrapper around v86 that handles:
 *   • Dynamic loading of libv86.js (so the large library only loads on demand)
 *   • Building the V86 constructor config from our simplified options object
 *   • Lifecycle: start → pause/resume → reset → stop → destroy
 *   • Serial console output streaming
 *   • Snapshot save / restore (IndexedDB or ArrayBuffer)
 *   • Simple EventEmitter so the UI can react to state changes
 */
class VMManager {
  constructor() {
    /** @type {V86|null} */
    this._vm = null;

    this._running  = false;
    this._ready    = false;
    this._paused   = false;

    /** @type {Record<string, Function[]>} */
    this._listeners = {};

    this._serialBuf = '';
  }

  // ─── EventEmitter helpers ──────────────────────────────────

  /**
   * Register an event listener.
   * @param {string}   event
   * @param {Function} fn
   */
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  /** Remove a previously registered listener. */
  off(event, fn) {
    if (!this._listeners[event]) return this;
    this._listeners[event] = this._listeners[event].filter(h => h !== fn);
    return this;
  }

  _emit(event, data) {
    const handlers = this._listeners[event];
    if (!handlers) return;
    handlers.forEach(h => {
      try { h(data); } catch (e) { console.error('[VMManager] Listener error:', e); }
    });
  }

  // ─── State accessors ───────────────────────────────────────

  get isRunning() { return this._running; }
  get isReady()   { return this._ready;   }
  get isPaused()  { return this._paused;  }

  // ─── Dynamic library loading ───────────────────────────────

  /**
   * Inject the libv86.js script into <head> if not already present.
   * Resolves once the script fires its load event (or immediately if already loaded).
   *
   * @param {string} url  Full URL to libv86.js (must use http: or https: scheme)
   * @returns {Promise<void>}
   */
  loadLibrary(url) {
    if (typeof V86 !== 'undefined') return Promise.resolve();

    // Validate URL scheme before injecting a <script> tag.
    // Only http: and https: are permitted; any other scheme (javascript:, data:, etc.)
    // is rejected to prevent DOM-based script injection.
    let parsedUrl;
    try {
      parsedUrl = new URL(url, window.location.href);
    } catch (_) {
      return Promise.reject(new Error(
        `Invalid v86 library URL: "${url}". Please enter a valid http(s) URL.`,
      ));
    }
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return Promise.reject(new Error(
        `Unsafe URL scheme "${parsedUrl.protocol}" for v86 library. ` +
        'Only https: and http: are allowed.',
      ));
    }
    const safeUrl = parsedUrl.href;

    return new Promise((resolve, reject) => {
      // Avoid double-injection
      if (document.querySelector('script[data-v86-lib]')) {
        // Script tag exists but V86 still isn't defined — wait for it
        const existing = document.querySelector('script[data-v86-lib]');
        existing.addEventListener('load',  resolve,          { once: true });
        existing.addEventListener('error', () => reject(
          new Error('v86 library script failed to load (already-queued script).'),
        ), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src            = safeUrl;
      script.dataset.v86Lib = '1';
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error(
        `Failed to load v86 library.\n` +
        'Check the URL in Advanced Options or host the files locally.',
      ));
      document.head.appendChild(script);
    });
  }

  // ─── Start ─────────────────────────────────────────────────

  /**
   * Initialise and start the VM.
   *
   * @param {Object} opts
   * @param {HTMLElement} opts.screenContainer   DOM node for the VGA canvas
   * @param {string}  opts.libUrl               URL to libv86.js
   * @param {string}  opts.wasmUrl              URL to v86.wasm
   * @param {string}  opts.biosUrl              URL to seabios.bin
   * @param {string}  opts.vgaBiosUrl           URL to vgabios.bin
   * @param {number}  opts.memoryMB             RAM in MB (default 256)
   * @param {number}  opts.vgaMemoryMB          VGA RAM in MB (default 8)
   * @param {string}  opts.bootDevice           'cdrom' | 'hdd' | 'floppy'
   * @param {string}  [opts.imageUrl]           Remote image URL (v86 fetches it)
   * @param {ArrayBuffer} [opts.imageBuffer]    Local image data (uploaded file)
   * @param {boolean} [opts.enableNetwork]      Enable WebSocket NE2000 adapter
   * @param {string}  [opts.networkRelayUrl]    WebSocket relay URL
   * @param {boolean} [opts.enableSerial]       Stream UART0 to serial console
   * @returns {Promise<void>}
   */
  async start(opts) {
    const {
      screenContainer,
      libUrl,
      wasmUrl,
      biosUrl,
      vgaBiosUrl,
      memoryMB       = 256,
      vgaMemoryMB    = 8,
      bootDevice     = 'cdrom',
      imageUrl,
      imageBuffer,
      enableNetwork  = false,
      networkRelayUrl = 'wss://relay.widgetry.org/',
      enableSerial   = true,
    } = opts;

    // 1. Load the library
    this._emit('status', { text: 'Loading v86 emulator…', sub: libUrl });
    await this.loadLibrary(libUrl);
    this._emit('status', { text: 'Configuring virtual machine…', sub: '' });

    // 2. Build the V86 config
    const config = {
      wasm_path:       wasmUrl,
      memory_size:     memoryMB    * 1024 * 1024,
      vga_memory_size: vgaMemoryMB * 1024 * 1024,
      screen_container: screenContainer,
      bios:     { url: biosUrl    },
      vga_bios: { url: vgaBiosUrl },
      autostart: true,
    };

    // Boot device
    const deviceKey = this._deviceKey(bootDevice);
    if (imageBuffer) {
      config[deviceKey] = { buffer: imageBuffer };
    } else if (imageUrl) {
      config[deviceKey] = { url: imageUrl };
    }

    // Network
    if (enableNetwork) {
      config.network_relay_url = networkRelayUrl;
    }

    // Serial
    if (enableSerial) {
      config.uart1_enabled = true;
    }

    // 3. Construct the emulator
    this._emit('status', { text: 'Starting CPU emulation…', sub: `${memoryMB} MB RAM` });

    try {
      this._vm = new V86(config);
    } catch (err) {
      throw new Error('Failed to initialise v86: ' + err.message);
    }

    // 4. Wire v86 events → our events
    this._vm.add_listener('emulator-ready', () => {
      this._ready = true;
      this._emit('ready');
    });

    this._vm.add_listener('emulator-started', () => {
      this._running = true;
      this._paused  = false;
      this._emit('started');
    });

    this._vm.add_listener('emulator-stopped', () => {
      this._running = false;
      this._emit('stopped');
    });

    if (enableSerial) {
      this._vm.add_listener('serial0-output-char', char => {
        this._serialBuf += char;
        this._emit('serial-char', char);
      });
    }
  }

  // ─── Control ───────────────────────────────────────────────

  /** Pause the VM (CPU stops ticking). */
  pause() {
    if (!this._vm || !this._running || this._paused) return;
    this._vm.stop();
    this._paused = true;
    this._emit('paused');
  }

  /** Resume a paused VM. */
  resume() {
    if (!this._vm || !this._paused) return;
    this._vm.run();
    this._paused  = false;
    this._running = true;
    this._emit('resumed');
  }

  /** Toggle pause / resume. */
  togglePause() {
    this._paused ? this.resume() : this.pause();
  }

  /** Hard-reset (restart) the emulated CPU. */
  reset() {
    if (!this._vm) return;
    this._vm.restart();
    this._emit('reset');
  }

  /** Stop the VM without destroying it (can be restarted). */
  stop() {
    if (!this._vm) return;
    this._vm.stop();
    this._running = false;
    this._emit('stopped');
  }

  /**
   * Destroy the emulator and free resources.
   * After this call the VMManager instance can be reused for a new start().
   */
  destroy() {
    if (this._vm) {
      try { this._vm.stop(); } catch (_) { /* ignore */ }
      this._vm = null;
    }
    this._running  = false;
    this._ready    = false;
    this._paused   = false;
    this._serialBuf = '';
    this._emit('destroyed');
  }

  // ─── Mouse lock ────────────────────────────────────────────

  /** Request Pointer Lock on the VGA canvas so the mouse is captured. */
  lockMouse() {
    const canvas = this._vm && document.querySelector(
      '#screenContainer canvas, .screen-container canvas',
    );
    if (canvas) {
      canvas.requestPointerLock?.();
    }
  }

  // ─── Snapshot ──────────────────────────────────────────────

  /**
   * Serialise the full machine state to an ArrayBuffer.
   * @returns {Promise<ArrayBuffer|null>}
   */
  saveSnapshot() {
    if (!this._vm) return Promise.resolve(null);
    return new Promise(resolve => {
      this._vm.save_state((err, buf) => {
        if (err) { console.error('[VMManager] save_state error:', err); resolve(null); }
        else      resolve(buf);
      });
    });
  }

  /**
   * Restore the machine state from a previously saved ArrayBuffer.
   * @param {ArrayBuffer} buf
   * @returns {Promise<void>}
   */
  restoreSnapshot(buf) {
    if (!this._vm || !buf) return Promise.resolve();
    return new Promise(resolve => {
      this._vm.restore_state(buf, () => resolve());
    });
  }

  // ─── Serial input ──────────────────────────────────────────

  /**
   * Send a string to the VM via the serial port (UART0).
   * Useful for sending commands to a running Linux VM without a keyboard.
   * @param {string} text
   */
  serialWrite(text) {
    if (!this._vm || !this._running) return;
    for (const ch of text) {
      this._vm.serial0_send(ch);
    }
  }

  /** Return everything received on the serial port so far. */
  get serialBuffer() { return this._serialBuf; }

  /** Clear the internal serial buffer. */
  clearSerialBuffer() { this._serialBuf = ''; }

  // ─── Private helpers ───────────────────────────────────────

  _deviceKey(bootDevice) {
    switch (bootDevice) {
      case 'hdd':    return 'hda';
      case 'floppy': return 'fda';
      case 'cdrom':
      default:       return 'cdrom';
    }
  }
}
