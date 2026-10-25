// ============================================================================
// Anything Download Manager — Content Script
// ============================================================================

(function () {
  const DOWNLOAD_EXTENSIONS = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.iso',
    '.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage',
    '.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac', '.wav',
    '.pdf', '.epub', '.torrent'
  ];

  let floatingButton = null;

  function createFloatingButton() {
    if (floatingButton) return;

    floatingButton = document.createElement('div');
    floatingButton.id = 'adm-hover-button';
    floatingButton.textContent = '⚡ Download with ADM';
    Object.assign(floatingButton.style, {
      position: 'absolute',
      zIndex: '2147483647',
      display: 'none',
      padding: '4px 10px',
      background: '#2563eb',
      color: '#ffffff',
      fontSize: '11px',
      fontWeight: '600',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      borderRadius: '6px',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      transition: 'opacity 0.15s ease, transform 0.15s ease',
      transform: 'translateY(-2px)',
      userSelect: 'none',
    });

    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.background = '#1d4ed8';
    });
    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.background = '#2563eb';
    });

    document.body.appendChild(floatingButton);
  }

  function isDownloadableUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.href);
      const pathname = parsed.pathname.toLowerCase();
      return DOWNLOAD_EXTENSIONS.some((ext) => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  // Hover detection over downloadable links
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a');
    if (!target || !isDownloadableUrl(target.href)) {
      return;
    }

    createFloatingButton();
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    floatingButton.style.top = `${rect.top + scrollY - 28}px`;
    floatingButton.style.left = `${rect.left + scrollX}px`;
    floatingButton.style.display = 'block';

    floatingButton.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      chrome.runtime.sendMessage({
        type: 'start-download',
        url: target.href,
        fileName: target.download || '',
      });
      floatingButton.style.display = 'none';
    };
  });

  document.addEventListener('mousemove', (e) => {
    if (!floatingButton || floatingButton.style.display === 'none') return;
    const btnRect = floatingButton.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - (btnRect.left + btnRect.width / 2), e.clientY - (btnRect.top + btnRect.height / 2));
    if (dist > 80) {
      floatingButton.style.display = 'none';
    }
  });

  // Scan for HTML5 video elements and inject download panel
  function scanMediaElements() {
    const mediaTags = document.querySelectorAll('video, audio');
    mediaTags.forEach((el) => {
      if (el.dataset.admInjected) return;
      el.dataset.admInjected = 'true';

      const parent = el.parentElement;
      if (!parent) return;

      const badge = document.createElement('div');
      badge.textContent = '⬇ Download Video';
      Object.assign(badge.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: '99999',
        background: 'rgba(37, 99, 235, 0.9)',
        backdropFilter: 'blur(4px)',
        color: '#fff',
        padding: '5px 10px',
        fontSize: '11px',
        fontWeight: 'bold',
        borderRadius: '6px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      });

      badge.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const src = el.currentSrc || el.src;
        if (src) {
          chrome.runtime.sendMessage({
            type: 'start-download',
            url: src,
            fileName: document.title || 'video.mp4',
          });
        }
      };

      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(badge);
    });
  }

  // Observe dynamically loaded video players
  const observer = new MutationObserver(() => scanMediaElements());
  observer.observe(document.body, { childList: true, subtree: true });
  scanMediaElements();
})();
