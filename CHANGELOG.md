# Änderungsprotokoll

Dieses Projekt verwendet [Semantic Versioning](https://semver.org/).

## 0.6.0 – 18.08.2026

- Abschnittsgewichtungen entfernt: Gesamtnoten werden wieder ausschließlich aus den erreichten Rohpunkten gebildet.
- Im EWH-Editor und Ausdruck wird je Abschnitt der automatisch aus den Maximalpunkten berechnete Anteil an der Gesamtpunktzahl angezeigt.
- Vorlagen, geführter Aufbau und PDF-Import übernehmen nur noch Abschnitts- und Aufgabenpunkte; alte Gewichtungswerte aus Backups werden beim Laden ignoriert.
- PDF-Import verlangt die Einwilligung vor der Dateiauswahl; Uploads sind auf 8 MB begrenzt.
- Der lokale PDF-Dienst begrenzt Anfragegröße, Parallelität und Laufzeit externer PDF-Werkzeuge.
- Die lokale Speicherung erkennt konkurrierende Tabs und verhindert das Überschreiben eines neueren Datenstands.
- README und Wartungsdokumentation wurden für Lehrkräfte und eine Einzelwartung vereinfacht und eingedeutscht.
- Teilnahme wird nun pro Klassenarbeit statt global pro Schüler:in geführt; verfügbar sind anwesend, abwesend, entschuldigt und „schreibt nach“.
- Teilnahmestatus sind Teil der verschlüsselten Bewertungsdaten, werden beim Sperren aus dem Klartext-Arbeitsspeicher entfernt und in verschlüsselte Backups übernommen.

## 0.5.0 – 06.08.2026

- Linting, Typprüfung, Unit-, Regression- und Browser-Tests ergänzt.
- Versionierte Speicher- und Backupformate mit Migrationen und Validierung eingeführt.
- Verschlüsselte Backups, kontrollierte Wiederherstellung und Backup-Status ergänzt.
- Lokale Fachlogik und Workspace-Controller klarer getrennt.
- AGPL-3.0-only, Sicherheitsrichtlinie und Hinweise zu Drittmaterial ergänzt.

### Bekannte Grenze

Für `xlsx@0.18.5` bestehen bekannte Upstream-Sicherheitshinweise ohne automatisch kompatible Korrektur. Vor einem Release bitte prüfen.
