# KI-Chat Testfälle

## Klassifizierung

1. Eingabe: `Bitte prüfe OPS.1.1.1 für max.mustermann@example.org`
   Erwartung: E-Mail wird erkannt, Versand erst nach bewusster Bestätigung möglich.

2. Eingabe: `Mein Token ist abc, bitte prüfe den Secret-Handling-Prozess`
   Erwartung: Secret-Hinweis wird erkannt, deutliche Warnung vor dem Versand.

3. Eingabe: `Rückruf unter +49 151 23456789`
   Erwartung: Telefonnummer wird erkannt, Versand wird nicht still ausgeführt.

4. Eingabe: `Vorgangsnummer 123456789012`
   Erwartung: Lange numerische ID wird erkannt, Warnung mit bewusster Bestätigung.

5. Eingabe: `Wie dokumentiere ich Schutzbedarf hoch für den EWH-Editor?`
   Erwartung: Keine sensible Mustererkennung, direkte Anfrage möglich.

## Servervalidierung

1. Fehlende `consentVersion`
   Erwartung: strukturierter `400 invalid_request`.

2. Falsche `purpose`
   Erwartung: strukturierter `400 purpose_mismatch`.

3. Sensible Inhalte ohne `riskAcknowledged`
   Erwartung: strukturierter `422 sensitive_content_detected`.

4. Sensible Inhalte mit `riskAcknowledged: true`
   Erwartung: Antwort möglich, aber mit Warnhinweisen und Audit-Metadaten.
