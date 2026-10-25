// ============================================================================
// Anything Download Manager — Browser Integration & WebSocket Server
// ============================================================================

import http from 'http';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { WEBSOCKET_PORT } from '../shared/constants';
import type { BrowserDownloadMessage } from '../shared/types';

export class NativeMessagingHost extends EventEmitter {
  private server: http.Server | null = null;
  private port = WEBSOCKET_PORT;
  private sockets: any[] = [];

  constructor() {
    super();
    this.startServer();
  }

  public startServer(): void {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      // Enable CORS for browser extension
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Handle simple HTTP POST fallback from extension
      if (req.method === 'POST' && req.url === '/intercept') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            this.handleIncomingDownload(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // Health check endpoint
      if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'adm-running', version: '1.0.0' }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    // WebSocket upgrade handler
    this.server.on('upgrade', (req, socket, head) => {
      if (req.headers['upgrade']?.toLowerCase() !== 'websocket') {
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key) {
        socket.destroy();
        return;
      }

      const digest = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

      const headers = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${digest}`,
      ];

      socket.write(headers.join('\r\n') + '\r\n\r\n');
      this.sockets.push(socket);

      socket.on('data', (buffer: Buffer) => {
        try {
          const message = this.decodeWebSocketFrame(buffer);
          if (message) {
            const data = JSON.parse(message);
            this.handleIncomingDownload(data);
          }
        } catch {
          // ignore corrupted frame
        }
      });

      socket.on('close', () => {
        this.sockets = this.sockets.filter((s) => s !== socket);
      });

      socket.on('error', () => {
        socket.destroy();
      });
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      console.log(`[ADM] Browser extension gateway listening on 127.0.0.1:${this.port}`);
    });

    this.server.on('error', (err: any) => {
      console.warn(`[ADM] Extension gateway port ${this.port} unavailable:`, err.message);
    });
  }

  private handleIncomingDownload(data: any): void {
    if (data.type === 'new-download' || data.url) {
      const msg: BrowserDownloadMessage = {
        type: 'new-download',
        url: data.url,
        fileName: data.fileName || '',
        fileSize: data.fileSize || -1,
        mimeType: data.mimeType || null,
        referrer: data.referrer || '',
        headers: data.headers || {},
        cookies: data.cookies || '',
      };
      this.emit('download-intercepted', msg);
    }
  }

  private decodeWebSocketFrame(buffer: Buffer): string | null {
    if (buffer.length < 2) return null;
    const secondByte = buffer[1];
    const isMasked = (secondByte & 0x80) === 0x80;
    let length = secondByte & 0x7f;
    let offset = 2;

    if (length === 126) {
      length = buffer.readUInt16BE(2);
      offset += 2;
    } else if (length === 127) {
      // 64-bit length
      offset += 8;
    }

    if (!isMasked) {
      return buffer.slice(offset, offset + length).toString('utf8');
    }

    const maskingKey = buffer.slice(offset, offset + 4);
    offset += 4;

    const payload = buffer.slice(offset, offset + length);
    const unmasked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      unmasked[i] = payload[i] ^ maskingKey[i % 4];
    }

    return unmasked.toString('utf8');
  }

  public stop(): void {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets = [];
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
