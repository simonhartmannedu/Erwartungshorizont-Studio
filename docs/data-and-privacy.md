# Datenschutz und Datenhaltung

EWH-Studio verarbeitet Arbeitsstände und Schülerdaten grundsätzlich lokal im Browser. Es gibt kein verpflichtendes Benutzerkonto, keine zentrale Schülerdatenbank und keine Telemetrie.

## Wo Daten liegen

| Daten | Speicherort |
| --- | --- |
| Klassenarbeiten, Archive und Schülerdaten | sql.js-Datenbank in IndexedDB des Browsers |
| Darstellung und Backup-Status | `localStorage` des Browsers |
| Sicherungen | von dir heruntergeladene, verschlüsselte Datei |

Löscht du Browserdaten, verwendest ein privates Fenster oder wechselst das Gerät, können lokale Daten verloren gehen. Deshalb sind regelmäßige verschlüsselte Backups wichtig.

## Schutz geschützter Lerngruppen

Geschützte Lerngruppen speichern Namen verschlüsselt. Punkte, Kommentare und Unterschriften werden während einer entsperrten Sitzung im Arbeitsspeicher benötigt und beim Speichern beziehungsweise Sperren wieder verschlüsselt oder aus dem aktiven Zustand entfernt. Die globale Suche lädt Klarnamen nur für aktuell entsperrte Lerngruppen; beim Sperren oder automatischen Sitzungs-Timeout werden diese Suchdaten und die aktuelle Suchanfrage verworfen. Gruppenpasswörter und Backup-Passwörter werden nicht dauerhaft gespeichert.

Auf einem gemeinsam genutzten Gerät: Gruppe nach der Korrektur sperren, Browser schließen und kein Passwort im Browser speichern.

## PDF-Import

Eine PDF wird erst nach deiner ausdrücklichen Einwilligung ausgewählt und verarbeitet. Die Anwendung begrenzt die Größe, zeigt eine redigierte Vorschau und warnt bei erkannten sensiblen Mustern. Vor der Übernahme prüfst du Inhalt und Datenschutz selbst.

Im lokalen Entwicklungsbetrieb erfolgt die Verarbeitung im lokalen Dienst. Statische Bereitstellungen – etwa die GitHub-Pages-Demo – enthalten diesen Dienst nicht und können deshalb keine PDF verarbeiten. Wenn du die Anwendung anders bereitstellst, muss vorher klar sein, wo die PDF verarbeitet wird und welche Daten das Gerät verlassen könnten. Der Dienst sollte Poppler und Tesseract isoliert, mit Ressourcenlimits und ohne dauerhafte Dateiablage ausführen.

## Backups und Wiederherstellung

Vollbackups enthalten Arbeitsstände, Archive und – falls vorhanden – Schülerdaten. Du verschlüsselst sie mit einem selbst gewählten Passwort. Die Anwendung zeigt den Import vor dem Ersetzen an, verlangt eine Bestätigung und bietet eine Vorab-Sicherung an.

Ein Backup-Passwort kann nicht wiederhergestellt werden. Teste eine wichtige Sicherung gelegentlich in einem getrennten Browserprofil.
