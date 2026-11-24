# Wissen: Design- und 3D-Websites (aus Marks Videos, 2026-11-24)

**Quelle:** 39 Reels, die Mark am 2026-11-24 in die Video-Ablage hochgeladen hat (Tabelle `videos`, Übersicht aller Videos:
`docs/WISSEN-VIDEOS-2026-11-24.md`). Von Claude über Bildtafeln und eingebrannte Untertitel ausgewertet, **der Ton wurde nicht
ausgewertet**. Details wie Preise, Studien und Modellnamen sind Aussagen der Videos, nicht geprüft. Alles in `[Claude]` ist
Claudes eigenes Hintergrundwissen, nicht aus den Videos. Marks Wunsch: „alles Wichtige speichern, vor allem Design- und 3D-Websites“.

## 1. Die wiederkehrenden Muster bei 3D-/Scroll-Websites

| Muster | Beispiele im Material | Kern |
|---|---|---|
| **Scroll-gesteuerter Film (Scroll-Scrubbing)** | Omnya Lab Homes (Video 14), Hochhaus „Jaws“ (Video 16), Power-Washing-Seite (Video 6) | Beim Scrollen läuft ein (KI-generiertes) Video vor/zurück oder Vollbild-Szenen wechseln. Das Haus „wächst“ von Wireframe → Fundament → Wände → Rohbau → wetterfest → Fassade → Details → Innenraum; ein Drohnenflug führt von der Baustelle zum fertigen Turm. Danach ruhige, helle Inhaltsseiten. |
| **Interaktive 3D-Szene mit Zoom-Stufen** | Stadion-Ticketing (Video 18), Wohnturm „The Solenne“ (Video 21) | Außenansicht → Block/Etage → einzelner Sitz/Wohnung → fotorealistischer „Blick von deinem Platz“. Karten mit Preis/Details schweben an der Szene. Wohnturm: klickbare Etagen, isometrische 3D-Grundriss-Schnitte, Räume mit **Tag/Nacht-Regler**. |
| **3D-Produktkonfigurator** | Aura Yachts M12 (Video 17) | Drehbares 3D-Modell, Auswahl Außenfarbe/Rumpf/Polster, Innenraum-360°, Hell/Dunkel, „Hold to compare“. |
| **Vorher/Nachher-Regler** | Power-Washing-Seite (Video 6), Dachdecker-Portal (Video 23) | „Drag it. See the difference.“ Zeigt den Nutzen ohne Text. |
| **3D-Wireframe mit Glas-Beschriftung** | „KI im All“ (Video 10) | Weiße Drahtgitter-Szene, schwebende Milchglas-Karten mit Logos/Titeln, Kamera fliegt zum nächsten Bauteil. |
| **Gewölbte/3D-Oberflächen als Oberfläche** | Launchpad als Kuppel (Video 37) | Apps auf gebogener Fläche, Gruppen als Glaskacheln. |
| **Skizze → 3D** | Fable 5.2 / Opus 5.5 (Videos 12, 13) | Handskizze + Prompt → fotorealistische 3D-/Spielszene bzw. App-Animation. |
| **Interaktive Simulation aus einem Prompt** | Gemini 4 „Argon“ (Video 30) | Wissenschaftliche Visualisierung mit Reglern (Kuramoto-Oszillatoren, Schwarzes-Loch-Verschmelzung, 3D-Landschaft). |

**Gemeinsame Gestaltung dieser Seiten:** dunkle Kinoseite für den Einstieg (Vollbild, wenig Text), danach **helle, ruhige Seiten mit
Serifen-Überschrift** (oft kursiv, z. B. „A landmark shaped around the view“, „Spaces for every rhythm“), wenig Navigation, ein klarer
Knopf („Get a free quote“, „Register interest“). Fester Leistungs-Streifen am unteren Rand mit Bewertung + Anrufen/Text/Angebot (Video 6).

## 2. Anti-KI-Look: so sieht Design aus, das nicht nach KI wirkt (Videos 26, 29, 20)

- **Typische KI-Zeichen (Video 26):** (1) lila Verläufe + Emoji-Icons, (2) Knopf sendet bei Doppeltipp doppelt, (3) **Tastatur verdeckt das
  Eingabefeld** („typing blind“), (4) rohe Fehlertexte („undefined“), (5) Einstellungen gehen beim Schließen verloren.
  „AI can write the code. You still have to make it feel like a product.“
- **Besser (Video 29):** Serifen-Headline, cremeweißer Hintergrund statt lila Verlauf („Build the future with AI“ = Warnsignal), ein warmer
  Akzent (Terrakotta), weniger Karten. Befehl `/impeccable polish the landing page. Remove the AI tells.`
- **Design-Sets (Video 29):** feste Farbpalette + Schrift (z. B. Inter) nach dem Vorbild bekannter Produkte (z. B. Linear), über HeyGen
  „HyperFrames“-Sets, die man Claude gibt.
- **„Unslop“ (Video 20):** Skill von Damir Sokolovsky (@heydamir), macht „vibe-gecodete“ Oberflächen wie vom Senior-Designer (Design-Tokens:
  Gap, Gutter, Padding, Radius, Farben). Funktioniert für Websites und Apps.
- **„Kopiere diese Seiten“ (Video 5):** Claude bekommt eine Referenz-Seite und baut im gleichen Stil, je Aspekt: Apple (Animationen), Duolingo,
  Linear, Pentagram, Muji, Airbnb (Suche und Filter), eine Aesop-artige Seite (Art Direction), Notion, Stripe (Landingpage-Layouts), Framer
  (Micro-Interactions).

## 3. Claude-Skills und Befehle für Design (aus den Videos)

| Name | Wofür | Quelle im Video |
|---|---|---|
| `canvas-design` | Plakate/Grafiken: erst eine **Design-Philosophie** als Textdatei (z. B. „Warme Anziehung“), dann das Plakat als PNG/PDF | Offizielle Sammlung `github.com/anthropics/skills` (Ordner `canvas-design`; weitere dort: `algorithmic-art`, `brand-guidelines`, `doc-coauthoring`, `docx`, `frontend-design`). Aufruf z. B. `/canvas-design Gestalte ein Plakat für meinen Live-Workshop` (Video 3) |
| `frontend-design` | Offizieller Skill für bessere Web-Oberflächen | genannt in derselben Sammlung (Video 3) |
| `stageshow` | UI als Produkt-Showcase mit begründeter Bewegung („every motion has a cause“) | `npx skills add benjitaylor/skills --skill stageshow` (Benji Taylor, Video 19) |
| „Unslop“ | siehe oben | @heydamir (Video 20) |
| `/impeccable polish` | KI-Muster aus einer Seite entfernen | Video 29 |
| `/drone-build` | Foto eines Gebäudes → KI-Drohnenflug-Bauzeitraffer | @mondesirelabs.ai (Video 15) |
| Higgsfield MCP | Claude steuert Videoschnitt/Generierung (Editing Room) | Videos 4, 14 (Marks Higgsfield-Zugang ist im Claude-Werkzeugkasten vorhanden) |

Prompt-Technik für KI-Produktvideos (Video 11): Produktbild + langer Prompt mit Blöcken `[STYLE]` (Kamera/Objektiv, Licht, Bewegung) und
`[REFERENCE BINDING]` („exakte Garment-Identität bewahren: Schnitt, Stoff, Kragen, Knöpfe, Logo“), dazu „Do not reproduce the white
background“, „No strobe, no flicker“.

## 4. UX-Wissen aus den Videos (für Marks Dashboard anwendbar)

- **Gefühlt schnell (Video 24):** Instant-Like (optimistische Anzeige, Server später), **Skeleton-Screen** statt Spinner (1,5 s wirken kürzer),
  verschwommene Vorschau zuerst („nie eine leere Box zeigen“), Fortschrittsbalken langsam starten und schnell enden (Peak-End-Regel), schon
  beim Tippen hochladen, bei Suche die Arbeit zeigen („412 Seiten geprüft“).
- **Labor-Illusion (Video 28):** Wer „Arbeit zeigt“ („Searching 400 airlines …“), wirkt vertrauenswürdiger, auch bei gleichem Ergebnis
  (laut Video eine Harvard-Business-School-Studie, nicht geprüft). Bank: „Checking your details …“.
- **Header-Test (Video 8, Joseph-Joseph-Shop):** Fester Header vs. scrollt weg vs. **versteckt sich beim Runterscrollen und kommt beim Hochscrollen
  zurück**. Gewinner „hides & returns“: +6 % Käufe, +15,5 % Umsatz pro Besucher; „scrolls away“ −13 % In-den-Warenkorb. Regel: nichts darf Foto,
  Preis oder Bewertung verdecken.
- **Paywall-Regeln (Video 25, laut Video aus Daten von 115.000 Apps):** Paywall im Onboarding (Schritt 3), 14 Tage Probezeit (3-Tage-Trials: 55 %
  kündigen am Tag 1), drei Tarife mit **vorausgewähltem Jahresabo** („nur 3,33 €/Monat“), Erinnerung am Tag 12, Knopf „Kostenlos testen“,
  „Jederzeit kündbar“.
- **Navigation (Video 27):** zehn Mobil-Navigationsstile: Liquid Floating Bar, Magnetic Dock, Glass Capsule Dock, Segmented Dynamic Bar, Orbit
  Navigation, Morphing Blob Nav, Cyber Neon Dock, Wave Indicator Nav, Layered Card Navigation, Minimal Luxury Dock. Dashboard (Video 39): helle
  Karten, schmale dunkle Pillen-Navigation mit Tooltips, Hover-Anheben `whileHover y:-5` (framer-motion), Tailwind `glass-card rounded-2xl`.
- **Kundenportal (Video 23, Dachdecker):** Live-Updates am Jobtag, Vorher/Nachher-Slider, Unterschrift + Zahlung (Apple Pay) in der App,
  Bewertungsanfrage (Sterne → „Post to Google“), Dokumente/Garantie, Erinnerung an die Dachkontrolle.

## 5. Geschäft rund um diese Seiten (laut Videos)

Solche Seiten werden an lokale Firmen verkauft: Power-Washing-Seite **2.150 $** (Video 6), Wohnturm-Seite **3.350 $** (Video 21),
Landingpage **3.500 €** (Video 29), Kundenportal für Dachdecker (Video 23). Das passt zu Marks Projekten (Vercel-Projekte
`kunaus-gebaeudeservice` und `berlin-doener-lage-vorschau`).

## 6. Wie man sowas baut `[Claude]` (nicht aus den Videos)

- **Scroll-Scrubbing:** Einzelbilder aus einem KI-Video per ffmpeg ziehen, als `<canvas>`-Bildfolge oder `<video>` mit `currentTime` an die
  Scroll-Position koppeln (GSAP ScrollTrigger oder reines `requestAnimationFrame`). Klein halten (WebP/AVIF, 960 px), nur sichtbare Bilder laden.
- **3D-Szenen/Konfigurator:** Three.js (oder React Three Fiber) mit glTF-Modellen (Draco-komprimiert), Kamera-Animation pro Auswahl,
  Spline als No-Code-Weg. Auf dem Handy Pixelrate begrenzen (`devicePixelRatio` ≤ 2), bei `prefers-reduced-motion` Standbild zeigen.
- **Vorher/Nachher-Regler:** zwei übereinandergelegte Bilder, `clip-path` per `<input type=range>`; zugänglich per Tastatur.
- **Hinweis Marks Regel „Liquid Glass“:** `docs/DESIGN-SYSTEM.md` gilt weiter; neue Seiten für Marks Kundenprojekte (nicht das Dashboard) dürfen
  eigene Gestaltung haben (Regel „neutrale Unterseiten“: nichts verweist aufs Dashboard).

## 7. Was fürs Dashboard abfällt (Vorschläge, nicht umgesetzt)

Skeleton-Screens statt „Lade …“, optimistische Anzeige beim Abhaken/Eintragen, Eingabefelder bei geöffneter Tastatur sichtbar halten
(Suche ist seit 2026-11-24 angepasst), Header/Leiste beim Runterscrollen ausblenden, Doppeltipp-Schutz auf Speichern-Knöpfen, Fehlertexte
verständlich statt roh.
