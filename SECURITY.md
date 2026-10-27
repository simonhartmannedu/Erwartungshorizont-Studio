# Sicherheitsrichtlinie

## Vertrauliche Meldung

Bitte veröffentliche vermutete Sicherheitslücken nicht zuerst in einem öffentlichen Issue. Melde sie vertraulich an `simonhartmann@mailbox.org` – mit kurzer Beschreibung, betroffenen Versionen, reproduzierbaren Schritten und möglicher Auswirkung. Sende keine echten Schülerdaten, Passwörter, Schlüssel oder entschlüsselten Backups.

Wir prüfen Meldungen nach Möglichkeit zeitnah, können als Einzelprojekt aber keine Reaktionszeit zusagen. Bitte veröffentliche Details erst nach gemeinsamer Abstimmung.

## Unterstützte Versionen

Sicherheitskorrekturen werden für den aktuellen `main`-Stand bewertet. Ältere Releases werden nur nach Möglichkeit betrachtet; vor `1.0.0` gibt es keine zugesicherte Langzeitpflege. Nenne bitte Commit, Release oder Demo-Version.

## Besonderer Schutzbereich

Besonders kritisch sind Änderungen an Browser-Storage, Migrationen, Backup-/Restore-Parsing, Importen, PDF-Verarbeitung, Kryptografie, Entsperr-Sitzungen, Print-/Export-Escaping und Datenlöschung. Solche Änderungen benötigen Tests für Fehlpfade und eine Aktualisierung der Sicherheits- oder Datenschutzdokumentation.

## Kryptografie und sensible Daten

Die App verwendet Browser-Kryptografie für geschützte Gruppen und verschlüsselte Backups. Passwörter und ableitbare Klartextschlüssel werden nicht dauerhaft gespeichert. Entschlüsselte Daten können während einer aktiven Sitzung im JavaScript-Arbeitsspeicher liegen; eine vollständige sichere Bereinigung durch JavaScript ist nicht zusicherbar. Ergänzende Bedien- und Speichergrenzen stehen in [Datenschutz und Datenhaltung](docs/data-and-privacy.md).

## Bekannte Grenzen

Die Anwendung verarbeitet Daten lokal im Browser; das ist keine Zusicherung vollständiger Sicherheit, eine Sicherheitsprüfung oder automatische DSGVO-Konformität. Entschlüsselte Daten können während einer aktiven Sitzung im Arbeitsspeicher liegen. Browserprofil-Löschung und verlorene Backup-Passwörter können eine Wiederherstellung unmöglich machen.
