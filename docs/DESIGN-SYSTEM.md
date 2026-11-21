# Design-System „Liquid Glass“ (Stand 2026-11-20)

Quelle der Wahrheit: `app.css` (Tokens ganz oben). Shell: `index.html`, `js/app.js`, Icons/Navigation: `js/icons.js`, Befehlsleiste: `js/palette.js`. Schrift: `fonts/` (Geist, selbst gehostet; auf Apple-Geräten SF).

## Leitidee
Wie bei Apples Keynotes: Inhalte schweben auf durchscheinendem Glas über weichen Farbfeldern. Keine Kästchen mit harten Rändern, keine Ampelfarben. Genau eine Farbe: System-Blau (`--akzent-fill` #0a84ff). Beträge, Status und Punkte sind neutral, das Vorzeichen im Text trägt die Bedeutung.

## Tokens (Auszug)
| Zweck | Variable |
|---|---|
| Glas-Fläche / stark / Feld / Hover | `--glas`, `--glas-stark`, `--glas-feld`, `--glas-hover` |
| Lichtkante, Linien, Blur | `--glas-rand`, `--glas-linie`, `--glas-blur`, `--glas-schatten` |
| Text | `--text`, `--text-2`, `--gedaempft` |
| Akzent | `--akzent`, `--akzent-fill`, `--akzent-bg` |
| Rundungen | `--r-s` 14px, `--r-m` 24px, `--r-l` 32px, Kapseln 999px |
| Diagramm-Reihen | `--serie-1` … `--serie-5` (Blau- und Weiß-Abstufungen) |
| Hintergrund-Farbfelder | `--feld-1` … `--feld-4` |

Alte Variablennamen (`--karte`, `--rand`, `--hm-gruen` …) bleiben aus Kompatibilitätsgründen bestehen, sind aber neutral belegt. Für neue Module nur die neuen Tokens verwenden.

## Regeln für neue Oberflächen
- Eine Fläche = eine Glas-Ebene. Glas nicht in Glas verschachteln (kein zweiter Blur).
- Knöpfe und Eingaben sind Kapseln. Primärer Knopf: blaues Glas mit Lichtkante.
- Listen als zusammenhängende Glasplatte (`.punkt-liste`), Zeilen nur durch feine Linien getrennt.
- Keine Farbe als einzige Bedeutung (Barrierefreiheit): Status immer auch als Text.
- Diagramme nur mit `--serie-*`, nie mit Rot/Grün.
- Bewegung nur sparsam; `prefers-reduced-motion` wird respektiert.

## Navigation
Desktop ab 900 px: schwebende Seitenleiste mit Gruppen (`NAV_GRUPPEN` in `js/icons.js`). Handy: untere Glas-Kapsel mit vier Seiten plus „Mehr“. Befehlsleiste mit Strg/Cmd+K oder „/“.

## Historie
v1 SaaS-Anstrich (verworfen) → v2 „Ledger“ (verworfen, zu kastig) → v3 Liquid Glass (aktuell). Details: `docs/PROJEKT-LOG.md`.
