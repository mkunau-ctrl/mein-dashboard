// Befehlsleiste: Seiten und Aktionen suchen, mit Tastatur bedienbar (Strg/Cmd+K, "/").
const el = (id) => document.getElementById(id);

export function starteBefehlsleiste({ holeEintraege }) {
  const box = el('palette');
  const eingabe = el('palette-eingabe');
  const liste = el('palette-liste');
  let eintraege = [];
  let sichtbar = [];
  let index = 0;
  let zuletztFokus = null;
  const vv = window.visualViewport;
  const handy = window.matchMedia('(max-width: 899px)');

  // Handy: Die Leiste klebt oben und passt sich dem sichtbaren Bereich ueber der Tastatur an.
  // iOS legt die Tastatur UEBER die Seite (Layout-Viewport bleibt gleich); visualViewport sagt,
  // was wirklich sichtbar ist. So stehen Suchfeld und alle Treffer immer oben und nie hinter der Tastatur.
  function passeAnTastaturAn() {
    if (box.hidden) return;
    if (vv && handy.matches && vv.height > 120) { // kleine/unsinnige Werte ignorieren, dann greift das CSS
      box.style.top = `${vv.offsetTop}px`;
      box.style.bottom = 'auto';
      box.style.height = `${vv.height}px`;
    } else {
      box.style.top = box.style.bottom = box.style.height = '';
    }
  }
  if (vv) {
    vv.addEventListener('resize', passeAnTastaturAn);
    vv.addEventListener('scroll', passeAnTastaturAn);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function zeichne() {
    liste.innerHTML = '';
    if (!sichtbar.length) {
      liste.innerHTML = '<p class="palette-leer">Keine Treffer. Versuche einen anderen Begriff.</p>';
      return;
    }
    let letzteGruppe = null;
    sichtbar.forEach((e, i) => {
      if (e.gruppe !== letzteGruppe) {
        letzteGruppe = e.gruppe;
        const kopf = document.createElement('div');
        kopf.className = 'palette-gruppe';
        kopf.textContent = e.gruppe;
        liste.appendChild(kopf);
      }
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = `palette-eintrag${i === index ? ' gewaehlt' : ''}`;
      knopf.setAttribute('role', 'option');
      knopf.dataset.i = String(i);
      knopf.innerHTML = `${e.icon || ''}<span>${esc(e.titel)}</span>${e.hinweis ? `<small>${esc(e.hinweis)}</small>` : ''}`;
      knopf.addEventListener('click', () => waehle(i));
      liste.appendChild(knopf);
    });
    liste.querySelector('.gewaehlt')?.scrollIntoView({ block: 'nearest' });
  }

  function filtere() {
    const q = eingabe.value.trim().toLowerCase();
    sichtbar = q
      ? eintraege.filter((e) => `${e.titel} ${e.gruppe} ${e.stichworte || ''}`.toLowerCase().includes(q))
      : eintraege;
    index = 0;
    zeichne();
  }

  function oeffne() {
    zuletztFokus = document.activeElement;
    eintraege = holeEintraege();
    box.hidden = false;
    passeAnTastaturAn();
    eingabe.value = '';
    filtere();
    setTimeout(() => { eingabe.focus(); passeAnTastaturAn(); }, 0);
  }

  function schliesse() {
    box.hidden = true;
    box.style.top = box.style.bottom = box.style.height = '';
    if (zuletztFokus && typeof zuletztFokus.focus === 'function') zuletztFokus.focus();
  }

  function waehle(i) {
    const e = sichtbar[i];
    if (!e) return;
    schliesse();
    e.aktion();
  }

  eingabe.addEventListener('input', filtere);
  eingabe.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); index = Math.min(index + 1, sichtbar.length - 1); zeichne(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); index = Math.max(index - 1, 0); zeichne(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); waehle(index); }
  });
  box.addEventListener('mousedown', (ev) => { if (ev.target === box) schliesse(); });
  document.addEventListener('keydown', (ev) => {
    const cmdK = (ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k';
    const tippt = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (cmdK || (ev.key === '/' && !tippt && box.hidden)) {
      if (el('dashboard-ansicht').hidden) return;
      ev.preventDefault();
      box.hidden ? oeffne() : schliesse();
    } else if (ev.key === 'Escape' && !box.hidden) {
      schliesse();
    }
  });

  return { oeffne, schliesse };
}
