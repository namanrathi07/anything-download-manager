// ============================================================================
// Anything Download Manager — URL Resolver
// ============================================================================

import http from 'http';
import https from 'https';
import { URL } from 'url';
import type { UrlInfo } from '../../shared/types';
import { extractFileNameFromContentDisposition, extractFileNameFromUrl } from '../utils/url-utils';
import { sanitizeFileName } from '../utils/file-utils';

export class UrlResolver {
  private static MAX_REDIRECTS = 10;
  private static TIMEOUT = 15000;

  /**
   * Resolves remote URL information including size, filename, and resumability
   */
  public static async resolve(
    targetUrl: string,
    customHeaders: Record<string, string> = {},
    redirectCount = 0
  ): Promise<UrlInfo> {
    if (redirectCount > UrlResolver.MAX_REDIRECTS) {
      throw new Error(`Too many redirects (limit: ${UrlResolver.MAX_REDIRECTS})`);
    }

    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const requestHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ADM/1.0',
      'Accept': '*/*',
      ...customHeaders,
    };

    return new Promise<UrlInfo>((resolve, reject) => {
      const options: http.RequestOptions = {
        method: 'HEAD',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers: requestHeaders,
        timeout: UrlResolver.TIMEOUT,
      };

      const req = client.request(options, async (res) => {
        // Handle HTTP Redirects (301, 302, 303, 307, 308)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, targetUrl).toString();
          try {
            const redirectedInfo = await UrlResolver.resolve(
              redirectUrl,
              customHeaders,
              redirectCount + 1
            );
            return resolve(redirectedInfo);
          } catch (err) {
            return reject(err);
          }
        }

        // If HEAD is rejected with 405 Method Not Allowed or 403, fallback to GET with Range: bytes=0-0
        if (res.statusCode === 405 || res.statusCode === 501 || res.statusCode === 403) {
          try {
            const fallbackInfo = await UrlResolver.resolveWithGetRange(
              targetUrl,
              requestHeaders
            );
            return resolve(fallbackInfo);
          } catch (err) {
            return reject(err);
          }
        }

        if (res.statusCode && res.statusCode >= 400) {
          return reject(
            new Error(`Server responded with status ${res.statusCode} ${res.statusMessage}`)
          );
        }

        const headersObj: Record<string, string> = {};
        for (const [key, val] of Object.entries(res.headers)) {
          if (val) headersObj[key.toLowerCase()] = Array.isArray(val) ? val.join(', ') : val;
        }

        // Content Length
        let fileSize = -1;
        const contentLengthHeader = headersObj['content-length'];
        if (contentLengthHeader) {
          const parsedSize = parseInt(contentLengthHeader, 10);
          if (!isNaN(parsedSize) && parsedSize >= 0) {
            fileSize = parsedSize;
          }
        }

        // Resumability (Accept-Ranges or Content-Range support)
        const acceptRanges = headersObj['accept-ranges'];
        const resumable = acceptRanges?.toLowerCase() === 'bytes';

        // File name extraction
        const contentDisposition = headersObj['content-disposition'];
        let fileName = extractFileNameFromContentDisposition(contentDisposition);
        if (!fileName) {
          fileName = extractFileNameFromUrl(targetUrl);
        }
        fileName = sanitizeFileName(fileName);

        const mimeType = headersObj['content-type'] ? headersObj['content-type'].split(';')[0].trim() : null;

        resolve({
          url: targetUrl,
          fileName,
          fileSize,
          mimeType,
          resumable,
          headers: headersObj,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out while resolving URL'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }

  /**
   * Fallback for servers that reject HEAD requests: sends GET with Range: bytes=0-0
   */
  private static async resolveWithGetRange(
    targetUrl: string,
    headers: Record<string, string>
  ): Promise<UrlInfo> {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    return new Promise<UrlInfo>((resolve, reject) => {
      const options: http.RequestOptions = {
        method: 'GET',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          ...headers,
          Range: 'bytes=0-0',
        },
        timeout: UrlResolver.TIMEOUT,
      };

      const req = client.request(options, (res) => {
        const headersObj: Record<string, string> = {};
        for (const [key, val] of Object.entries(res.headers)) {
          if (val) headersObj[key.toLowerCase()] = Array.isArray(val) ? val.join(', ') : val;
        }

        let fileSize = -1;
        let resumable = false;

        if (res.statusCode === 206) {
          resumable = true;
          const contentRange = headersObj['content-range'];
          if (contentRange) {
            const match = contentRange.match(/\/(\d+|\*)/);
            if (match && match[1] && match[1] !== '*') {
              fileSize = parseInt(match[1], 10);
            }
          }
        } else if (res.statusCode === 200) {
          // Range not supported, full download requested
          resumable = false;
          if (headersObj['content-length']) {
            fileSize = parseInt(headersObj['content-length'], 10);
          }
        }

        const contentDisposition = headersObj['content-disposition'];
        let fileName = extractFileNameFromContentDisposition(contentDisposition);
        if (!fileName) {
          fileName = extractFileNameFromUrl(targetUrl);
        }
        fileName = sanitizeFileName(fileName);

        const mimeType = headersObj['content-type'] ? headersObj['content-type'].split(';')[0].trim() : null;

        // Abort the rest of the body since we only wanted metadata
        res.destroy();

        resolve({
          url: targetUrl,
          fileName,
          fileSize,
          mimeType,
          resumable,
          headers: headersObj,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out during GET fallback'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }
}
