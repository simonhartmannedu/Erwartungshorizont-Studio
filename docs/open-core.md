# Open-Core-Abgrenzung

## Community-Kern

Der Community-Kern ist unter `AGPL-3.0-only` vollständig nutzbar. Er umfasst dauerhaft:

- Erwartungshorizonte, Lerngruppen, Bewertungen, Punkte und Kommentare;
- Archive, Backup, Restore, lokale Speicherung und lokale Verschlüsselung;
- Offlinebetrieb und Datenmigrationen;
- PDF-, DOCX-, XLSX-, ODS- und CSV-Export sowie Druck;
- Accessibility-Basis und Kern-Templates.

Diese Funktionen dürfen weder künstlich begrenzt noch von Cloud, Konto, Lizenzserver, Zahlung, Telemetrie oder proprietärem Code abhängig gemacht werden. Zugriff auf eigene Daten, lokale Exporte, Wiederherstellung und Löschung eigener Daten bleiben Kernrechte.

## Architekturelle Grenze

Die aktuelle Einzel-Repository-Struktur bereitet folgende Grenze vor:

```text
src/
  app/             # Composition root und lokale App-Shell
  domain/          # Community-Fachlogik: keine Lizenzprüfungen
  infrastructure/  # lokale Storage-, Crypto-, Import-/Export-Adapter
  shared/          # Community-Typen, Hooks und UI-Bausteine
  features/        # Community-Workflows
  integrations/    # zukünftige optionale, klar begrenzte Adapter
  enterprise/      # derzeit nicht vorhanden; nur Erweiterungen, nie Kernabhängigkeit
```

`domain`, lokale `infrastructure` und die für lokale Workflows nötigen Feature-/Shared-Teile sind Community-Code. Ein künftiges Enterprise-Modul darf ausschließlich über explizite Interfaces ergänzen. Es darf keine Imports in den Kern erzwingen, keine Feature-Prüfungen in Domain-Commands platzieren und keine Persistenzformate ohne offene Migrations- und Exportmöglichkeit besitzen.

## Durchsetzbare Leitplanken

1. Kern-Imports zeigen nie auf Enterprise-Code.
2. Kern-Commands enthalten keine Lizenz- oder Account-Prüfungen.
3. Lokale Datenformate bleiben dokumentiert, exportierbar und migrationsfähig.
4. Erweiterungen dürfen den Kern erweitern, nicht ersetzen.
5. Neue Abhängigkeiten benötigen eine Lizenz- und Kompatibilitätsprüfung.

Es werden mit dieser Dokumentation keine Enterprise-Funktionen implementiert.
