// Sehr kleiner Markdown-Renderer – reicht für den Infos-Text.
function escape(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function inline(s) {
  return escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function mdZuHtml(md) {
  const zeilen = (md || '').split('\n');
  const out = [];
  let inListe = false;
  const listeZu = () => { if (inListe) { out.push('</ul>'); inListe = false; } };
  for (const z of zeilen) {
    if (/^##\s+/.test(z)) {
      listeZu();
      out.push(`<h3>${inline(z.replace(/^##\s+/, ''))}</h3>`);
    } else if (/^-\s+/.test(z)) {
      if (!inListe) { out.push('<ul>'); inListe = true; }
      out.push(`<li>${inline(z.replace(/^-\s+/, ''))}</li>`);
    } else if (z.trim() === '') {
      listeZu();
    } else {
      listeZu();
      out.push(`<p>${inline(z)}</p>`);
    }
  }
  listeZu();
  return out.join('\n');
}

export async function zeigeInfos(container, zustand) {
  const md = zustand.settings.infos_markdown;
  container.innerHTML = md
    ? `<div class="infos-text">${mdZuHtml(md)}</div>`
    : '<p class="lade">Keine Infos hinterlegt.</p>';
}
