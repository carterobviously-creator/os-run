# OS-Run — Web Virtual Machine

A full web-based virtual machine system powered by **[v86.js](https://github.com/copy/v86)** — a complete x86 PC emulator written in JavaScript and WebAssembly that runs entirely inside your browser.  
No server-side code. No installation. No plugins.

---

## ✨ Features

| Feature | Detail |
|---|---|
| **Pure browser** | CPU emulation via v86 WebAssembly — zero server involvement |
| **Pre-made OS tab** | Presets for Tiny Core Linux, FreeDOS, Ubuntu Linux, Debian Linux, Alpine Linux, KolibriOS, and macOS Tahoe 26 |
| **Custom OS tab** | Linux, FreeDOS, Windows 3.1/95/98/ME/2000/XP, macOS, or any custom ISO |
| **macOS support** | All versions listed — Sierra through Tahoe — when you supply a compatible ISO |
| **Local file upload** | Drag-and-drop or pick any `.iso` / `.img` from your disk — it never leaves your browser |
| **Remote ISO** | Paste a URL; v86 streams and decompresses the image on-the-fly |
| **Serial console** | Live UART output streamed to an in-page terminal; downloadable as a log |
| **Snapshots** | Save and restore full machine state in one click |
| **Keyboard / mouse capture** | Click the screen to capture; `Escape` to release |
| **Fullscreen** | One-button fullscreen with letterbox scaling |
| **Configurable CDN** | All v86 asset URLs are editable in Advanced Options |
| **Network (optional)** | WebSocket-based NE2000 adapter via a relay server |

---

## 🚀 Quick Start

### Option A — open the HTML file directly

```
git clone https://github.com/carterobviously-creator/os-run.git
cd os-run
# open index.html in your browser
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

> **Note:** Some browsers block `fetch()` from `file://` origins which v86 uses internally to load WASM and BIOS files.  
> Use **Option B** (a local HTTP server) if anything fails.

### Option B — serve locally (recommended)

```bash
# Node.js
npx http-server . -p 8080 -c-1 --cors
# or Python 3
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## 🖥️ Supported Operating Systems

### Pre-made OS
Some presets are ready to boot from public v86 demo mirrors, while others are lightweight preset entries that use your own ISO when no public image is bundled. Select the **📦 Pre-made OS** tab, pick an OS, and click **Launch VM**.

| Preset | Image | Notes |
|---|---|---|
| Tiny Core Linux | `copy.sh/v86/images/tinycore.iso` | Minimal 16 MB desktop, boots in seconds |
| FreeDOS | `copy.sh/v86/images/freedos722.iso` | Free DOS-compatible OS |
| Ubuntu Linux | *(placeholder)* | Supply a compatible Ubuntu ISO |
| Debian Linux | *(placeholder)* | Supply a compatible Debian ISO |
| Alpine Linux | *(placeholder)* | Supply a compatible Alpine ISO |
| KolibriOS | `copy.sh/v86/images/kolibri.iso` | Tiny GUI OS written in assembly |
| macOS Tahoe 26 | *(placeholder)* | No public browser-bootable ISO yet; supply your own |

### Custom OS
Select the **⚙️ Custom OS** tab to supply your own image.

#### Linux
Any distribution that fits in an x86 ISO or disk image.  
Tested examples: Alpine Linux, Debian, Kali, Arch, Ubuntu, Tiny Core Linux.

#### FreeDOS
FreeDOS 1.2 and 1.3 — boot from ISO or a pre-installed HDD image.  
Download ready-made images from [freedos.org](https://www.freedos.org/download/).

#### Windows
Pre-installed raw disk images (`.img`) of Windows 3.1, 95, 98 SE, ME, 2000, XP.

#### macOS
v86 emulates **x86** hardware, so any macOS version that runs on x86 Intel is supported when you supply an appropriate ISO:

| Version | Status |
|---|---|
| Mac OS X Tiger 10.4 – Leopard 10.5 | ✅ x86 native |
| Snow Leopard 10.6 – El Capitan 10.11 | ✅ x86 native |
| Sierra 10.12 – Mojave 10.14 | ✅ x86 native |
| Catalina 10.15 – Big Sur 11 | ⚠️ needs Hackintosh ISO (OpenCore/Clover) |
| Monterey 12 – Tahoe 26 | ⚠️ needs Hackintosh ISO with x86 support |

You must supply your own ISO image. The emulator enforces no restrictions on which ISO you load.

#### Custom
Point the boot device at any x86 ISO (CDROM), raw disk image (HDD), or floppy image.

---

## ⚙️ Configuration

### Basic options

| Field | Description |
|---|---|
| **Variant / Version** | Choose the specific OS variant; memory is preset automatically |
| **RAM** | Adjustable from 32 MB to 16 384 MB via a slider |
| **Image URL** | HTTPS URL to the ISO or disk image — v86 fetches it directly |
| **Upload File** | Local `.iso` / `.img` file; read into memory via `FileReader`, never uploaded |

### Advanced options

| Field | Default | Description |
|---|---|---|
| VGA RAM | 8 MB | Video memory size |
| Enable Network | off | Attach a WebSocket NE2000 adapter |
| Network Relay URL | `wss://relay.widgetry.org/` | Relay for the emulated network card |
| Enable Serial Console | on | Stream UART0 output to the in-page terminal |
| v86 Library URL | jsDelivr CDN | URL for `libv86.js` |
| v86 WASM URL | jsDelivr CDN | URL for `v86.wasm` |
| BIOS URL | jsDelivr CDN | URL for `seabios.bin` |
| VGA BIOS URL | jsDelivr CDN | URL for `vgabios.bin` |

---

## 📁 Project Structure

```
os-run/
├── index.html          # Single-page application entry point
├── css/
│   └── main.css        # Dark modern theme; fully responsive
├── js/
│   ├── os-configs.js   # OS preset catalogue (Linux, FreeDOS, Windows, macOS, Custom)
│   ├── vm-manager.js   # VMManager — v86 wrapper (lifecycle, serial, snapshots)
│   └── app.js          # OSRunApp — UI controller, event wiring, launch logic
└── README.md
```

No build step, no bundler, no dependencies to install.

---

## 🔧 Self-Hosting v86 Assets

The default configuration pulls `libv86.js`, `v86.wasm`, `seabios.bin`, and `vgabios.bin` from jsDelivr (the v86 npm package). To self-host:

```bash
npm pack v86          # downloads the npm package
# extract and copy build/ and bios/ into your web root
```

Then update the four URLs in **Advanced Options** (or change `DEFAULTS` in `js/app.js`).

---

## 🏗️ Architecture

```
Browser
  │
  ├─ index.html           ← Single HTML page (no framework)
  │
  ├─ js/app.js            ← OSRunApp
  │     • OS card selection
  │     • Config panel rendering
  │     • Reads local files via FileReader
  │     • Calls VMManager.start()
  │
  ├─ js/vm-manager.js     ← VMManager
  │     • Dynamically loads libv86.js on demand
  │     • Wraps new V86({…}) constructor
  │     • Exposes: start / pause / resume / reset / stop / destroy
  │     • Proxies: serial output, snapshots, mouse lock
  │
  ├─ js/os-configs.js     ← Static configuration catalogue
  │     • Memory / VGA defaults per OS variant
  │     • Boot device selection
  │     • UI hints and warnings
  │
  └─ (v86 loaded at runtime from CDN or local path)
        libv86.js   ← x86 CPU / chipset emulation (JS)
        v86.wasm    ← Hot loop acceleration (WebAssembly)
        seabios.bin ← PC BIOS firmware
        vgabios.bin ← VGA BIOS firmware
```

---

## 📜 License

This project is released under the **MIT License**.  
v86 itself is licensed under the Artistic License 2.0 — see [github.com/copy/v86](https://github.com/copy/v86) for details.
