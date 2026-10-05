import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('akun lama mendapat username unik tanpa kehilangan email dan password', () => {
  const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sisakprod-migration-'));
  const dataDir = path.join(temp, 'data');
  fs.mkdirSync(dataDir);
  const file = path.join(dataDir, 'sisakprod.sqlite');
  try {
    const before = new DatabaseSync(file);
    before.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const insert = before.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)');
    insert.run('Tim Satu', 'tim@satu.test', 'hash-1', 'team');
    insert.run('Tim Dua', 'tim@dua.test', 'hash-2', 'team');
    before.close();

    const script = `import ${JSON.stringify(pathToFileURL(path.join(project, 'db.js')).href)};`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: project, env: { ...process.env, SISAKPROD_DATA_DIR: dataDir }, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);

    const after = new DatabaseSync(file, { readOnly: true });
    try {
      const users = after.prepare('SELECT username,email,password_hash FROM users ORDER BY id').all();
      assert.deepEqual(users.map(u => u.username), ['tim', 'tim-2']);
      assert.deepEqual(users.map(u => u.email), ['tim@satu.test', 'tim@dua.test']);
      assert.deepEqual(users.map(u => u.password_hash), ['hash-1', 'hash-2']);
    } finally { after.close(); }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
