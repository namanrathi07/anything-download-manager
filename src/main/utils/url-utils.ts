// ============================================================================
// Anything Download Manager — URL Utilities
// ============================================================================

import path from 'path';

/**
 * Validates whether string is a valid HTTP/HTTPS or Magnet URL
 */
export function isValidUrl(urlStr: string): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr);
    return ['http:', 'https:', 'magnet:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Extracts protocol from URL
 */
export function getProtocol(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol.replace(':', '');
  } catch {
    return '';
  }
}

/**
 * Extracts filename from URL path
 */
export function extractFileNameFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const basename = path.basename(pathname);
    if (basename && basename !== '/' && basename.length > 0) {
      // Decode URI components
      const decoded = decodeURIComponent(basename);
      // Remove any trailing query parameters or fragments if attached
      return decoded.split('?')[0].split('#')[0] || 'download';
    }
  } catch {
    // fallback
  }
  return 'download';
}

/**
 * Parses Content-Disposition header to extract filename
 */
export function extractFileNameFromContentDisposition(headerValue?: string): string | null {
  if (!headerValue) return null;

  // Try filename*=UTF-8''... RFC 5987 / RFC 6266
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;\r\n]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      // ignore
    }
  }

  // Try standard filename="..." or filename=...
  const filenameMatch = headerValue.match(/filename="?([^";\r\n]+)"?/i);
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].trim();
  }

  return null;
}

/**
 * Normalizes URL string
 */
export function normalizeUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.toString();
  } catch {
    return urlStr;
  }
}
