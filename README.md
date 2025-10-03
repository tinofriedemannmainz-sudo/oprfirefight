
# OPR Firefight – Browser Prototype (React + TypeScript)

Erste spielbare Version als Hotseat (2 Spieler an einem Gerät). Ziel ist ein UX-Gefühl ähnlich **Warhammer 40k: Tacticus**.

## Features
- Hexfeld-Spielfeld (zufällig generiert; Gelände: Offen, Wald, Fels, Wasser, Ruine)
- 2 Spieler, Teamwahl (10 vorkonfigurierte Teams, JSON-basiert)
- OPR-nahe Grundmechanik: Quality (Treffer), Defense (Rettung), AP, getrennte Nah-/Fernkampfwaffen
- Animationen/Stil: Leichtes Glow, Shake auf Treffer, übersichtliche HUD
- Würfellog (letzte Würfe)
- Platzhalter-Bilder je Fraktion (SVG)

## Start
```bash
npm install
npm run dev
```
Öffne dann die angezeigte URL.

## Hinweise
- Regeln sind stark vereinfacht. Ziel: schnelles, verständliches Grundgerüst.
- Daten (Teams) liegen unter `public/data/teams/` und können leicht angepasst werden.
- Bilder liegen unter `public/assets/`.
- Für Online-Multiplayer, Missionsziele, Spezialregeln und Effekte können wir schrittweise erweitern.
