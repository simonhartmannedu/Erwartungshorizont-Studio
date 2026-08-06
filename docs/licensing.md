# Lizenzierung: AGPL-3.0 und Open Core

Der EWH-Studio Community-Kern ist unter der GNU Affero General Public License, Version 3 **nur dieser Version** (`AGPL-3.0-only`) lizenziert. Der vollständige, unveränderte Lizenztext steht in [LICENSE](../LICENSE).

Diese Dokumentation stellt keine Rechtsberatung dar.

## Warum AGPL?

Die AGPL schützt den lokalen Community-Kern und hält Verbesserungen an abgeleiteten Versionen offen, wenn sie weitergegeben werden. Besonders wichtig ist Abschnitt 13: Wer eine geänderte Version als Netzwerkdienst anbietet, muss den Nutzenden dieses Dienstes den entsprechenden Quellcode zugänglich machen. Das erschwert proprietäre SaaS-Forks des Kerns und fördert Rückflüsse in die Community.

Die Lizenz ändert nicht das Produktprinzip: Lehrkräfte und Schulen können den Kern lokal, ohne Konto und ohne Cloud nutzen.

## Warum kein MIT, Apache, MPL oder PolyForm?

- **Nicht MIT:** Die sehr freizügige Lizenz verlangt keine Offenlegung abgeleiteter, auch nicht gehosteter Versionen.
- **Nicht Apache-2.0:** Sie enthält eine wertvolle Patentregelung, ist aber ebenfalls kein Copyleft und schützt keinen gehosteten Fork.
- **Nicht MPL-2.0:** Ihr dateibezogenes Copyleft ist für eine modulare Community hilfreich, lässt aber größere proprietäre Kombinationen und Dienste leichter zu.
- **Nicht PolyForm Noncommercial:** Eine Noncommercial-Lizenz ist nicht Open Source nach OSI-Verständnis und beschränkt auch nützliche gewerbliche Nutzung, etwa Dienstleistung oder Support. Sie passt nicht zum dauerhaft freien Community-Kern.

## Rechte der Nutzer

Sie dürfen den Community-Kern ausführen, kopieren, untersuchen, ändern und weitergeben. Bei Weitergabe gelten insbesondere die AGPL-Pflichten: Lizenz- und Copyright-Hinweise erhalten, vollständigen entsprechenden Quellcode bereitstellen und abgeleitete Gesamtwerke unter AGPL weitergeben. Die konkrete Anwendung der Lizenz hängt vom Einzelfall ab.

## Rechte von Schulen

Schulen dürfen den Kern kostenlos lokal nutzen, selbst hosten, ändern und Dienstleister damit beauftragen. Es gibt keine verpflichtende Cloud, kein verpflichtendes Konto und keine künstlichen Datenlimits im Kern. Wenn eine Schule oder ein Dienstleister eine geänderte Netzwerkversion für Nutzende betreibt, sind die Pflichten aus AGPL Abschnitt 13 zu beachten.

## Rechte von Entwicklern

Entwickler dürfen Forks erstellen und Beiträge einreichen. Beiträge werden unter `AGPL-3.0-only` eingebracht. Ein DCO-`Signed-off-by` bestätigt, dass der Beitrag dazu berechtigt ist; ein CLA ist nicht vorgesehen. Details: [CONTRIBUTING.md](../CONTRIBUTING.md).

## Häufige Fragen

### Darf kommerzieller Support angeboten werden?

Ja. Die AGPL verbietet weder kommerzielle Nutzung noch kostenpflichtigen Support. Sie begrenzt jedoch nicht die Rechte anderer am Community-Kern.

### Darf eine veränderte Version als Webdienst angeboten werden?

Ja, unter den Bedingungen der AGPL. Bei Remote-Nutzung muss der entsprechende Quellcode der laufenden geänderten Version zugänglich gemacht werden.

### Bedeutet Open Core, dass Kernfunktionen später kostenpflichtig werden?

Nein. Die in [open-core.md](open-core.md) genannten Kernfunktionen bleiben vollständig lokal nutzbar. Optionale Erweiterungen dürfen sie nicht ersetzen, sperren oder von Cloud, Konto, Lizenzserver oder Zahlungsfunktion abhängig machen.

### Gilt die AGPL automatisch für Drittinhalte?

Nein. Abhängigkeiten, Fonts, Icons und sonstige Drittinhalte behalten ihre eigenen Lizenzen. Vor einer Veröffentlichung oder neuen Abhängigkeit müssen deren Bedingungen geprüft und Hinweise erhalten werden.

## Lizenzhinweise im Produkt

Die Browser-Anwendung zeigt im Footer den AGPL-Hinweis, eine ausgelieferte Lizenzseite und einen Quellcode-Link. Das erfüllt die vorgesehenen sichtbaren Legal Notices, ohne Schülerdaten oder Telemetrie einzuführen.
