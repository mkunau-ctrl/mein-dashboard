# Armwrestling-Ranglisten – Entwurf (NICHT freigegeben, noch nichts gebaut)

Stand 2026-11-22, aus dem Brainstorming mit Mark. Kein Code, keine Konten, keine Tabellen angelegt.

## Zweck
Ranglisten für Armwrestling-Matches in Marks Gemeinde. Nur eine Person trägt Matches ein.

## Ranglisten (Leitern)
- Männer: Gewichtsklassen U70, U80, U90, U100, U115, Ü115 × Altersgruppe U16 / Ü16 × Arm rechts / links
  (6 × 2 × 2 = 24 Listen).
- Dazu eine offene Frauen-/Mädchen-Rangliste (egal welches Alter/Gewicht). Offen: ob auch dort rechts/links getrennt – bei Mark nachfragen.
- Ein Match zählt nur in der Liste, die zu Gewichtsklasse des Matches, Altersgruppe und Arm passt. Körpergewicht der Personen ist nur Angabe zum Match.

## Match-Eintrag
Person A und B: Name, Körpergewicht, Alter; Gewichtsklasse des Matches; Arm; Anzahl Runden; Sieger.

## Ranglisten-Regel (Leiter, Marks Worte sinngemäß)
- Neue Person steht ganz unten.
- Gewinnt jemand weiter unten gegen jemanden weiter oben, nimmt er dessen Platz; der Verlierer und alle dazwischen rutschen einen Platz nach unten.
- Gewinnt der höher Platzierte, ändert sich nichts.
- Noch zu klären: Revanche/Wiederholung, Person in mehreren Listen (Gewicht-/Altersklasse), Gleichstand.

## Zugänge (drei Rollen, drei Benutzer mit eigenem Passwort)
| Benutzer (Vorschlag, von Mark bestätigt) | Rolle | Darf |
|---|---|---|
| chef | Admin (Mark) | alles, Benutzer/Passwörter verwalten |
| liste | Listen-Admin (von Mark ermächtigte Person) | Matches eintragen, Listen pflegen |
| zuschauer | Zuschauer (Gemeinde) | alles ansehen, nichts ändern |
Passwörter zufällig erzeugen, nur einmal beim Anlegen zeigen, nie ins Repo. Rollen müssen von der Datenbank erzwungen werden (RLS), nicht nur von der Oberfläche.

## Außenauftritt und Infrastruktur (Marks Entscheidung)
- Nach außen neutral, kein Hinweis auf Marks Dashboard (Name, Links, Texte).
- Gemeinsame Infrastruktur: dasselbe Supabase-Projekt `vogztxoaqbnuciboughd` (Free-Tarif erlaubt nur 2 aktive Projekte), eigene Tabellen und Rollen, strikt getrennt von Marks Privatdaten.
- Eine Adresse, alle Projekte als Unterseiten: Vercel-Projekt `portal-start` (`/` = neutrale Seite "Portal", `/dashboard/` = Dashboard, künftig z. B. `/ranglisten/`). Später echte Domain.
- Im Dashboard soll es später eine Ansicht geben, die zeigt, wie jede dieser Seiten gerade aussieht.
- Vercel-Schutz (SSO) bei `portal-start` muss für die Ranglisten-Seite aus sein.
- Login der Gemeinde: Benutzername + Passwort (Supabase Auth, interne Pseudo-Adressen); Marks Dashboard-Login bleibt getrennt.

## Optik
"Cleaner alter Tafel-Stil, 3D-mäßig" (Marks Worte). Entwürfe zum Anschauen sind der nächste Schritt (Browser-Vorschau noch nicht angeboten/angenommen).

## Offene Entscheidungen
Tafel-Stil/Entwürfe, Frauenliste rechts/links, Sonderfälle der Leiter, Supabase-Rücksprungadresse + Passkey für die neue Adresse (macht Mark im Supabase-Dashboard), Domain.

## Nächste Schritte
Entwürfe zeigen → Design freigeben lassen → Plan (superpowers:writing-plans) → Tabellen + RLS + Benutzer → Seite bauen.
