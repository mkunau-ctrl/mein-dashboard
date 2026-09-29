function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function zuHtml(markdown) {
  return String(markdown).split(/\r?\n/).map((zeile) => {
    if (zeile.startsWith('### ')) return `<h4>${inline(zeile.slice(4))}</h4>`;
    if (zeile.startsWith('## ')) return `<h3>${inline(zeile.slice(3))}</h3>`;
    if (zeile.startsWith('# ')) return `<h2>${inline(zeile.slice(2))}</h2>`;
    if (zeile.trim() === '') return '<br>';
    const punkt = /^(\s*)[-*] (.*)$/.exec(zeile);
    if (punkt) return `<p style="margin:2px 0 2px ${8 + punkt[1].length * 6}px;">• ${inline(punkt[2])}</p>`;
    return `<p>${inline(zeile)}</p>`;
  }).join('\n');
}
