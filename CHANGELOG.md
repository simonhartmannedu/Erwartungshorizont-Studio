# Änderungsprotokoll

Dieses Projekt verwendet [Semantic Versioning](https://semver.org/).

## 0.9.0 – 13.10.2026

- Der Korrektur-Tisch ergänzt die Einzelkorrektur: Eine Aufgabe wird für die ganze Lerngruppe zeilenweise bewertet. Mit Enter springt der Fokus zur nächsten Eingabe; Abwesenheiten bleiben gesperrt.
- Die Einzelkorrektur bleibt unverändert verfügbar und kann direkt über den Korrekturmodus wieder gewählt werden.
- Die Notenübersicht kann zusätzlich als einfache CSV-Datei ausgegeben werden.

## 0.8.2 – 13.10.2026

- Klassenlisten werden aus Sicherheitsgründen ausschließlich noch als CSV- oder TXT-Datei importiert.
- Excel- und ODS-Tabellenimporte sowie Tabellenexporte sind entfernt. Als schlanke Ausnahme steht die Notenübersicht zusätzlich als CSV bereit; verfügbar bleiben außerdem Druck-PDF, Word-Dokumente und verschlüsselte JSON-Backups.
- Die betroffene Tabellenbibliothek wurde aus dem Produktionsbundle entfernt. Der Produktions-Audit sperrt nun bereits bei Sicherheitslücken der Stufe `high`.
- Das Inhaltsverzeichnis im EWH-Editor erklärt bei leeren Klassenarbeiten seinen Zustand und lässt sich einklappen.

## 0.8.1 – 10.10.2026

- Easy-Mode trennt das Überarbeiten eines Erwartungshorizonts klar von der individuellen Korrektur: Aufgaben, Erwartungen und Maximalpunkte lassen sich ohne Lerngruppe oder Schüler:in bearbeiten.
- Der Easy-Mode druckt und exportiert ausschließlich den anonymen EWH; individuelle Punkte, Schülercodes und Kommentare werden nicht angezeigt oder ausgegeben.
- Druckansichten stellen ihren manuellen Druckknopf sofort bereit. Verzögerte Bilder können die Ausgabe nicht mehr blockieren; die Druckabläufe wurden in Chromium und Firefox geprüft.
- Die doppelte Pflege der Rahmendaten entfällt im Vorlagen-, Struktur- und Zusammenstellungsweg. Rahmendaten werden anschließend zentral im EWH-Editor vorbereitet.
- Der Browser-Test für konkurrierende Tabs berücksichtigt die absichtlich rechenintensive lokale Passwortableitung und bleibt damit unter CI-Last stabil.

## 0.8.0 – 08.10.2026

- Der geführte Klausur-Builder bündelt Aufgabenbibliothek und Gliederung in einer ruhigen Seitenleiste; der Klausuraufbau erhält mehr Platz und bleibt der klare Arbeitsfokus.
- Aufgaben lassen sich per Maus, Touch oder Tastatur zwischen Teilen sortieren. Hinzufügen, Verschieben, Duplizieren und Entfernen bleiben zusätzlich ohne Drag & Drop erreichbar.
- Rahmendaten, Lerngruppe und Ziel der Klassenarbeit erscheinen erst im Schritt „Vorschau & erstellen“ statt dauerhaft neben dem Aufbau.
- Die mobile Aufgabenbibliothek öffnet als Bottom Drawer; der Vorlageneinstieg nutzt einen kompakten Fachfilter.
- „EWH erstellen“ bleibt als hervorgehobene Aktion dauerhaft in der Hauptnavigation erreichbar.
- Neue Browserprofile starten mit der Darstellung „Erklärvideo bei 1,25×“; bereits gewählte Darstellungen bleiben gespeichert.

## 0.7.0 – 07.10.2026

- Arbeitsbereiche, Klassenarbeitskontext und Korrekturansicht klarer gegliedert.
- Teilnahmeschalter bündelt Korrektur, Klassendurchschnitt und Klassendruck; nicht teilnehmende Schüler:innen werden in diesen Abläufen ausgelassen.
- Sperrstatus und Backup-Bereich vereinfacht; Schuljahr-Aktionen sind nicht mehr als eigene Einstiegspunkte sichtbar.
- Erwartungshorizonte erhalten bei strukturellen Änderungen weiterhin automatisch eine lokale Version.
- Optionale Nextcloud-Ablage nutzt nun einen lokal synchronisierten, schulisch freigegebenen Ordner statt Browser-WebDAV: keine CORS-Konfiguration und keine Speicherung von Nextcloud-Zugangsdaten in EWH-Studio.

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
