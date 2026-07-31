/* global OS_CONFIGS */
'use strict';

/**
 * OS_CONFIGS — preset configurations for every supported operating system.
 *
 * Each top-level key is the OS identifier used by the UI.
 * Structure:
 *   id            – matches the key
 *   name          – human-readable OS family name
 *   icon          – emoji icon
 *   description   – short one-liner shown in the config panel
 *   bootDevice    – default boot device: 'cdrom' | 'hdd' | 'floppy'
 *   memoryMB      – default RAM allocation in megabytes
 *   vgaMemoryMB   – default VGA RAM in megabytes
 *   variants[]    – selectable sub-types (distros, versions, etc.)
 *     .id         – unique within the OS
 *     .name       – display name
 *     .memoryMB   – RAM override for this variant
 *     .bootDevice – optional boot-device override
 *   requiresImage – if true the UI shows the image URL / upload field
 *   imageLabel    – label text for the image field
 *   imagePlaceholder – placeholder URL hint
 *   note          – optional informational string shown in the panel
 */

// eslint-disable-next-line no-unused-vars
const PREMADE_ISOS = {

  /* ── Tiny Core Linux ───────────────────────────────────────── */
  tinycore: {
    id: 'tinycore',
    name: 'Tiny Core Linux',
    icon: '🐧',
    description: 'Tiny Core Linux — a minimal 16 MB desktop distro, ready to boot.',
    bootDevice: 'cdrom',
    memoryMB: 128,
    vgaMemoryMB: 8,
    imageUrl: 'https://copy.sh/v86/images/tinycore.iso',
    source: 'premade',
    note: 'Hosted by the v86 project. Tiny Core boots quickly and works great in the browser.',
  },

  /* ── FreeDOS ────────────────────────────────────────────────── */
  freedos: {
    id: 'freedos',
    name: 'FreeDOS',
    icon: '💾',
    description: 'FreeDOS — free, open-source DOS compatible with MS-DOS software.',
    bootDevice: 'cdrom',
    memoryMB: 64,
    vgaMemoryMB: 2,
    imageUrl: 'https://copy.sh/v86/images/freedos722.iso',
    source: 'premade',
    note: 'Hosted by the v86 project. FreeDOS 7.22 live ISO, ready to run.',
  },

  /* ── Ubuntu Linux ──────────────────────────────────────────── */
  ubuntu: {
    id: 'ubuntu',
    name: 'Ubuntu Linux',
    icon: '🐧',
    description: 'Ubuntu Linux — a user-friendly desktop distro preset.',
    bootDevice: 'cdrom',
    memoryMB: 1024,
    vgaMemoryMB: 16,
    imageUrl: '',
    source: 'premade',
    note: 'No public browser-bootable Ubuntu ISO is bundled. Supply your own compatible ISO below.',
    noteType: 'warning',
    allowsCustomImage: true,
  },

  /* ── Debian Linux ───────────────────────────────────────────── */
  debian: {
    id: 'debian',
    name: 'Debian Linux',
    icon: '🐧',
    description: 'Debian Linux — a stable and widely used distro preset.',
    bootDevice: 'cdrom',
    memoryMB: 1024,
    vgaMemoryMB: 16,
    imageUrl: '',
    source: 'premade',
    note: 'No public browser-bootable Debian ISO is bundled. Supply your own compatible ISO below.',
    noteType: 'warning',
    allowsCustomImage: true,
  },

  /* ── Alpine Linux ───────────────────────────────────────────── */
  alpine: {
    id: 'alpine',
    name: 'Alpine Linux',
    icon: '🐧',
    description: 'Alpine Linux — a lightweight distro preset for modern setups.',
    bootDevice: 'cdrom',
    memoryMB: 512,
    vgaMemoryMB: 16,
    imageUrl: '',
    source: 'premade',
    note: 'No public browser-bootable Alpine ISO is bundled. Supply your own compatible ISO below.',
    noteType: 'warning',
    allowsCustomImage: true,
  },

  /* ── KolibriOS ──────────────────────────────────────────────── */
  kolibri: {
    id: 'kolibri',
    name: 'KolibriOS',
    icon: '🦋',
    description: 'KolibriOS — tiny, fast graphical OS written in assembly.',
    bootDevice: 'cdrom',
    memoryMB: 128,
    vgaMemoryMB: 8,
    imageUrl: 'https://copy.sh/v86/images/kolibri.iso',
    source: 'premade',
    note: 'Hosted by the v86 project. Boots in seconds with a full GUI.',
  },

  /* ── macOS Tahoe 26 ─────────────────────────────────────────── */
  tahoe: {
    id: 'tahoe',
    name: 'macOS Tahoe 26',
    icon: '🍎',
    description: 'macOS Tahoe (26) — demo placeholder entry for the newest macOS release.',
    bootDevice: 'cdrom',
    memoryMB: 4096,
    vgaMemoryMB: 16,
    imageUrl: '',
    source: 'premade',
    note: 'A public, browser-bootable Tahoe 26 ISO is not available. Use this entry as a ' +
          'placeholder/template, or supply your own compatible x86/Hackintosh ISO below.',
    noteType: 'warning',
    allowsCustomImage: true,
  },
};

// eslint-disable-next-line no-unused-vars
const OS_CONFIGS = {

  /* ── Linux ─────────────────────────────────────────────────── */
  linux: {
    id: 'linux',
    source: 'custom',
    name: 'Linux',
    icon: '🐧',
    description: 'Boot any Linux distribution from a live ISO or a pre-installed disk image.',
    bootDevice: 'cdrom',
    memoryMB: 256,
    vgaMemoryMB: 8,
    variants: [
      { id: 'alpine',   name: 'Alpine Linux',         memoryMB: 128,  description: 'Minimal, security-focused' },
      { id: 'debian',   name: 'Debian',               memoryMB: 256,  description: 'Stable & versatile' },
      { id: 'ubuntu',   name: 'Ubuntu',               memoryMB: 512,  description: 'User-friendly desktop' },
      { id: 'kali',     name: 'Kali Linux',           memoryMB: 512,  description: 'Penetration testing' },
      { id: 'arch',     name: 'Arch Linux',           memoryMB: 512,  description: 'Rolling-release, DIY' },
      { id: 'fedora',   name: 'Fedora',               memoryMB: 1024, description: 'Cutting-edge RHEL upstream' },
      { id: 'mint',     name: 'Linux Mint',           memoryMB: 1024, description: 'Beginner-friendly Debian/Ubuntu' },
      { id: 'nixos',    name: 'NixOS',                memoryMB: 1024, description: 'Reproducible, declarative' },
      { id: 'tinycore', name: 'Tiny Core Linux',      memoryMB: 64,   description: 'World\'s smallest distro' },
      { id: 'custom',   name: 'Other / Custom distro', memoryMB: 256,  description: 'Any other Linux ISO' },
    ],
    requiresImage: true,
    imageLabel: 'Linux ISO Image',
    imagePlaceholder: 'https://example.com/linux.iso',
  },

  /* ── FreeDOS ────────────────────────────────────────────────── */
  freedos: {
    id: 'freedos',
    source: 'custom',
    name: 'FreeDOS',
    icon: '💾',
    description: 'Free, open-source DOS implementation — compatible with MS-DOS programs and games.',
    bootDevice: 'hdd',
    memoryMB: 64,
    vgaMemoryMB: 2,
    variants: [
      { id: 'freedos13',  name: 'FreeDOS 1.3',        memoryMB: 64 },
      { id: 'freedos12',  name: 'FreeDOS 1.2',        memoryMB: 64 },
      { id: 'cdrom',      name: 'FreeDOS (boot from ISO)', memoryMB: 64, bootDevice: 'cdrom' },
    ],
    requiresImage: true,
    imageLabel: 'FreeDOS Disk Image (.img)',
    imagePlaceholder: 'https://example.com/freedos.img',
    note: 'Download pre-built FreeDOS images from https://www.freedos.org/download/ or the v86 demo page.',
  },

  /* ── Windows ────────────────────────────────────────────────── */
  windows: {
    id: 'windows',
    source: 'custom',
    name: 'Windows',
    icon: '🪟',
    description: 'Run classic Windows versions using a pre-installed hard-disk image (.img).',
    bootDevice: 'hdd',
    memoryMB: 128,
    vgaMemoryMB: 4,
    variants: [
      { id: 'win31',  name: 'Windows 3.1',       memoryMB: 32  },
      { id: 'win95',  name: 'Windows 95',        memoryMB: 64  },
      { id: 'win98',  name: 'Windows 98 SE',     memoryMB: 128 },
      { id: 'winme',  name: 'Windows ME',        memoryMB: 128 },
      { id: 'win2k',  name: 'Windows 2000',      memoryMB: 256 },
      { id: 'winxp',  name: 'Windows XP',        memoryMB: 512 },
    ],
    requiresImage: true,
    imageLabel: 'Windows Disk Image (.img)',
    imagePlaceholder: 'https://example.com/win98.img',
    note: 'You must supply a pre-installed Windows hard-disk image in raw (.img) format. ' +
          'These are available from various archival and legal sources.',
  },

  /* ── macOS ──────────────────────────────────────────────────── */
  macos: {
    id: 'macos',
    source: 'custom',
    name: 'macOS',
    icon: '🍎',
    description: 'Run macOS via a Hackintosh-compatible x86 ISO. Provide your own image file.',
    bootDevice: 'cdrom',
    memoryMB: 2048,
    vgaMemoryMB: 16,
    variants: [
      { id: 'tiger',        name: 'Mac OS X Tiger (10.4)',         memoryMB: 512  },
      { id: 'leopard',      name: 'Mac OS X Leopard (10.5)',       memoryMB: 512  },
      { id: 'snow-leopard', name: 'Mac OS X Snow Leopard (10.6)',  memoryMB: 1024 },
      { id: 'lion',         name: 'OS X Lion (10.7)',              memoryMB: 2048 },
      { id: 'mountain',     name: 'OS X Mountain Lion (10.8)',     memoryMB: 2048 },
      { id: 'mavericks',    name: 'OS X Mavericks (10.9)',         memoryMB: 2048 },
      { id: 'yosemite',     name: 'OS X Yosemite (10.10)',         memoryMB: 2048 },
      { id: 'el-capitan',   name: 'OS X El Capitan (10.11)',       memoryMB: 2048 },
      { id: 'sierra',       name: 'macOS Sierra (10.12)',          memoryMB: 2048 },
      { id: 'high-sierra',  name: 'macOS High Sierra (10.13)',     memoryMB: 2048 },
      { id: 'mojave',       name: 'macOS Mojave (10.14)',          memoryMB: 4096 },
      { id: 'catalina',     name: 'macOS Catalina (10.15)',        memoryMB: 4096 },
      { id: 'big-sur',      name: 'macOS Big Sur (11)',            memoryMB: 4096 },
      { id: 'monterey',     name: 'macOS Monterey (12)',           memoryMB: 4096 },
      { id: 'ventura',      name: 'macOS Ventura (13)',            memoryMB: 8192 },
      { id: 'sonoma',       name: 'macOS Sonoma (14)',             memoryMB: 8192 },
      { id: 'sequoia',      name: 'macOS Sequoia (15)',            memoryMB: 8192 },
      { id: 'tahoe',        name: 'macOS Tahoe (26)',              memoryMB: 8192 },
    ],
    requiresImage: true,
    imageLabel: 'macOS ISO / Disk Image',
    imagePlaceholder: 'https://example.com/macos-sierra.iso',
    note: 'v86 emulates x86 hardware. macOS versions up to 10.14 (Mojave) run on x86 ' +
          'natively and are best supported. Newer versions (Catalina+) require a ' +
          'Hackintosh ISO with UEFI/OpenCore support. Apple Silicon versions (12+) may ' +
          'need an ISO that includes x86 emulation. You must supply your own ISO image.',
    noteType: 'warning',
  },

  /* ── Custom ─────────────────────────────────────────────────── */
  custom: {
    id: 'custom',
    source: 'custom',
    name: 'Custom',
    icon: '⚙️',
    description: 'Boot any x86 operating system from a custom ISO, hard-disk image, or floppy image.',
    bootDevice: 'cdrom',
    memoryMB: 256,
    vgaMemoryMB: 8,
    variants: [
      { id: 'cdrom',  name: 'Boot from ISO (CDROM)',       memoryMB: 256, bootDevice: 'cdrom'  },
      { id: 'hdd',    name: 'Boot from Disk Image (HDD)',  memoryMB: 256, bootDevice: 'hdd'    },
      { id: 'floppy', name: 'Boot from Floppy Image',      memoryMB: 64,  bootDevice: 'floppy' },
    ],
    requiresImage: true,
    imageLabel: 'OS Image (ISO / IMG)',
    imagePlaceholder: 'https://example.com/os.iso',
  },
};
