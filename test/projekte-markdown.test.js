import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zuHtml } from '../js/module/projekte/markdown.js';

test('zuHtml: Ueberschriften und Fettschrift werden umgewandelt, HTML wird escaped', () => {
  const html = zuHtml('# Titel\n## Unterabschnitt\n### Klein\nEin **wichtiger** Satz.\n<script>');
  assert.ok(html.includes('<h2>Titel</h2>'));
  assert.ok(html.includes('<h3>Unterabschnitt</h3>'));
  assert.ok(html.includes('<h4>Klein</h4>'));
  assert.ok(html.includes('Ein <strong>wichtiger</strong> Satz.'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('zuHtml: leere Zeilen werden zu Zeilenumbruechen, CRLF wird verstanden', () => {
  const html = zuHtml('Zeile 1\r\n\r\nZeile 2');
  assert.ok(html.includes('<br>'));
  assert.ok(!html.includes('\r'));
});

test('zuHtml: Listenpunkte und Code inline', () => {
  const html = zuHtml('- Punkt mit `npm test`\n  - Unterpunkt');
  assert.ok(html.includes('• Punkt mit <code>npm test</code>'));
  assert.ok(html.includes('• Unterpunkt'));
});
