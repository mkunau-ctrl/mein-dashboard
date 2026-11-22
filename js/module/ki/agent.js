import { chatZustand, pruefeEingabe, chatStatusText } from './chat.js';
import { letzteNachrichten, kurzfassung } from './ansicht.js';
import { istChatbar, statusInfo, kuerze, aufgabenStatusInfo } from './status.js';
import {
  el, karte, leer, euro, agentName, statusPunkt, pille, formHinweis, zeigeAufgabeDetails,
} from './helfer.js';

function zeitWert(aufgabe) {
  const zeit = Date.parse(aufgabe?.aktualisiert_am || aufgabe?.erstellt_am);
  return Number.isFinite(zeit) ? zeit : 0;
}

function kopfKarte(agentNameWert, agent) {
  const box = karte('ki-agent-kopf');
  const zurueck = el('button', 'link-muted', '‹ Übersicht');
  zurueck.type = 'button';
  zurueck.addEventListener('click', () => { location.hash = '#/ki'; });
  box.appendChild(zurueck);

  const titel = el('div', 'ki-agent-titelzeile');
  titel.appendChild(el('h2', 'ki-gross', agentName(agentNameWert)));
  if (agent.titel) titel.appendChild(el('span', 'ki-meta', agent.titel));
  box.appendChild(titel);

  box.appendChild(statusPunkt(statusInfo(agent.status || 'aus')));
  box.appendChild(el('p', 'ki-agent-aufgabe',
    agent.aktuelle_aufgabe ? `Aktuell: ${agent.aktuelle_aufgabe}` : 'Leerlauf'));
  box.appendChild(el('p', 'ki-meta',
    `${agent.offene_aufgaben || 0} offen · ${euro(agent.heute_kosten_eur)} heute`));
  return box;
}

function chatAbschnitt(agentNameWert, zustand, aktionen) {
  const box = karte('ki-chat');
  box.appendChild(el('h2', 'ki-abschnitt', 'Chat'));

  const chatbar = istChatbar(agentNameWert);
  const nachrichten = zustand.chat.filter((z) => z && z.agent === agentNameWert);
  const chat = chatZustand(nachrichten);

  const nurAnsicht = aktionen.nurAnsicht();
  // Nur-Ansicht: nur der letzte Austausch, lange Antworten gekuerzt (Tippen klappt sie auf).
  const sichtbar = nurAnsicht ? letzteNachrichten(chat.verlauf, 2) : chat.verlauf;

  if (chat.verlauf.length === 0) {
    box.appendChild(leer('Noch keine Nachrichten.'));
  } else {
    const verlauf = el('div', 'ki-chat-verlauf');
    if (nurAnsicht && chat.verlauf.length > sichtbar.length) {
      verlauf.appendChild(el('p', 'ki-meta',
        `${chat.verlauf.length - sichtbar.length} ältere Nachrichten ausgeblendet`));
    }
    for (const nachricht of sichtbar) {
      const rolle = nachricht.rolle === 'nutzer' || nachricht.rolle === 'agent' || nachricht.rolle === 'system'
        ? nachricht.rolle : 'system';
      const zeile = el('div', `ki-chat-zeile ki-chat-${rolle}`);
      const schluessel = `chat-${nachricht.id ?? sichtbar.indexOf(nachricht)}`;
      const kurz = nurAnsicht ? kurzfassung(nachricht.text) : { text: nachricht.text || '', gekuerzt: false };
      const aufgeklappt = kurz.gekuerzt && aktionen.istOffen(schluessel);
      zeile.appendChild(el('div', 'ki-chat-text', aufgeklappt ? (nachricht.text || '') : kurz.text));
      if (kurz.gekuerzt) {
        const mehr = el('button', 'link-muted ki-chat-mehr', aufgeklappt ? 'weniger' : 'mehr');
        mehr.type = 'button';
        mehr.addEventListener('click', () => aktionen.toggleKarte(schluessel));
        zeile.appendChild(mehr);
      }
      if (rolle === 'nutzer' && nachricht === chat.letzterNutzer) {
        zeile.appendChild(el('span', 'ki-chat-status', chatStatusText(nachricht.status)));
      }
      verlauf.appendChild(zeile);
    }
    box.appendChild(verlauf);
  }

  if (chat.wartetAufAntwort) {
    box.appendChild(el('p', 'ki-chat-laden', 'AURORA arbeitet …'));
  }

  if (nurAnsicht) {
    box.appendChild(el('p', 'ki-meta', 'Nur-Ansicht: Senden ist ausgeschaltet.'));
    return box;
  }

  if (!chatbar) {
    box.appendChild(leer('Der Monitor ist reiner Beobachter und kann nicht angeschrieben werden.'));
    return box;
  }

  const form = el('form', 'ki-chat-form');
  const feld = document.createElement('textarea');
  feld.id = 'ki-chat-text';
  feld.rows = 2;
  feld.placeholder = `Nachricht an ${agentName(agentNameWert)} …`;
  feld.value = aktionen.entwurf('chat') || '';
  feld.addEventListener('input', () => aktionen.setEntwurf('chat', feld.value));
  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.appendChild(feld);

  const hinweis = formHinweis();
  const knopf = el('button', 'ki-knopf', 'Senden');
  knopf.type = 'submit';
  form.appendChild(knopf);

  let sendet = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sendet) return;
    const pruefung = pruefeEingabe(feld.value);
    if (!pruefung.ok) {
      hinweis.textContent = pruefung.fehler;
      hinweis.classList.add('ki-fehler-text');
      return;
    }
    sendet = true;
    knopf.disabled = true;
    hinweis.classList.remove('ki-fehler-text');
    hinweis.textContent = 'Wird gesendet …';
    aktionen.setEntwurf('chat', '');
    try {
      await aktionen.sendeChat(agentNameWert, pruefung.text);
    } catch (fehler) {
      sendet = false;
      knopf.disabled = false;
      aktionen.setEntwurf('chat', pruefung.text);
      if (feld.isConnected) feld.value = pruefung.text;
      hinweis.textContent = `Fehler: ${fehler.message}`;
      hinweis.classList.add('ki-fehler-text');
    }
  });

  box.appendChild(form);
  box.appendChild(hinweis);
  box.appendChild(el('p', 'ki-meta', 'Enter sendet, Shift+Enter macht einen Zeilenumbruch.'));
  return box;
}

function aufgabenAbschnitt(agentNameWert, zustand, aktionen) {
  const box = karte();
  box.appendChild(el('h2', 'ki-abschnitt', 'Aufgaben'));

  const aufgaben = zustand.aufgaben
    .filter((a) => a && a.agent === agentNameWert)
    .sort((a, b) => zeitWert(b) - zeitWert(a))
    .slice(0, 20);

  if (aufgaben.length === 0) {
    box.appendChild(leer('Noch keine Aufgaben.'));
    return box;
  }

  const liste = el('div', 'ki-aufgaben');
  aufgaben.forEach((aufgabe, index) => {
    const schluessel = aufgabe.id ?? `ohne-id-${index}`;
    const eintrag = el('div', 'ki-aufgabe');
    const kopf = el('button', 'ki-aufgabe-kopf');
    kopf.type = 'button';
    kopf.appendChild(pille(aufgabenStatusInfo(aufgabe.status)));
    kopf.appendChild(el('span', 'ki-aufgabe-text', kuerze(aufgabe.eingabe || '—', 80)));
    kopf.appendChild(el('span', 'ki-meta', euro(aufgabe.kosten_eur)));
    kopf.addEventListener('click', () => aktionen.toggleKarte(schluessel));
    eintrag.appendChild(kopf);
    if (aktionen.istOffen(schluessel)) {
      zeigeAufgabeDetails(eintrag, aufgabe);
    }
    liste.appendChild(eintrag);
  });
  box.appendChild(liste);
  return box;
}

export function zeigeKi(inhalt, zustand, agentNameWert, aktionen) {
  const agent = zustand.agenten.find((a) => a && a.agent === agentNameWert)
    || { agent: agentNameWert, status: 'aus', offene_aufgaben: 0, heute_kosten_eur: 0 };
  inhalt.appendChild(kopfKarte(agentNameWert, agent));
  inhalt.appendChild(chatAbschnitt(agentNameWert, zustand, aktionen));
  inhalt.appendChild(aufgabenAbschnitt(agentNameWert, zustand, aktionen));
}
