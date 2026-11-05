# Sicherheitsrichtlinie

## Vertrauliche Meldung

Bitte veröffentliche vermutete Sicherheitslücken nicht zuerst in einem öffentlichen Issue. Melde sie vertraulich an `simonhartmann@mailbox.org` – mit kurzer Beschreibung, betroffenen Versionen, reproduzierbaren Schritten und möglicher Auswirkung. Sende keine echten Schülerdaten, Passwörter, Schlüssel oder entschlüsselten Backups.

Wir prüfen Meldungen nach Möglichkeit zeitnah, können als Einzelprojekt aber keine Reaktionszeit zusagen. Bitte veröffentliche Details erst nach gemeinsamer Abstimmung.

## Unterstützte Versionen

Sicherheitskorrekturen werden für den aktuellen `main`-Stand bewertet. Ältere Releases werden nur nach Möglichkeit betrachtet; vor `1.0.0` gibt es keine zugesicherte Langzeitpflege. Nenne bitte Commit, Release oder Demo-Version.

## Besonderer Schutzbereich

Besonders kritisch sind Änderungen an Browser-Storage, Migrationen, Backup-/Restore-Parsing, Importen, PDF-Verarbeitung, Kryptografie, Entsperr-Sitzungen, Print-/Export-Escaping und Datenlöschung. Solche Änderungen benötigen Tests für Fehlpfade und eine Aktualisierung der Sicherheits- oder Datenschutzdokumentation.

## Kryptografie und sensible Daten

Die App verwendet Web Crypto für geschützte Gruppen und verschlüsselte Backups: PBKDF2-HMAC-SHA-256 mit 250.000 Iterationen und zufälligem 16-Byte-Salt leitet einen AES-256-GCM-Schlüssel ab; jede Verschlüsselung erhält einen zufälligen 12-Byte-Initialisierungsvektor. Passwörter und ableitbare Klartextschlüssel werden nicht dauerhaft gespeichert.

Namen sowie die bewertungsbezogenen Daten geschützter Gruppen (Punkte, Kommentare, Signaturen, Teilnahmestatus und Antwortbogencodes) werden verschlüsselt gespeichert. Entschlüsselte Daten und das Gruppenpasswort können während einer aktiven Entsperrsitzung im JavaScript-Arbeitsspeicher liegen. Nach 15 Minuten ohne Aktivität sperrt die Anwendung entsperrte Gruppen; eine vollständige sichere Bereinigung durch JavaScript ist dennoch nicht zusicherbar. Ergänzende Bedien-, Speicher- und Backupgrenzen stehen in [Datenschutz und Datenhaltung](docs/data-and-privacy.md).

## Bekannte Grenzen

Die Anwendung verarbeitet Daten lokal im Browser; das ist keine Zusicherung vollständiger Sicherheit, eine Sicherheitsprüfung oder automatische DSGVO-Konformität. Ein entsperrtes oder kompromittiertes Gerät, Schadsoftware, Browser-Erweiterungen mit weitreichenden Rechten und eine offene Sitzung liegen außerhalb des Schutzes der gespeicherten Verschlüsselung. Browserprofil-Löschung und verlorene Backup-Passwörter können eine Wiederherstellung unmöglich machen. Backup-Dateiname sowie Format, Version und Erstellzeit bleiben unverschlüsselt.
