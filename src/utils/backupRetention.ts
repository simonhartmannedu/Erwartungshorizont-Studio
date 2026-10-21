/** Central, deliberately general guidance. This view has no reliable data about when teaching ended. */
export const BACKUP_RETENTION_NOTICE = {
  summary: "Personenbezogene Daten haben Löschfristen. Prüfe auch ältere Sicherungen und weitere Kopien. Das Sicherungsdatum allein bestimmt keine Löschfrist.",
  sourceLabel: "§ 9 VO-DV I (amtliche NRW-Quelle)",
  sourceUrl: "https://bass.schule.nrw/101.htm",
  sourceStatus: "Quellenstand: § 9 VO-DV I, abgerufen für diese Hinweistexte.",
  details: [
    "Für Privatgeräte nennt § 9 Absatz 2 eine einjährige Aufbewahrungsfrist. Sie beginnt erst mit Ablauf des Kalenderjahres, in dem die Lehrkraft die betreffenden Lernenden nicht mehr unterrichtet.",
    "Dieses Unterrichtsende wird weder aus dem Schuljahresende noch aus dem Sicherungsdatum abgeleitet. Neue Sicherungen oder Wiederherstellungen starten die Frist nicht neu.",
    "Für Dienstgeräte und schulische Aufbewahrung gelten nicht pauschal dieselben Regeln. Reine Vorlagen ohne personenbezogene Daten sind gesondert zu betrachten.",
    "Gemischte Gesamtsicherungen können Daten mit unterschiedlichen Fristen enthalten. Deshalb zeigt diese Übersicht ohne verlässlichen Kontext nur: Löschfrist prüfen.",
    "Das Entfernen eines Eintrags aus einer Übersicht würde keine Datei löschen; diese Version bietet weder Dateilöschung noch automatisches Bereinigen. Das Löschen aktiver Daten entfernt auch keine älteren Sicherungskopien.",
  ],
} as const;
