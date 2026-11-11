import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
// @ts-expect-error — module JS sans déclarations de types
import { startServer } from '../server.mjs';

let server: Server;
let base: string;
let dist: string;

beforeAll(async () => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'fp3-dist-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>FP3</title>');
  fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), '{}');
  const started = await startServer({ port: 0, dist });
  server = started.server;
  base = started.url;
});

afterAll(() => {
  server?.close();
  fs.rmSync(dist, { recursive: true, force: true });
});

describe('relais local (server.mjs)', () => {
  it('démarre sur un port libre et répond à /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, video: true });
  });

  it('sert index.html, les fichiers statiques et le fallback SPA', async () => {
    expect(await (await fetch(`${base}/`)).text()).toContain('FP3');
    expect(await (await fetch(`${base}/une/route?x=1`)).text()).toContain('FP3');
    const manifest = await fetch(`${base}/manifest.webmanifest`);
    expect(manifest.headers.get('content-type')).toBe('application/manifest+json');
  });

  it('refuse la sortie du dossier dist', async () => {
    const res = await fetch(`${base}/..%2F..%2Fetc%2Fpasswd`);
    expect([403, 200]).toContain(res.status);
    expect(await res.text()).not.toContain('root:');
  });

  it('refuse les appels /api venant d’un autre site', async () => {
    const res = await fetch(`${base}/api/health`, { headers: { Origin: 'https://site-malveillant.example' } });
    expect(res.status).toBe(403);
    const local = await fetch(`${base}/api/health`, { headers: { Origin: base } });
    expect(local.status).toBe(200);
  });
});
