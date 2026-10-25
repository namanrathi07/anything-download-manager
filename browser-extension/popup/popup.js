// ============================================================================
// Anything Download Manager — Extension Popup Logic
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status-indicator');
  const toggleEl = document.getElementById('intercept-toggle');
  const urlInput = document.getElementById('url-input');
  const downloadBtn = document.getElementById('download-btn');

  // Check connection status with background service worker
  chrome.runtime.sendMessage({ type: 'check-connection' }, (response) => {
    if (response) {
      if (response.connected) {
        statusEl.textContent = 'Connected';
        statusEl.className = 'status-badge connected';
      } else {
        statusEl.textContent = 'Desktop App Closed';
        statusEl.className = 'status-badge disconnected';
      }
      toggleEl.checked = response.interceptEnabled !== false;
    }
  });

  // Toggle interception
  toggleEl.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'toggle-intercept',
      enabled: toggleEl.checked,
    });
  });

  // Send URL to desktop ADM
  downloadBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) return;

    chrome.runtime.sendMessage(
      {
        type: 'start-download',
        url,
      },
      (res) => {
        if (res?.success) {
          urlInput.value = '';
          downloadBtn.textContent = 'Sent to ADM!';
          setTimeout(() => {
            downloadBtn.textContent = 'Send to ADM';
          }, 2000);
        } else {
          downloadBtn.textContent = 'App not running';
          setTimeout(() => {
            downloadBtn.textContent = 'Send to ADM';
          }, 2000);
        }
      }
    );
  });
});
