# Technical Debt

Stand: 6. August 2026. Priorisierung berücksichtigt Datenverlust, Sicherheit, Local-first und Wartbarkeit.

## P0 – kritisch

1. **Herkunft lokaler Assets nachweisen.** WOFF2-Schriften, Favicons und `signature.svg` haben keinen separaten Lizenznachweis. Bis zur Klärung dürfen sie nicht als Teil des AGPL-Kerns ausgegeben werden. Direkte Maßnahme dieser Phase: Inventar angelegt und Release-Hinweis dokumentiert.
2. **`xlsx@0.18.5`-Advisories behandeln.** Frühere Audits meldeten High-Severity-Probleme ohne automatischen Fix. Ein XLSX-Roundtrip-Test für fiktive Lerngruppen ist jetzt vorhanden; ein Austausch oder Upgrade benötigt zusätzlich Export-Roundtrips und Datei-Fuzzing. Keine ungetestete Abhängigkeitsänderung in dieser Phase.

## P1 – wichtig

1. `src/App.tsx` bleibt großer Orchestrator; Backup, Archiv, Lerngruppen und Bewertung schrittweise in getestete Controller extrahieren.
2. Browser-E2E für unbekannte verschlüsselte Schema-Version, Vorab-Backup und Legacy-Migration ergänzen.
3. Doppelte Legacy-JavaScript-/Deklarationsdateien unter `src/ai` und `src/pdf` auf Herkunft und Build-Notwendigkeit prüfen.
4. Accessibility automatisiert mit axe ergänzen und Dialog-Fokuspfade prüfen.

## P2 – nice to have

1. Bundlegrößen vor/nach Lazy Loading von XLSX/DOCX/PDF messen.
2. Dokumentationssprache schrittweise vereinheitlichen.
3. Öffentliche Architektur-ADRs für Datenformat- und Kryptografieentscheidungen ergänzen.
