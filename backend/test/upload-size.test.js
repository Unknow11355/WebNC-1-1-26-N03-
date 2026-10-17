import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import multer from 'multer';
import { normalizeError } from '../src/errors/normalize-error.js';
import { errorHandler } from '../src/middlewares/error-handler.js';

test('Multer file size error maps to safe HTTP 413', () => {
  const result = normalizeError(new multer.MulterError('LIMIT_FILE_SIZE', 'file'));
  assert.equal(result.status, 413);
  assert.equal(result.code, 'PAYLOAD_TOO_LARGE');
  assert.match(result.message, /5 MiB/);
});

test('Unexpected errors remain HTTP 500', () => {
  assert.equal(normalizeError(new Error('private server detail')).status, 500);
});

test('Real multipart request over 5 MiB gets 413 through shared error handler', async () => {
  const app = express();
  app.use((req, res, next) => { req.traceId = 'upload-size-regression'; next(); });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  let reachedController = false;
  app.post('/upload', upload.single('file'), (req, res) => {
    reachedController = true;
    res.status(201).json({ success: true });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 413);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
    assert.equal(body.error.traceId, 'upload-size-regression');
    assert.equal(reachedController, false);
    assert.equal(body.error.stack, undefined);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
