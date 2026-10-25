#!/usr/bin/env node
// ============================================================================
// Anything Download Manager — Native Messaging Host (stdin/stdout bridge)
// ============================================================================

const http = require('http');

function sendNativeMessage(msg) {
  const buffer = Buffer.from(JSON.stringify(msg));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

let inputBuffer = Buffer.alloc(0);

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    inputBuffer = Buffer.concat([inputBuffer, chunk]);

    while (inputBuffer.length >= 4) {
      const msgLen = inputBuffer.readUInt32LE(0);
      if (inputBuffer.length < 4 + msgLen) break;

      const msgData = inputBuffer.slice(4, 4 + msgLen);
      inputBuffer = inputBuffer.slice(4 + msgLen);

      try {
        const message = JSON.parse(msgData.toString('utf8'));
        // Forward to ADM HTTP endpoint
        const postData = JSON.stringify(message);
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: 28370,
            path: '/intercept',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            },
          },
          (res) => {
            sendNativeMessage({ status: 'ok', statusCode: res.statusCode });
          }
        );

        req.on('error', (err) => {
          sendNativeMessage({ status: 'error', message: err.message });
        });

        req.write(postData);
        req.end();
      } catch (err) {
        sendNativeMessage({ status: 'error', message: err.message });
      }
    }
  }
});
