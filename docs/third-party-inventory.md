# Rechte- und Drittmaterialinventar

Stand: 6. August 2026. Dieses Inventar ist ein technischer Prüfstand, keine Rechtsberatung.

| Bestandteil | Version | Lizenz laut Paketmetadaten | Verwendung | Prüfung vor Release |
| --- | ---: | --- | --- | --- |
| React / React DOM | 18.3.1 | MIT | Browser-UI | Lizenztext bei Distribution erhalten. |
| sql.js | 1.14.1 | MIT | lokale SQLite-Persistenz | WASM-Distribution und Lizenzhinweis prüfen. |
| docx | 9.7.1 | MIT | DOCX-Export | Lizenzhinweis prüfen. |
| SheetJS `xlsx` | 0.18.5 | Apache-2.0 | XLSX-/ODS-Import und -Export | Sicherheitsadvisories und Lizenz bei jedem Release prüfen. |
| Valibot | 1.4.2 | MIT | Runtime-Validierung | Lizenzhinweis prüfen. |
| Vite, Vitest, ESLint, Tailwind | aktuelle Lockfile-Versionen | MIT | Entwicklungswerkzeuge | nicht Teil des Laufzeitbundles, Lockfile prüfen. |
| Playwright | 1.62.1 | Apache-2.0 | E2E-Testwerkzeug | nur CI/Entwicklung. |
| TypeScript | 5.9.3 | Apache-2.0 | Entwicklungswerkzeug | nur CI/Entwicklung. |
| Fraunces | lokale WOFF2-Subsets | SIL Open Font License 1.1 | Überschriften | Copyright, Quelle und Lizenzhinweis in `THIRD_PARTY_NOTICES.md`. |
| Manrope | lokale WOFF2-Subsets | SIL Open Font License 1.1 | UI-Schrift | Copyright, Quelle und Lizenzhinweis in `THIRD_PARTY_NOTICES.md`. |

## Assets und offene Nachweise

- Die Fraunces- und Manrope-Webfonts sind gegen die offiziellen Google-Fonts-Quellen und deren SIL Open Font License 1.1 geprüft; Details stehen in `THIRD_PARTY_NOTICES.md`.
- `public/signature.svg` ist eine persönliche lokale Datei, wird nicht versioniert oder ausgeliefert und wird nicht mehr als Standardunterschrift referenziert.
- Die Favicons sind projektinterne, in `favicon.svg` eingebettete Rastergrafiken. Ihre Herkunft muss vor einem öffentlichen Release vom Rechteinhaber bestätigt oder durch eindeutig dokumentierte Ersatzgrafiken ersetzt werden.
- Neue Assets benötigen Herkunft, Lizenz, Copyright-Hinweis und – sofern erforderlich – einen Eintrag in diesem Inventar.

## Ergebnis

Für die Paketabhängigkeiten wurden keine Copyleft-Inkompatibilitäten erkannt. Die Schriftlizenzen sind nachgewiesen. Die Herkunft der Favicons bleibt ein Release-Blocker, bis sie vom Rechteinhaber bestätigt oder ersetzt ist.
