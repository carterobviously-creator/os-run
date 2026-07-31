/* global OS_CONFIGS, VMManager */
'use strict';

/**
 * Default base URL for the v86 library files.
 * jsDelivr serves the v86 npm package with correct MIME types and CORS headers.
 * Users can override every individual URL in Advanced Options.
 */
const V86_CDN = 'https://cdn.jsdelivr.net/npm/v86';

/** Default BIOS / library URLs. */
const DEFAULTS = {
  libUrl:     `${V86_CDN}/build/libv86.js`,
  wasmUrl:    `${V86_CDN}/build/v86.wasm`,
  biosUrl:    `${V86_CDN}/bios/seabios.bin`,
  vgaBiosUrl: `${V86_CDN}/bios/vgabios.bin`,
};

/* ================================================================
   OSRunApp — wires OS selection cards → config panel → VMManager
   ================================================================ */
class OSRunApp {
  constructor() {
    this._source          = 'premade'; // 'premade' | 'custom'
    this._selectedOS      = { premade: 'tinycore', custom: 'linux' };
    this._imageBuffer     = null;      // ArrayBuffer from a local file upload
    this._snapshotBuffer  = null;      // saved state ArrayBuffer
    this._vm              = new VMManager();

    this._bindElements();
    this._bindTabEvents();
    this._bindCardEvents();
    this._bindToolbarEvents();
    this._bindConsoleEvents();

    // Render initial OS cards and config panel for the default source
    this._renderSourceTabs();
    this._renderOSCards();
    this._renderConfig(this._selectedOSForSource);
  }

  /**
   * Return the currently selected OS id for the active source tab.
   * @returns {string}
   */
  get _selectedOSForSource() {
    return this._selectedOS[this._source];
  }

  // ─── Element references ──────────────────────────────────

  _bindElements() {
    this.launcher       = this._el('launcher');
    this.vmSection      = this._el('vmSection');
    this.sourceTabs     = this._el('sourceTabs');
    this.osCards        = this._el('osCards');
    this.osCardsTitle   = this._el('osCardsTitle');
    this.configPanel    = this._el('configPanel');
    this.launchBtn      = this._el('launchBtn');
    this.backBtn        = this._el('backBtn');
    this.pauseBtn       = this._el('pauseBtn');
    this.resetBtn       = this._el('resetBtn');
    this.stopBtn        = this._el('stopBtn');
    this.snapshotBtn    = this._el('snapshotBtn');
    this.fullscreenBtn  = this._el('fullscreenBtn');
    this.vmTitle        = this._el('vmTitle');
    this.vmWrapper      = this._el('vmWrapper');
    this.screenCont     = this._el('screenContainer');
    this.vmOverlay      = this._el('vmOverlay');
    this.statusText     = this._el('statusText');
    this.statusSub      = this._el('statusSub');
    this.statusSpinner  = this._el('statusSpinner');
    this.screenHint     = this._el('screenHint');
    this.consoleToggle  = this._el('consoleToggle');
    this.consoleOutput  = this._el('consoleOutput');
    this.serialOut      = this._el('serialOutput');
  }

  /**
   * Return the configuration object for the currently selected OS.
   * Looks in PREMADE_ISOS when the premade tab is active, otherwise OS_CONFIGS.
   * @returns {Object|undefined}
   */
  _currentConfig() {
    return this._source === 'premade'
      ? PREMADE_ISOS[this._selectedOSForSource]
      : OS_CONFIGS[this._selectedOSForSource];
  }

  _el(id) { return document.getElementById(id); }

  // ─── Source tabs ─────────────────────────────────────────

  _bindTabEvents() {
    this.sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const newSource = tab.dataset.source;
        if (newSource === this._source) return;
        this._source = newSource;
        this._imageBuffer = null;
        this._renderSourceTabs();
        this._renderOSCards();
        this._renderConfig(this._selectedOSForSource);
      });
    });
  }

  _renderSourceTabs() {
    this.sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
      const active = tab.dataset.source === this._source;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  /**
   * Render the OS cards for the currently active source.
   */
  _renderOSCards() {
    const configs = this._source === 'premade' ? PREMADE_ISOS : OS_CONFIGS;
    const cards = Object.values(configs).map(cfg => `
      <button class="os-card${cfg.id === this._selectedOSForSource ? ' active' : ''}"
              data-os="${this._esc(cfg.id)}" type="button">
        <span class="os-icon" aria-hidden="true">${this._esc(cfg.icon)}</span>
        <span class="os-name">${this._esc(cfg.name)}</span>
        <span class="os-desc">${this._esc(cfg.description)}</span>
      </button>
    `).join('');

    this.osCards.innerHTML = cards;
    this.osCardsTitle.textContent = this._source === 'premade'
      ? 'Select Pre-made Operating System'
      : 'Select Custom Operating System';

    this.osCards.querySelectorAll('.os-card').forEach(card => {
      card.addEventListener('click', () => {
        this.osCards.querySelectorAll('.os-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this._selectedOS[this._source] = card.dataset.os;
        this._imageBuffer = null;
        this._renderConfig(this._selectedOSForSource);
      });
    });
  }

  // ─── OS card selection ───────────────────────────────────

  _bindCardEvents() {
    this.launchBtn.addEventListener('click', () => this._launchVM());
  }

  // ─── Toolbar events ──────────────────────────────────────

  _bindToolbarEvents() {
    this.backBtn.addEventListener('click', () => this._showLauncher());

    this.pauseBtn.addEventListener('click', () => {
      this._vm.togglePause();
      this.pauseBtn.textContent = this._vm.isPaused ? '▶' : '⏸';
      this.pauseBtn.title       = this._vm.isPaused ? 'Resume VM' : 'Pause VM';
    });

    this.resetBtn.addEventListener('click', () => {
      if (confirm('Reset the virtual machine? Unsaved work will be lost.')) {
        this._vm.reset();
        this.pauseBtn.textContent = '⏸';
        this.pauseBtn.title       = 'Pause VM';
      }
    });

    this.stopBtn.addEventListener('click', () => {
      if (confirm('Stop the virtual machine?')) {
        this._vm.stop();
      }
    });

    this.snapshotBtn.addEventListener('click', () => this._handleSnapshot());

    this.fullscreenBtn.addEventListener('click', () => this._toggleFullscreen());

    // Click screen → capture mouse
    this.screenCont.addEventListener('click', () => this._vm.lockMouse());

    // Release on Esc is handled automatically by the browser Pointer Lock API
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.screenCont ||
                     this.screenCont.contains(document.pointerLockElement);
      this.screenHint.style.display = locked ? 'none' : '';
    });
  }

  // ─── Console events ──────────────────────────────────────

  _bindConsoleEvents() {
    this.consoleToggle.addEventListener('click', () => {
      const open = this.consoleOutput.classList.toggle('hidden');
      // classList.toggle returns true when the class was *added*, i.e. now hidden
      const expanded = !open;
      this.consoleToggle.setAttribute('aria-expanded', String(expanded));
    });

    this._el('consoleClearBtn').addEventListener('click', () => {
      this.serialOut.textContent = '';
      this._vm.clearSerialBuffer();
    });

    this._el('consoleDownloadBtn').addEventListener('click', () => {
      const text = this._vm.serialBuffer || this.serialOut.textContent;
      this._downloadText(text, 'serial-log.txt');
    });
  }

  // ─── Config panel rendering ──────────────────────────────

  /**
   * Dynamically render the configuration panel for the selected OS.
   * @param {string} osId
   */
  _renderConfig(osId) {
    const cfg = this._source === 'premade' ? PREMADE_ISOS[osId] : OS_CONFIGS[osId];
    if (!cfg) return;

    const variantsHtml = cfg.variants?.map(v =>
      `<option value="${this._esc(v.id)}" data-memory="${v.memoryMB || cfg.memoryMB}" `+
      `data-boot="${v.bootDevice || cfg.bootDevice}">${this._esc(v.name)}</option>`,
    ).join('') || '';

    let noteHtml = '';
    if (cfg.note) {
      const cls = cfg.noteType === 'warning' ? 'config-note warning' : 'config-note';
      const icon = cfg.noteType === 'warning' ? '⚠️' : 'ℹ️';
      noteHtml = `
        <div class="${cls}">
          <span class="config-note-icon">${icon}</span>
          <span>${this._esc(cfg.note)}</span>
        </div>`;
    }

    const isPremade = cfg.source === 'premade';
    let imageHtml = '';
    if (isPremade) {
      // Premade entries already have a known image URL. Show it (optionally editable
      // for entries like Tahoe that allow a custom override).
      const readonly = cfg.allowsCustomImage ? '' : 'readonly';
      const placeholder = cfg.imageUrl || 'https://example.com/os.iso';
      imageHtml = `
        <div class="config-group">
          <label class="config-label" for="imageUrl">${cfg.allowsCustomImage ? 'Image URL (optional override)' : 'Pre-installed Image URL'}</label>
          <input type="url" class="config-input" id="imageUrl"
            value="${this._esc(cfg.imageUrl || '')}"
            placeholder="${this._esc(placeholder)}"
            ${readonly} autocomplete="off" spellcheck="false">
          ${cfg.allowsCustomImage ? '' : '<p class="config-hint">This image is provided by the pre-made preset.</p>'}
        </div>`;
    } else if (cfg.requiresImage) {
      imageHtml = `
        <div class="config-group">
          <label class="config-label" for="imageUrl">${this._esc(cfg.imageLabel)}</label>
          <div class="image-input-row">
            <input type="url" class="config-input" id="imageUrl"
              placeholder="${this._esc(cfg.imagePlaceholder)}"
              autocomplete="off" spellcheck="false">
            <span class="input-or">or</span>
            <label class="file-upload-label" title="Upload a local image file">
              📁 Upload File
              <input type="file" id="imageFile"
                accept=".iso,.img,.bin,.vhd,.qcow2,application/octet-stream"
                style="display:none" aria-label="Upload OS image file">
            </label>
          </div>
          <p class="config-hint" id="fileHint"></p>
        </div>`;
    }

    const customBootHtml = osId === 'custom' ? `
      <div class="config-group">
        <label class="config-label" for="bootDeviceOverride">Boot Device</label>
        <select class="config-select" id="bootDeviceOverride">
          <option value="cdrom">CDROM (ISO)</option>
          <option value="hdd">Hard Disk (IMG)</option>
          <option value="floppy">Floppy (IMG)</option>
        </select>
      </div>` : '';

    const variantGroupHtml = variantsHtml ? `
      <div class="config-group">
        <label class="config-label" for="variantSelect">Variant / Version</label>
        <select class="config-select" id="variantSelect">${variantsHtml}</select>
      </div>` : '';

    const html = `
      ${variantGroupHtml}

      <div class="config-group">
        <label class="config-label" for="memoryRange">
          RAM: <strong id="memLabel">${cfg.memoryMB} MB</strong>
        </label>
        <input type="range" class="config-range" id="memoryRange"
          min="32" max="16384" step="32" value="${cfg.memoryMB}"
          aria-valuemin="32" aria-valuemax="16384" aria-valuenow="${cfg.memoryMB}">
        <div class="range-row">
          <span>32 MB</span>
          <span>16384 MB</span>
        </div>
      </div>

      ${imageHtml}
      ${customBootHtml}
      ${noteHtml}

      <details class="advanced-section">
        <summary class="advanced-summary">Advanced Options</summary>
        <div class="advanced-body">

          <div class="advanced-row">
            <div class="config-group" style="margin-bottom:0">
              <label class="config-label" for="vgaMemRange">
                VGA RAM: <strong id="vgaMemLabel">${cfg.vgaMemoryMB} MB</strong>
              </label>
              <input type="range" class="config-range" id="vgaMemRange"
                min="2" max="64" step="2" value="${cfg.vgaMemoryMB}">
            </div>
          </div>

          <label class="checkbox-group">
            <input type="checkbox" id="enableNetwork">
            Enable Network (WebSocket NE2000 relay)
          </label>

          <div class="config-group" id="networkRelayGroup" style="display:none;margin-bottom:0">
            <label class="config-label" for="networkRelay">Network Relay URL</label>
            <input type="url" class="config-input" id="networkRelay"
              value="wss://relay.widgetry.org/"
              placeholder="wss://relay.widgetry.org/">
          </div>

          <label class="checkbox-group">
            <input type="checkbox" id="enableSerial" checked>
            Enable Serial Console (UART output)
          </label>

          <div class="config-group" style="margin-bottom:0">
            <label class="config-label" for="libUrl">v86 Library URL (libv86.js)</label>
            <input type="url" class="config-input" id="libUrl"
              value="${DEFAULTS.libUrl}" placeholder="${DEFAULTS.libUrl}">
          </div>

          <div class="advanced-row">
            <div class="config-group" style="margin-bottom:0">
              <label class="config-label" for="wasmUrl">v86 WASM URL</label>
              <input type="url" class="config-input" id="wasmUrl"
                value="${DEFAULTS.wasmUrl}" placeholder="${DEFAULTS.wasmUrl}">
            </div>
            <div class="config-group" style="margin-bottom:0">
              <label class="config-label" for="biosUrl">BIOS URL (seabios.bin)</label>
              <input type="url" class="config-input" id="biosUrl"
                value="${DEFAULTS.biosUrl}" placeholder="${DEFAULTS.biosUrl}">
            </div>
          </div>

          <div class="config-group" style="margin-bottom:0">
            <label class="config-label" for="vgaBiosUrl">VGA BIOS URL (vgabios.bin)</label>
            <input type="url" class="config-input" id="vgaBiosUrl"
              value="${DEFAULTS.vgaBiosUrl}" placeholder="${DEFAULTS.vgaBiosUrl}">
          </div>

        </div>
      </details>
    `;

    this.configPanel.innerHTML = html;

    // ── Post-render bindings ──

    const variantSel  = this._el('variantSelect');
    const memRange    = this._el('memoryRange');
    const memLabel    = this._el('memLabel');
    const vgaRange    = this._el('vgaMemRange');
    const vgaLabel    = this._el('vgaMemLabel');
    const netCb       = this._el('enableNetwork');
    const netGroup    = this._el('networkRelayGroup');
    const imageFile   = this._el('imageFile');
    const fileHint    = this._el('fileHint');

    // Variant selection → update memory default
    if (variantSel) {
      variantSel.addEventListener('change', () => {
        const opt = variantSel.selectedOptions[0];
        const mem = parseInt(opt.dataset.memory, 10);
        if (mem) {
          memRange.value         = mem;
          memLabel.textContent   = mem + ' MB';
          memRange.ariaValueNow  = mem;
        }
      });
    }

    // Memory range label update
    if (memRange) {
      memRange.addEventListener('input', () => {
        memLabel.textContent  = memRange.value + ' MB';
        memRange.ariaValueNow = memRange.value;
      });
    }

    // VGA memory range
    if (vgaRange) {
      vgaRange.addEventListener('input', () => {
        vgaLabel.textContent = vgaRange.value + ' MB';
      });
    }

    // Network checkbox → show/hide relay URL
    if (netCb && netGroup) {
      netCb.addEventListener('change', () => {
        netGroup.style.display = netCb.checked ? '' : 'none';
      });
    }

    // File upload
    if (imageFile) {
      imageFile.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        if (fileHint) {
          fileHint.textContent  = `Reading ${file.name}…`;
          fileHint.className    = 'config-hint';
        }

        this._readFile(file)
          .then(buf => {
            this._imageBuffer = buf;
            if (fileHint) {
              fileHint.textContent = `✅ ${file.name}  (${this._fmtBytes(file.size)})`;
              fileHint.className   = 'config-hint ok';
            }
            // Clear the URL field so we use the buffer
            const urlInput = this._el('imageUrl');
            if (urlInput) urlInput.value = '';
          })
          .catch(() => {
            this._imageBuffer = null;
            if (fileHint) {
              fileHint.textContent = '❌ Failed to read file. Try again.';
              fileHint.className   = 'config-hint error';
            }
          });
      });
    }
  }

  // ─── VM launch ───────────────────────────────────────────

  async _launchVM() {
    const cfg = this._currentConfig();
    if (!cfg) return;

    // ── Gather config values ──
    const memoryMB      = parseInt(this._val('memoryRange')    || cfg.memoryMB,    10);
    const vgaMemoryMB   = parseInt(this._val('vgaMemRange')    || cfg.vgaMemoryMB, 10);
    let   imageUrl      = (this._val('imageUrl') || '').trim();
    const libUrl        = (this._val('libUrl')   || DEFAULTS.libUrl).trim();
    const wasmUrl       = (this._val('wasmUrl')  || DEFAULTS.wasmUrl).trim();
    const biosUrl       = (this._val('biosUrl')  || DEFAULTS.biosUrl).trim();
    const vgaBiosUrl    = (this._val('vgaBiosUrl')|| DEFAULTS.vgaBiosUrl).trim();
    const enableNetwork = this._checked('enableNetwork');
    const networkRelay  = (this._val('networkRelay') || 'wss://relay.widgetry.org/').trim();
    const enableSerial  = this._checked('enableSerial') !== false;

    // Determine boot device
    const variantSel    = this._el('variantSelect');
    const selectedVar   = variantSel?.selectedOptions[0];
    const bootDeviceOverride = this._el('bootDeviceOverride');
    const bootDevice    = bootDeviceOverride?.value
      || selectedVar?.dataset?.boot
      || cfg.bootDevice;

    // Build a display title
    const variantName = selectedVar?.text?.split('—')[0]?.trim() || '';
    const title = variantName ? `${cfg.name} — ${variantName}` : cfg.name;

    // For premade presets, fall back to the built-in image URL if the user left the field empty
    const isPremade = cfg.source === 'premade';
    if (isPremade && !imageUrl && cfg.imageUrl) {
      imageUrl = cfg.imageUrl;
    }

    // ── Validate ──
    const needsImage = cfg.requiresImage || (isPremade && !cfg.imageUrl);
    if (needsImage && !imageUrl && !this._imageBuffer) {
      if (isPremade) {
        alert('This pre-made preset does not have a built-in image URL. Please enter one in the Image URL field.');
      } else {
        alert(
          `Please provide a ${cfg.imageLabel}.\n\n` +
          `Either paste a URL into the image field, or click "Upload File" to choose a local file.`,
        );
      }
      return;
    }

    if (!libUrl) {
      alert('Please provide the v86 Library URL in Advanced Options.');
      return;
    }

    // ── Show VM section ──
    this._showVM(title);
    this.pauseBtn.textContent = '⏸';
    this.pauseBtn.title       = 'Pause VM';

    // Destroy any previous instance
    this._vm.destroy();
    // Clear old canvases injected by v86
    this.screenCont.innerHTML = '';
    // Clear serial output
    this.serialOut.textContent = '';

    // ── Register VM events ──
    this._vm
      .on('status',    ({ text, sub }) => {
        this.statusText.textContent = text;
        this.statusSub.textContent  = sub || '';
      })
      .on('ready',     ()  => this._onVMReady())
      .on('started',   ()  => this._onVMStarted())
      .on('stopped',   ()  => this._onVMStopped())
      .on('paused',    ()  => this._onVMPaused())
      .on('resumed',   ()  => this._onVMResumed())
      .on('serial-char', c => this._appendSerial(c));

    // ── Start the VM ──
    try {
      await this._vm.start({
        screenContainer: this.screenCont,
        libUrl,
        wasmUrl,
        biosUrl,
        vgaBiosUrl,
        memoryMB,
        vgaMemoryMB,
        bootDevice,
        imageUrl:     imageUrl      || undefined,
        imageBuffer:  this._imageBuffer || undefined,
        enableNetwork,
        networkRelayUrl: networkRelay,
        enableSerial,
      });
    } catch (err) {
      this.statusText.textContent = '❌ Error';
      this.statusSub.textContent  = err.message;
      this.statusSpinner.style.display = 'none';
      console.error('[OSRunApp] VM start error:', err);
    }
  }

  // ─── VM event handlers ───────────────────────────────────

  _onVMReady() {
    // Fade out the overlay
    this.vmOverlay.classList.add('fading');
    setTimeout(() => this.vmOverlay.classList.add('hidden'), 450);
  }

  _onVMStarted() {
    this.vmOverlay.classList.add('hidden');
  }

  _onVMStopped() {
    this.vmOverlay.classList.remove('hidden', 'fading');
    this.statusText.textContent      = 'VM stopped';
    this.statusSub.textContent       = '';
    this.statusSpinner.style.display = 'none';
  }

  _onVMPaused() {
    this.vmOverlay.classList.remove('hidden', 'fading');
    this.statusText.textContent      = '⏸ VM paused';
    this.statusSub.textContent       = 'Click ▶ to resume';
    this.statusSpinner.style.display = 'none';
  }

  _onVMResumed() {
    this.vmOverlay.classList.add('hidden');
    this.statusSpinner.style.display = '';
  }

  _appendSerial(char) {
    this.serialOut.textContent += char;
    // Auto-scroll only if already near the bottom
    const el = this.serialOut;
    if (el.scrollHeight - el.scrollTop < el.clientHeight + 80) {
      el.scrollTop = el.scrollHeight;
    }
  }

  // ─── Snapshot ────────────────────────────────────────────

  async _handleSnapshot() {
    if (!this._vm.isReady) return;

    // Toggle: save when nothing saved, restore when snapshot available
    if (!this._snapshotBuffer) {
      this.snapshotBtn.textContent = '…';
      this._snapshotBuffer = await this._vm.saveSnapshot();
      this.snapshotBtn.textContent = '♻️';
      this.snapshotBtn.title       = 'Restore snapshot';
      if (this._snapshotBuffer) {
        this._toast('Snapshot saved. Click 💾 again to restore.');
      }
    } else {
      await this._vm.restoreSnapshot(this._snapshotBuffer);
      this._snapshotBuffer  = null;
      this.snapshotBtn.textContent = '💾';
      this.snapshotBtn.title       = 'Save snapshot';
      this._toast('Snapshot restored.');
    }
  }

  // ─── UI transitions ──────────────────────────────────────

  _showVM(title) {
    this.launcher.classList.add('hidden');
    this.vmSection.classList.remove('hidden');
    this.vmTitle.textContent         = title;
    this.vmOverlay.classList.remove('hidden', 'fading');
    this.statusText.textContent      = 'Initializing…';
    this.statusSub.textContent       = '';
    this.statusSpinner.style.display = '';
    this.consoleOutput.classList.add('hidden');
    this.consoleToggle.setAttribute('aria-expanded', 'false');
    this.screenHint.style.display    = '';
    this.snapshotBtn.textContent     = '💾';
    this.snapshotBtn.title           = 'Save snapshot';
    this._snapshotBuffer             = null;
  }

  _showLauncher() {
    this._vm.destroy();
    this.vmSection.classList.add('hidden');
    this.launcher.classList.remove('hidden');
    this.serialOut.textContent = '';
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      (this.vmWrapper.requestFullscreen
        || this.vmWrapper.webkitRequestFullscreen
      ).call(this.vmWrapper);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  }

  // ─── Utility ─────────────────────────────────────────────

  _val(id) {
    const el = this._el(id);
    return el ? el.value : '';
  }

  _checked(id) {
    const el = this._el(id);
    return el ? el.checked : false;
  }

  _esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  _readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  _fmtBytes(n) {
    if (n < 1024)                   return n + ' B';
    if (n < 1024 * 1024)            return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024)    return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  _downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _toast(msg) {
    // Simple ephemeral toast notification
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      background: '#1a1a30', border: '1px solid #6366f1',
      color: '#e2e8f0', padding: '12px 20px',
      borderRadius: '8px', fontSize: '0.85rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      zIndex: '9999', transition: 'opacity 0.3s ease',
    });
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 350);
    }, 3000);
  }
}

/* ── Bootstrap ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window.osRunApp = new OSRunApp();
});
