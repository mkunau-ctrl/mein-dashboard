import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/auto/+esm';
import { heute } from './berechnung.js';
import { setzeGewicht, setzeSetting } from './daten.js';

export async function zeigeGewicht(container, zustand, aktualisieren) {
  const verlauf = [...zustand.gewicht].sort((a, b) => a.datum.localeCompare(b.datum));
  const letzter = verlauf.at(-1)?.gewicht_kg ?? '';
  const groesse = zustand.settings.koerpergroesse_cm ?? '';
  const ziel = zustand.settings.zielgewicht_kg ?? null;

  container.innerHTML = `
    <div class="gewicht-eingabe">
      <label>Heutiges Gewicht (kg)
        <input type="number" step="0.1" id="g-wert" value="${letzter}"></label>
      <button id="g-speichern" type="button">Speichern</button>
    </div>
    <div class="gewicht-eingabe">
      <label>Körpergröße (cm)
        <input type="number" step="1" id="g-groesse" value="${groesse}"></label>
      <button id="g-groesse-speichern" type="button">Merken</button>
    </div>
    <p id="g-bmi" class="g-bmi"></p>
    <div class="g-chart-box"><canvas id="g-chart"></canvas></div>`;

  const wertFeld = container.querySelector('#g-wert');
  const groesseFeld = container.querySelector('#g-groesse');

  function bmiNeu() {
    const g = parseFloat(groesseFeld.value);
    const w = parseFloat(wertFeld.value);
    const el = container.querySelector('#g-bmi');
    el.textContent = (g > 0 && w > 0) ? `BMI: ${(w / ((g / 100) ** 2)).toFixed(1)}` : '';
  }
  bmiNeu();
  wertFeld.addEventListener('input', bmiNeu);
  groesseFeld.addEventListener('input', bmiNeu);

  container.querySelector('#g-speichern').addEventListener('click', async (e) => {
    const w = parseFloat(wertFeld.value);
    if (!(w > 0)) { alert('Bitte gültiges Gewicht eingeben.'); return; }
    e.target.disabled = true;
    try { await setzeGewicht(heute(), w); await aktualisieren(); }
    catch (err) { alert(err.message); e.target.disabled = false; }
  });
  container.querySelector('#g-groesse-speichern').addEventListener('click', async (e) => {
    const g = parseFloat(groesseFeld.value);
    if (!(g > 0)) { alert('Bitte gültige Größe eingeben.'); return; }
    e.target.disabled = true;
    try { await setzeSetting('koerpergroesse_cm', g); await aktualisieren(); }
    catch (err) { alert(err.message); e.target.disabled = false; }
  });

  const labels = verlauf.map((v) => v.datum);
  const datasets = [{
    label: 'Gewicht (kg)', data: verlauf.map((v) => Number(v.gewicht_kg)),
    tension: 0.2, borderColor: '#4f8cff', pointRadius: 3,
  }];
  if (ziel) {
    datasets.push({
      label: 'Ziel', data: labels.map(() => Number(ziel)),
      borderColor: '#9aa4b2', borderDash: [6, 6], pointRadius: 0,
    });
  }
  new Chart(container.querySelector('#g-chart'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: false } },
    },
  });
}
