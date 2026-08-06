# Sicherheitsrichtlinie

## Responsible Disclosure

Bitte veröffentlichen Sie vermutete Sicherheitslücken nicht zuerst in einem öffentlichen Issue. Melden Sie sie vertraulich an `simonhartmann@mailbox.org` mit einer kurzen Beschreibung, betroffenen Versionen, reproduzierbaren Schritten und möglicher Auswirkung. Senden Sie keine echten Schülerdaten, Passwörter, Schlüssel oder entschlüsselten Backups.

Wir bestätigen den Eingang nach Möglichkeit zeitnah, bewerten die Auswirkung und stimmen einen verantwortungsvollen Offenlegungszeitpunkt ab.

## Unterstützte Versionen

Sicherheitskorrekturen werden für den aktuellen `main`-Stand und veröffentlichte, noch unterstützte Versionen bewertet. Vor `1.0.0` gibt es keine zugesicherte Langzeitpflege für ältere Vorabversionen. Bitte nennen Sie Commit, Release oder Demo-Version.

## Besonderer Schutzbereich

Besonders kritisch sind Änderungen an Browser-Storage, Migrationen, Backup-/Restore-Parsing, Importen, PDF-Verarbeitung, Kryptografie, Entsperr-Sitzungen, Print-/Export-Escaping und Datenlöschung. Solche Änderungen benötigen Tests für Fehlpfade und eine Aktualisierung der Sicherheits- oder Datenschutzdokumentation.

## Kryptografie und sensible Daten

Die App verwendet dokumentierte Browser-Kryptografie für geschützte Gruppen und verschlüsselte Backups. Passwörter und ableitbare Klartextschlüssel werden nicht dauerhaft gespeichert. Entschlüsselte Daten können während einer aktiven Sitzung im JavaScript-Arbeitsspeicher liegen; eine vollständige sichere Bereinigung durch JavaScript ist nicht zusicherbar. Details und Grenzen werden in einer eigenen Sicherheitsphase weiter dokumentiert.

## Bekannte Grenzen

Die Anwendung verarbeitet Daten lokal im Browser; das ist keine Zusicherung vollständiger Sicherheit oder automatischer DSGVO-Konformität. Entschlüsselte Daten können während einer aktiven Sitzung im Arbeitsspeicher liegen. Browserprofil-Löschung und verlorene Backup-Passwörter können eine Wiederherstellung unmöglich machen. Die detaillierte Bedrohungsmodell- und Kryptografiedokumentation wird in einer späteren, eigenen Sicherheitsphase ergänzt.
