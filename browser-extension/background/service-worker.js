// ============================================================================
// Anything Download Manager — Browser Extension Background Service Worker
// ============================================================================

const ADM_WS_URL = 'ws://127.0.0.1:28370';
const ADM_HTTP_URL = 'http://127.0.0.1:28370/intercept';

let ws = null;
let isConnected = false;
let interceptEnabled = true;

// Connect to ADM App
function connectToApp() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(ADM_WS_URL);

    ws.onopen = () => {
      isConnected = true;
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
      console.log('[ADM Extension] Connected to desktop application');
    };

    ws.onclose = () => {
      isConnected = false;
      chrome.action.setBadgeText({ text: '' });
      setTimeout(connectToApp, 3000);
    };

    ws.onerror = () => {
      isConnected = false;
    };
  } catch {
    isConnected = false;
    setTimeout(connectToApp, 5000);
  }
}

connectToApp();

// Helper to send intercepted download to ADM
async function forwardToADM(data) {
  // If WebSocket connected, send JSON frame
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }

  // Fallback to HTTP POST
  try {
    const res = await fetch(ADM_HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    console.warn('[ADM Extension] Failed to forward to desktop app:', err);
    return false;
  }
}

// ─── Browser Download Interception ──────────────────────────────────────────

chrome.downloads.onCreated.addListener(async (item) => {
  if (!interceptEnabled) return;

  // Avoid self-interception or blob/data URLs
  if (!item.url || item.url.startsWith('blob:') || item.url.startsWith('data:')) {
    return;
  }

  // Cancel the native browser download
  chrome.downloads.cancel(item.id, () => {
    chrome.downloads.erase({ id: item.id });
  });

  // Forward to ADM
  await forwardToADM({
    type: 'new-download',
    url: item.url,
    fileName: item.filename || '',
    fileSize: item.fileSize || -1,
    mimeType: item.mime || null,
    referrer: item.referrer || '',
  });
});

// ─── Context Menus ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'adm-download-link',
    title: 'Download with ADM',
    contexts: ['link', 'image', 'video', 'audio'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl || info.srcUrl;
  if (!targetUrl) return;

  await forwardToADM({
    type: 'new-download',
    url: targetUrl,
    referrer: tab?.url || '',
  });
});

// ─── Messaging from Content Script & Popup ──────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'check-connection') {
    sendResponse({ connected: isConnected, interceptEnabled });
    return true;
  }

  if (message.type === 'toggle-intercept') {
    interceptEnabled = message.enabled;
    sendResponse({ success: true, interceptEnabled });
    return true;
  }

  if (message.type === 'start-download') {
    forwardToADM({
      type: 'new-download',
      url: message.url,
      fileName: message.fileName,
      referrer: sender.tab?.url || '',
    }).then((ok) => sendResponse({ success: ok }));
    return true;
  }
});
