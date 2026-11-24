#!/usr/bin/env bash
# Zieht aus einem Video aus der Video-Ablage (#/videos) gleichmaessig verteilte Einzelbilder, damit Claude
# es "ansehen" kann (Read-Werkzeug zeigt JPGs). Aufruf:
#   automatisierung/video-bilder.sh <URL-oder-Datei> [Ausgabeordner] [Anzahl Bilder=16]
# Ergebnis: <Ordner>/video.<endung>, <Ordner>/bild-01.jpg ... und <Ordner>/tafel.jpg (alle Bilder als Raster).
# Hinweis: Ton wird hier NICHT transkribiert; was gesprochen wird, muss Mark kurz in "Worum geht es" notieren.
set -euo pipefail
QUELLE="${1:?URL oder Datei angeben}"
ORDNER="${2:-$(mktemp -d)}"
N="${3:-16}"
mkdir -p "$ORDNER"
if [[ "$QUELLE" =~ ^https?:// ]]; then
  EXT="${QUELLE##*.}"; EXT="${EXT%%\?*}"
  DATEI="$ORDNER/video.$EXT"
  curl -fsS --max-time 300 -o "$DATEI" "$QUELLE"
else
  DATEI="$QUELLE"
fi
DAUER=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DATEI")
HAT_TON=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$DATEI" | head -1)
echo "Dauer: ${DAUER}s, Ton: ${HAT_TON:-keiner}"
# Bild i liegt in der Mitte des i-ten Abschnitts
for i in $(seq 1 "$N"); do
  T=$(awk -v d="$DAUER" -v i="$i" -v n="$N" 'BEGIN{printf "%.2f", (i-0.5)*d/n}')
  ffmpeg -y -loglevel error -ss "$T" -i "$DATEI" -frames:v 1 -vf "scale='min(960,iw)':-2" -q:v 4 "$ORDNER/bild-$(printf %02d "$i").jpg"
  echo "bild-$(printf %02d "$i").jpg = ${T}s"
done
SPALTEN=4; ZEILEN=$(( (N + SPALTEN - 1) / SPALTEN ))
ffmpeg -y -loglevel error -pattern_type glob -i "$ORDNER/bild-*.jpg" \
  -vf "scale=480:-2,tile=${SPALTEN}x${ZEILEN}" -frames:v 1 -q:v 4 "$ORDNER/tafel.jpg"
echo "Fertig: $ORDNER"
