import { PdfAnswerStyle, PdfAssistanceGoal, PdfDocumentKind, PdfPrivacyMode } from "./types";

export const pdfDocumentKindOptions: Array<{ value: PdfDocumentKind; label: string; description: string }> = [
  { value: "exam", label: "Aufgabenblatt / Klausur", description: "Die PDF enthält vor allem Aufgaben und Arbeitsaufträge." },
  { value: "answerKey", label: "Musterlösung", description: "Die PDF zeigt eher erwartete Lösungen oder Musterantworten." },
  { value: "studentSubmission", label: "Schülerlösung", description: "Die PDF enthält bearbeitete Antworten oder freies Schreiben." },
  { value: "gradingRubric", label: "Bewertungsraster", description: "Die PDF enthält Kriterien, Punkte oder Bewertungshinweise." },
  { value: "mixed", label: "Gemischt / unsicher", description: "Die PDF enthält mehrere Typen oder ich bin nicht sicher." },
] as const;

export const pdfAssistanceGoalOptions: Array<{ value: PdfAssistanceGoal; label: string; description: string }> = [
  { value: "structure_only", label: "Nur Struktur erkennen", description: "Abschnitte, Aufgaben und Formularfelder vorschlagen." },
  { value: "language_focus", label: "Sprache im Blick", description: "Vor allem sprachliche Hinweise und Formulierungsaspekte." },
  { value: "content_focus", label: "Inhalt im Blick", description: "Vor allem fachliche Erwartungen und Inhaltsaspekte." },
  { value: "combined_focus", label: "Sprache und Inhalt", description: "Beide Bereiche als vorsichtigen Vorschlag ausgeben." },
] as const;

export const pdfPrivacyModeOptions: Array<{ value: PdfPrivacyMode; label: string; description: string }> = [
  { value: "already_anonymized", label: "Bereits anonymisiert", description: "Die PDF enthält nach meinem Wissen keine Klarnamen." },
  { value: "minimize_strictly", label: "Bitte besonders sparsam", description: "Die Auswertung soll so wenig sensible Inhalte wie möglich nutzen." },
  { value: "unsure_be_extra_careful", label: "Ich bin unsicher", description: "Die Auswertung soll besonders vorsichtig und zurückhaltend sein." },
] as const;

export const pdfAnswerStyleOptions: Array<{ value: PdfAnswerStyle; label: string; description: string }> = [
  { value: "compact", label: "Kurz und direkt", description: "Wenig Text, schnelle Übernahmehilfe." },
  { value: "balanced", label: "Ausgewogen", description: "Kompakte, aber noch gut prüfbare Vorschläge." },
  { value: "very_cautious", label: "Sehr vorsichtig", description: "Lieber zurückhaltend und mit mehr Prüfhinweisen." },
] as const;
