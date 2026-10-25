// ============================================================================
// Anything Download Manager — URL Resolver & Shared HTTP Agents
// ============================================================================

import http from 'http';
import https from 'https';
import { URL } from 'url';
import type { UrlInfo } from '../../shared/types';
import { extractFileNameFromContentDisposition, extractFileNameFromUrl } from '../utils/url-utils';
import { sanitizeFileName } from '../utils/file-utils';

export const sharedHttpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 64,
  maxFreeSockets: 16,
  scheduling: 'fifo',
});

export const sharedHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 64,
  maxFreeSockets: 16,
  scheduling: 'fifo',
});

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ADM/1.0';

export class UrlResolver {
  private static MAX_REDIRECTS = 10;
  private static TIMEOUT = 15000;

  public static async resolve(
    targetUrl: string,
    customHeaders: Record<string, string> = {},
    redirectCount = 0
  ): Promise<UrlInfo> {
    if (redirectCount > UrlResolver.MAX_REDIRECTS) {
      throw new Error(`Too many redirects (limit: ${UrlResolver.MAX_REDIRECTS})`);
    }

    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      'User-Agent': DEFAULT_UA,
      Accept: '*/*',
      ...customHeaders,
    };

    return new Promise<UrlInfo>((resolve, reject) => {
      const req = client.request(
        {
          method: 'HEAD',
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: `${parsed.pathname}${parsed.search}`,
          headers: requestHeaders,
          timeout: UrlResolver.TIMEOUT,
          agent: isHttps ? sharedHttpsAgent : sharedHttpAgent,
        },
        async (res) => {
          res.resume();

          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            try {
              return resolve(
                await UrlResolver.resolve(redirectUrl, customHeaders, redirectCount + 1)
              );
            } catch (err) {
              return reject(err);
            }
          }

          if (res.statusCode === 405 || res.statusCode === 501 || res.statusCode === 403) {
            try {
              return resolve(await UrlResolver.resolveWithGetRange(targetUrl, requestHeaders));
            } catch (err) {
              return reject(err);
            }
          }

          if (res.statusCode && res.statusCode >= 400) {
            return reject(
              new Error(`Server responded with status ${res.statusCode} ${res.statusMessage}`)
            );
          }

          const headersObj = UrlResolver.normalizeHeaders(res.headers);
          let fileSize = UrlResolver.parseContentLength(headersObj['content-length']);
          let resumable = headersObj['accept-ranges']?.toLowerCase() === 'bytes';

          let fileName =
            extractFileNameFromContentDisposition(headersObj['content-disposition']) ||
            extractFileNameFromUrl(targetUrl);
          fileName = sanitizeFileName(fileName);

          if (fileSize <= 0) {
            try {
              const fallback = await UrlResolver.resolveWithGetRange(targetUrl, requestHeaders);
              if (fallback.fileSize > 0) fileSize = fallback.fileSize;
              if (fallback.resumable) resumable = true;
              if (fallback.fileName && (!fileName || fileName === 'download')) {
                fileName = fallback.fileName;
              }
            } catch {
              // Keep HEAD metadata
            }
          }

          const mimeType = headersObj['content-type']
            ? headersObj['content-type'].split(';')[0].trim()
            : null;

          resolve({
            url: targetUrl,
            fileName,
            fileSize,
            mimeType,
            resumable,
            headers: headersObj,
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out while resolving URL'));
      });

      req.on('error', reject);
      req.end();
    });
  }

  private static async resolveWithGetRange(
    targetUrl: string,
    headers: Record<string, string>,
    redirectCount = 0
  ): Promise<UrlInfo> {
    if (redirectCount > UrlResolver.MAX_REDIRECTS) {
      throw new Error(`Too many redirects (limit: ${UrlResolver.MAX_REDIRECTS})`);
    }

    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise<UrlInfo>((resolve, reject) => {
      const req = client.request(
        {
          method: 'GET',
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: `${parsed.pathname}${parsed.search}`,
          headers: { ...headers, Range: 'bytes=0-0' },
          timeout: UrlResolver.TIMEOUT,
          agent: isHttps ? sharedHttpsAgent : sharedHttpAgent,
        },
        async (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.destroy();
            const redirectUrl = new URL(res.headers.location, targetUrl).toString();
            try {
              return resolve(
                await UrlResolver.resolveWithGetRange(redirectUrl, headers, redirectCount + 1)
              );
            } catch (err) {
              return reject(err);
            }
          }

          const headersObj = UrlResolver.normalizeHeaders(res.headers);
          let fileSize = -1;
          let resumable = false;

          if (res.statusCode === 206) {
            resumable = true;
            const match = headersObj['content-range']?.match(/\/(\d+|\*)/);
            if (match && match[1] && match[1] !== '*') {
              fileSize = parseInt(match[1], 10);
            }
          } else if (res.statusCode === 200) {
            fileSize = UrlResolver.parseContentLength(headersObj['content-length']);
          }

          let fileName =
            extractFileNameFromContentDisposition(headersObj['content-disposition']) ||
            extractFileNameFromUrl(targetUrl);
          fileName = sanitizeFileName(fileName);

          const mimeType = headersObj['content-type']
            ? headersObj['content-type'].split(';')[0].trim()
            : null;

          res.destroy();

          resolve({
            url: targetUrl,
            fileName,
            fileSize,
            mimeType,
            resumable,
            headers: headersObj,
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out during GET fallback'));
      });

      req.on('error', reject);
      req.end();
    });
  }

  private static normalizeHeaders(raw: http.IncomingHttpHeaders): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v) out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
    }
    return out;
  }

  private static parseContentLength(val?: string): number {
    if (!val) return -1;
    const n = parseInt(val, 10);
    return !isNaN(n) && n >= 0 ? n : -1;
  }
}
