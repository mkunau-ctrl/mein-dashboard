import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leseLetztenLauf, schreibeLetztenLauf } from '../automatisierung/letzter-lauf.js';

test('leseLetztenLauf: null wenn Datei fehlt', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'md-test-'));
  const pfad = join(ordner, 'letzter-lauf.json');
  assert.equal(leseLetztenLauf(pfad), null);
  rmSync(ordner, { recursive: true, force: true });
});

test('schreibeLetztenLauf + leseLetztenLauf: Roundtrip', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'md-test-'));
  const pfad = join(ordner, 'letzter-lauf.json');
  schreibeLetztenLauf(pfad, '2026-09-16T07:00:00.000Z');
  assert.equal(leseLetztenLauf(pfad), '2026-09-16T07:00:00.000Z');
  rmSync(ordner, { recursive: true, force: true });
});
