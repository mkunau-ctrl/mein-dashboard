import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/auto/+esm';

const WAAGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M12 13v-3"/></svg>';

export async function zeigeGewicht(container, zustand) {
  const verlauf = [...zustand.gewicht].sort((a, b) => a.datum.localeCompare(b.datum));
  const letzter = verlauf.at(-1)?.gewicht_kg ?? '';
  const groesse = zustand.settings.koerpergroesse_cm ?? '';
  const ziel = zustand.settings.zielgewicht_kg ?? null;
  const bmi = (groesse > 0 && letzter > 0) ? (letzter / ((groesse / 100) ** 2)).toFixed(1) : null;

  container.innerHTML = `
    ${letzter ? `
    <div class="stat-karte gross">
      <div class="stat-kopf">
        <div class="icon-badge">${WAAGE_ICON}</div>
        <small>Aktuelles Gewicht</small>
      </div>
      <span>${Number(letzter).toFixed(1)} kg</span>
      ${ziel ? `<small>Ziel ${Number(ziel).toFixed(1)} kg</small>` : ''}
      ${bmi ? `<small>BMI: ${bmi}</small>` : ''}
    </div>` : ''}
    <div class="g-chart-box"><canvas id="g-chart"></canvas></div>`;

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
