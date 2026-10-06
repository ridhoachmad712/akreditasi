import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('server dapat dimuat melalui require seperti pemuat Hostinger', { timeout: 15000 }, async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sisakprod-require-'));
  const port = await freePort();
  const child = spawn(process.execPath, ['-e', "require('./server.js')"], {
    cwd: project,
    env: { ...process.env, DB_DRIVER: 'sqlite', NODE_ENV: 'test', PORT: String(port),
      SISAKPROD_DATA_DIR: path.join(temp, 'data'), SISAKPROD_UPLOAD_DIR: path.join(temp, 'uploads') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  try {
    let response;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { response = await fetch(`http://127.0.0.1:${port}/api/setup-status`); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 150)); }
    }
    assert.ok(response, `Server tidak mulai: ${stderr}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { needsSetup: true });
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await once(child, 'exit');
    }
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
