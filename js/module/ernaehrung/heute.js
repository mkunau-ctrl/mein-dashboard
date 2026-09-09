import { istFaellig } from './zeitplan.js';
import { heute, letzteErledigungVor } from './berechnung.js';
import { setzeLogEintrag } from './daten.js';

const KATEGORIE_TITEL = { ernaehrung: 'Ernährung', supplement: 'Supplemente' };

export async function zeigeHeute(container, zustand) {
  const d = heute();
  const faellige = zustand.items.filter((it) => {
    const k = it.plan_typ === 'intervall'
      ? { letzteErledigung: letzteErledigungVor(it.id, d, zustand.logs) } : {};
    return istFaellig(it, d, k);
  });

  const ring = document.createElement('div');
  ring.className = 'fortschritt-ring';
  container.appendChild(ring);

  const istErledigt = (itemId) =>
    zustand.logs.some((l) => l.datum === d && l.item_id === itemId && l.erledigt);

  function ringNeu() {
    const pflicht = faellige.filter((it) => it.pflicht);
    const erledigt = pflicht.filter((it) => istErledigt(it.id)).length;
    const prozent = pflicht.length ? Math.round((erledigt / pflicht.length) * 100) : 100;
    ring.style.setProperty('--prozent', prozent);
    ring.innerHTML = `<span>${erledigt}/${pflicht.length}</span><small>Tagesziel</small>`;
  }
  ringNeu();

  for (const kategorie of ['ernaehrung', 'supplement']) {
    const punkte = faellige.filter((it) => it.kategorie === kategorie);
    if (punkte.length === 0) continue;
    const gruppe = document.createElement('section');
    gruppe.className = 'heute-gruppe';
    const h = document.createElement('h3');
    h.textContent = KATEGORIE_TITEL[kategorie];
    gruppe.appendChild(h);

    for (const it of punkte) {
      const zeile = document.createElement('label');
      zeile.className = 'heute-zeile';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = istErledigt(it.id);
      box.addEventListener('change', async () => {
        box.disabled = true;
        try {
          await setzeLogEintrag(d, it.id, box.checked);
          const vorhanden = zustand.logs.find((l) => l.datum === d && l.item_id === it.id);
          if (vorhanden) vorhanden.erledigt = box.checked;
          else zustand.logs.push({ datum: d, item_id: it.id, erledigt: box.checked });
          ringNeu();
        } catch (e) {
          box.checked = !box.checked;
          alert(e.message);
        } finally {
          box.disabled = false;
        }
      });
      const text = document.createElement('span');
      text.textContent = it.label;
      zeile.append(box, text);
      gruppe.appendChild(zeile);
    }
    container.appendChild(gruppe);
  }

  if (faellige.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Heute ist nichts fällig.';
    container.appendChild(p);
  }
}
