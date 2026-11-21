import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetProzent, budgetInfo, stufenFarbe, killSwitchHinweis } from '../js/module/ki/budget.js';

test('budgetProzent: begrenzt auf 0..100 und rundet', () => {
  assert.equal(budgetProzent(5, 25), 20);
  assert.equal(budgetProzent(0, 25), 0);
  assert.equal(budgetProzent(30, 25), 100);
  assert.equal(budgetProzent(1, 3), 33);
});

test('budgetProzent: Limit 0 oder ungueltige Werte ergibt 0', () => {
  assert.equal(budgetProzent(5, 0), 0);
  assert.equal(budgetProzent(null, null), 0);
  assert.equal(budgetProzent('kaputt', 25), 0);
  assert.equal(budgetProzent(5, -3), 0);
});

test('budgetInfo: Verbraucht, Limit, Rest und Prozent', () => {
  const info = budgetInfo({ budget_verbraucht_eur: 6.5, budget_limit_eur: 25, budget_stufe: 'OK' });
  assert.equal(info.verbraucht, 6.5);
  assert.equal(info.limit, 25);
  assert.equal(info.rest, 18.5);
  assert.equal(info.prozent, 26);
  assert.equal(info.farbe, 'gruen');
  assert.equal(info.killSwitchAktiv, false);
});

test('budgetInfo: verbraucht ueber Limit zeigt Rest 0 und rote Stufe', () => {
  const info = budgetInfo({ budget_verbraucht_eur: 30, budget_limit_eur: 25, budget_stufe: 'KRITISCH', kill_switch: true });
  assert.equal(info.rest, 0);
  assert.equal(info.prozent, 100);
  assert.equal(info.farbe, 'rot');
  assert.equal(info.killSwitchAktiv, true);
  assert.ok(info.killSwitchHinweis.includes('Kill-Switch'));
});

test('budgetInfo: fehlende Zeile/null liefert neutrale Defaults', () => {
  const info = budgetInfo(null);
  assert.equal(info.verbraucht, 0);
  assert.equal(info.limit, 0);
  assert.equal(info.rest, 0);
  assert.equal(info.prozent, 0);
  assert.equal(info.farbe, 'grau');
  assert.equal(info.killSwitchAktiv, false);
  assert.equal(info.killSwitchHinweis, null);
});

test('stufenFarbe: OK/Warnung/kritisch/unbekannt', () => {
  assert.equal(stufenFarbe('OK'), 'gruen');
  assert.equal(stufenFarbe('WARNUNG'), 'gelb');
  assert.equal(stufenFarbe('KRITISCH'), 'rot');
  assert.equal(stufenFarbe('irgendwas'), 'grau');
  assert.equal(stufenFarbe(null), 'grau');
});

test('killSwitchHinweis: nur bei aktivem Schalter ein Text', () => {
  assert.equal(killSwitchHinweis(false), null);
  assert.equal(killSwitchHinweis(null), null);
  assert.match(killSwitchHinweis(true), /Kill-Switch/);
});
