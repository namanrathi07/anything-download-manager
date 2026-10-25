# Anything Download Manager — Universal Browser Extension

This extension integrates **Anything Download Manager (ADM)** with your web browser to provide IDM-like automatic download detection, video sniffing, and single-click downloading on **Chrome, Firefox, Edge, Brave, Opera, and Vivaldi**.

---

## 🚀 Features

- **Auto-Detection**: Intercepts native browser downloads and hands them over to ADM's accelerated multi-stream engine.
- **Video Sniffer**: Detects HTML5 streaming videos on any web page and displays an on-screen "Download Video" overlay.
- **Link Sniffer**: Hover over downloadable links (`.zip`, `.iso`, `.exe`, `.mp4`, etc.) to show a quick "Download with ADM" button.
- **Context Menu**: Right click any link, video, or audio file and choose **"Download with ADM"**.
- **Cross-Browser**: Standard WebExtension Manifest V3 compatible with Chromium and Firefox-based browsers.

---

## 🛠️ Installation Instructions

### Chrome, Brave, Edge, Opera, Vivaldi (Chromium)

1. Open your browser and go to the Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Enable **"Developer mode"** in the top-right corner.
3. Click **"Load unpacked"**.
4. Select the `browser-extension` folder inside this repository.
5. The ADM icon will appear in your toolbar!

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **"Load Temporary Add-on..."**.
3. Select `browser-extension/manifest.json`.

---

## 📡 Communication Architecture

The extension communicates with the desktop ADM application through:
1. **Local WebSocket** at `ws://127.0.0.1:28370` (Zero configuration, instantaneous).
2. **HTTP REST Fallback** at `http://127.0.0.1:28370/intercept`.
3. **Native Messaging API** via length-prefixed stdin/stdout bridge (`com.adm.native_messaging`).
