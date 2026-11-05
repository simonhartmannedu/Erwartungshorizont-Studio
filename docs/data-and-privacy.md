# Datenschutz und Datenhaltung

EWH-Studio verarbeitet Arbeitsstände und Schülerdaten grundsätzlich lokal im Browser. Es gibt kein verpflichtendes Benutzerkonto, keine zentrale Schülerdatenbank und keine Telemetrie.

## Wo Daten liegen

| Daten | Speicherort |
| --- | --- |
| Klassenarbeiten, Archive und Schülerdaten | sql.js-Datenbank in IndexedDB des Browsers |
| Darstellung und Backup-Status | `localStorage` des Browsers |
| Ausgewählte Sicherungs- und Nextcloud-Ordner | Browser-Ordnerfreigaben in IndexedDB; keine Datei- oder Zugangsdaten |
| Sicherungen | von dir heruntergeladene, verschlüsselte Datei |
| Optionale Nextcloud-Ablage | ausschließlich eine neu erzeugte, verschlüsselte Backup-Datei im lokal synchronisierten und schulisch freigegebenen Nextcloud-Ordner |

Löscht du Browserdaten, verwendest ein privates Fenster oder wechselst das Gerät, können lokale Daten verloren gehen. Deshalb sind regelmäßige verschlüsselte Backups wichtig.

## Was speichern, wann?

- **Automatisches Speichern:** während der Arbeit. Änderungen liegen direkt im aktuellen Browser und benötigen keinen zusätzlichen Klick.
- **EWH-Version:** vor größeren Änderungen an Aufgaben, Punkten oder Notenschlüssel. Sie stellt nur einen früheren Erwartungshorizont wieder her, keine Schülerpunkte.
- **Vollbackup:** regelmäßig, nach einer abgeschlossenen Korrektur und vor einem Geräte- oder Browserwechsel. Die verschlüsselte Datei enthält Arbeitsstände, EWH-Versionen, Archiv und Schülerdaten.

## Schutz geschützter Lerngruppen

Geschützte Lerngruppen speichern Namen verschlüsselt. Punkte, Kommentare, Unterschriften, Teilnahmestatus und Antwortbogencodes je Klassenarbeit liegen beim Speichern verschlüsselt vor. Für die aktive, entsperrte Gruppe werden diese Werte im JavaScript-Arbeitsspeicher bereitgestellt; beim Sperren werden sie dort entfernt und erneut verschlüsselt gespeichert. Nach 15 Minuten ohne Aktivität sperrt die Anwendung entsperrte Gruppen automatisch. Die globale Suche lädt Klarnamen nur für aktuell entsperrte Lerngruppen; beim Sperren oder automatischen Sitzungs-Timeout werden diese Suchdaten und die aktuelle Suchanfrage verworfen. Gruppenpasswörter und Backup-Passwörter werden nicht dauerhaft gespeichert.

Auf einem gemeinsam genutzten Gerät: Gruppe nach der Korrektur sperren, Browser schließen und kein Passwort im Browser speichern.

### Technische Einordnung der Verschlüsselung

Die Verschlüsselung findet im Browser mit Web Crypto statt: Aus dem Passwort wird mit PBKDF2-HMAC-SHA-256 (250.000 Iterationen und zufälligem 16-Byte-Salt) ein AES-256-GCM-Schlüssel abgeleitet. Jede Verschlüsselung verwendet zusätzlich einen zufälligen 12-Byte-Initialisierungsvektor. Das Verfahren schützt gespeicherte geschützte Gruppendaten und verschlüsselte Backups; es ersetzt keinen Schutz gegen ein kompromittiertes oder bereits entsperrtes Gerät.

## Backups und Wiederherstellung

Vollbackups enthalten Arbeitsstände, Archive und – falls vorhanden – Schülerdaten. Du verschlüsselst sie mit einem selbst gewählten Passwort. Die Anwendung prüft beim Import zuerst Datei, Passwort und Inhalt, zeigt eine Vorschau vor dem Ersetzen an und bietet eine Vorab-Sicherung an.

Ein Backup-Passwort kann nicht wiederhergestellt werden. Teste eine wichtige Sicherung gelegentlich in einem getrennten Browserprofil. Dateiname sowie Format, Version und Erstellzeit der Backup-Datei sind nicht verschlüsselt; wähle deshalb auch den Speicherort bewusst.

### Nextcloud-Ordner für freigegebene Speicherorte

Die optionale Nextcloud-Funktion verbindet einen lokalen Ordner, der bereits durch den Nextcloud-Desktop-Client synchronisiert wird. EWH-Studio legt dort nur neu erzeugte, lokal verschlüsselte Vollbackups ab. Der Desktop-Client der Schule übernimmt die Übertragung. EWH-Studio erhält und speichert weder WebDAV-Adresse noch Nextcloud-Benutzernamen oder -Passwörter; im Browser liegt nur die Ordnerfreigabe. Sie erlaubt das Lesen des Ordners für die lokale Backup-Übersicht; Schreibzugriff fragt der Browser erst beim ausdrücklichen Speichern ab.

Die Ordnerverbindung benötigt einen Browser mit Dateisystemzugriff (derzeit insbesondere Chromium-basierte Browser wie Edge oder Chrome). In anderen Browsern bleibt das verschlüsselte Download-Backup verfügbar. Auf einem weiteren Gerät muss der Nextcloud-Desktop-Client den Ordner zuerst lokal synchronisieren; anschließend wählst du ihn dort ebenfalls ausdrücklich aus.

Du bzw. deine Schule verantwortet die Freigabe des gewählten Cloud-Speichers, dessen Serverstandort, Zugriffsrechte, Auftragsverarbeitung, Verzeichnis der Verarbeitungstätigkeiten und die Datenschutzprüfung. Vor der Nutzung mit Schülerdaten muss der Speicher durch Schule oder Schulträger freigegeben sein. EWH-Studio übernimmt keine Gewähr für Verfügbarkeit oder Sicherheitskonfiguration fremder Cloud-Speicher.

Office 365, OneDrive und iCloud werden nicht angebunden.
