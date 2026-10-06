<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

[![Build Application](https://github.com/sirinsidiator/black-book-browser/actions/workflows/build.yml/badge.svg)](https://github.com/sirinsidiator/black-book-browser/actions/workflows/build.yml)

Source repository for Black Book Browser. More information and prebuilt binaries for **Windows**, **Linux**, and **macOS** are provided over on [the ESOUI project page](https://www.esoui.com/downloads/info2532-BlackBookBrowser.html) and from [the GitHub Releases page](https://github.com/sirinsidiator/black-book-browser/releases).

## macOS Troubleshooting

### "bad CPU type in executable"

The macOS build is compiled for x86_64, which Apple Silicon (M-series) Macs run via the
Rosetta 2 translation layer. If Rosetta is not installed, the app will fail to launch with
`bad CPU type in executable`. Install it with:

```bash
softwareupdate --install-rosetta
```

### "Apple could not verify that this app is safe"

The release binary is ad-hoc signed and distributed as a loose executable, so macOS Gatekeeper
quarantines it and blocks launch. To allow it to run, remove the quarantine attribute:

```zsh
xattr -dr com.apple.quarantine /path/to/bbb
```

## Building it

All platforms require Node.js and Rust (see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for the exact versions). On top of those, each OS needs a few extra packages for the Tauri/WebKit runtime.

### Windows

1. Install Visual Studio (e.g. VS Community 2022) with the "Desktop development with C++" workload to provide the required C++ CLI tools
2. The WebView2 runtime, used to render the UI, is included with recent versions of Windows 10/11 — no extra step needed on most systems

### Linux

Install the required GTK/WebKit development packages. On Debian/Ubuntu:

```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev build-essential curl \
    wget file libxdo-dev libssl-dev
```

### macOS

Install the Xcode command line tools, which provide the C/C++ toolchain and SDKs:

```bash
xcode-select --install
```

> **Note:** The macOS build targets x86_64 and runs on Apple Silicon via Rosetta 2 (see [MacOS Troubleshooting](#macos-troubleshooting) if you hit a `bad CPU type in executable` error).

### Build

1. Run `npm i` to install necessary dependencies
2. Run `npm run tauri dev` for a debug build or `npm run tauri build` for a release build
