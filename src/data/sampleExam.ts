import { Exam, Section, Task } from "../types";
import { createDefaultGradeScale } from "../utils/grades";

const createTask = (
  title: string,
  maxPoints: number,
  category: string,
  description: string,
  expectation: string,
  achievedPoints = 0,
): Task => ({
  id: crypto.randomUUID(),
  title,
  description,
  category,
  maxPoints,
  achievedPoints,
  expectation,
});

const createSection = (
  title: string,
  weight: number,
  description: string,
  note: string,
  tasks: Task[],
): Section => ({
  id: crypto.randomUUID(),
  title,
  description,
  weight,
  linkedSectionId: null,
  maxPointsOverride: null,
  note,
  tasks,
});

export const sampleExam: Exam = {
  id: crypto.randomUUID(),
  meta: {
    schoolYear: "2025/2026",
    subject: "Englisch",
    gradeLevel: "8",
    course: "8b",
    teacher: "M. Beispiel",
    examDate: "2026-03-23",
    title: "Englisch-Klassenarbeit Unit 4",
    unit: "Unit 4 · New Media and Communication",
    notes: "Bewertung gemäß schulinterner Englisch-Fachkonferenz. Alle Teilbereiche bleiben vollständig editierbar.",
  },
  evaluationMode: "direct",
  gradeScale: createDefaultGradeScale(),
  printSettings: {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  },
  sections: [
    createSection(
      "Teil A: Leseverstehen",
      30,
      "Leseverstehen auf Grundlage eines altersgerechten Textauszugs.",
      "Als Textgrundlage eignen sich zum Beispiel Blogeintrag, Artikel, Interview oder Erzähltext mit klaren Operatoren.",
      [
        createTask(
          "Richtig / Falsch mit Begründung",
          10,
          "Leseverstehen",
          "Entscheide, ob Aussagen richtig oder falsch sind, und begründe falsche Aussagen knapp.",
          "Die Begründungen sollen sich auf passende Textstellen stützen und nicht auf Vermutungen beruhen.",
          8,
        ),
        createTask(
          "Multiple Choice",
          10,
          "Leseverstehen",
          "Wähle die beste Antwort zu Fragen zum Textverständnis aus.",
          "Die Fragen sollten Hauptaussage, Details und gegebenenfalls implizite Informationen abdecken.",
          7,
        ),
        createTask(
          "Kurze Antworten",
          10,
          "Leseverstehen",
          "Beantworte Fragen in kurzen, präzisen Sätzen möglichst in eigenen Worten.",
          "Die Antworten sollen textnah sein, aber Verständnis zeigen statt ganze Zeilen zu übernehmen.",
          6,
        ),
      ],
    ),
    createSection(
      "Teil B: Sprache",
      20,
      "Eigenständige Grammatikaufgabe ohne Bezug zur Schreibaufgabe.",
      "Dieser Teil bildet ausschließlich die Grammatikleistung ab und steht unabhängig vom Schreibteil.",
      [
        createTask(
          "Grammatik",
          20,
          "Sprache",
          "Grammatische Richtigkeit, Satzbau und passende Strukturen.",
          "Achte auf Zeiten, Satzstellung, Nebensätze, Fragen, Verneinung und korrekte grammatische Formen.",
          15,
        ),
      ],
    ),
    createSection(
      "Teil C: Schreiben",
      20,
      "Schreibaufgabe mit Schwerpunkt auf Inhalt und Aufbau.",
      "Dieser Schreibteil bündelt Inhalt und Aufbau; die sprachliche Bewertung liegt im folgenden Sprach-Teil.",
      [
        createTask(
          "Inhalt",
          10,
          "Schreiben",
          "Aufgabenerfüllung, inhaltliche Relevanz und nachvollziehbare Ausgestaltung.",
          "Die Antwort erfüllt die Aufgabenstellung vollständig, enthält passende Inhalte und entwickelt Gedanken nachvollziehbar.",
          8,
        ),
        createTask(
          "Aufbau",
          10,
          "Schreiben",
          "Struktur, Absatzbildung, Kohärenz und passende Textsortenmerkmale.",
          "Der Text soll klar gegliedert sein und zur geforderten Textsorte passen, zum Beispiel E-Mail oder Stellungnahme.",
          7,
        ),
      ],
    ),
    createSection(
      "Teil D: Sprache",
      30,
      "Sprachbewertung der Schreibaufgabe mit vier festen Teilbereichen.",
      "Dieser Teil bildet die sprachliche Bewertung des Schreibens in Grammatik, Wortschatz, Rechtschreibung und Ausdrucksvermögen ab.",
      [
        createTask(
          "Grammatik",
          7.5,
          "Sprache im Schreiben",
          "Grammatische Richtigkeit, Satzbau und passende Strukturen im Schreibprodukt.",
          "Bewertet werden korrekte Zeiten, Satzmuster, Verknüpfungen und grammatische Sicherheit im Text.",
          6.5,
        ),
        createTask(
          "Wortschatz",
          7.5,
          "Sprache im Schreiben",
          "Treffsichere, abwechslungsreiche und zur Schreibaufgabe passende Wortwahl.",
          "Bewertet werden Wortschatzbreite, Angemessenheit, idiomatische Wendungen und Präzision.",
          6.5,
        ),
        createTask(
          "Rechtschreibung",
          7.5,
          "Sprache im Schreiben",
          "Orthografie, Zeichensetzung und formale sprachliche Genauigkeit im Text.",
          "Achte auf korrekt geschriebene Wörter, sinnvolle Zeichensetzung und formale Genauigkeit.",
          7,
        ),
        createTask(
          "Ausdrucksvermögen",
          7.5,
          "Sprache im Schreiben",
          "Sprachliche Variabilität, Klarheit und angemessener stilistischer Ausdruck.",
          "Bewertet werden differenzierte Formulierungen, sprachliche Flexibilität und ein passender Stil.",
          6.5,
        ),
      ],
    ),
  ],
};
