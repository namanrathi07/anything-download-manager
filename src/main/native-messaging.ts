// ============================================================================
// Anything Download Manager — Browser Integration & WebSocket Server
// ============================================================================

import http from 'http';
import crypto from 'crypto';
import type { Duplex } from 'stream';
import { EventEmitter } from 'events';
import { app } from 'electron';
import { WEBSOCKET_PORT } from '../shared/constants';
import type { BrowserDownloadMessage } from '../shared/types';

export class NativeMessagingHost extends EventEmitter {
  private server: http.Server | null = null;
  private port = WEBSOCKET_PORT;
  private sockets = new Set<Duplex>();

  constructor() {
    super();
    this.startServer();
  }

  public startServer(): void {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/intercept') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1024 * 1024) req.destroy();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            this.handleIncomingDownload(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"status":"ok"}');
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'adm-running', version: app.getVersion() || '1.0.0' }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    this.server.on('upgrade', (req, socket) => {
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

      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${digest}\r\n\r\n`
      );
      this.sockets.add(socket);

      socket.on('data', (buffer: Buffer) => {
        try {
          if (buffer.length < 2) return;
          const opcode = buffer[0] & 0x0f;
          if (opcode === 0x08) {
            socket.end();
            return;
          }
          if (opcode === 0x09) {
            socket.write(Buffer.from([0x8a, 0x00]));
            return;
          }
          if (opcode !== 0x01) return;

          const message = this.decodeWebSocketFrame(buffer);
          if (message) {
            const data = JSON.parse(message);
            this.handleIncomingDownload(data);
          }
        } catch {
          // Ignore malformed frame
        }
      });

      socket.on('close', () => {
        this.sockets.delete(socket);
      });

      socket.on('error', () => {
        this.sockets.delete(socket);
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
    if (data && (data.type === 'new-download' || data.url)) {
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
      if (buffer.length < 4) return null;
      length = buffer.readUInt16BE(2);
      offset += 2;
    } else if (length === 127) {
      if (buffer.length < 10) return null;
      length = Number(buffer.readBigUInt64BE(2));
      offset += 8;
    }

    if (!isMasked) {
      return buffer.subarray(offset, offset + length).toString('utf8');
    }

    if (buffer.length < offset + 4 + length) return null;
    const maskingKey = buffer.subarray(offset, offset + 4);
    offset += 4;

    const payload = buffer.subarray(offset, offset + length);
    const unmasked = Buffer.allocUnsafe(payload.length);
    for (let i = 0; i < payload.length; i++) {
      unmasked[i] = payload[i] ^ maskingKey[i & 3];
    }

    return unmasked.toString('utf8');
  }

  public stop(): void {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
