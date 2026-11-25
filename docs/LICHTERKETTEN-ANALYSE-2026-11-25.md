# Lichterketten-Marktanalyse: lang, hell, günstig

**Recherchedatum: 25.11.2026** · kritische, unabhängige Analyse, keine Werbung · Ablage: `docs/LICHTERKETTEN-ANALYSE-2026-11-25.md`

**So sind die Daten gekennzeichnet (bitte beachten):**

- **[GEPRÜFT]** = Seite am 25.11.2026 selbst geöffnet und gelesen.
- **[INDEX]** = Wert aus dem Suchindex. Die Seite selbst konnte ich nicht öffnen, der Wert kann veraltet sein.
- **[RECHNUNG]** = von mir berechnet, Annahmen stehen dabei.
- **[SCHÄTZUNG]** = Annahme, ausdrücklich unsicher.
- **unbekannt / n. a.** = nicht ermittelbar. Ich habe nichts erfunden.

---

## 1. Ergebnis in Kürze

1. **100 m sind billig, aber dunkel.** UISEBRT und Quntis geben für ihre 100-m-Kette (31-V-Trafo, 1000 LEDs, 10 cm Abstand) nur **6 W** an (NAIZY nennt keine Leistung). Das ergibt grob **180–420 lm für die ganze Kette, also 2–4 lm je Meter** [SCHÄTZUNG]. Die Stiftung Warentest hat 2015 bei 20-m-Ketten 6,5 und 14,2 lm/m gemessen [GEPRÜFT]. Eine 100-m-Kette ist Dekoration, keine Beleuchtung.
2. **Belegte Preise (EU-Händler):** 100 m kosten ca. **26 €** (eBay, deutscher Händler) bis **31 €** (Kaufland) [INDEX]. OBI verlangt **34,99 €** für **79,92 m** beleuchtete Länge [GEPRÜFT]. AliExpress und Alibaba zeigen deutlich weniger (Alibaba ab 13,42 $ ohne Versand und MwSt., AliExpress-Listenansicht 0,99 € Aktionspreis gegen 21,67 € Streichpreis) [INDEX]. **Diese Seiten ließen sich nicht öffnen, die Preise sind ungeprüft.**
3. **Mehr Licht pro Euro** liefern dichte 1.500-LED-Ketten: Action 22,95 € [INDEX], Aldi 24,99 € [INDEX]. Sie haben 50 statt 10 LEDs je Meter. Rechnerisch ergibt das etwa **1,7-mal mehr Licht je Euro** und etwa **5-mal mehr Licht je Meter** als die 100-m-Klasse [SCHÄTZUNG], aber nur 30 m Länge.
4. **Haltbarkeit ist die Schwachstelle.** Bei UISEBRT, Quntis, NAIZY und Gresonic sind **67–87 % der Haltbarkeits-Kommentare negativ**, obwohl alle 4,4–4,5 Sterne haben [GEPRÜFT]. 1,3–3,6 % aller Bewertenden schreiben eine negative Haltbarkeits-Aussage. Ausfälle kommen oft erst nach 9–13 Monaten und fehlen deshalb in frühen Rezensionen.
5. **Marktplatz-Risiko ist real, aber nicht lichterkettenspezifisch belegt.** Stiftung Warentest (30.10.2025): 110 von 162 Temu/Shein-Produkten erfüllten die EU-Standards nicht [GEPRÜFT]. Die EU-Kommission verhängte im Mai 2026 200 Mio. € Strafe gegen Temu [GEPRÜFT]. Tests speziell zu Lichterketten von Temu, AliExpress oder SHEIN habe ich nicht gefunden.
6. **Direktimport lohnt rechnerisch erst ab etwa 500 Sets** (Seefracht als Sammelladung). Darunter ist er nicht günstiger als der eBay-Preis [RECHNUNG].
7. **Seit 1.7.2026 gilt ein EU-Pauschalzoll von 3 € je Warenkategorie** bei Sendungen unter 150 € [GEPRÜFT]. Mehrere Lichterketten gehören in **ein** Paket.
8. **Wichtigste Einschränkung:** AliExpress, Temu, SHEIN, eBay, Kaufland, Action, Aldi und Alibaba sperren automatische Abrufe. Ich habe diese Sperren nicht umgangen. Geprüft habe ich OBI, die Amazon-Seiten (ohne Euro-Preis) und die Test- und Behördenseiten. Alles andere stammt aus dem Suchindex.

---

## 2. Datenlage: was ich prüfen konnte und was nicht

| Quelle | Zugriff | Befund am 25.11.2026 | Verwendung |
|---|---|---|---|
| OBI | ja | Produktseite gelesen | [GEPRÜFT] |
| Amazon.de | teilweise | Seiten laden. Der Recherche-Standort liegt in den USA: Die Seite zeigt "Versand nach Vereinigte Staaten", Preise nur in USD und weist die Lieferung an diesen Standort ab, deshalb fehlt der Euro-Preis. Technische Daten, Sterne und Rezensionsthemen waren lesbar | Daten und Bewertungen [GEPRÜFT], Preise nicht ermittelbar |
| eBay.de | nein | 403 "Error Page" | [INDEX] |
| Kaufland | nein | "Zugriff blockiert" | [INDEX] |
| Action | nein | Cloudflare-Prüfseite | [INDEX] |
| Aldi Süd | nein | 403 | Presseberichte und [INDEX] |
| AliExpress | nein | Bot-Prüfseite (Slider-Challenge) | [INDEX] |
| Temu | Seite lädt, aber nur eine leere JavaScript-Hülle. Der getestete Artikel war "abgekündigt" | keine Produktdaten | [INDEX] |
| SHEIN | nein | Weiterleitung auf Captcha | [INDEX] |
| Alibaba | nein | JavaScript-Hülle ohne Inhalt | [INDEX] |
| test.de, Öko-Test, EU-Kommission, Temu-Richtlinie | ja | Seiten gelesen | [GEPRÜFT] |
| Verbraucherzentrale | nein | 403 | [INDEX] |

**Wichtig für deine eigene Prüfung:** Preise auf AliExpress, Temu und SHEIN sind personalisiert (Neukundenrabatt, Gutscheine, Standort). Ein Roboter sieht nie *deinen* Preis. Prüfe die Preise deshalb am Handy. Die Suchbegriffe stehen in Abschnitt 13.

Für die Recherche habe ich in der Cloud-Umgebung eine eigene Netzwerk-Freigabe (15 Hosts, Umgebung "Shop-Recherche Preisvergleich") angelegt. Deine Default-Umgebung ist unverändert.

---

## 3. Methode und Annahmen

- **Beleuchtete Länge** = (LED-Zahl − 1) × LED-Abstand. Beispiel OBI: 999 × 8 cm = 79,9 m (OBI nennt 79,92 m [GEPRÜFT]). Zuleitungen ohne LEDs zähle ich nicht mit.
- **Gesamtlänge ist nicht beleuchtete Länge.** Beispiele aus den Angeboten: Gresonic "20 m" = 10 m leuchten + 10 m Zuleitung. Nipach-Büschelkette "30 m" enthält ca. 10 m Zuleitung. Action "35 m" = 30 m + 5 m Kabel. AMARE "30 m (+5 m Zuleitung)". Die 100-m-Ketten von UISEBRT, Quntis und NAIZY haben 3 m Zuleitung vor der ersten LED.
- **Helligkeit:** Kein einziges Angebot nennt Lumen. Ich schätze den Lichtstrom als **Leistung × 30–70 lm/W** [SCHÄTZUNG]. Referenz sind die Messwerte der Stiftung Warentest 12/2015 [GEPRÜFT]:
  - Dehner, 100 LEDs, 19,8 m beleuchtet: 128 lm bei 4 W, also 32 lm/W, 6,5 lm/m.
  - Konstsmide, 120 LEDs, 19,6 m beleuchtet: 279 lm bei 8 W, also 35 lm/W, 14,2 lm/m.
- **Leistung der 1.500-LED-Ketten:** nicht angegeben. Ich setze 9 W an (6 mW je LED wie bei den geprüften 6-W-Ketten mit 1000 LEDs) [SCHÄTZUNG].
- **Preis-Leistungs-Verhältnis** nach deiner Formel: beleuchtete Länge × Helligkeit ÷ Gesamtpreis. Ich nehme als Helligkeit lm je Meter. Das Ergebnis sind dann **Lumen je Euro**. Getrennt weise ich **Meter je Euro** aus, weil beide Größen verschiedene Sieger haben.
- **Strom:** 0,35 €/kWh [Annahme]. Eine 6-W-Kette kostet damit 2,10 € je 1.000 Betriebsstunden, eine 9-W-Kette 3,15 €. Die Stromkosten spielen gegenüber dem Kaufpreis praktisch keine Rolle.
- **Wechselkurs:** 1 € = 1,15 $ [Annahme].

---

## 4. Die Produktklassen

| Klasse | Typisch | LEDs je m | Preisniveau | Licht je Meter [SCHÄTZUNG] |
|---|---|---|---|---|
| **A: 100-m-Mikro-LED-Kette** (31-V-Trafo, IP44) | 1000 LEDs, 10 cm Abstand, 6 W | 10 | 26–35 € bei EU-Händlern | 2–4 lm/m |
| **B: dichte Kette** | 1500 LEDs auf 30 m, ca. 9 W | 50 | 22,95–24,99 € (Action, Aldi) | 9–21 lm/m |
| **C: Büschel-Kette** (Nipach) | 1000 LEDs auf ca. 20 m, 6 W | ca. 50 | Preis unbekannt | 9–21 lm/m |
| **D: USB-, Solar-, Batterie-Kette** (typisch Temu, SHEIN) | 50–300 LEDs, 5 V | gering | wenige Euro | niedrig, Länge begrenzt, nicht erweiterbar |
| **E: Glühbirnen-Girlande** (E27, G40) | 15 m mit ca. 25 Fassungen | je Birne | eBay 22,89–25,99 € je 15-m-Set [INDEX], Kaufland Ledvion 54,95–74,95 € [INDEX], Leuchtmittel teils extra | deutlich hell (Lumen je Birne nicht belegt) |
| **F: 230-V-LED-Band** (Temu: 120 LEDs/m, EU-Stecker) | Band mit Netzspannung | 120 | Preis nicht ermittelbar | sehr hell, aber Stromschlag- und Brandrisiko bei Beschädigung |

**Warum 100 m nicht zehnmal so viel Licht sind wie 10 m:** Die geprüften Ketten haben pro 1000 LEDs denselben 6-W-Trafo. Die Gesamtleistung bestimmt das Licht. Mehr Länge verteilt dieselbe Lichtmenge nur dünner. Auf 100 m verteilt entspricht die geschätzte Gesamtmenge von 180–420 lm etwa einer einzigen 25–40-W-Glühlampe (Faustwerte 220–430 lm).

**Erweiterbarkeit:** Jede 100-m-Kette braucht eine eigene Steckdose (Trafo am Anfang). Weitere Ketten lassen sich nicht an denselben 6-W-Trafo hängen.

---

## 5. Vergleichstabelle (17 Angebote)

Helligkeit = Leistung und daraus geschätzter Lichtstrom (Leistung × 30–70 lm/W). Risiko = Gesamtrisiko 1–10, dass du Geld für schlechte oder unsichere Ware ausgibst. Die Begründung steht in Abschnitt 8.

| # | Produkt | Anbieter | Länge (beleuchtet) | LEDs | Helligkeit | Gesamtpreis | €/m | Qualität | Risiko | Link |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | LED-Lichterkette 1000 LEDs warmweiß, grünes Kabel, Timer (Art. 2927747), 31 V | OBI | 79,92 m (+5 m Zuleitung) | 1000 (12,5/m, 8 cm) | Leistung nicht angegeben, bei 6 W ca. 180–420 lm | **34,99 €** [GEPRÜFT], nur "Reservieren & Abholen", Heimlieferung derzeit nicht möglich | 0,44 | 4,2 ★ (nur 6 Bewertungen) | 3 | [OBI](https://www.obi.de/p/2927747/led-lichterkette-1000-leds-warmweiss-gruenes-kabel-mit-timer-funktion) |
| 2 | UISEBRT 100 m (F0302), 31 V | Amazon.de | 100 m (+3 m) | 1000 (10/m) | 6 W, ca. 180–420 lm | Euro-Preis nicht abrufbar | n. a. | 4,4 ★ (985). Haltbarkeit: 28 von 36 Nennungen negativ | 5 | [Amazon](https://www.amazon.de/dp/B08JP7RVSQ) |
| 3 | Quntis 100 m warmweiß, 31 V | Amazon.de | 100 m (+3 m) | 1000 (10 cm) | 6 W, ca. 180–420 lm | n. a. | n. a. | 4,5 ★ (2.605). Haltbarkeit: 33 von 38 negativ | 5 | [Amazon](https://www.amazon.de/dp/B08DKQ2J6Q) |
| 4 | Quntis 100 m bunt | Amazon.de | 100 m (+3 m) | 1000 | 6 W, ca. 180–420 lm | n. a. | n. a. | 4,5 ★ (geteilte Bewertungen). Farbgebung 18 von 50 negativ | 5 | [Amazon](https://www.amazon.de/dp/B08DKNMDTF) |
| 5 | NAIZY 100 m | Amazon.de | 100 m (+3 m) | 1000 (10 cm) | Leistung nicht angegeben | n. a. | n. a. | 4,4 ★ (1.108). Haltbarkeit: 33 von 49 negativ | 5 | [Amazon](https://www.amazon.de/dp/B07X84WSZ6) |
| 6 | Gresonic 100 LED (Listing "20 m"), 31 V | Amazon.de | 10 m leuchten + 10 m Zuleitung | 100 (10/m) | 3,6 W laut Text, 2 W laut Datenblatt (Widerspruch), ca. 110–250 lm | n. a. | n. a. | 4,4 ★ (2.495). Haltbarkeit: 89 von 126 negativ, LEDs nach 9–13 Monaten defekt | 6 | [Amazon](https://www.amazon.de/dp/B06XDLS489) |
| 7 | Nipach LED-Büschelkette 1000 LED, Außen-Trafo, 6-h-Timer (Titel "25 m", Beschreibung "30 m inkl. ca. 10 m Zuleitung") | Amazon.de (Nipach GmbH) | ca. 20 m (+10 m) | 1000 (ca. 50/m) | 6 W, ca. 180–420 lm | n. a. | n. a. | 4,5 ★ (146) | 4 | [Amazon](https://www.amazon.de/dp/B075FQQ98P) |
| 8 | AMARE 1000 LED, 30 m (+5 m), Fernbedienung, Timer, Dimmer | Amazon.de | 30 m | 1000 (33/m, 3 cm) | 6 W, ca. 180–420 lm | n. a. | n. a. | 4,3 ★ (85) | 4 | [Amazon](https://www.amazon.de/dp/B07YCVL4QH) |
| 9 | SHS 300 LED kaltweiß, 10 m Zuleitung, "DEKRA GS-geprüft" (nur im Titel) | Amazon.de (Nipach GmbH) | unbekannt | 300 | unbekannt | n. a. | n. a. | 4,3 ★ (25) | 4 (GS-Angabe nicht verifiziert) | [Amazon](https://www.amazon.de/dp/B077TWYRJJ) |
| 10 | Noname 100 m, 600 oder 1000 LED, "Markenlos" | eBay.de (Händler in Frankfurt) | 100 m | 600 oder 1000 | Leistung unbekannt | **25,98 €** inkl. MwSt., Versand 0 € [INDEX] | 0,26 | keine Daten | 5 | [eBay](https://www.ebay.de/itm/128150345193) |
| 11 | XMTECH 100 m, 1000 LED, 8 Modi | Kaufland Marktplatz (Händler HKGaga) | 100 m (+3 m) | 1000 | Leistung unbekannt | **31,44 €** [INDEX], älterer Stand 37,99 € (2023) | 0,31 | 4,7 ★ (10 Bewertungen) | 6 | [Kaufland](https://www.kaufland.de/product/443175167/) |
| 12 | Weihnachtsbeleuchtung 1.500 LEDs, Netzbetrieb, 8 Effekte, 6-h-Timer | Action | 30 m (+5 m Kabel) | 1500 (50/m) | Leistung unbekannt, bei 9 W ca. 270–630 lm | **22,95 €** [INDEX] (älterer Stand 19,95 €) | 0,77 | keine Daten | 3 | [Action](https://www.action.com/de-de/p/3001485/weihnachtsbeleuchtung/) |
| 13 | Home Creation LED-Lichterkette 1.500 LEDs, IP44 laut Prospekt, Timer, Dimmer, 8 Modi | Aldi Nord (ab 5.11.), Aldi Süd (ab 19.11.) | ca. 30 m (Galaxy-Variante ca. 24 m) | 1500 | Leistung unbekannt | **24,99 €** [INDEX, Presse; Jahr im Treffer nicht eindeutig], Aktionsware, Bestand ungeprüft | 0,83 | keine Daten | 3 | [GIGA-Bericht](https://www.giga.de/tech/diese-lichterkette-mit-1-500-leds-bei-aldi-sorgt-naechste-woche-garantiert-fuer-weihnachtsstimmung--01M5HK97D0FES3FBE5X4ZJA1ZB) |
| 14 | 100 m, 1000 LED, 220 V, EU-Stecker, warmweiß, MOQ 1 | Alibaba (Händler unbekannt) | 100 m | 1000 | unbekannt | 13,42–13,75 $ (ca. 11,7–12,0 €) ohne Versand und MwSt. [INDEX] | ca. 0,12 | keine Daten | 6 | [Alibaba](https://www.alibaba.com/showroom/100m-1000-leds-christmas-string-lights.html) |
| 15 | "100–1000 LED, 220 V EU Plug", Längen 10–100 m wählbar | AliExpress | 10–100 m | 100–1000 | unbekannt | 0,99 € (Aktions- oder Einstiegspreis) gegen Streichpreis 21,67 € [INDEX]. In der Listenansicht auf aliexpress.us: 3,20 $ statt 27,93 $, 4,8 ★, 183 verkauft | 0,01–0,22 | 4,8 ★ (183 verkauft, Listenansicht) | 7 | [AliExpress](https://de.aliexpress.com/w/wholesale-100-1000-led-lichterkette.html) |
| 16 | USB 50–200 LED, Solar 50–300 LED, 220-V-Band 120 LEDs/m | Temu | meist 5–30 m | 50–300 | niedrig (USB, Solar) | keine Preise ermittelbar | n. a. | keine Daten | 6 | [Temu Außen-Lichterketten](https://www.temu.com/de/led-lichterkette-f%C3%BCr-den-au%C3%9Fenbereich-5040302774125-s.html) |
| 17 | 50/100 LED, 5/10 m, "wasserfest, 8 Modi" | SHEIN | 5–10 m | 50–100 | niedrig | 6,75 € [INDEX], Stromart unbekannt | 0,68–1,35 | keine Daten | 6 | [SHEIN](https://m.shein.com/de/50/100-Led-5/10m-Waterproof-8-Modes-String-Light-p-7324697-cat-3386.html) |

**Zu Temu:** Im Suchindex fand ich keine netzbetriebene Langkette (20–100 m, EU-Stecker, Trafo). Die Treffer waren USB-, Solar- und Batterie-Ketten sowie ein 230-V-Band. Ob Temu eine echte Langkette führt, konnte ich nicht klären.

### Preise nach deiner Unterscheidung (nur 100-m-Klasse)

| Kanal | Regulärer Preis | Angebots- oder Neukundenpreis | Realistisch erreichbar |
|---|---|---|---|
| eBay.de (Händler Frankfurt) | 25,98 € [INDEX], "Preisvorschlag" bei manchen Angeboten möglich | kein Neukundenpreis bekannt | 25–27 € [INDEX] |
| Kaufland Marktplatz | 31,44 € [INDEX] | – | ca. 31 € |
| OBI | 34,99 € [GEPRÜFT] | – | 34,99 € (nur Abholung) |
| AliExpress | 21,67 € (Streichpreis) [INDEX] | 0,99 € (wirkt wie Aktions- oder Neukundenpreis, nicht belegt) | unbekannt, [SCHÄTZUNG] 10–20 € |
| Alibaba | 13,42–13,75 $ [INDEX], MOQ 1 | – | ohne Versand und MwSt. |
| Amazon.de | Euro-Preis nicht abrufbar | – | unbekannt. Vergleich: Salcar 10 m/1000 LED Cluster war als Black-Friday-Deal 26,09 € (20.–23.11., beendet) [INDEX] |
| Temu, SHEIN | unbekannt | unbekannt | unbekannt |

---

## 6. Kennzahlen (nur Angebote mit belegtem Preis)

| Angebot | Preis | Meter je € | LEDs je € | €/100 LEDs | Lichtstrom je € [SCHÄTZUNG] |
|---|---|---|---|---|---|
| eBay 100 m / 1000 LED | 25,98 € | 3,85 | 38 | 2,60 € | 7–16 lm/€ |
| Kaufland XMTECH 100 m | 31,44 € | 3,18 | 32 | 3,14 € | 6–13 lm/€ |
| OBI 79,92 m | 34,99 € | 2,28 | 29 | 3,50 € | 5–12 lm/€ (bei 6 W) |
| Action 1500 LED, 30 m | 22,95 € | 1,31 | 65 | 1,53 € | 12–27 lm/€ (bei 9 W) |
| Aldi 1500 LED, ca. 30 m | 24,99 € | 1,20 | 60 | 1,67 € | 11–25 lm/€ (bei 9 W) |
| Alibaba 100 m (ohne Versand, MwSt.) | ca. 11,81 € | 8,47 | 85 | 1,18 € | 15–36 lm/€ (bei 6 W) |

**Was das bedeutet:**

- **Meter je Euro:** Sieger ist die 100-m-Klasse.
- **Licht je Euro:** Sieger sind die dichten 1.500-LED-Ketten. Sie liefern bei vergleichbarem Preis etwa 1,7-mal mehr Licht je Euro, aber nur 30 statt 100 m.
- **Gemessene Vergleichswerte (Warentest 2015):** Dehner 25 € für 128 lm, Konstsmide 29 € für 279 lm. Das sind 5,1 bzw. 9,6 lm/€, also in derselben Größenordnung wie die heutige 100-m-Klasse.

### Was bekommst du für 50 €, 100 € und 200 €? (ganze Sets) [RECHNUNG]

| Angebot | 50 € | 100 € | 200 € |
|---|---|---|---|
| eBay 100 m (25,98 €) | 1 Set = 100 m (zwei Sets kosten 51,96 €) | 3 Sets = 300 m | 7 Sets = 700 m |
| Kaufland XMTECH (31,44 €) | 1 Set = 100 m | 3 Sets = 300 m | 6 Sets = 600 m |
| OBI (34,99 €) | 1 Set = 80 m | 2 Sets = 160 m | 5 Sets = 400 m |
| Action 1500 LED (22,95 €) | 2 Sets = 60 m | 4 Sets = 120 m | 8 Sets = 240 m |
| Aldi 1500 LED (24,99 €) | 2 Sets = 60 m | 4 Sets = 120 m | 8 Sets = 240 m |
| 100-m-Klasse, nur falls 12 € stimmen (AliExpress/Alibaba) [SCHÄTZUNG] | 4 Sets = 400 m | 8 Sets = 800 m | 16 Sets = 1.600 m |

---

## 7. Qualität: was Amazon-Rezensionen über die Haltbarkeit sagen [GEPRÜFT]

Quelle: Produktseiten vom 25.11.2026. Die Themenzähler ("Kunden erwähnen Haltbarkeit, x positiv, y negativ") stammen aus Amazons KI-Zusammenfassung der Rezensionen.

| Produkt | Sterne (Anzahl) | 1★ + 2★ | Haltbarkeit: Nennungen (positiv/negativ) | negativer Anteil | negative Haltbarkeits-Aussage unter allen Bewertungen | Auffällig |
|---|---|---|---|---|---|---|
| UISEBRT 100 m | 4,4 (985) | 7 % | 36 (8/28) | 78 % | 2,8 % | "nach kurzer Zeit defekt oder Netzteil defekt". Funktionalität 19 von 40 negativ |
| Quntis 100 m (zwei Varianten, geteilte Bewertungen) | 4,5 (2.605) | 7 % | 38 (5/33) | 87 % | 1,3 % | Zuverlässigkeit 18 von 29 negativ. Farbgebung (bunt) 18 von 50 negativ |
| NAIZY 100 m | 4,4 (1.108) | 7 % | 49 (16/33) | 67 % | 3,0 % | Lebensdauer 8 von 12 negativ. Zuverlässigkeit 12 von 33 negativ |
| Gresonic 100 LED | 4,4 (2.495) | 9 % | 126 (37/89) | 71 % | 3,6 % | LEDs nach 3/4 Jahr oder 13 Monaten defekt. Lichtfarbe 26 von 46 negativ |
| Nipach Büschelkette | 4,5 (146) | 6 % | 7 (3/4) | 57 % | 2,7 % | wenig Daten |

**Einordnung:**

- Bei **Qualität, Optik und Preis-Leistung** sind die Kunden überwiegend zufrieden (z. B. UISEBRT Optik 13 von 13 positiv, Preis-Leistung 18 von 19 positiv). Die Länge wird gelobt.
- Bei der **Haltbarkeit** kippt das Bild. Der Anteil betroffener Bewertender ist klein (1,3–3,6 %), die Stimmung in diesem Thema aber klar negativ.
- Rezensionen erfassen vor allem die **erste Saison**. Gresonic zeigt Ausfälle nach 9–13 Monaten. Die echte Ausfallquote über zwei bis drei Jahre liegt vermutlich höher, als die Sterne vermuten lassen. Für 10–20 % Ausfälle innerhalb von zwei Saisons habe ich keinen Beleg, das ist meine Planungsgröße [SCHÄTZUNG].
- **Datenqualität der Listings:** Gresonic nennt im Text "31 V DC, 3,6 W", im Datenblatt aber "7 Volt, 2 Watt". Bei Nipach steht "6 Kilowattstunden" als Leistung. NAIZY schreibt "100 LEDs auf 1000 m Leuchtlänge". Solche Widersprüche sind ein Warnsignal für unsorgfältige Produktdaten.

---

## 8. Risikoanalyse

### 8.1 Produktqualität

- **Haltbarkeit:** siehe Abschnitt 7. Das Muster ist in allen geprüften Marken gleich, weil es dieselbe Bauart ist (100 m, 1000 LED, 6 W, 31 V).
- **Schadstoffe:** Ein BUND-Labortest (Bericht von Öko-Test, 01.12.2019) fand bei **drei von vier** Lichterketten verbotene Weichmacher (DEHP, DBP, Chlorparaffine) mit bis zu 27 % Anteil, darunter Ketten, die über OBI und Amazon verkauft wurden [GEPRÜFT]. Das Material der Kabelisolierung erkennst du nicht an der Produktseite. Der Test ist alt, zeigt aber, dass auch Marktplätze und Baumärkte betroffen sein können.
- **Gleichmäßigkeit und Lichtfarbe:** Bei den 100-m-Ketten ist der Abstand mit 8–10 cm gleichmäßig. Beim Büschel- und Mehrfarb-Typ gibt es mehr Beschwerden (Quntis bunt: Farbgebung 18 von 50 negativ, Gresonic: Lichtfarbe 26 von 46 negativ). Die beiden warmweißen LED-Ketten im Warentest 2015 hatten ca. 2.400–2.500 K.

### 8.2 Elektrische Sicherheit

- **Das CE-Zeichen beweist nichts.** Bei Temu und Shein trugen im Warentest **alle** getesteten Spielzeuge und USB-Ladegeräte ein CE-Zeichen. Trotzdem fielen insgesamt 110 von 162 Produkten (Spielzeug, Schmuck, Ladegeräte) durch [GEPRÜFT]. Ein Prüfzeichen wie das GS-Zeichen bestätigt dagegen, dass eine anerkannte Prüfstelle das Produkt getestet hat. Bei den geprüften Angeboten behauptet nur SHS im Titel "DEKRA GS-geprüft". Ich konnte das nicht verifizieren.
- **Schutzkleinspannung (31 V) ist die richtige Bauart.** Laut Stiftung Warentest (2015) wandeln die Sicherheitstrafos der geprüften LED-Ketten die Netzspannung in "harmlose Schutzkleinspannung" um [GEPRÜFT]. Der Schwachpunkt ist der **Trafo mit Stecker**. UISEBRT schreibt selbst, dass Funktionsbox und Stecker **nicht wasserdicht** sind. Außen brauchst du eine Steckdosenbox und eine FI-geschützte Steckdose (RCD).
- **IP44 heißt spritzwassergeschützt**, nicht wasserdicht und nicht für Dauerregen mit stehendem Wasser.
- **230 V direkt am Strang meiden.** Bei einigen AliExpress- und Alibaba-Angeboten steht "220 V EU Plug". Prüfe, ob eine **Ausgangsspannung von höchstens 50 V (typisch 31 V)** angegeben ist. Ein Strang mit voller Netzspannung ist bei Kabelschäden gefährlich. Dasselbe gilt für das 230-V-LED-Band bei Temu.
- **Kinderzimmer:** Laut VDE nur Schutzkleinspannung bis 24 V oder Batteriebetrieb [INDEX].
- **Überhitzung:** In den gelesenen Quellen gibt es keine Hinweise auf Überhitzung der 6-W-Trafos. Für Noname-Trafos ist es unbekannt. Nutze den Timer und decke den Trafo nicht ab.
- **Alte, aber lehrreiche Zahl:** Eine EU-Untersuchung von 2009 ließ **fast jede dritte** Weihnachtslichterkette im Sicherheitstest durchfallen (zu dünne Drähte, schlechte Isolierung, Kabel reißt zu leicht) [GEPRÜFT]. Sie zeigt, dass billige Kabel und Isolierung die Hauptrisikoklasse sind.

### 8.3 Händler- und Lieferantenrisiko

- **Rückgabe bei Temu** [GEPRÜFT, Richtlinie vom 18.06.2026]: gesetzliches Widerrufsrecht 14 Tage plus freiwilliges Rücksendefenster von 90 Tagen. Bei bestimmten Elektrogeräten kann es je nach Verkäufer auf 45 oder 60 Tage verkürzt sein. Die erste Rücksendung je Bestellung ist kostenlos. Erstattungen werden innerhalb von 14 Tagen ab Information des Verkäufers bearbeitet.
- **AliExpress:** Eine aktuelle offizielle Richtlinie habe ich nicht gelesen. Nach Foren und Ratgebern gibt es ein kostenloses Rückgaberecht von etwa 15 Tagen bei bestimmten Angeboten, mit Reibung bei Rücksendekosten [INDEX, unbelegt].
- **Amazon, eBay, Kaufland mit EU-Händler:** gesetzliches 14-Tage-Widerrufsrecht und zwei Jahre Gewährleistung nach deutschem Recht. Bei Marktplatz-Händlern außerhalb der EU ist die Durchsetzung schwerer. Den Standort des Kaufland-Händlers "HKGaga" konnte ich nicht klären.
- **Produktsicherheitsverordnung (GPSR) seit 13.12.2024:** Für Produkte aus Drittländern muss ein EU-Verantwortlicher benannt sein. Prüfe, ob das Angebot eine EU-Adresse nennt [INDEX].
- **Plattform-Aufsicht:** Die EU-Kommission verhängte im Mai 2026 200 Mio. € gegen Temu, weil die Plattform nicht genug gegen illegale Produkte tue [GEPRÜFT, Update auf test.de]. Die Bayerische Marktüberwachung meldete bei Testkäufen auf Temu, SHEIN und AliExpress im Oktober 2025 bei **28,6 % von 28 Produkten** schwere Mängel (kleine Stichprobe, nicht lichterkettenspezifisch) [INDEX].

### 8.4 Import- und Zusatzkosten

- **EU-Pauschalzoll seit 1.7.2026** [GEPRÜFT, EU-Kommission vom 29.06.2026]: 3 € je Warenkategorie (nicht je Menge) bei Sendungen unter 150 € aus Nicht-EU-Ländern. Alle Lichterketten fallen in dieselbe Zolltarifnummer (9405 31 00, LED-Lichterketten). **Drei Ketten in einem Paket kosten 3 € Zoll, in drei Paketen 9 €** [RECHNUNG nach der EU-Regel]. Ob Temu und AliExpress Bestellungen so bündeln, habe ich nicht geprüft. Ob die Plattformen die 3 € separat ausweisen oder einpreisen, ebenfalls nicht.
- **Regulärer Zollsatz** (Alibaba-Bestellungen über 150 € oder gewerblicher Import): Tarifnummer 9405 31 00 mit **3,7 %** nach älteren Tarifauszügen. Der Wert für 2026 ist nicht bestätigt, die Zollverwaltung (TARIC) hat das letzte Wort [INDEX]. Dazu kommen 19 % Einfuhrumsatzsteuer. Eine Presse-Quelle nennt für DHL eine Auslagepauschale von 7,50 € je Sendung [INDEX].
- **Preise auf Plattformen** enthalten üblicherweise die Einfuhr-Umsatzsteuer (Verfahren IOSS) [nicht geprüft].
- **EU-Lager gegen Direktimport:** EU-Lager bedeuten kürzere Lieferzeit und einfachere Rückgabe. Direktimport aus China dauert länger. AliExpress zeigte in einem Listing "schnellste Lieferung in 6 Tagen" [INDEX]. **Bis Heiligabend sind es 29 Tage.** Direkt aus China ist es meist machbar, aber knapp.

### 8.5 Risiko-Bewertung 1–10 und Begründung

Die Zahlen sind mein Urteil. Sie bewerten, wie wahrscheinlich es ist, dass du Geld für schlechte oder unsichere Ware ausgibst. Je höher, desto riskanter.

| Angebot | Risiko | Begründung |
|---|---|---|
| Action 1.500 LED, Aldi 1.500 LED | 3 | EU-Händler haftet, Gewährleistung, Rückgabe in der Filiale. Nachteil: Prüfzeichen und Leistung nicht belegt, Aktionsware, Bestand ungeprüft |
| OBI 1000 LED | 3 | Baumarkt-Haftung. Nur 6 Bewertungen, Pickup-only. Der Schadstofftest 2019 betraf eine *andere* OBI-Kette |
| Nipach Büschelkette, AMARE, SHS | 4 | Deutsche Firmen als Hersteller bzw. Marke angegeben, wenige Bewertungen. SHS-GS-Angabe nicht verifiziert |
| Amazon 100 m (UISEBRT, Quntis, NAIZY) | 5 | Hohe Sterne, Gewährleistung beim Händler, aber klares Haltbarkeitsmuster und nicht wasserdichter Trafo. Hersteller meist unbekannt |
| eBay Noname 100 m, deutscher Händler | 5 | Dieselbe Ware, Händler und Bewertungen ungeprüft |
| Gresonic | 6 | Widersprüchliche Leistungsangaben, 71 % negative Haltbarkeits-Kommentare |
| Kaufland HKGaga | 6 | Händlerstandort unbekannt (Durchsetzung schwerer, falls außerhalb der EU), nur 10 Bewertungen |
| Alibaba (Einzelkauf) | 6 | Keine CE-Bestätigung in den Treffern. Du bist Importeur, Zoll und Versand liegen bei dir |
| Temu USB, Solar, SHEIN | 6 | Die Geräte selbst sind meist ungefährlich (5 V), aber dunkel. Das Netzteil der Plattform ist das Risiko (Warentest 2025: zu heiße USB-Ladegeräte) |
| AliExpress und Temu direkt (Langkette) | 7 | Lockpreise, keine Dokumente prüfbar, schwierigere Rückgabe, hohe Basisquote bei Plattform-Elektroware (Warentest 68 % durchgefallen, Bayern 29 % schwere Mängel, jeweils andere Produktgruppen) |

---

## 9. Rangliste

### 1. Preis-Leistungs-Sieger (viel Licht und Länge für wenig Geld)

- **Belegter Sieger: dichte 1.500-LED-Kette von Action (22,95 €) oder Aldi (24,99 €).** Bestes Licht je Euro unter den belegten EU-Händlern (11–27 lm/€ [SCHÄTZUNG]).
- **Nachteile:** nur 30 m, Preis und Bestand vor Ort prüfen (Aktionsware), Leistung und Prüfzeichen unbekannt, Preise stammen aus dem Suchindex.
- **Rechnerisch vorn, aber ungeprüft:** AliExpress oder Alibaba 100 m für ca. 12 € (15–36 lm/€). Risiko 6–7.

### 2. Günstigste brauchbare Option

- **100 m, 1000 LED, 31 V von einem EU-Händler: eBay, deutscher Händler, 25,98 €** (0,26 €/m) [INDEX]. "Brauchbar" heißt hier: EU-Händler mit Rückgaberecht, 31-V-Trafo, kostenloser Versand.
- **Nachteile:** das Haltbarkeitsmuster aus Abschnitt 7, Händler und Bewertungen ungeprüft. Plane einen Ersatz ein. Kaufland (31,44 €) ist bei gleicher Ware teurer und riskanter.

### 3. Beste lange Lichterkette

- **Quntis 100 m warmweiß** (4,5 ★ bei 2.605 Bewertungen, 31 V, 6 W, 3 m Zuleitung, mit Kabeltrommel und Kabelbindern). UISEBRT und NAIZY sind gleichwertig, weil es dieselbe Bauart ist. Wähle nach tatsächlichem Preis und Händler.
- **Nachteile:** mit 87 % negativen Haltbarkeits-Kommentaren schneidet Quntis dort am schlechtesten ab. Ohne Rückgaberecht nicht kaufen. Wer Haltbarkeit höher gewichtet, nimmt die **OBI-Kette** (79,92 m, 34,99 €), wenn sie am Markt abholbar ist.

### 4. Beste helle Lichterkette

- **Unter den Ketten:** dichte Typen (Action, Aldi, Nipach-Büschel). Etwa 9–21 lm/m gegen 2–4 lm/m bei der 100-m-Klasse [SCHÄTZUNG].
- **Wirklich hell:** eine **Glühbirnen-Girlande (E27, G40)**. 15 m mit etwa 25 Birnen kosten 22,89–25,99 € bei eBay [INDEX] bzw. 54,95–74,95 € bei Kaufland (Ledvion, teils ohne Leuchtmittel) [INDEX]. Lumen je Birne habe ich nicht belegt. Die Größenordnung (100–200 lm je Birne [SCHÄTZUNG]) wäre ein Vielfaches jeder Mikro-LED-Kette. Prüfe im Angebot, ob Birnen enthalten sind.

### 5. Beste Option für den Außenbereich

- **Händler-Ware mit EU-Haftung und 31-V-Trafo: Aldi (IP44 laut Prospekt), OBI, Action.** Risiko 3.
- **Nachteile und Pflicht:** IP44 ist nicht wasserdicht. Stecker und Trafo brauchen eine Steckdosenbox, die Steckdose muss FI-geschützt sein. Bei OBI und Action ist die Schutzart in den von mir gelesenen Daten nicht genannt.

### 6. Beste Option bei größeren Mengen

- **Bis ca. 20 Sets:** ein Händler, ein Paket (Zoll nur einmal). Bei eBay gibt es gewerbliche Händler mit Staffelpreis ab vier Stück (Beispiel 14,90 € je Stück, 100-m-Variante dort ausverkauft) [INDEX].
- **50–500 Sets:** Alibaba-Händler mit MOQ 50–100 Sets (Beispiel Hangzhou Wang Shi: 11–16,80 $ je Set für 20–100 m, MOQ 100) [INDEX]. Vorher Muster bestellen, CE-, LVD-, EMV- und RoHS-Prüfberichte anfordern, besser eine Drittprüfung beauftragen.
- **Ab ca. 500 Sets:** Direktimport als Seefracht-Sammelladung (siehe Abschnitt 10).
- **Nachteil:** Dein Anteil an Pflichten und Risiko wächst mit der Menge (Abschnitt 10).

---

## 10. Alternative Beschaffungswege

- **Direkt beim Hersteller (Alibaba):** MOQ 1 bis 100, 100-m-Set ab 13,42 $. Es gibt Staffelpreise (Beispiel: 1,35 $ je 10-m-Los bei 100–19.999 m, 1,08 $ ab 20.000 m) [INDEX]. In keinem der Treffer war ein CE-Nachweis bestätigt.
- **Großhandel in Deutschland (B2B):** Wurm und Steinigke verkaufen nur an Gewerbetreibende (Preise netto). Dort geht es um Profi-Ketten (z. B. E27-Lichterketten ohne Leuchtmittel), nicht um Billig-Mikro-LED-Ketten. Preise sind nicht öffentlich und ungeprüft [INDEX].
- **Restposten und Saisonabverkauf:** Erfahrungsgemäß werden Weihnachtsartikel nach den Feiertagen reduziert. **In meiner Recherche nicht belegt.** Black Friday ist am 27.11., Cyber Monday am 30.11.: Die Preise können noch fallen. Ein Salcar-Deal (10 m, 1000 LED, 26,09 €, 20.–23.11.) lief schon aus [INDEX]. Auf mydealz fand ich keinen Deal für 100-m-Ketten.
- **Gleiche Ware unter vielen Namen:** UISEBRT, Quntis, NAIZY, Moxled, Salcar, Ollny, XMTECH und XINZI verkaufen offensichtlich dieselbe Auslegung (100 m, 1000 LED, 6 W, 31 V). Preisspanne in Treffern: ca. 25–43 € (Ollny 42,99 €, Datenstand alt). Kaufe die billigste Variante **mit Händlerhaftung**.
- **Mehrere Ketten bei einem Anbieter:** günstiger, wenn (a) der Zoll nur einmal anfällt (ein Paket), (b) der Händler Staffelpreise anbietet (eBay-Händler, Alibaba), (c) Versandkosten pro Bestellung entfallen. Ob AliExpress oder Temu Mehrfachkäufe preislich belohnen, habe ich nicht geprüft.

### Break-even: ab welcher Menge lohnt sich Direktimport? [RECHNUNG, grobe Annahmen]

Annahmen: Fabrikpreis 11–14 $ je 100-m-Set (1 € = 1,15 $). Gewicht 1,74 kg je Set (Quntis-Angabe). Zoll 3,7 %, Einfuhr-USt 19 %. Fracht nach Richtwerten von Spediteur-Seiten (deren Zahlen sind Werbung und nur als Größenordnung zu lesen): Express ca. 8 €/kg, Luftfracht 4–8 $/kg, Seefracht-Sammelladung ca. 60–150 $ je m³ plus Nebenkosten. Fixkosten 150 € (Luft) bis 600 € (See) je Sendung.

| Menge | Weg | Kosten je Set netto (ohne USt) | brutto (mit 19 % Einfuhr-USt) | gegen eBay 25,98 € |
|---|---|---|---|---|
| 10 Sets | Express | 24–27 € | 29–32 € | **teurer** |
| 100 Sets | Luftfracht | 20,5–23 € | 24–28 € | **gleich teuer** |
| 500 Sets | Seefracht-Sammelladung | 12–14 € | 14–17 € | ca. 34–46 % günstiger |
| 1.000 Sets | Seefracht-Sammelladung | 11–14 € | 13–16 € | ca. 37–49 % günstiger |
| 3.000 Sets | ganzer Container | 11–13 € | 13–16 € | ca. 39–51 % günstiger |

**Fazit:** Für den Eigenbedarf lohnt Großhandel oder Direktimport **nie**. Auch der AliExpress-Einzelkauf (falls er bei 10–20 € liegt) ist näher am Fabrikpreis als jeder Kleinimport. Rechnerisch lohnt es sich erst ab **ca. 500 Sets**. Beim **Weiterverkauf** zählen zusätzlich:

- **ElektroG:** Registrierung bei der stiftung ear vor dem Inverkehrbringen, kostenpflichtig, laut IHK sechs bis sieben Wochen Bearbeitungszeit [INDEX].
- **GPSR:** EU-Verantwortlicher, der Importeur haftet (Art. 19) [INDEX].
- **CE-Unterlagen:** Konformität nach Niederspannungs-, EMV- und RoHS-Recht.
- **Verpackungsregister** und **Rücknahme**.
- **Ausfälle und Retouren:** Abschnitt 7 zeigt, dass das keine Randgröße ist.

Dafür brauchst du rechtliche Beratung. Ich gebe hier keine Rechtsauskunft.

---

## 11. Antworten auf deine Schlussfragen

**1. Welche Lichterkette würde ich selbst kaufen?**
Das hängt vom Ziel ab. Ist Helligkeit das Ziel, nehme ich **eine dichte 1.500-LED-Kette von Action oder Aldi** (ca. 23–25 €, EU-Händler, Filialrückgabe). Ist die **Länge** das Ziel (Zaun, Garten, 100 m), nehme ich die **100-m-Kette eines EU-Händlers für ca. 26 €** und plane einen Ersatz ein. Ich würde sie nicht blind bei AliExpress oder Temu bestellen, weil ich dort Preise und Dokumente nicht prüfen konnte. Wer am Handy ein Angebot sieht, das **inklusive Versand und Rückgabe** bei 10–15 € liegt, kann es als Zweitkauf probieren (Risiko 7).

**2. Wo bekomme ich sie aktuell am günstigsten?**
Belegt (Suchindex): eBay ca. 26 € für 100 m, Action 22,95 € für 1.500 LEDs, Aldi 24,99 €. Rechnerisch noch billiger, aber **ungeprüft**: AliExpress und Alibaba.

**3. Wie viele Meter bekomme ich für 50 €, 100 € und 200 €?**
Siehe Tabelle in Abschnitt 6: **100 m / 300 m / 700 m** bei der 100-m-Klasse für 26 € je Set (ganze Sets). Bei dichten 1.500-LED-Ketten **60 m / 120 m / 240 m**. Nur falls AliExpress-Preise um 12 € stimmen: bis zu 400 m / 800 m / 1.600 m.

**4. Welche Variante liefert am meisten tatsächliches Licht?**
Unter den Ketten die **dichten 1.500-LED-Typen** (geschätzt 9–21 lm/m, 11–27 lm/€). **Wirklich hell** ist nur die Glühbirnen-Girlande (E27). Alle Werte außer den Warentest-Messungen von 2015 sind Schätzungen.

**5. Welche Produkte sind trotz niedrigen Preises nicht empfehlenswert?**

- **"ab 0,99 €" und "ab 4,99 €"-Angebote.** Das sind Preise der kleinsten Variante (10 m) oder Aktionen. Die 100-m-Variante kostet bei vergleichbaren Händlern ca. 25–27 €.
- **230-V-Stränge ohne Trafo** und das 230-V-LED-Band, sofern du kein Fachwissen hast.
- **USB- und Solar-Ketten für lange Außenstrecken.** Zu dunkel, nicht erweiterbar, und das Netzteil der Plattform ist das Risiko.
- **Gresonic.** Widersprüchliche Leistungsangaben und LEDs, die nach 9–13 Monaten ausfallen.
- **Angebote ohne EU-Adresse.**
- **Innen-Ketten im Außenbereich.**

**6. Wie hoch ist das Risiko, dass ich Geld für schlechte Ware ausgebe?**
Für die 100-m-Klasse bei einem EU-Händler (Risiko 5/10): In Amazon-Rezensionen geben 6–9 % der Bewertenden nur 1–2 Sterne. 1,3–3,6 % schreiben eine negative Haltbarkeits-Aussage. Planungsgröße 10–20 % Ausfälle in zwei Saisons [SCHÄTZUNG]. Für AliExpress und Temu direkt (7/10) kommen schwerere Rückgabe und fehlende Dokumente dazu. Die Testbasis bei Plattform-Elektroware ist schlecht (Warentest: 68 % durchgefallen, Bayern: 29 % schwere Mängel, jeweils andere Produktgruppen). **Speziell für Lichterketten fehlen Plattform-Tests.**

**7. Ab welcher Bestellmenge lohnt sich Großhandel oder Direktimport?**
Rechnerisch ab **ca. 500 Sets** (Seefracht-Sammelladung): dann 14–17 € brutto je Set gegen 26 € bei eBay. Darunter nicht. Beim Weiterverkauf zusätzlich die Pflichten aus Abschnitt 10.

---

## 12. Kauf-Checkliste

1. **Ausgangsspannung höchstens 50 V (typisch 31 V)** und Trafo mit CE, besser mit GS oder VDE. Keine "220-V-Stränge" ohne Trafo.
2. **Beleuchtete Länge ausrechnen** (LEDs × Abstand), Zuleitung abziehen. **LEDs je Meter** ansehen: ab ca. 30/m wirkt eine Kette "hell".
3. **Leistung in Watt** prüfen (Trafo-Aufdruck oder Datenblatt). W je Meter ist der beste Helligkeits-Anhaltspunkt: 6 W auf 100 m = 0,06 W/m, 9 W auf 30 m = 0,3 W/m.
4. **IP44 ist spritzwassergeschützt.** Stecker und Trafo extra schützen, FI-geschützte Steckdose.
5. **EU-Lager, Rückgabe, EU-Verantwortlicher** im Angebot. Bestellbestätigung und Beleg aufbewahren.
6. **Sofort testen:** 48 Stunden Dauerlauf, bevor die Rückgabefrist abläuft.
7. **Bewertungen richtig lesen:** nicht die Sterne, sondern "Haltbarkeit". Ausfälle kommen oft erst nach 9–13 Monaten.
8. **Widersprüche im Listing** (Leistung, Spannung, Länge) sind ein Warnsignal.
9. **Mehrere Ketten in einem Paket** bestellen (Zoll 3 €).
10. **Preise am eigenen Handy prüfen**, weil Gutscheine und Neukundenpreise personalisiert sind. Auf "ab"-Preise nicht hereinfallen.
11. **Timer nutzen**, Trafo nicht abdecken.

---

## 13. Offene Punkte und wie du es selbst nachprüfst

- **Live-Preise** auf AliExpress, Temu, SHEIN, Amazon und eBay am Handy prüfen. Suchbegriffe: "Lichterkette 100m 1000 LED 31V Trafo IP44" und "Lichterkette 1500 LED 30m Netzbetrieb". Filter: Versand aus EU-Lager, Rückgabe.
- **Euro-Preise bei Amazon.de** ließen sich wegen des US-Standorts der Recherche nicht auslesen. Die ASINs stehen in der Tabelle.
- **Leistung, IP-Schutzart und Prüfzeichen** der OBI-, Action- und Aldi-Ketten im Datenblatt prüfen.
- **Zollsatz 9405 31 00** für 2026 in TARIC bestätigen (3,7 % stammt aus älteren Auszügen).
- **Händlerstandort** von "HKGaga" (Kaufland) prüfen.
- **Temu:** gibt es eine echte netzbetriebene Langkette mit Trafo? Mit den Begriffen "Lichterkette 220V EU-Stecker 31V Trafo" suchen.
- **CE-Konformitätserklärung** beim Verkäufer anfordern, wenn du in größerer Menge kaufst.

---

## 14. Quellen

**Selbst geöffnet und gelesen [GEPRÜFT] (25.11.2026):**

- OBI: [LED Lichterkette 1000 LEDs](https://www.obi.de/p/2927747/led-lichterkette-1000-leds-warmweiss-gruenes-kabel-mit-timer-funktion)
- Amazon.de (Technik, Sterne, Rezensionsthemen): [UISEBRT](https://www.amazon.de/dp/B08JP7RVSQ), [Quntis warmweiß](https://www.amazon.de/dp/B08DKQ2J6Q), [Quntis bunt](https://www.amazon.de/dp/B08DKNMDTF), [NAIZY](https://www.amazon.de/dp/B07X84WSZ6), [Gresonic](https://www.amazon.de/dp/B06XDLS489), [Nipach Büschelkette](https://www.amazon.de/dp/B075FQQ98P), [AMARE](https://www.amazon.de/dp/B07YCVL4QH), [SHS](https://www.amazon.de/dp/B077TWYRJJ)
- Stiftung Warentest: [Messwerte Dehner](https://www.test.de/Lichterketten-Besinnlich-mit-LED-Weihnachtsbeleuchtung-im-Test-4946457-4948050/detail/2015232!5/), [Messwerte Konstsmide](https://www.test.de/Lichterketten-Besinnlich-mit-LED-Weihnachtsbeleuchtung-im-Test-4946457-4948050/detail/2015232!14/), [Lichterketten: Festliches Funkeln mit wenig Strom (2016)](https://www.test.de/Lichterketten-Festliches-Funkeln-mit-wenig-Strom-5098896-0/), [Gefährliche Lichterketten: EU warnt vor Mängeln (2009)](https://www.test.de/Gefaehrliche-Lichterketten-EU-warnt-vor-Maengeln-1829865-0/), [Temu und Shein: Gefährliche Schnäppchen (2025, Update 2026)](https://www.test.de/Temu-und-Shein-Gefaehrliche-Schnaeppchen-6253491-0/)
- Öko-Test: [Gefährliche Weihnachtsbeleuchtung: Illegale Schadstoffe in Lichterketten (2019)](https://www.oekotest.de/gesundheit-medikamente/Gefaehrliche-Weihnachtsbeleuchtung-Illegale-Schadstoffe-in-Lichterketten-_11002_1.html)
- EU-Kommission: [3 Euro Zoll auf Kleinsendungen (29.06.2026)](https://commission.europa.eu/news-and-media/news/ensuring-fairness-and-safety-eur3-customs-duty-low-value-parcels-2026-06-29_de)
- Temu: [Rückgabe- und Erstattungsrichtlinien (Stand 18.06.2026)](https://www.temu.com/de/return-and-refund-policy.html)

**Nur aus dem Suchindex [INDEX] (Seite nicht geöffnet, Stand unsicher):**

- eBay: [Noname 100 m 600–1000 LED](https://www.ebay.de/itm/128150345193), [Suchtreffer 100 m Lichterketten](https://www.ebay.de/itm/177552275124)
- Kaufland: [XMTECH 100 m](https://www.kaufland.de/product/443175167/)
- Action: [Weihnachtsbeleuchtung 1.500 LED](https://www.action.com/de-de/p/3001485/weihnachtsbeleuchtung/)
- Aldi, Lidl (Presse): [GIGA Aldi 1.500 LEDs](https://www.giga.de/tech/diese-lichterkette-mit-1-500-leds-bei-aldi-sorgt-naechste-woche-garantiert-fuer-weihnachtsstimmung--01M5HK97D0FES3FBE5X4ZJA1ZB), [GIGA Lidl 30-m-Kette (2025)](https://www.giga.de/tech/nur-7-99-euro-lidl-verkauft-ueberlange-led-lichterkette-zum-sparpreis--01K80BKJK1ZDYV6J1HFD96J8PT)
- AliExpress: [Listenansicht 100 1000 LED](https://de.aliexpress.com/w/wholesale-100-1000-led-lichterkette.html)
- Alibaba: [100 m 1000 LEDs Showroom](https://www.alibaba.com/showroom/100m-1000-leds-christmas-string-lights.html)
- Temu: [Außen-Lichterketten](https://www.temu.com/de/led-lichterkette-f%C3%BCr-den-au%C3%9Fenbereich-5040302774125-s.html)
- SHEIN: [Lichterkette 5/10 m](https://m.shein.com/de/50/100-Led-5/10m-Waterproof-8-Modes-String-Light-p-7324697-cat-3386.html)
- VDE: [Weihnachtsbeleuchtung](https://www.vde.com/topics-de/verbraucherschutz/weihnachtsbeleuchtung)
- Bayerische Marktüberwachung: [Analyse Testkäufe 2025 (PDF)](https://www.stmwi.bayern.de/fileadmin/user_upload/stmwi/publikationen/pdf/2025-10-22-gefaehrliche-schnaeppchen-analyse-testkaeufe-2025-gesichert.pdf)
- Zolltarif: [9405 31 00 (zolltarifnummern.de)](https://www.zolltarifnummern.de/2026/94053100)
- ElektroG und GPSR: [IHK Ostwürttemberg: Überblick ElektroG](https://www.ihk.de/ostwuerttemberg/produktmarken/standortpolitik/umwelt-energie/elektrog-ueberblick-6956170), [Händlerbund: GPSR und EU-Importeur](https://ohn.haendlerbund.de/recht/rechtsfragen/gpsr-eu-importeur-produkte-genannt-werden)
- Fracht-Richtwerte: [sino-shipping.com LCL-Kosten](https://www.sino-shipping.com/de/frachtkosten-aus-china/seekosten/lcl-cost-calculation-per-cbm-volume-pricing/)

---

**Zusammenfassung in fünf Sätzen:** **Die günstigste und längste Ware ist die 100-m-Kette mit 31-V-Trafo (belegt ca. 26 € bei eBay, 34,99 € bei OBI für 80 m beleuchtet), aber sie liefert mit 6 W nur etwa so viel Licht wie eine einzige Glühlampe.** **Mehr Licht je Euro bringen dichte 1.500-LED-Ketten von Action (22,95 €) und Aldi (24,99 €), nur eben auf 30 m.** **Die Haltbarkeit ist bei allen geprüften Marken die Schwachstelle, und AliExpress, Temu, SHEIN, eBay, Kaufland, Action, Aldi und Alibaba ließen sich nicht öffnen, deshalb sind deren Preise nur Suchindex-Werte.** **Direktimport lohnt rechnerisch erst ab etwa 500 Sets, und seit 1.7.2026 kostet jede Warenkategorie je Paket 3 € Zoll, also lieber alles in ein Paket.** **Mein Rat: Ketten nur von EU-Händlern mit Rückgaberecht kaufen, Stecker und Trafo wettergeschützt betreiben und die Live-Preise am eigenen Handy prüfen.**
