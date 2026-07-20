import { BuilderSchoolStage } from "../data/builderResearch";
import { Exam, Section, Task } from "../types";
import { createDefaultGradeScale } from "../utils/grades";

const createTask = (
  title: string,
  maxPoints: number,
  category: string,
  description: string,
  expectation = "",
): Task => ({
  id: crypto.randomUUID(),
  title,
  description,
  category,
  maxPoints,
  achievedPoints: 0,
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

const createBaseExam = ({
  title,
  unit,
  notes,
  gradeLevel,
  course,
  subject = "Englisch",
  schoolYear = "2025/2026",
}: {
  title: string;
  unit: string;
  notes: string;
  gradeLevel: string;
  course: string;
  subject?: string;
  schoolYear?: string;
}): Omit<Exam, "sections"> => ({
  id: crypto.randomUUID(),
  meta: {
    schoolYear,
    subject,
    gradeLevel,
    course,
    teacher: "M. Beispiel",
    examDate: new Date().toISOString().slice(0, 10),
    title,
    unit,
    notes,
  },
  evaluationMode: "direct",
  gradeScale: createDefaultGradeScale(),
  printSettings: {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  },
});

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

const distributePoints = (total: number, count: number) => {
  const base = Math.floor(total / count);
  const remainder = total - base * count;

  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
};

const templateSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface TemplateTaskSeed {
  title: string;
  points?: number;
  description: string;
  expectation: string;
}

interface TemplateSectionSeed {
  title: string;
  points: number;
  description: string;
  note: string;
  tasks: TemplateTaskSeed[];
}

type TemplateFocus = "general" | "abitur";

interface TemplateBlueprint {
  id: string;
  subject: string;
  schoolStage: BuilderSchoolStage;
  focus: TemplateFocus;
  title: string;
  shortLabel: string;
  description: string;
  pedagogicalHint: string;
  standardsNote?: string;
  metaTitle: string;
  unit: string;
  notes: string;
  gradeLevel: string;
  course: string;
  totalPoints: number;
  sections: TemplateSectionSeed[];
}

export interface ExamTemplateDefinition {
  id: string;
  subject: string;
  schoolStage: BuilderSchoolStage;
  focus: TemplateFocus;
  totalPoints: number;
  title: string;
  shortLabel: string;
  description: string;
  pedagogicalHint: string;
  standardsNote?: string;
  previewSections: Array<{
    title: string;
    points: number;
    tasks: string[];
  }>;
  build: () => Exam;
}

const resolveTaskPoints = (section: TemplateSectionSeed) => {
  const explicitTotal = section.tasks.reduce((sum, task) => sum + (typeof task.points === "number" ? task.points : 0), 0);
  const implicitTasks = section.tasks.filter((task) => typeof task.points !== "number");

  if (implicitTasks.length === 0) {
    return section.tasks.map((task) => task.points ?? 0);
  }

  const distributed = distributePoints(Math.max(0, section.points - explicitTotal), implicitTasks.length);
  let distributedIndex = 0;

  return section.tasks.map((task) => {
    if (typeof task.points === "number") return task.points;
    const points = distributed[distributedIndex] ?? 0;
    distributedIndex += 1;
    return points;
  });
};

const createTemplateDefinition = (blueprint: TemplateBlueprint): ExamTemplateDefinition => ({
  id: blueprint.id,
  subject: blueprint.subject,
  schoolStage: blueprint.schoolStage,
  focus: blueprint.focus,
  totalPoints: blueprint.totalPoints,
  title: blueprint.title,
  shortLabel: blueprint.shortLabel,
  description: blueprint.description,
  pedagogicalHint: blueprint.pedagogicalHint,
  standardsNote: blueprint.standardsNote,
  previewSections: blueprint.sections.map((section) => ({
    title: section.title,
    points: section.points,
    tasks: section.tasks.map((task) => task.title),
  })),
  build: () => ({
    ...createBaseExam({
      title: blueprint.metaTitle,
      unit: blueprint.unit,
      notes: blueprint.notes,
      gradeLevel: blueprint.gradeLevel,
      course: blueprint.course,
    }),
    sections: blueprint.sections.map((section) => {
      const taskPoints = resolveTaskPoints(section);
      return createSection(
        section.title,
        roundToTwo((section.points / blueprint.totalPoints) * 100),
        section.description,
        section.note,
        section.tasks.map((task, index) =>
          createTask(task.title, taskPoints[index] ?? 0, section.title, task.description, task.expectation),
        ),
      );
    }),
  }),
});

const additionalModernForeignLanguages = [
  { subject: "Französisch", short: "F" },
  { subject: "Spanisch", short: "S" },
] as const;

const additionalClassicalLanguages = [
  { subject: "Lateinisch", short: "L" },
] as const;

const additionalMaterialSubjects = [
  { subject: "Geographie", short: "Geo" },
  { subject: "Sozialwissenschaften", short: "Sowi" },
  { subject: "Philosophie", short: "Phil" },
] as const;

const createModernForeignLanguageSek1Blueprint = ({ subject, short }: { subject: string; short: string }): TemplateBlueprint => ({
  id: `${templateSlug(subject)}-sek1-kompetenzen`,
  subject,
  schoolStage: "sek1",
  focus: "general",
  title: `${subject} Sek I · Kompetenzorientierte Klassenarbeit`,
  shortLabel: `${short} Sek I`,
  description: "Sek-I-Vorlage mit Rezeption, Sprache, Schreiben und sprachlicher Leistung.",
  pedagogicalHint:
    "Als Startstruktur für moderne Fremdsprachen: Rezeptionsaufgabe, kontrollierte Sprache und produktiver Schreibteil bleiben getrennt.",
  metaTitle: `${subject}-Klassenarbeit Sek I`,
  unit: "Rezeption, Sprache und Schreiben",
  notes:
    "Sek-I-Vorlage moderne Fremdsprache. Kompetenzschwerpunkt, Textsorte und genaue Punkteverteilung an Jahrgang, Lehrwerk und Fachkonferenz anpassen.",
  gradeLevel: "8",
  course: "8",
  totalPoints: 100,
  sections: [
    {
      title: "Teil A: Rezeption",
      points: 30,
      description: "Lese-, Hör- oder Sprachmittlungsaufgabe als materialgebundener Auftakt.",
      note: "Den Teil je nach Klassenarbeit auf Lesen, Hören oder Sprachmittlung zuschneiden.",
      tasks: [
        {
          title: "Globalverstehen",
          description: "Hauptaussage, Situation und kommunikative Absicht erfassen.",
          expectation: "Das Gesamtverständnis des Materials ist sicher erkennbar.",
        },
        {
          title: "Detailverstehen",
          description: "Relevante Einzelinformationen korrekt entnehmen und zuordnen.",
          expectation: "Details werden präzise, materialnah und nicht geraten wiedergegeben.",
        },
      ],
    },
    {
      title: "Teil B: Sprache",
      points: 20,
      description: "Kontrollierte Sprachverwendung in Grammatik und Wortschatz.",
      note: "Typisch sind Formenbildung, Satzbau, Wortschatz im Kontext oder Umformung.",
      tasks: [
        {
          title: "Grammatik",
          description: "Zielstrukturen passend und korrekt anwenden.",
          expectation: "Die Sprachstrukturen werden sicher gebildet und funktional eingesetzt.",
        },
        {
          title: "Wortschatz",
          description: "Wortschatz im Kontext verstehen und passend verwenden.",
          expectation: "Die Wortwahl ist verständlich, thematisch passend und korrekt.",
        },
      ],
    },
    {
      title: "Teil C: Schreiben",
      points: 25,
      description: "Produktive Schreibaufgabe mit Inhalt, Aufbau und Textsortenbezug.",
      note: "Textsorten wie E-Mail, Nachricht, Blogeintrag, Kommentar oder Dialog anpassen.",
      tasks: [
        {
          title: "Inhalt",
          description: "Die Schreibaufgabe vollständig und adressatenbezogen umsetzen.",
          expectation: "Alle geforderten Aspekte sind sinnvoll bearbeitet.",
        },
        {
          title: "Aufbau und Textsorte",
          description: "Den Text logisch gliedern und textsortengerecht gestalten.",
          expectation: "Der Text ist klar strukturiert und passt zur Schreibsituation.",
        },
      ],
    },
    {
      title: "Teil D: Sprachliche Leistung",
      points: 25,
      description: "Sprachrichtigkeit, Ausdruck, Kohärenz und formale Sicherheit.",
      note: "Sprachliche Leistung getrennt vom Inhalt des Schreibteils ausweisen.",
      tasks: [
        {
          title: "Korrektheit",
          description: "Grammatik, Rechtschreibung und Satzbau bewerten.",
          expectation: "Die sprachliche Form bleibt verständlich und überwiegend korrekt.",
        },
        {
          title: "Ausdruck und Kohärenz",
          description: "Wortschatz, Verknüpfungen und Leseführung bewerten.",
          expectation: "Die Darstellung ist zusammenhängend und angemessen formuliert.",
        },
      ],
    },
  ],
});

const createClassicalLanguageBlueprint = (
  { subject, short }: { subject: string; short: string },
  stage: BuilderSchoolStage,
  focus: TemplateFocus,
): TemplateBlueprint => ({
  id: `${templateSlug(subject)}-${focus === "abitur" ? "abitur" : stage}-textarbeit`,
  subject,
  schoolStage: stage,
  focus,
  title: `${subject} ${focus === "abitur" ? "Abitur" : stage === "sek1" ? "Sek I" : "Sek II"} · Textarbeit`,
  shortLabel: `${short} ${focus === "abitur" ? "Abi" : stage === "sek1" ? "Sek I" : "Sek II"}`,
  description: "Vorlage für Texterschließung, Übersetzung, Interpretation und Sprach-/Sachwissen.",
  pedagogicalHint:
    "Für alte Sprachen als Startstruktur: Übersetzung und Interpretation getrennt bewerten, Sprachwissen und Darstellung sichtbar halten.",
  metaTitle: `${subject}-${focus === "abitur" ? "Abiturtraining" : "Klausur"}`,
  unit: "Texterschließung, Übersetzung und Interpretation",
  notes:
    "Vorlage für alte Sprachen. Aufgabenart, Übersetzungsanteil, Hilfsmittel und konkrete Punkteverteilung an Standardsicherung, Kernlehrplan und Fachkonferenz anpassen.",
  gradeLevel: focus === "abitur" ? "Q2" : stage === "sek1" ? "9" : "Q1",
  course: focus === "abitur" ? "GK / LK" : stage === "sek1" ? "9" : "GK",
  totalPoints: focus === "abitur" || stage === "sek2" ? 120 : 100,
  sections: [
    {
      title: "Teil A: Texterschließung",
      points: focus === "abitur" || stage === "sek2" ? 25 : 20,
      description: "Ausgangstext vorentlasten, Sinnabschnitte sichern und sprachliche Signale nutzen.",
      note: "Material, Vokabelhilfen und Operatorik konkret eintragen.",
      tasks: [
        {
          title: "Vorerschließung",
          description: "Inhalt, Situation, Formen oder Strukturmerkmale erschließen.",
          expectation: "Die Erschließung bereitet die Übersetzung fachlich tragfähig vor.",
        },
      ],
    },
    {
      title: "Teil B: Übersetzung",
      points: focus === "abitur" || stage === "sek2" ? 45 : 40,
      description: "Text angemessen und sprachlich korrekt ins Deutsche übertragen.",
      note: "Bewertungskriterien der Fachkonferenz und ggf. Fehlergewichtung eintragen.",
      tasks: [
        {
          title: "Sinn und Struktur übertragen",
          description: "Textinhalt, Satzbau und sprachliche Beziehungen sachgerecht übersetzen.",
          expectation: "Die Übersetzung ist verständlich, textnah und grammatisch abgesichert.",
        },
      ],
    },
    {
      title: "Teil C: Interpretation und Kultur",
      points: focus === "abitur" || stage === "sek2" ? 35 : 25,
      description: "Text deuten, sprachlich analysieren und kulturhistorisch einordnen.",
      note: "Autor, Gattung, Thema und Halbjahresbezug ergänzen.",
      tasks: [
        {
          title: "Analyse und Deutung",
          description: "Sprache, Aufbau, Figuren, Argumentation oder Motive untersuchen.",
          expectation: "Deutungen sind textbezogen, fachsprachlich und nachvollziehbar.",
        },
        {
          title: "Sachwissen anwenden",
          description: "Kulturelles, historisches oder literarisches Wissen funktional einbinden.",
          expectation: "Sachwissen unterstützt die Interpretation und bleibt aufgabenbezogen.",
        },
      ],
    },
    {
      title: "Teil D: Darstellung",
      points: focus === "abitur" || stage === "sek2" ? 15 : 15,
      description: "Struktur, Fachsprache und sprachliche Qualität der deutschen Darstellung.",
      note: "Darstellungsleistung getrennt ausweisen, wenn die Fachvorgabe dies verlangt.",
      tasks: [
        {
          title: "Fachsprache und Kohärenz",
          description: "Gedankengang, Fachbegriffe und sprachliche Richtigkeit bewerten.",
          expectation: "Die Darstellung ist klar, präzise und fachlich angemessen.",
        },
      ],
    },
  ],
});

const createModernForeignLanguageSek2Blueprint = ({ subject, short }: { subject: string; short: string }): TemplateBlueprint => ({
  id: `${templateSlug(subject)}-sek2-sprachmittlung-schreiben`,
  subject,
  schoolStage: "sek2",
  focus: "general",
  title: `${subject} Sek II · Sprachmittlung + Schreiben`,
  shortLabel: `${short} Sek II`,
  description: "GOSt-Startvorlage moderne Fremdsprache: Sprachmittlung 50 + Schreiben/Leseverstehen 110.",
  pedagogicalHint:
    "Für moderne Fremdsprachen in der Q-Phase: Sprachmittlung getrennt bewerten, Schreibteil separat mit Inhalt und Darstellungsleistung führen.",
  standardsNote:
    "Moderne Fremdsprachen NRW ab Abitur 2025: Sprachmittlung 50 Punkte, Schreiben/Leseverstehen 110 Punkte. Vor Einsatz mit der aktuellen Fachseite abgleichen.",
  metaTitle: `${subject}-Klausur GOSt`,
  unit: "Sprachmittlung und Schreiben/Leseverstehen",
  notes:
    "GOSt-Vorlage moderne Fremdsprache. Zieltextformat, Material, Kursart und aktuelle Fachvorgaben der Standardsicherung NRW prüfen.",
  gradeLevel: "Q1 / Q2",
  course: "GK / LK",
  totalPoints: 160,
  sections: [
    {
      title: "Teil A: Sprachmittlung",
      points: 50,
      description: "Isolierter Teil Sprachmittlung.",
      note: "50 Punkte: 20 Inhalt und 30 Darstellungsleistung/sprachliche Leistung.",
      tasks: [
        {
          title: "Inhalt",
          points: 20,
          description: "Relevante Informationen situations- und adressatengerecht auswählen.",
          expectation: "Der Zieltext vermittelt die relevanten Inhalte korrekt und zweckbezogen.",
        },
        {
          title: "Darstellungsleistung / Sprache",
          points: 30,
          description: "Zieltextformat, Register, Struktur und sprachliche Angemessenheit bewerten.",
          expectation: "Sprache und Textgestaltung passen zur Kommunikationssituation.",
        },
      ],
    },
    {
      title: "Teil B: Schreiben / Leseverstehen · Inhalt",
      points: 44,
      description: "Inhaltliche Leistung im integrierten Schreibteil.",
      note: "Teilaufgaben an Material, Operatoren und Zieltextformat anpassen.",
      tasks: [
        {
          title: "Textverständnis",
          points: 12,
          description: "Zentrale Aspekte des Ausgangstextes sichern.",
          expectation: "Das Textverständnis ist korrekt, knapp und materialbezogen.",
        },
        {
          title: "Analyse",
          points: 17,
          description: "Aussage, Perspektive, Struktur oder Sprache analysieren.",
          expectation: "Die Analyse ist textnah, kohärent und fachlich präzise.",
        },
        {
          title: "Commentaire / production",
          points: 15,
          description: "Eine bewertende, produktive oder weiterführende Schreibaufgabe bearbeiten.",
          expectation: "Die Bearbeitung ist differenziert, adressatenbezogen und begründet.",
        },
      ],
    },
    {
      title: "Teil C: Darstellungsleistung / Sprache",
      points: 66,
      description: "Sprachliche Leistung im integrierten Schreiben/Leseverstehen.",
      note: "Nicht mit der Sprachmittlung verrechnen.",
      tasks: [
        {
          title: "Kommunikative Textgestaltung",
          points: 22,
          description: "Textaufbau, Leserführung, Textsortenbezug und Kohärenz bewerten.",
          expectation: "Der Text ist funktional strukturiert und kommunikativ passend.",
        },
        {
          title: "Ausdruck / sprachliche Mittel",
          points: 22,
          description: "Wortschatz, Eigenständigkeit, Variation und Satzbau bewerten.",
          expectation: "Die sprachlichen Mittel sind angemessen, variabel und aufgabenbezogen.",
        },
        {
          title: "Sprachrichtigkeit",
          points: 22,
          description: "Wortschatz, Grammatik, Orthografie und Zeichensetzung bewerten.",
          expectation: "Fehler beeinträchtigen die Kommunikation nicht wesentlich.",
        },
      ],
    },
  ],
});

const createModernForeignLanguageAbiturBlueprint = ({ subject, short }: { subject: string; short: string }): TemplateBlueprint => ({
  ...createModernForeignLanguageSek2Blueprint({ subject, short }),
  id: `${templateSlug(subject)}-abitur-vorabitur`,
  focus: "abitur",
  title: `${subject} Abitur · Vorabitur`,
  shortLabel: `${short} Abi`,
  description: "Abiturnahe Vorlage moderne Fremdsprache: Hörverstehen 40 + Sprachmittlung 50 + Schreiben/Leseverstehen 110.",
  pedagogicalHint:
    "Für Q2/Vorabitur unter Abiturbedingungen: Hörverstehen, Sprachmittlung und Schreiben/Leseverstehen getrennt bewerten.",
  standardsNote:
    "Moderne Fremdsprachen NRW ab Abitur 2025: 40 Hörverstehen + 50 Sprachmittlung + 110 Schreiben/Leseverstehen = 200 Punkte. Fachseite vor Einsatz prüfen.",
  metaTitle: `${subject}-Vorabitur / Abiturtraining`,
  unit: "Hörverstehen, Sprachmittlung und Schreiben/Leseverstehen",
  gradeLevel: "Q2",
  totalPoints: 200,
  sections: [
    {
      title: "Teil A: Hörverstehen",
      points: 40,
      description: "Isolierter Teil Hörverstehen.",
      note: "Bei Abiturbedingungen zuerst bearbeiten und einsammeln.",
      tasks: [
        {
          title: "Hörverstehen",
          description: "Globale und detaillierte Informationen aus Hörmaterialien erfassen.",
          expectation: "Antworten bilden die Hörinformationen korrekt und aufgabenbezogen ab.",
        },
      ],
    },
    ...createModernForeignLanguageSek2Blueprint({ subject, short }).sections,
  ],
});

const createMaterialBasedSek2Blueprint = (
  { subject, short }: { subject: string; short: string },
  focus: TemplateFocus,
): TemplateBlueprint => ({
  id: `${templateSlug(subject)}-${focus === "abitur" ? "abitur" : "sek2"}-material`,
  subject,
  schoolStage: "sek2",
  focus,
  title: `${subject} ${focus === "abitur" ? "Abitur" : "Sek II"} · Material und Urteil`,
  shortLabel: `${short} ${focus === "abitur" ? "Abi" : "Sek II"}`,
  description: "Vorlage für materialgebundene Analyse, Einordnung, Urteil und Darstellung.",
  pedagogicalHint:
    "Für gesellschafts- und geisteswissenschaftliche Klausuren: Materialanalyse, Sachwissen und Urteil sauber trennen.",
  metaTitle: `${subject}-${focus === "abitur" ? "Vorabitur / Abiturtraining" : "Klausur GOSt"}`,
  unit: "Materialanalyse, Einordnung und Urteil",
  notes:
    "GOSt-Startvorlage. Aufgabenart, Operatoren, Materialbasis, Hilfsmittel und konkrete Punkteverteilung an die aktuelle Standardsicherung-Fachseite und Fachkonferenz anpassen.",
  gradeLevel: focus === "abitur" ? "Q2" : "Q1",
  course: "GK / LK",
  totalPoints: focus === "abitur" ? 120 : 110,
  sections: [
    {
      title: "Teil A: Materialanalyse",
      points: focus === "abitur" ? 40 : 35,
      description: "Material formal, inhaltlich und fachmethodisch erschließen.",
      note: "Materialart, Operatoren und Analysefokus konkret eintragen.",
      tasks: [
        {
          title: "Material erschließen",
          description: "Aussagen, Struktur, Perspektive oder Daten des Materials erfassen.",
          expectation: "Die Analyse bleibt materialnah und fachmethodisch korrekt.",
        },
        {
          title: "Fachmethodisch auswerten",
          description: "Material mit passenden Fachbegriffen und Verfahren untersuchen.",
          expectation: "Die Auswertung nutzt fachliche Kategorien sicher und nachvollziehbar.",
        },
      ],
    },
    {
      title: "Teil B: Einordnung und Sachwissen",
      points: focus === "abitur" ? 35 : 30,
      description: "Fachliche Zusammenhänge darstellen und Material einordnen.",
      note: "Theorien, Modelle, Raumbezug, politische Konzepte oder philosophische Positionen eintragen.",
      tasks: [
        {
          title: "Einordnen",
          description: "Material in fachliche Zusammenhänge, Modelle oder Problemfelder einbetten.",
          expectation: "Die Einordnung ist sachlich richtig und fachlich relevant.",
        },
        {
          title: "Zusammenhänge erklären",
          description: "Ursachen, Folgen, Positionen oder Strukturen differenziert darstellen.",
          expectation: "Zusammenhänge werden klar, fachsprachlich und begründet entfaltet.",
        },
      ],
    },
    {
      title: "Teil C: Urteil und Transfer",
      points: focus === "abitur" ? 25 : 25,
      description: "Begründetes Sachurteil, Werturteil oder Transfer entwickeln.",
      note: "Urteilskriterien explizit ausweisen.",
      tasks: [
        {
          title: "Beurteilen",
          description: "Eine fachliche Fragestellung kriteriengeleitet beurteilen.",
          expectation: "Das Urteil ist differenziert, begründet und an Analyse/Sachwissen rückgebunden.",
        },
        {
          title: "Transfer herstellen",
          description: "Ergebnisse auf neue Kontexte, Positionen oder Problemfelder übertragen.",
          expectation: "Der Transfer bleibt fachlich tragfähig und nicht bloß assoziativ.",
        },
      ],
    },
    {
      title: "Teil D: Darstellung",
      points: focus === "abitur" ? 20 : 20,
      description: "Struktur, Fachsprache, Kohärenz und sprachliche Richtigkeit.",
      note: "Darstellungsleistung als eigenen Block sichtbar halten, wenn die Fachvorgabe dies vorsieht.",
      tasks: [
        {
          title: "Fachsprache und Struktur",
          description: "Gedankengang, Fachbegriffe und sprachliche Form bewerten.",
          expectation: "Die Darstellung ist stringent, präzise und fachsprachlich angemessen.",
        },
      ],
    },
  ],
});

const createScienceSekBlueprint = (subject: "Biologie" | "Physik", stage: BuilderSchoolStage): TemplateBlueprint => ({
  id: `${templateSlug(subject)}-${stage}-fachwissen-auswertung`,
  subject,
  schoolStage: stage,
  focus: "general",
  title: `${subject} ${stage === "sek1" ? "Sek I" : "Sek II"} · Fachwissen und Auswertung`,
  shortLabel: `${subject.slice(0, 3)} ${stage === "sek1" ? "Sek I" : "Sek II"}`,
  description: "Vorlage mit Fachwissen, Material-/Datenanalyse und Transfer.",
  pedagogicalHint:
    "Für naturwissenschaftliche Arbeiten: Fachkonzepte, Auswertung und begründeter Transfer bleiben getrennt sichtbar.",
  metaTitle: `${subject}-${stage === "sek1" ? "Lernüberprüfung" : "Klausur GOSt"}`,
  unit: "Fachwissen, Auswertung und Transfer",
  notes:
    "Naturwissenschaftliche Startvorlage. Experimente, Hilfsmittel, Formelsammlung und Punkteverteilung an Jahrgang, Kursart und Fachkonferenz anpassen.",
  gradeLevel: stage === "sek1" ? "9" : "Q1",
  course: stage === "sek1" ? "9" : "GK",
  totalPoints: stage === "sek1" ? 90 : 120,
  sections: [
    {
      title: "Teil A: Fachwissen",
      points: stage === "sek1" ? 30 : 30,
      description: "Begriffe, Konzepte, Modelle und Grundlagen anwenden.",
      note: "Fachbegriffe und Modellgrenzen sichtbar machen.",
      tasks: [
        {
          title: "Konzepte anwenden",
          description: "Fachwissen passend zur Aufgabenstellung einsetzen.",
          expectation: "Grundideen werden korrekt, fachsprachlich und zielgerichtet genutzt.",
        },
      ],
    },
    {
      title: "Teil B: Auswertung",
      points: stage === "sek1" ? 30 : 45,
      description: "Material, Daten, Diagramme oder Versuchsinformationen auswerten.",
      note: "Beobachtung, Beschreibung und Deutung getrennt lesbar halten.",
      tasks: [
        {
          title: "Material auswerten",
          description: "Daten, Diagramme oder Experimente sachgerecht erschließen.",
          expectation: "Relevante Informationen werden korrekt erfasst und fachlich gedeutet.",
        },
        {
          title: "Zusammenhänge erklären",
          description: "Fachliche Ursachen, Wirkungen oder Modellzusammenhänge erläutern.",
          expectation: "Erklärungen sind fachlich stimmig und materialgebunden.",
        },
      ],
    },
    {
      title: "Teil C: Transfer und Bewertung",
      points: stage === "sek1" ? 30 : 45,
      description: "Konzepte auf neue Kontexte übertragen und begründet bewerten.",
      note: "Kontext, Modellannahmen oder Anwendungsbezug konkretisieren.",
      tasks: [
        {
          title: "Transfer",
          description: "Bekannte Konzepte auf eine neue Situation anwenden.",
          expectation: "Der Transfer zeigt vernetztes Fachverständnis.",
        },
        {
          title: "Begründen oder bewerten",
          description: "Aussagen, Ergebnisse oder Anwendungen fachlich beurteilen.",
          expectation: "Bewertungen sind begründet und fachlich belastbar.",
        },
      ],
    },
  ],
});

const sek1Blueprints: TemplateBlueprint[] = [
  {
    id: "deutsch-sek1-analyse",
    subject: "Deutsch",
    schoolStage: "sek1",
    focus: "general",
    title: "Deutsch Sek I · Analyse und Schreiben",
    shortLabel: "D Sek I",
    description: "Sek-I-Vorlage mit Textverstehen, Analyse, Schreibauftrag und Darstellungsleistung.",
    pedagogicalHint: "Passt für Klassenarbeiten mit Textgrundlage, klaren Operatoren und getrennter Bewertung von Inhalt und sprachlicher Darstellung.",
    metaTitle: "Deutsch-Klassenarbeit Sek I",
    unit: "Textverstehen, Analyse und Schreibaufgabe",
    notes:
      "Sek-I-Vorlage Deutsch. Textsorte, Jahrgang und Aufgabenart können direkt an den schulinternen Lehrplan angepasst werden.",
    gradeLevel: "8",
    course: "8b",
    totalPoints: 100,
    sections: [
      {
        title: "Teil A: Textverstehen",
        points: 30,
        description: "Informationen sichern, Aussagen prüfen und Textstellen passend belegen.",
        note: "Geeignet für Erzähltext, Sachtext, Jugendbuchauszug oder journalistischen Text.",
        tasks: [
          {
            title: "Inhalte erschließen",
            description: "Zentrale Informationen, Figuren, Positionen oder Argumente aus dem Text sichern.",
            expectation: "Erwartet werden treffende Informationen mit Rückbezug auf den Ausgangstext.",
          },
          {
            title: "Aussagen prüfen",
            description: "Aussagen zum Text als zutreffend, unzutreffend oder teilweise zutreffend bewerten.",
            expectation: "Entscheidungen werden mit passenden Textstellen oder Begründungen abgesichert.",
          },
          {
            title: "Textbelege nutzen",
            description: "Belege auswählen und knapp erläutern, warum sie zur Fragestellung passen.",
            expectation: "Belege sind korrekt ausgewählt und funktional in die Antwort eingebunden.",
          },
        ],
      },
      {
        title: "Teil B: Analyse",
        points: 20,
        description: "Sprache, Aufbau, Erzählweise oder Argumentationsstruktur untersuchen.",
        note: "Die Analyse kann literarisch oder pragmatisch angelegt sein.",
        tasks: [
          {
            title: "Gestaltungsmittel untersuchen",
            description: "Sprachliche Mittel, Stil oder Auffälligkeiten der Darstellung analysieren.",
            expectation: "Benennungen und Wirkungsdeutungen greifen sauber ineinander.",
          },
          {
            title: "Aufbau erklären",
            description: "Abschnitte, Verlauf oder Argumentationsstruktur funktional erläutern.",
            expectation: "Die Darstellung zeigt nachvollziehbar, wie der Text aufgebaut ist und wirkt.",
          },
        ],
      },
      {
        title: "Teil C: Schreiben",
        points: 30,
        description: "Materialgestützter oder textbezogener Schreibauftrag.",
        note: "Textsorte vor Ort anpassen, zum Beispiel Stellungnahme, Brief, innerer Monolog oder Fortsetzung.",
        tasks: [
          {
            title: "Inhaltliche Ausgestaltung",
            description: "Die Schreibaufgabe adressaten- und aufgabenbezogen umsetzen.",
            expectation: "Die Aufgabenstellung wird vollständig erfüllt und sinnvoll ausgestaltet.",
          },
          {
            title: "Textaufbau",
            description: "Gedanken strukturieren, Absätze sinnvoll setzen und Textsortenmerkmale beachten.",
            expectation: "Der Text ist klar gegliedert und passt zur geforderten Schreibsituation.",
          },
          {
            title: "Überarbeitung",
            description: "Den Text auf Klarheit, Präzision und Anschlussfähigkeit prüfen.",
            expectation: "Der Schreibprozess zeigt erkennbar bewusste Formulierungsentscheidungen.",
          },
        ],
      },
      {
        title: "Teil D: Darstellungsleistung",
        points: 20,
        description: "Sprachrichtigkeit, Fachsprache, Kohärenz und formale Sicherheit.",
        note: "Dieser Block sollte sichtbar getrennt ausgewiesen bleiben.",
        tasks: [
          {
            title: "Sprachrichtigkeit",
            description: "Rechtschreibung, Grammatik und Zeichensetzung bewerten.",
            expectation: "Die sprachliche Form ist überwiegend korrekt und unterstützt das Textverständnis.",
          },
          {
            title: "Ausdruck und Kohärenz",
            description: "Passende Wortwahl, Verknüpfungen und fachlich stimmige Darstellung bewerten.",
            expectation: "Der Text ist sprachlich klar, zusammenhängend und angemessen formuliert.",
          },
        ],
      },
    ],
  },
  {
    id: "englisch-sek1-kompetenzen",
    subject: "Englisch",
    schoolStage: "sek1",
    focus: "general",
    title: "Englisch Sek I · Reading/Language/Writing",
    shortLabel: "E Sek I",
    description: "Vollständige Sek-I-Vorlage mit Rezeption, Sprache, Schreiben und sprachlicher Leistung.",
    pedagogicalHint: "Bewährt für Unit-Tests und Klassenarbeiten, in denen kommunikative Kompetenz und Sprachrichtigkeit getrennt sichtbar bleiben sollen.",
    metaTitle: "Englisch-Klassenarbeit Sek I",
    unit: "Reading, language practice and writing task",
    notes:
      "Sek-I-Vorlage Englisch. Der Rezeptionsteil kann wahlweise auf Reading, Listening oder Mediation umgestellt werden.",
    gradeLevel: "8",
    course: "8b",
    totalPoints: 100,
    sections: [
      {
        title: "Teil A: Rezeption",
        points: 30,
        description: "Lese-, Hör- oder Sprachmittlungsaufgaben als materialgebundener Auftakt.",
        note: "Den Titel bei Bedarf auf Reading, Listening oder Mediation zuschneiden.",
        tasks: [
          {
            title: "Global understanding",
            description: "Die Hauptaussage und Situation des Materials erfassen.",
            expectation: "Antworten zeigen sicheres Gesamtverständnis des Materials.",
          },
          {
            title: "Detailed information",
            description: "Schlüsselstellen, Details oder Aussagen korrekt zuordnen.",
            expectation: "Details werden präzise und textnah herausgearbeitet.",
          },
          {
            title: "Own wording / transfer",
            description: "Informationen knapp in eigenen Worten wiedergeben oder adressatenbezogen übertragen.",
            expectation: "Inhalte werden verständlich, passend und nicht bloß abschreibend verarbeitet.",
          },
        ],
      },
      {
        title: "Teil B: Sprache",
        points: 20,
        description: "Kontrollierte Sprachverwendung in Grammatik und Wortschatz.",
        note: "Typisch sind Lückentext, Umformung, Satzbau oder Wortschatztransfer.",
        tasks: [
          {
            title: "Grammar",
            description: "Zeiten, Satzbau, Nebensätze oder other language structures korrekt anwenden.",
            expectation: "Die Zielstrukturen werden sicher und passend gebildet.",
          },
          {
            title: "Vocabulary in context",
            description: "Passenden Wortschatz situationsangemessen einsetzen.",
            expectation: "Die Wortwahl ist treffend, verständlich und aufgabenbezogen.",
          },
        ],
      },
      {
        title: "Teil C: Writing",
        points: 20,
        description: "Produktive Schreibaufgabe mit Fokus auf content und structure.",
        note: "Textsorten wie email, blog entry, comment oder report lassen sich direkt eintragen.",
        tasks: [
          {
            title: "Content",
            description: "Die Schreibaufgabe vollständig und aufgabenbezogen umsetzen.",
            expectation: "Alle geforderten Aspekte sind sinnvoll bearbeitet.",
          },
          {
            title: "Structure",
            description: "Den Text logisch gliedern und textsortengerecht aufbauen.",
            expectation: "Der Text ist übersichtlich, verbunden und klar adressatenbezogen.",
          },
        ],
      },
      {
        title: "Teil D: Language Performance",
        points: 30,
        description: "Sprachliche Qualität des Schreibprodukts getrennt erfassen.",
        note: "Sprache im Schreiben bewusst vom Inhaltsblock trennen.",
        tasks: [
          {
            title: "Grammar and accuracy",
            description: "Grammatische Sicherheit und formale Korrektheit bewerten.",
            expectation: "Sprachstrukturen sind weitgehend korrekt und funktional eingesetzt.",
          },
          {
            title: "Vocabulary and expression",
            description: "Range, precision and appropriateness of language bewerten.",
            expectation: "Die Ausdrucksweise ist variabel, treffend und zur Situation passend.",
          },
          {
            title: "Spelling and coherence",
            description: "Orthografie, linking words und Leserführung bewerten.",
            expectation: "Der Text bleibt gut lesbar, zusammenhängend und formal sicher.",
          },
        ],
      },
    ],
  },
  {
    id: "mathematik-sek1-grundlagen",
    subject: "Mathematik",
    schoolStage: "sek1",
    focus: "general",
    title: "Mathematik Sek I · Basiskompetenz bis Begründung",
    shortLabel: "M Sek I",
    description: "Sek-I-Mathevorlage mit Basiskompetenzen, Anwendung und Argumentation.",
    pedagogicalHint: "Die Vorlage trennt Rechenroutinen, mehrschrittige Anwendungen und mathematische Begründung, damit nicht nur Endergebnisse sichtbar bleiben.",
    metaTitle: "Mathematik-Klassenarbeit Sek I",
    unit: "Basiskompetenzen, Anwendungen und Begründungen",
    notes:
      "Mathematik-Vorlage Sek I. Formeln und Terme werden aktuell als Klartext gepflegt; Hilfsmittelregelungen können im Abschnittshinweis ergänzt werden.",
    gradeLevel: "9",
    course: "9a",
    totalPoints: 100,
    sections: [
      {
        title: "Teil A: Basiskompetenzen",
        points: 30,
        description: "Sichere Grundverfahren ohne komplexe Kontextbindung.",
        note: "Hier lassen sich auch hilfsmittelfreie Kurzaufgaben bündeln.",
        tasks: [
          {
            title: "Routineverfahren",
            description: "Rechenwege, Umformungen oder Standardverfahren sicher ausführen.",
            expectation: "Rechenschritte sind fachlich korrekt und nachvollziehbar notiert.",
          },
          {
            title: "Begriffe und Darstellungen",
            description: "Mathematische Darstellungen lesen, ergänzen oder passend auswählen.",
            expectation: "Begriffe, Symbole und Darstellungen werden sicher verwendet.",
          },
          {
            title: "Kontrolle einfacher Ergebnisse",
            description: "Ergebnisse plausibilisieren und naheliegende Fehler erkennen.",
            expectation: "Ergebnisse werden nicht nur genannt, sondern überprüft.",
          },
        ],
      },
      {
        title: "Teil B: Anwendung",
        points: 40,
        description: "Mehrschrittige Aufgaben mit Kontext, Modellierung oder Strategieeinsatz.",
        note: "Typisch für Textaufgaben, Geometrie, Funktionen oder Stochastik in realen Situationen.",
        tasks: [
          {
            title: "Modellieren",
            description: "Eine Sachsituation mathematisch strukturieren und passende Ansätze wählen.",
            expectation: "Der mathematische Zugang zur Situation ist schlüssig gewählt.",
          },
          {
            title: "Berechnen",
            description: "Die gewählten Verfahren vollständig und korrekt durchführen.",
            expectation: "Rechenwege sind tragfähig und führen zu stimmigen Ergebnissen.",
          },
          {
            title: "Ergebnisse deuten",
            description: "Ergebnisse auf den Kontext beziehen und fachlich angemessen formulieren.",
            expectation: "Resultate werden sinnvoll interpretiert und nicht isoliert stehen gelassen.",
          },
        ],
      },
      {
        title: "Teil C: Argumentation",
        points: 30,
        description: "Begründungen, Lösungswege und Reflexion mathematisch klar darstellen.",
        note: "Besonders nützlich für geometrische Begründungen, Termargumentationen und Vergleiche von Verfahren.",
        tasks: [
          {
            title: "Begründen",
            description: "Aussagen mathematisch nachvollziehbar erklären oder beweisen.",
            expectation: "Die Begründung ist fachsprachlich stimmig und schließt logisch.",
          },
          {
            title: "Lösungsweg dokumentieren",
            description: "Gedankengang geordnet, symbolisch korrekt und lesbar darstellen.",
            expectation: "Zwischenschritte und Struktur machen den Lösungsweg transparent.",
          },
          {
            title: "Verfahren reflektieren",
            description: "Lösungen vergleichen, Grenzen benennen oder alternative Wege diskutieren.",
            expectation: "Die Reflexion zeigt Verständnis für Methode und Ergebnis.",
          },
        ],
      },
    ],
  },
  {
    id: "geschichte-sek1-material",
    subject: "Geschichte",
    schoolStage: "sek1",
    focus: "general",
    title: "Geschichte Sek I · Material und Urteil",
    shortLabel: "G Sek I",
    description: "Sek-I-Vorlage mit Materialanalyse, Kontextwissen sowie Urteil und Transfer.",
    pedagogicalHint: "Nützlich für schriftliche Lernüberprüfungen in Geschichte, wenn Materialerschließung und Urteilsbildung getrennt ausgewiesen werden sollen.",
    metaTitle: "Geschichte-Lernüberprüfung Sek I",
    unit: "Quelle, Kontext und Urteil",
    notes:
      "Geschichte ist in Sek I nicht überall Klassenarbeitsfach. Die Vorlage eignet sich für schriftliche Lernüberprüfungen oder WP-Formate.",
    gradeLevel: "9",
    course: "9b",
    totalPoints: 90,
    sections: [
      {
        title: "Teil A: Materialanalyse",
        points: 35,
        description: "Quelle oder Darstellung erschließen und wesentliche Informationen sichern.",
        note: "Materialart vor Ort eintragen, zum Beispiel Textquelle, Bildquelle oder Statistik.",
        tasks: [
          {
            title: "Material beschreiben",
            description: "Quelle oder Darstellung formal und inhaltlich erschließen.",
            expectation: "Art, Perspektive und Kernaussagen des Materials werden sicher erkannt.",
          },
          {
            title: "Informationen herausarbeiten",
            description: "Zentrale Aussagen und Hinweise aus dem Material geordnet erfassen.",
            expectation: "Wesentliche Informationen werden treffend und materialnah benannt.",
          },
          {
            title: "Perspektive reflektieren",
            description: "Intention, Adressatenbezug oder Blickwinkel des Materials erläutern.",
            expectation: "Die Perspektive wird mit passenden Hinweisen aus dem Material begründet.",
          },
        ],
      },
      {
        title: "Teil B: Kontextwissen",
        points: 30,
        description: "Historische Zusammenhänge erklären und einordnen.",
        note: "Hier lassen sich auch Zeitleiste, Ursachen und Folgen oder Begriffsarbeit bündeln.",
        tasks: [
          {
            title: "Einordnen",
            description: "Das Material in Zeit, Thema und historische Zusammenhänge einbetten.",
            expectation: "Die Einordnung ist sachlich richtig und historisch tragfähig.",
          },
          {
            title: "Zusammenhänge erklären",
            description: "Ursachen, Folgen oder Entwicklungen geordnet darstellen.",
            expectation: "Darstellungen zeigen Ursache-Wirkungs-Zusammenhänge nachvollziehbar auf.",
          },
        ],
      },
      {
        title: "Teil C: Urteil und Transfer",
        points: 25,
        description: "Sachurteil entwickeln und Gegenwartsbezüge reflektieren.",
        note: "Urteilsfragen sollten klar operatorengeleitet formuliert sein.",
        tasks: [
          {
            title: "Sachurteil formulieren",
            description: "Eine historische Entscheidung, Entwicklung oder Position begründet bewerten.",
            expectation: "Das Urteil stützt sich auf Material und Kontextwissen.",
          },
          {
            title: "Transfer herstellen",
            description: "Gegenwartsbezug, Perspektivvergleich oder historische Relevanz herausarbeiten.",
            expectation: "Der Transfer bleibt sachlich, differenziert und aufgabenbezogen.",
          },
        ],
      },
    ],
  },
  {
    id: "chemie-sek1-auswertung",
    subject: "Chemie",
    schoolStage: "sek1",
    focus: "general",
    title: "Chemie Sek I · Fachwissen und Auswertung",
    shortLabel: "C Sek I",
    description: "Sek-I-Vorlage mit Fachwissen, Auswertung von Material oder Experiment und Transfer.",
    pedagogicalHint: "Die Struktur hilft besonders dann, wenn Versuchsbefunde und fachliche Deutung getrennt sichtbar bleiben sollen.",
    metaTitle: "Chemie-Lernüberprüfung Sek I",
    unit: "Fachwissen, Materialauswertung und Transfer",
    notes:
      "Geeignet für schriftliche Formate in Chemie oder naturwissenschaftlichem Wahlpflichtunterricht der Sek I.",
    gradeLevel: "9",
    course: "9c",
    totalPoints: 90,
    sections: [
      {
        title: "Teil A: Fachwissen",
        points: 30,
        description: "Begriffe, Modelle und Grundlagen sicher anwenden.",
        note: "Typisch sind Begriffsarbeit, Teilchenmodell, Stoffeigenschaften oder Reaktionswissen.",
        tasks: [
          {
            title: "Grundbegriffe sichern",
            description: "Fachbegriffe, Symbole oder Modelle korrekt einsetzen.",
            expectation: "Die chemische Fachsprache wird sicher und passend verwendet.",
          },
          {
            title: "Modelle anwenden",
            description: "Beobachtungen mithilfe geeigneter Modelle erklären.",
            expectation: "Das Modell passt zur Aufgabe und wird fachlich korrekt genutzt.",
          },
        ],
      },
      {
        title: "Teil B: Auswertung",
        points: 30,
        description: "Daten, Materialien oder Versuchsergebnisse auswerten.",
        note: "Beobachtung und Deutung sollten getrennt erfasst werden.",
        tasks: [
          {
            title: "Beobachtungen auswerten",
            description: "Messwerte, Tabellen oder Versuchsbefunde strukturiert lesen und ordnen.",
            expectation: "Wichtige Befunde werden vollständig und sachlich korrekt herausgearbeitet.",
          },
          {
            title: "Deutung ableiten",
            description: "Aus den Befunden fachlich stimmige Schlüsse ziehen.",
            expectation: "Die Deutung ist direkt an die Daten oder Beobachtungen angebunden.",
          },
        ],
      },
      {
        title: "Teil C: Transfer",
        points: 30,
        description: "Chemische Konzepte auf neue Kontexte übertragen und erklären.",
        note: "Alltagsbezüge oder neue Materialien eignen sich hier besonders gut.",
        tasks: [
          {
            title: "Anwenden",
            description: "Erarbeitetes Wissen auf neue Situationen oder Stoffsysteme übertragen.",
            expectation: "Bekannte Konzepte werden zielgerichtet auf den neuen Kontext angewendet.",
          },
          {
            title: "Begründen",
            description: "Entscheidungen oder Aussagen fachsprachlich begründen.",
            expectation: "Begründungen zeigen chemisches Verständnis und bleiben nachvollziehbar.",
          },
        ],
      },
    ],
  },
  {
    id: "informatik-sek1-algorithmik",
    subject: "Informatik",
    schoolStage: "sek1",
    focus: "general",
    title: "Informatik Sek I · Modellierung und Algorithmik",
    shortLabel: "I Sek I",
    description: "Sek-I-Vorlage mit Konzepten, Algorithmik und Analyse/Reflexion.",
    pedagogicalHint: "Gut geeignet für papierbasierte Informatikarbeiten, bei denen Modellierung und Lösungsweg stärker zählen sollen als reine Syntax.",
    metaTitle: "Informatik-Lernüberprüfung Sek I",
    unit: "Modellierung, Algorithmik und Reflexion",
    notes:
      "Sek-I-Vorlage Informatik. Aufgaben können zwischen Blockprogrammierung, Pseudocode oder textueller Sprache angepasst werden.",
    gradeLevel: "9",
    course: "9 WP",
    totalPoints: 90,
    sections: [
      {
        title: "Teil A: Konzepte und Modellierung",
        points: 35,
        description: "Daten, Abläufe und Strukturen fachlich modellieren.",
        note: "Zum Beispiel Klassendiagramm, Zustandsmodell, Struktogramm oder Datenfluss.",
        tasks: [
          {
            title: "Strukturen modellieren",
            description: "Objekte, Daten oder Zustände passend darstellen.",
            expectation: "Das Modell passt zur Problemstellung und ist konsistent.",
          },
          {
            title: "Beziehungen erläutern",
            description: "Zusammenhänge zwischen Elementen fachsprachlich erklären.",
            expectation: "Die Modellbestandteile werden nicht nur genannt, sondern sinnvoll gedeutet.",
          },
        ],
      },
      {
        title: "Teil B: Algorithmik und Umsetzung",
        points: 30,
        description: "Algorithmen entwickeln, lesen oder verbessern.",
        note: "Die Aufgabe kann als Pseudocode, Blockprogramm oder Codefragment angelegt werden.",
        tasks: [
          {
            title: "Algorithmus entwickeln",
            description: "Einen Lösungsweg strukturiert planen und darstellen.",
            expectation: "Der Algorithmus ist korrekt aufgebaut und zur Aufgabe passend.",
          },
          {
            title: "Code oder Ablauf prüfen",
            description: "Vorhandene Lösungen lesen, ergänzen oder korrigieren.",
            expectation: "Fehler oder Lücken werden sachgerecht identifiziert und behoben.",
          },
        ],
      },
      {
        title: "Teil C: Analyse und Reflexion",
        points: 25,
        description: "Lösungen erklären, bewerten und vergleichen.",
        note: "Auch Datenschutz, Effizienz oder Nutzerperspektive können hier auftauchen.",
        tasks: [
          {
            title: "Lösung analysieren",
            description: "Korrektheit, Funktion oder Grenzen einer Lösung erläutern.",
            expectation: "Die Analyse bleibt fachlich sauber und argumentativ nachvollziehbar.",
          },
          {
            title: "Entscheidungen begründen",
            description: "Alternativen vergleichen oder Gestaltungsentscheidungen reflektieren.",
            expectation: "Die Begründung zeigt Verständnis für Informatikkonzepte und Auswirkungen.",
          },
        ],
      },
    ],
  },
  ...additionalModernForeignLanguages.map(createModernForeignLanguageSek1Blueprint),
  ...additionalClassicalLanguages.map((language) => createClassicalLanguageBlueprint(language, "sek1", "general")),
  createScienceSekBlueprint("Biologie", "sek1"),
  createScienceSekBlueprint("Physik", "sek1"),
];

const sek2Blueprints: TemplateBlueprint[] = [
  {
    id: "deutsch-sek2-klausur",
    subject: "Deutsch",
    schoolStage: "sek2",
    focus: "general",
    title: "Deutsch Sek II · Klausur",
    shortLabel: "D Sek II",
    description: "GOSt-Klausurvorlage mit Analyse, Deutung/Argumentation, Transfer und Darstellungsleistung.",
    pedagogicalHint: "Die Gewichtung orientiert sich an einer oberstufentypischen Trennung von Inhalt und Darstellungsleistung.",
    metaTitle: "Deutsch-Klausur GOSt",
    unit: "Analyse, Deutung und Transfer",
    notes:
      "GOSt-Vorlage Deutsch. Aufgabenart, Materialbasis und Darstellungsleistungsraster an Halbjahr und Fachkonferenzbeschlüsse anpassen.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Analyse",
        points: 40,
        description: "Textanalyse mit Belegen, Struktur- und Sprachuntersuchung.",
        note: "Literarische und pragmatische Texte sind gleichermaßen abbildbar.",
        tasks: [
          {
            title: "Aussageabsicht erfassen",
            description: "Textaussagen und Leitgedanken analytisch herausarbeiten.",
            expectation: "Die Analyse bleibt eng am Material und arbeitet zentrale Sinnstrukturen heraus.",
          },
          {
            title: "Gestaltung untersuchen",
            description: "Sprachliche, strukturelle oder erzählerische Mittel funktional deuten.",
            expectation: "Mittel werden nicht isoliert benannt, sondern in ihrer Wirkung erklärt.",
          },
          {
            title: "Beleggestützt argumentieren",
            description: "Analyseergebnisse mit präzisen Verweisen auf das Material absichern.",
            expectation: "Die Darstellung bleibt fachsprachlich präzise und textnah.",
          },
        ],
      },
      {
        title: "Teil B: Deutung und Argumentation",
        points: 30,
        description: "Interpretationsansatz oder Erörterung entwickeln.",
        note: "Geeignet für Deutungshypothese, Vergleichsaspekt oder materialgestützte Positionierung.",
        tasks: [
          {
            title: "Deutung entwickeln",
            description: "Auf Basis der Analyse einen schlüssigen Deutungsansatz entfalten.",
            expectation: "Der Interpretationsgang ist eigenständig, konsistent und materialgestützt.",
          },
          {
            title: "Argumentativ verdichten",
            description: "Gedankengang systematisch strukturieren und überzeugend entfalten.",
            expectation: "Argumente bauen klar aufeinander auf und führen zu einem tragfähigen Ergebnis.",
          },
        ],
      },
      {
        title: "Teil C: Transfer",
        points: 20,
        description: "Vergleich, Kontextualisierung oder materialgestützte Weiterführung.",
        note: "Hier kann auch ein Epochenbezug oder Medienvergleich verortet werden.",
        tasks: [
          {
            title: "Kontext herstellen",
            description: "Textaussagen in einen größeren literarischen oder gesellschaftlichen Zusammenhang stellen.",
            expectation: "Der Transfer bleibt fachlich präzise und nicht bloß additiv.",
          },
          {
            title: "Vergleichen oder weiterführen",
            description: "Eine zweite Position, ein weiteres Material oder einen Kontext produktiv einbeziehen.",
            expectation: "Bezüge werden funktional hergestellt und begründet.",
          },
        ],
      },
      {
        title: "Teil D: Darstellungsleistung",
        points: 30,
        description: "Aufbau, Fachsprache, Kohärenz und sprachliche Richtigkeit.",
        note: "Als eigener Bewertungsblock besonders für Oberstufenklausuren wichtig.",
        tasks: [
          {
            title: "Struktur und Kohärenz",
            description: "Textaufbau, Leserführung und logische Verbindung der Gedankenschritte bewerten.",
            expectation: "Die Darstellung ist stringent aufgebaut und sicher gegliedert.",
          },
          {
            title: "Sprache und Fachlichkeit",
            description: "Fachsprache, Stil und sprachliche Korrektheit bewerten.",
            expectation: "Die Sprache ist präzise, angemessen und formal weitgehend sicher.",
          },
        ],
      },
    ],
  },
  {
    id: "englisch-sek2-klausur",
    subject: "Englisch",
    schoolStage: "sek2",
    focus: "general",
    title: "Englisch Sek II · Hörverstehen + Schreiben",
    shortLabel: "E Sek II",
    description: "GOSt-Vorlage mit 150-Punkte-Struktur: Hörverstehen 40 + Schreiben/Leseverstehen 110.",
    pedagogicalHint: "Diese Vorlage ist nur für die Kombination Hörverstehen plus Schreiben/Leseverstehen gedacht. Für Sprachmittlung muss die 160-Punkte-Vorlage genutzt werden.",
    standardsNote:
      "NRW moderne Fremdsprachen ab Abitur 2025: Hörverstehen 40 Punkte; Schreiben/Leseverstehen 110 Punkte, davon 44 Inhalt und 66 Darstellungsleistung/sprachliche Leistung.",
    metaTitle: "Englisch-Klausur GOSt",
    unit: "Listening, writing task and language performance",
    notes:
      "GOSt-Vorlage Englisch nach Standardsicherung NRW: Hörverstehen 40 BE/Punkte, Schreiben/Leseverstehen integriert 110 Punkte. Nicht für Sprachmittlung verwenden; dafür gibt es die getrennte 160-Punkte-Vorlage.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 150,
    sections: [
      {
        title: "Teil A: Hörverstehen",
        points: 40,
        description: "Isolierter Klausurteil Hörverstehen.",
        note: "Bei Hörverstehen wird dieser Teil zuerst bearbeitet und vor den weiteren Teilen eingesammelt.",
        tasks: [
          {
            title: "Listening comprehension",
            description: "Core ideas and relevant information from the material identify.",
            expectation: "The response shows secure understanding of the source material.",
          },
          {
            title: "Listening tasks",
            description: "Closed, semi-open or short-answer tasks as required complete.",
            expectation: "Responses are precise and map correctly onto the listening items.",
          },
        ],
      },
      {
        title: "Teil B: Schreiben / Leseverstehen · Inhalt",
        points: 44,
        description: "Inhaltliche Leistung der operatorengeleiteten Textarbeit.",
        note: "Im Abitur 44 Punkte Inhalt; Teilaufgaben können je nach Aufgabenstellung variieren.",
        tasks: [
          {
            title: "Comprehension",
            points: 12,
            description: "Summarise or select central aspects of the source text.",
            expectation: "The response secures source understanding accurately and concisely.",
          },
          {
            title: "Analysis",
            points: 17,
            description: "Analyse message, perspective, strategy or language of the source.",
            expectation: "The analysis is text-based, coherent and conceptually precise.",
          },
          {
            title: "Evaluation / re-creation",
            points: 15,
            description: "Develop an evaluative, creative or context-based final task.",
            expectation: "The final response is differentiated, task-related and well reasoned.",
          },
        ],
      },
      {
        title: "Teil C: Darstellungsleistung / Sprache",
        points: 66,
        description: "Sprachliche Leistung im integrierten Schreiben/Leseverstehen.",
        note: "66 Punkte: kommunikative Textgestaltung 22, Ausdruck/sprachliche Mittel 22, Sprachrichtigkeit 22.",
        tasks: [
          {
            title: "Communicative text design",
            points: 22,
            description: "Assess audience orientation, text type, structure, coherence and use of references.",
            expectation: "The text is coherent, purposeful and functionally structured.",
          },
          {
            title: "Range / linguistic resources",
            points: 22,
            description: "Assess independent wording, vocabulary, text-production vocabulary and sentence structure.",
            expectation: "Language use is differentiated, appropriate and sufficiently independent from the source.",
          },
          {
            title: "Sprachrichtigkeit: Wortschatz",
            points: 9,
            description: "Lexical accuracy according to the NRW orientation grid.",
            expectation: "Lexical choices support comprehension and do not distort meaning.",
          },
          {
            title: "Sprachrichtigkeit: Grammatik",
            points: 9,
            description: "Grammar and sentence-level correctness according to the NRW orientation grid.",
            expectation: "Grammar supports communication and does not materially impair understanding.",
          },
          {
            title: "Sprachrichtigkeit: Orthografie",
            points: 4,
            description: "Spelling and punctuation according to the NRW orientation grid.",
            expectation: "Orthography and punctuation remain functional for comprehension.",
          },
        ],
      },
    ],
  },
  {
    id: "englisch-sek2-sprachmittlung-schreiben",
    subject: "Englisch",
    schoolStage: "sek2",
    focus: "general",
    title: "Englisch Sek II · Sprachmittlung + Schreiben",
    shortLabel: "E Sek II Mediation",
    description: "GOSt-Vorlage mit 160-Punkte-Struktur: Sprachmittlung 50 + Schreiben/Leseverstehen 110.",
    pedagogicalHint:
      "Für Klausuren mit Mediation: Sprachmittlung hat eigene 20 Inhalt + 30 Darstellungsleistung. Der Schreib-/Analyseteil behält separat 44 Inhalt + 66 Darstellungsleistung.",
    standardsNote:
      "NRW moderne Fremdsprachen ab Abitur 2025: Sprachmittlung 50 Punkte (20 Inhalt, 30 Darstellungsleistung/sprachliche Leistung) plus Schreiben/Leseverstehen 110 Punkte.",
    metaTitle: "Englisch-Klausur GOSt · Sprachmittlung",
    unit: "Mediation and integrated writing/reading",
    notes:
      "GOSt-Vorlage Englisch nach Standardsicherung NRW: Sprachmittlung 50 Punkte getrennt bewerten; Schreiben/Leseverstehen integriert 110 Punkte. Keine gemeinsame Darstellungsleistung über beide Klausurteile bilden.",
    gradeLevel: "Q1 / Q2",
    course: "GK / LK",
    totalPoints: 160,
    sections: [
      {
        title: "Teil A: Sprachmittlung",
        points: 50,
        description: "Isolierter Klausurteil Sprachmittlung auf Basis eines deutschsprachigen Sach- oder Gebrauchstextes.",
        note: "50 Punkte: 20 Inhalt und 30 Darstellungsleistung/sprachliche Leistung.",
        tasks: [
          {
            title: "Mediation content",
            points: 20,
            description: "Select and transfer relevant information for the target situation.",
            expectation: "The mediation product is accurate, purposeful and audience-oriented.",
          },
          {
            title: "Mediation language / text construction",
            points: 30,
            description: "Assess target-text format, addressee orientation, register, structure and language.",
            expectation: "Language and text construction support the communicative mediation task.",
          },
        ],
      },
      {
        title: "Teil B: Schreiben / Leseverstehen · Inhalt",
        points: 44,
        description: "Inhaltliche Leistung im integrierten Schreiben/Leseverstehen.",
        note: "Die Teilaufgaben können je nach konkreter Aufgabenstellung variieren.",
        tasks: [
          {
            title: "Comprehension",
            points: 12,
            description: "Summarise or select central aspects of the source text.",
            expectation: "The response secures source understanding accurately and concisely.",
          },
          {
            title: "Analysis",
            points: 17,
            description: "Analyse message, perspective, strategy or language of the source.",
            expectation: "The analysis is text-based, coherent and conceptually precise.",
          },
          {
            title: "Evaluation / re-creation",
            points: 15,
            description: "Develop an evaluative, creative or context-based final task.",
            expectation: "The final response is differentiated, task-related and well reasoned.",
          },
        ],
      },
      {
        title: "Teil C: Darstellungsleistung / Sprache",
        points: 66,
        description: "Sprachliche Leistung im integrierten Schreiben/Leseverstehen.",
        note: "Nicht mit der Mediation-Darstellungsleistung verrechnen.",
        tasks: [
          {
            title: "Communicative text design",
            points: 22,
            description: "Assess audience orientation, text type, structure, coherence and use of references.",
            expectation: "The text is coherent, purposeful and functionally structured.",
          },
          {
            title: "Range / linguistic resources",
            points: 22,
            description: "Assess independent wording, vocabulary, text-production vocabulary and sentence structure.",
            expectation: "Language use is differentiated, appropriate and sufficiently independent from the source.",
          },
          {
            title: "Sprachrichtigkeit: Wortschatz",
            points: 9,
            description: "Lexical accuracy according to the NRW orientation grid.",
            expectation: "Lexical choices support comprehension and do not distort meaning.",
          },
          {
            title: "Sprachrichtigkeit: Grammatik",
            points: 9,
            description: "Grammar and sentence-level correctness according to the NRW orientation grid.",
            expectation: "Grammar supports communication and does not materially impair understanding.",
          },
          {
            title: "Sprachrichtigkeit: Orthografie",
            points: 4,
            description: "Spelling and punctuation according to the NRW orientation grid.",
            expectation: "Orthography and punctuation remain functional for comprehension.",
          },
        ],
      },
    ],
  },
  {
    id: "mathematik-sek2-klausur",
    subject: "Mathematik",
    schoolStage: "sek2",
    focus: "general",
    title: "Mathematik Sek II · Klausur",
    shortLabel: "M Sek II",
    description: "GOSt-Vorlage mit hilfsmittelfreiem Teil, Verfahren/Modellierung und Begründung.",
    pedagogicalHint: "Hilft, Grundkompetenzen und mehrschrittige Verfahren schon in der Oberstufe sauber zu trennen.",
    metaTitle: "Mathematik-Klausur GOSt",
    unit: "Hilfsmittelfrei, Verfahren und Reflexion",
    notes:
      "GOSt-Vorlage Mathematik. Formeln und mathematische Zeichen werden derzeit als Klartext geführt; für gerenderte LaTeX-Ausgabe wäre ein eigener Math-Renderer nötig.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Hilfsmittelfrei",
        points: 30,
        description: "Grundkompetenzen ohne digitale Hilfsmittel absichern.",
        note: "Zum Beispiel Analysis-Grundlagen, algebraische Umformungen oder Stochastik-Basisaufgaben.",
        tasks: [
          {
            title: "Grundlagen anwenden",
            description: "Basale Verfahren und Rechentechniken sicher durchführen.",
            expectation: "Die wesentlichen Grundkompetenzen sind ohne Hilfsmittel sicher abrufbar.",
          },
          {
            title: "Zwischenschritte notieren",
            description: "Lösungsweg strukturiert und nachvollziehbar darstellen.",
            expectation: "Zwischenschritte sind mathematisch korrekt und transparent dokumentiert.",
          },
        ],
      },
      {
        title: "Teil B: Modellierung und Verfahren",
        points: 55,
        description: "Mehrschrittige Aufgaben mit Verfahren, Modellierung oder Funktionsdeutung.",
        note: "Geeignet für Analysis, Analytische Geometrie oder Stochastik mit GTR/CAS-Bezug.",
        tasks: [
          {
            title: "Ansatz wählen",
            description: "Für die Aufgabe ein tragfähiges mathematisches Modell oder Verfahren bestimmen.",
            expectation: "Der Lösungsansatz ist sachgerecht gewählt und begründet.",
          },
          {
            title: "Verfahren durchführen",
            description: "Rechnungen, Ableitungen, Wahrscheinlichkeiten oder Vektorschritte korrekt ausführen.",
            expectation: "Die mathematischen Operationen führen konsistent zum Ergebnis.",
          },
          {
            title: "Kontext deuten",
            description: "Ergebnisse im Sachzusammenhang oder Modell interpretieren.",
            expectation: "Die Interpretation bleibt fachlich korrekt und kontextbezogen.",
          },
        ],
      },
      {
        title: "Teil C: Begründung und Reflexion",
        points: 35,
        description: "Argumentieren, Ergebnisse prüfen und Lösungswege reflektieren.",
        note: "Besonders passend für Beweisideen, Grenzfallüberlegungen und Plausibilitätsprüfungen.",
        tasks: [
          {
            title: "Argumentieren",
            description: "Mathematische Aussagen begründen und Zusammenhänge erklären.",
            expectation: "Die Argumentation ist logisch schlüssig und fachsprachlich präzise.",
          },
          {
            title: "Reflektieren",
            description: "Ergebnisse prüfen, Grenzfälle diskutieren oder alternative Verfahren vergleichen.",
            expectation: "Die Reflexion zeigt echtes Verständnis über das reine Rechnen hinaus.",
          },
        ],
      },
    ],
  },
  {
    id: "geschichte-sek2-klausur",
    subject: "Geschichte",
    schoolStage: "sek2",
    focus: "general",
    title: "Geschichte Sek II · Klausur",
    shortLabel: "G Sek II",
    description: "GOSt-Vorlage mit Materialanalyse, historischer Einordnung sowie Urteil und Darstellungsleistung.",
    pedagogicalHint: "Die Vorlage folgt dem typischen Dreischritt aus Erschließen, Einordnen und Urteilen, ergänzt um sichtbare Darstellungsleistung.",
    metaTitle: "Geschichte-Klausur GOSt",
    unit: "Analyse, Einordnung und Urteil",
    notes:
      "GOSt-Vorlage Geschichte. Operatoren, Materialart und Epochenbezug sollten mit den Vorgaben des jeweiligen Halbjahrs abgestimmt werden.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 110,
    sections: [
      {
        title: "Teil A: Materialanalyse",
        points: 40,
        description: "Quelle oder Darstellung erschließen und analysieren.",
        note: "Für Text-, Bild-, Statistik- oder Karikaturmaterial geeignet.",
        tasks: [
          {
            title: "Material erschließen",
            description: "Formale und inhaltliche Merkmale des Materials präzise herausarbeiten.",
            expectation: "Das Material wird sicher erfasst und in seiner Aussageabsicht gelesen.",
          },
          {
            title: "Analytische Deutung",
            description: "Perspektive, Argumentationsweise oder Darstellungsmittel funktional analysieren.",
            expectation: "Analyseschritte bleiben materialgebunden und historisch fachlich sauber.",
          },
        ],
      },
      {
        title: "Teil B: Historische Einordnung",
        points: 35,
        description: "Kontexte, Entwicklungen und Zusammenhänge darstellen.",
        note: "Hier kann auch ein Vergleich mit bekannten Fallbeispielen oder Epochenmerkmalen erfolgen.",
        tasks: [
          {
            title: "Kontextualisieren",
            description: "Das Material in historische Prozesse, Strukturen und Akteure einordnen.",
            expectation: "Die Einordnung ist präzise, angemessen gewichtet und sachlich korrekt.",
          },
          {
            title: "Zusammenhänge erläutern",
            description: "Ursachen, Folgen und Wechselwirkungen differenziert erklären.",
            expectation: "Die Darstellung zeigt komplexe historische Bezüge nachvollziehbar auf.",
          },
        ],
      },
      {
        title: "Teil C: Urteil und Darstellungsleistung",
        points: 35,
        description: "Sachurteil, Werturteil und strukturierte Darstellung bewerten.",
        note: "Urteilsbildung und sprachlich-fachliche Qualität bewusst zusammen sichtbar machen.",
        tasks: [
          {
            title: "Sachurteil",
            description: "Eine historische Entwicklung oder Position begründet beurteilen.",
            expectation: "Das Urteil ist argumentativ tragfähig und fachlich differenziert.",
          },
          {
            title: "Werturteil / Reflexion",
            description: "Perspektiven, Gegenwartsbezug oder Deutungsgrenzen reflektieren.",
            expectation: "Reflexionen bleiben historisch sensibel und nicht anachronistisch.",
          },
          {
            title: "Darstellung",
            description: "Gedankengang klar gliedern und fachsprachlich präzise entfalten.",
            expectation: "Die Darstellung ist kohärent, operatorensicher und sprachlich angemessen.",
          },
        ],
      },
    ],
  },
  {
    id: "chemie-sek2-klausur",
    subject: "Chemie",
    schoolStage: "sek2",
    focus: "general",
    title: "Chemie Sek II · Klausur",
    shortLabel: "C Sek II",
    description: "GOSt-Vorlage mit Fachwissen, Daten-/Materialauswertung und Transfer/Modellierung.",
    pedagogicalHint: "Hilfreich für Oberstufenklausuren mit experimenteller oder modellbezogener Ausrichtung.",
    metaTitle: "Chemie-Klausur GOSt",
    unit: "Fachwissen, Auswertung und Transfer",
    notes:
      "GOSt-Vorlage Chemie. Formelsammlung, Hilfsmittel und eventuelle experimentelle Anteile sollten im Hinweisfeld präzisiert werden.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Fachwissen",
        points: 25,
        description: "Modelle, Konzepte und Reaktionswissen sicher anwenden.",
        note: "Begriffe, Modelle und Reaktionsprinzipien zuerst sauber sichern.",
        tasks: [
          {
            title: "Konzepte anwenden",
            description: "Fachwissen und Modelle fachgerecht auf die Aufgabenstellung beziehen.",
            expectation: "Chemische Grundideen werden korrekt und gezielt eingesetzt.",
          },
          {
            title: "Fachsprache nutzen",
            description: "Reaktionen, Teilchenebene und Fachbegriffe präzise formulieren.",
            expectation: "Die Fachsprache ist stimmig und unterstützt die Argumentation.",
          },
        ],
      },
      {
        title: "Teil B: Daten- und Materialauswertung",
        points: 40,
        description: "Messwerte, Diagramme oder Versuchsbefunde analysieren.",
        note: "Beobachtung, Auswertung und Deutung sollten getrennt lesbar bleiben.",
        tasks: [
          {
            title: "Befunde sichern",
            description: "Daten, Diagramme oder Versuchsergebnisse korrekt erfassen.",
            expectation: "Relevante Informationen werden vollständig und korrekt herausgearbeitet.",
          },
          {
            title: "Deutung ableiten",
            description: "Chemische Schlüsse aus Material oder Daten ziehen.",
            expectation: "Die Deutung ist fachlich abgesichert und direkt an die Daten gebunden.",
          },
          {
            title: "Zusammenhänge erklären",
            description: "Reaktionsabläufe oder Zusammenhänge zwischen Variablen erläutern.",
            expectation: "Erklärungen bleiben modellbezogen und nachvollziehbar.",
          },
        ],
      },
      {
        title: "Teil C: Transfer und Modellierung",
        points: 55,
        description: "Erklären, rechnen und auf neue Kontexte übertragen.",
        note: "Hier können auch stöchiometrische Rechnungen oder Energetik/Elektrochemie verortet werden.",
        tasks: [
          {
            title: "Transfer anwenden",
            description: "Bekannte Konzepte auf eine neue fachliche Situation übertragen.",
            expectation: "Der Transfer zeigt tragfähiges chemisches Verständnis.",
          },
          {
            title: "Modellieren oder rechnen",
            description: "Rechen- oder Modellierungsaufgaben vollständig lösen.",
            expectation: "Rechenwege und Modellannahmen sind korrekt und transparent.",
          },
          {
            title: "Begründen und bewerten",
            description: "Ergebnisse fachlich einordnen und Entscheidungen begründen.",
            expectation: "Die Bewertung ist chemisch fundiert und argumentativ sauber.",
          },
        ],
      },
    ],
  },
  {
    id: "informatik-sek2-klausur",
    subject: "Informatik",
    schoolStage: "sek2",
    focus: "general",
    title: "Informatik Sek II · Klausur",
    shortLabel: "I Sek II",
    description: "GOSt-Vorlage mit Modellierung, Algorithmik/Programmierung und Analyse/Reflexion.",
    pedagogicalHint: "Die Aufteilung passt gut zu Oberstufenklausuren, in denen Lösungsentwurf und fachliche Begründung getrennt erscheinen sollen.",
    metaTitle: "Informatik-Klausur GOSt",
    unit: "Modellierung, Programmierung und Reflexion",
    notes:
      "GOSt-Vorlage Informatik. Aufgaben können in Pseudocode, Java, Python oder UML-notierten Formaten umgesetzt werden.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Modellierung",
        points: 30,
        description: "Datenstrukturen, Zustände, Abläufe und Systemmodelle entwickeln.",
        note: "Hier lassen sich UML, ER-Modelle, Automaten oder Datenflussmodelle abbilden.",
        tasks: [
          {
            title: "System modellieren",
            description: "Die Problemstellung in ein fachlich stimmiges Modell überführen.",
            expectation: "Das Modell ist konsistent, vollständig genug und aufgabenbezogen.",
          },
          {
            title: "Modell erläutern",
            description: "Komponenten, Beziehungen und Zustände fachsprachlich erklären.",
            expectation: "Die Erläuterung zeigt, dass das Modell verstanden und begründet ist.",
          },
        ],
      },
      {
        title: "Teil B: Algorithmik und Programmierung",
        points: 50,
        description: "Lösungen entwerfen, lesen, ergänzen oder optimieren.",
        note: "Praktische oder codebasierte Teile können hier gebündelt werden.",
        tasks: [
          {
            title: "Algorithmus entwickeln",
            description: "Für das Problem einen korrekten und strukturierten Lösungsweg entwerfen.",
            expectation: "Die Lösung ist logisch, ausführbar und fachlich tragfähig.",
          },
          {
            title: "Code analysieren oder ergänzen",
            description: "Vorliegende Programme lesen, verbessern oder vervollständigen.",
            expectation: "Programmteile werden korrekt verstanden und zielgerichtet angepasst.",
          },
          {
            title: "Datenstrukturen nutzen",
            description: "Passende Datenstrukturen auswählen und korrekt einsetzen.",
            expectation: "Die Wahl der Struktur ist fachlich plausibel und begründet.",
          },
        ],
      },
      {
        title: "Teil C: Analyse und Reflexion",
        points: 40,
        description: "Korrektheit, Komplexität, Fehleranalyse und Bewertung.",
        note: "Auch Datenschutz, Effizienz oder Gestaltungskriterien lassen sich hier eintragen.",
        tasks: [
          {
            title: "Korrektheit prüfen",
            description: "Funktion, Randfälle oder Testfälle systematisch untersuchen.",
            expectation: "Die Analyse deckt relevante Fälle auf und begründet das Ergebnis.",
          },
          {
            title: "Lösung bewerten",
            description: "Effizienz, Wartbarkeit oder Alternativen fachlich diskutieren.",
            expectation: "Die Reflexion bleibt fachlich präzise und nicht oberflächlich.",
          },
        ],
      },
    ],
  },
  ...additionalModernForeignLanguages.map(createModernForeignLanguageSek2Blueprint),
  ...additionalClassicalLanguages.map((language) => createClassicalLanguageBlueprint(language, "sek2", "general")),
  ...additionalMaterialSubjects.map((subject) => createMaterialBasedSek2Blueprint(subject, "general")),
  createScienceSekBlueprint("Biologie", "sek2"),
  createScienceSekBlueprint("Physik", "sek2"),
];

const abiturBlueprints: TemplateBlueprint[] = [
  {
    id: "deutsch-abitur-vorabitur",
    subject: "Deutsch",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Deutsch Abitur · Vorabitur / Abiturnah",
    shortLabel: "D Abi",
    description: "Abiturnahe Vorlage mit Analyse, materialgestützter Vertiefung, Transfer und Darstellungsleistung.",
    pedagogicalHint: "Sinnvoll für Q2, Vorabitur und abiturorientierte Klausuren mit explizit abiturtypischem Bewertungsraster.",
    metaTitle: "Deutsch-Vorabitur / Abiturtraining",
    unit: "Abiturnahe Analyse und Deutung",
    notes:
      "Abiturorientierte Deutsch-Vorlage für Q2. Aufgabenart und Erwartungshorizont an die aktuellen fachlichen Vorgaben und die Kursart anpassen.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Analyse",
        points: 40,
        description: "Abiturnahe Analyse mit stringenter Materialbindung.",
        note: "Operatoren und Aufgabenart möglichst abiturtypisch formulieren.",
        tasks: [
          {
            title: "Analyseauftrag entfalten",
            description: "Die Aufgabenstellung systematisch und textnah bearbeiten.",
            expectation: "Die Analyse orientiert sich präzise an Operator und Material.",
          },
          {
            title: "Gestaltung funktional deuten",
            description: "Struktur, Sprache und Aussageabsicht argumentativ verknüpfen.",
            expectation: "Die Deutung entwickelt sich beleggestützt und folgerichtig.",
          },
        ],
      },
      {
        title: "Teil B: Materialgestützte Vertiefung",
        points: 30,
        description: "Vertiefung, Erörterung oder zweites Material abiturorientiert einbinden.",
        note: "Besonders passend für Vergleichs- oder Erörterungsaufgaben.",
        tasks: [
          {
            title: "Argumentationslinie entwickeln",
            description: "Eine tragfähige, differenzierte Deutungs- oder Erörterungslinie entfalten.",
            expectation: "Gedankenführung und Materialeinbindung bleiben stringent.",
          },
          {
            title: "Zusatzmaterial funktional nutzen",
            description: "Weiteres Material oder Vergleichsaspekte zielgerichtet integrieren.",
            expectation: "Zusatzaspekte werden nicht additiv, sondern funktional verarbeitet.",
          },
        ],
      },
      {
        title: "Teil C: Transfer",
        points: 20,
        description: "Epochen-, Kontext- oder Problemtransfer auf Abiturniveau.",
        note: "Transferaufgaben sollten klaren fachlichen Mehrwert haben.",
        tasks: [
          {
            title: "Kontextualisieren",
            description: "Die Analyse in einen größeren literarischen oder kulturellen Zusammenhang stellen.",
            expectation: "Der Transfer erweitert die Deutung substanziell und fachgerecht.",
          },
        ],
      },
      {
        title: "Teil D: Darstellungsleistung",
        points: 30,
        description: "Expliziter Bewertungsblock für Oberstufen- und Abiturstandards.",
        note: "Darstellungsleistung nicht in den Inhaltsblöcken verstecken.",
        tasks: [
          {
            title: "Fachsprache und Struktur",
            description: "Stringenz, Kohärenz und fachsprachliche Präzision bewerten.",
            expectation: "Die Darstellung erfüllt den Anspruch einer abiturvorbereitenden Klausur.",
          },
          {
            title: "Sprachliche Korrektheit",
            description: "Sprachrichtigkeit und stilistische Angemessenheit bewerten.",
            expectation: "Die sprachliche Form ist weitgehend sicher und adressatenangemessen.",
          },
        ],
      },
    ],
  },
  {
    id: "englisch-abitur-vorabitur",
    subject: "Englisch",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Englisch Abitur · Vorabitur / Abi-ready",
    shortLabel: "E Abi",
    description: "Abiturnahe Englischvorlage mit Hörverstehen, Sprachmittlung und Schreiben/Leseverstehen nach 200-Punkte-Logik.",
    pedagogicalHint: "Gedacht für Q2.2, Vorabitur und Klausuren unter Abiturbedingungen: 40 Punkte Hörverstehen, 50 Punkte Sprachmittlung, 110 Punkte Schreiben/Leseverstehen.",
    standardsNote:
      "NRW moderne Fremdsprachen ab Abitur 2025: Q2.2/Abitur fortgeführt und LK verpflichtend 40 Hörverstehen + 50 Sprachmittlung + 110 Schreiben/Leseverstehen = 200 Punkte.",
    metaTitle: "Englisch-Vorabitur / Abiturtraining",
    unit: "Abiturorientierter Input und writing task",
    notes:
      "Abiturorientierte Englisch-Vorlage nach Standardsicherung NRW ab Abitur 2025: Hörverstehen 40 BE, Sprachmittlung 50 BE, Schreiben/Leseverstehen integriert 110 BE. Für EF oder frühere Q-Phase bei Bedarf skalieren.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 200,
    sections: [
      {
        title: "Teil A: Hörverstehen",
        points: 40,
        description: "Isolierter Klausurteil Hörverstehen.",
        note: "Im Abitur und in Q2.2-Klausuren unter Abiturbedingungen zuerst bearbeiten und einsammeln.",
        tasks: [
          {
            title: "Listening comprehension",
            description: "Global and detailed information from audio material identify.",
            expectation: "Answers show accurate understanding of the listening material.",
          },
          {
            title: "Listening tasks",
            description: "Complete closed, semi-open or short-answer tasks as required.",
            expectation: "Responses are precise, evidence-based and task-related.",
          },
        ],
      },
      {
        title: "Teil B: Sprachmittlung",
        points: 50,
        description: "Isolierter Klausurteil Sprachmittlung.",
        note: "Im Abitur ab 2025 mit 20 Punkten Inhalt und 30 Punkten Darstellungsleistung/sprachliche Leistung.",
        tasks: [
          {
            title: "Mediation content",
            points: 20,
            description: "Select and transfer relevant information for the target situation.",
            expectation: "The mediation product is accurate, purposeful and audience-oriented.",
          },
          {
            title: "Mediation language",
            points: 30,
            description: "Use appropriate register, structure and language for the target text.",
            expectation: "Language and text construction support the communicative task.",
          },
        ],
      },
      {
        title: "Teil C: Schreiben / Leseverstehen · Inhalt",
        points: 44,
        description: "Inhaltliche Leistung im integrierten Schreiben/Leseverstehen.",
        note: "Die drei Teilaufgaben können je nach konkreter Aufgabenstellung unterschiedlich verteilt werden.",
        tasks: [
          {
            title: "Comprehension",
            points: 12,
            description: "Summarise or select central aspects of the source text.",
            expectation: "The response secures source understanding accurately and concisely.",
          },
          {
            title: "Analysis",
            points: 17,
            description: "Analyse message, perspective, strategy or language of the source.",
            expectation: "The analysis is text-based, coherent and conceptually precise.",
          },
          {
            title: "Evaluation / re-creation",
            points: 15,
            description: "Develop an evaluative, creative or context-based final task.",
            expectation: "The final response is differentiated, task-related and well reasoned.",
          },
        ],
      },
      {
        title: "Teil D: Darstellungsleistung / Sprache",
        points: 66,
        description: "Sprachliche Leistung im integrierten Schreiben/Leseverstehen.",
        note: "66 Punkte: kommunikative Textgestaltung 22, Ausdruck/sprachliche Mittel 22, Sprachrichtigkeit 22.",
        tasks: [
          {
            title: "Communicative text design",
            points: 22,
            description: "Assess audience orientation, text type, structure, coherence and use of references.",
            expectation: "The text is coherent, purposeful and functionally structured.",
          },
          {
            title: "Range / linguistic resources",
            points: 22,
            description: "Assess independent wording, vocabulary, text-production vocabulary and sentence structure.",
            expectation: "Language use is differentiated, appropriate and sufficiently independent from the source.",
          },
          {
            title: "Sprachrichtigkeit: Wortschatz",
            points: 9,
            description: "Lexical accuracy according to the NRW orientation grid.",
            expectation: "Lexical choices support comprehension and do not distort meaning.",
          },
          {
            title: "Sprachrichtigkeit: Grammatik",
            points: 9,
            description: "Grammar and sentence-level correctness according to the NRW orientation grid.",
            expectation: "Grammar supports communication and does not materially impair understanding.",
          },
          {
            title: "Sprachrichtigkeit: Orthografie",
            points: 4,
            description: "Spelling and punctuation according to the NRW orientation grid.",
            expectation: "Orthography and punctuation remain functional for comprehension.",
          },
        ],
      },
    ],
  },
  {
    id: "mathematik-abitur-vorabitur",
    subject: "Mathematik",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Mathematik Abitur · Grundkurs 2026+",
    shortLabel: "M Abi GK",
    description: "Abiturstruktur NRW Grundkurs: Teil A 25 + Analysis 25 + Geometrie 15 + Stochastik 15 = 80 Punkte.",
    pedagogicalHint:
      "Für GK-Abiturtraining ab 2026: Teil A ohne Hilfsmittel, Teil B mit Analysis, vektorieller Geometrie und Stochastik nach NRW-Punktverteilung.",
    standardsNote:
      "NRW Mathematik Abitur ab 2026: GK 80 Punkte; Teil A 25, Analysis 25, Vektorielle Geometrie 15, Stochastik 15. Gesamtarbeitszeit 255 Minuten.",
    metaTitle: "Mathematik-Vorabitur / Abiturtraining",
    unit: "Abitur GK: Teil A und Teil B",
    notes:
      "Abiturorientierte Mathematik-GK-Vorlage nach Standardsicherung NRW ab Prüfungsjahr 2026. Teil A ohne Hilfsmittel; Hilfsmittel werden erst nach Abgabe von Teil A genutzt.",
    gradeLevel: "Q2",
    course: "GK",
    totalPoints: 80,
    sections: [
      {
        title: "Teil A: Hilfsmittelfrei",
        points: 25,
        description: "Fünf Aufgaben ohne Hilfsmittel einschließlich Auswahlzeit.",
        note: "Teil A muss vor Ausgabe von CAS/MMS bzw. WTR und Formelsammlung abgegeben werden.",
        tasks: [
          {
            title: "Grundkompetenzen",
            description: "Zentrale Verfahren, Umformungen oder Grundbegriffe sicher anwenden.",
            expectation: "Die hilfsmittelfreien Grundlagen werden routiniert und korrekt bearbeitet.",
          },
          {
            title: "Darstellung",
            description: "Zwischenschritte sauber und formal korrekt notieren.",
            expectation: "Die Notation ist präzise und der Lösungsweg klar nachvollziehbar.",
          },
        ],
      },
      {
        title: "Teil B1: Analysis",
        points: 25,
        description: "Analysis-Aufgabe mit Hilfsmitteln.",
        note: "Teil B im GK umfasst insgesamt 55 Punkte; Analysis ist mit 25 Punkten ausgewiesen.",
        tasks: [
          {
            title: "Ansatz und Modellierung",
            description: "Ein abiturtypisches Problem strukturieren und mathematisch fassen.",
            expectation: "Der mathematische Zugang ist passend gewählt und begründet.",
          },
        ],
      },
      {
        title: "Teil B2: Vektorielle Geometrie",
        points: 15,
        description: "Geometrie-Aufgabe mit Hilfsmitteln.",
        note: "NRW-GK-Verteilung ab 2026: vektorielle Geometrie 15 Punkte.",
        tasks: [
          {
            title: "Geometrische Verfahren",
            description: "Vektoren, Geraden, Ebenen oder Abstands- und Lagebeziehungen bearbeiten.",
            expectation: "Lösungswege sind formal korrekt, begründet und nachvollziehbar.",
          },
        ],
      },
      {
        title: "Teil B3: Stochastik",
        points: 15,
        description: "Stochastik-Aufgabe mit Hilfsmitteln.",
        note: "NRW-GK-Verteilung ab 2026: Stochastik 15 Punkte.",
        tasks: [
          {
            title: "Stochastische Verfahren",
            description: "Wahrscheinlichkeitsmodelle, Verteilungen oder statistische Entscheidungen bearbeiten.",
            expectation: "Rechnungen, Deutungen und Begründungen passen zum stochastischen Modell.",
          },
        ],
      },
    ],
  },
  {
    id: "mathematik-abitur-lk",
    subject: "Mathematik",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Mathematik Abitur · Leistungskurs 2026+",
    shortLabel: "M Abi LK",
    description: "Abiturstruktur NRW Leistungskurs: Teil A 30 + Analysis 30 + Geometrie 20 + Stochastik 20 = 100 Punkte.",
    pedagogicalHint:
      "Für LK-Abiturtraining ab 2026: Teil A ohne Hilfsmittel, Teil B mit Analysis, vektorieller Geometrie und Stochastik nach NRW-Punktverteilung.",
    standardsNote:
      "NRW Mathematik Abitur ab 2026: LK 100 Punkte; Teil A 30, Analysis 30, Vektorielle Geometrie 20, Stochastik 20. Gesamtarbeitszeit 300 Minuten.",
    metaTitle: "Mathematik-LK-Vorabitur / Abiturtraining",
    unit: "Abitur LK: Teil A und Teil B",
    notes:
      "Abiturorientierte Mathematik-LK-Vorlage nach Standardsicherung NRW ab Prüfungsjahr 2026. Teil A ohne Hilfsmittel; Hilfsmittel werden erst nach Abgabe von Teil A genutzt.",
    gradeLevel: "Q2",
    course: "LK",
    totalPoints: 100,
    sections: [
      {
        title: "Teil A: Hilfsmittelfrei",
        points: 30,
        description: "Sechs Aufgaben ohne Hilfsmittel einschließlich Auswahlzeit.",
        note: "Teil A muss vor Ausgabe von CAS/MMS bzw. WTR und Formelsammlung abgegeben werden.",
        tasks: [
          {
            title: "Grundkompetenzen",
            description: "Zentrale Verfahren, Umformungen oder Grundbegriffe ohne Hilfsmittel anwenden.",
            expectation: "Die hilfsmittelfreien Grundlagen werden routiniert und korrekt bearbeitet.",
          },
          {
            title: "Darstellung",
            description: "Zwischenschritte sauber und formal korrekt notieren.",
            expectation: "Die Notation ist präzise und der Lösungsweg klar nachvollziehbar.",
          },
        ],
      },
      {
        title: "Teil B1: Analysis",
        points: 30,
        description: "Analysis-Aufgabe mit Hilfsmitteln.",
        note: "NRW-LK-Verteilung ab 2026: Analysis 30 Punkte.",
        tasks: [
          {
            title: "Ansatz, Berechnung und Interpretation",
            description: "Ein Analysis-Problem strukturieren, lösen und interpretieren.",
            expectation: "Der mathematische Zugang ist passend, vollständig und fachlich begründet.",
          },
        ],
      },
      {
        title: "Teil B2: Vektorielle Geometrie",
        points: 20,
        description: "Geometrie-Aufgabe mit Hilfsmitteln.",
        note: "NRW-LK-Verteilung ab 2026: vektorielle Geometrie 20 Punkte.",
        tasks: [
          {
            title: "Geometrische Verfahren",
            description: "Vektoren, Geraden, Ebenen oder Abstands- und Lagebeziehungen bearbeiten.",
            expectation: "Lösungswege sind formal korrekt, begründet und nachvollziehbar.",
          },
        ],
      },
      {
        title: "Teil B3: Stochastik",
        points: 20,
        description: "Stochastik-Aufgabe mit Hilfsmitteln.",
        note: "NRW-LK-Verteilung ab 2026: Stochastik 20 Punkte.",
        tasks: [
          {
            title: "Stochastische Verfahren",
            description: "Wahrscheinlichkeitsmodelle, Verteilungen oder statistische Entscheidungen bearbeiten.",
            expectation: "Rechnungen, Deutungen und Begründungen passen zum stochastischen Modell.",
          },
        ],
      },
    ],
  },
  {
    id: "geschichte-abitur-vorabitur",
    subject: "Geschichte",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Geschichte Abitur · Vorabitur / Abiturnah",
    shortLabel: "G Abi",
    description: "Abiturnahe Geschichtsvorlage mit Materialanalyse, Kontextualisierung und differenzierter Urteilsbildung.",
    pedagogicalHint: "Gedacht für Q2 und Vorabitur, wenn Analyse- und Urteilskompetenz nah am Abiturmodell geübt werden sollen.",
    metaTitle: "Geschichte-Vorabitur / Abiturtraining",
    unit: "Abiturnahe Analyse und Urteil",
    notes:
      "Abiturorientierte Geschichte-Vorlage. Materialart, Operatorik und epochenspezifische Schwerpunktsetzung an die aktuellen fachlichen Vorgaben anpassen.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 110,
    sections: [
      {
        title: "Teil A: Materialanalyse",
        points: 40,
        description: "Abiturnahe Analyse historischer Materialien.",
        note: "Für komplexere Materialien und differenzierte Operatoren gedacht.",
        tasks: [
          {
            title: "Erschließen",
            description: "Material formal und inhaltlich präzise erfassen.",
            expectation: "Das Material wird sicher gelesen und in seiner Aussageabsicht erfasst.",
          },
          {
            title: "Analysieren",
            description: "Struktur, Perspektive und historische Aussagefunktion untersuchen.",
            expectation: "Analyseschritte sind materialnah und fachlich differenziert.",
          },
        ],
      },
      {
        title: "Teil B: Historische Kontextualisierung",
        points: 35,
        description: "Historische Prozesse, Zusammenhänge und Deutungsrahmen entfalten.",
        note: "Hier zeigt sich die Anbindung an Q2- und Abiturhorizonte besonders deutlich.",
        tasks: [
          {
            title: "Einordnen",
            description: "Das Material in relevante Strukturen und Entwicklungen einbetten.",
            expectation: "Kontextualisierung ist präzise, tragfähig und angemessen gewichtet.",
          },
          {
            title: "Zusammenhänge differenzieren",
            description: "Ursachen, Folgen und Perspektiven systematisch verknüpfen.",
            expectation: "Zusammenhänge werden multiperspektivisch und schlüssig dargestellt.",
          },
        ],
      },
      {
        title: "Teil C: Urteil und Reflexion",
        points: 35,
        description: "Sachurteil, Werturteil und reflektierte Darstellung auf Abiturniveau.",
        note: "Die Urteilsbildung sollte explizit an Kriterien rückgebunden werden.",
        tasks: [
          {
            title: "Sachurteil",
            description: "Eine historische Fragestellung argumentativ fundiert beurteilen.",
            expectation: "Das Sachurteil basiert klar auf Analyse und Kontextwissen.",
          },
          {
            title: "Reflexion und Werturteil",
            description: "Perspektivische, normative oder gegenwartsbezogene Dimensionen reflektieren.",
            expectation: "Die Reflexion bleibt historisch sensibel und argumentativ tragfähig.",
          },
        ],
      },
    ],
  },
  {
    id: "chemie-abitur-vorabitur",
    subject: "Chemie",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Chemie Abitur · Vorabitur / Abiturnah",
    shortLabel: "C Abi",
    description: "Abiturnahe Chemievorlage mit Fachwissen, Auswertung und Transfer/Modellierung.",
    pedagogicalHint:
      "Passend für Q2, Vorabitur und klausurnahe Abiturvorbereitung. Im Zentralabitur ab 2025 werden vier Aufgaben bereitgestellt, von denen drei bearbeitet werden.",
    standardsNote:
      "NRW Chemie Abitur ab 2025: Schule erhält vier Aufgaben, Prüflinge wählen drei. Formelsammlung bzw. zulässiger fachspezifischer Auszug ist ab 2025 verpflichtend.",
    metaTitle: "Chemie-Vorabitur / Abiturtraining",
    unit: "Abiturorientierte Auswertung und Modellierung",
    notes:
      "Abiturorientierte Chemie-Vorlage. Auswahl 3 aus 4 dokumentieren; Formelsammlung, Hilfsmittel und experimentelle Anteile an die aktuellen Abiturvorgaben der Fachkonferenz anpassen.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Fachwissen und Konzepte",
        points: 25,
        description: "Abiturnahe Konzepte, Modelle und Reaktionsprinzipien sicher anwenden.",
        note: "Geeignet für Wiederholungs- und Vernetzungsaufgaben der Q2.",
        tasks: [
          {
            title: "Konzepte sichern",
            description: "Zentrale chemische Modelle und Fachbegriffe passgenau nutzen.",
            expectation: "Grundlagen sind sicher verfügbar und werden korrekt verwendet.",
          },
        ],
      },
      {
        title: "Teil B: Auswertung",
        points: 40,
        description: "Komplexe Materialien, Daten oder Versuchsbefunde analysieren.",
        note: "Typisch für abiturähnliche Materialgrundlagen mit mehreren Darstellungsformen.",
        tasks: [
          {
            title: "Material lesen",
            description: "Daten, Diagramme oder Versuchsinformationen präzise erfassen.",
            expectation: "Relevante Informationen werden sicher identifiziert und geordnet.",
          },
          {
            title: "Fachlich deuten",
            description: "Aus den Daten belastbare chemische Schlüsse ableiten.",
            expectation: "Die Deutung ist fachlich stimmig und datenbasiert.",
          },
        ],
      },
      {
        title: "Teil C: Transfer und Modellierung",
        points: 55,
        description: "Abiturtypische Transfer-, Rechen- und Begründungsaufgaben lösen.",
        note: "Stöchiometrie, Gleichgewichte, Energetik oder Elektrochemie passen gut hierher.",
        tasks: [
          {
            title: "Transfer",
            description: "Bekannte Konzepte auf neue chemische Kontexte übertragen.",
            expectation: "Transferleistungen zeigen vernetztes chemisches Verständnis.",
          },
          {
            title: "Rechnen oder modellieren",
            description: "Quantitative oder modellbezogene Aufgaben vollständig lösen.",
            expectation: "Verfahren und Rechenwege sind korrekt und nachvollziehbar.",
          },
          {
            title: "Bewerten",
            description: "Ergebnisse chemisch einordnen und Entscheidungen begründen.",
            expectation: "Bewertungen sind argumentativ sauber und fachlich abgesichert.",
          },
        ],
      },
    ],
  },
  {
    id: "biologie-abitur-auswahl",
    subject: "Biologie",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Biologie Abitur · 3 aus 4",
    shortLabel: "Bio Abi",
    description: "Abiturnahe Biologievorlage für das NRW-Auswahlmodell: vier Aufgaben gestellt, drei bewertet.",
    pedagogicalHint:
      "Die Vorlage bildet die drei tatsächlich bearbeiteten Aufgaben ab. Die vierte, nicht gewählte Aufgabe wird in den Notizen dokumentiert, aber nicht bepunktet.",
    standardsNote:
      "NRW Biologie Abitur ab 2025: Schule erhält für GK und LK jeweils vier Aufgaben; Prüflinge wählen drei Aufgaben zur Bearbeitung aus.",
    metaTitle: "Biologie-Vorabitur / Abiturtraining",
    unit: "Abiturorientierte Aufgabenwahl",
    notes:
      "Abiturorientierte Biologie-Vorlage. Auswahl 3 aus 4 dokumentieren und die drei bearbeiteten Aufgaben nach den aktuellen fachlichen Vorgaben ausarbeiten.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 120,
    sections: [
      {
        title: "Gewählte Aufgabe 1",
        points: 40,
        description: "Erste bearbeitete Abituraufgabe.",
        note: "Original-Aufgabentitel und Inhaltsfeld eintragen.",
        tasks: [
          {
            title: "Material erschließen und fachlich auswerten",
            description: "Materialien, Daten, Modelle oder Experimente biologisch erschließen.",
            expectation: "Auswertung und Fachsprache sind korrekt, materialgebunden und nachvollziehbar.",
          },
        ],
      },
      {
        title: "Gewählte Aufgabe 2",
        points: 40,
        description: "Zweite bearbeitete Abituraufgabe.",
        note: "Original-Aufgabentitel und Inhaltsfeld eintragen.",
        tasks: [
          {
            title: "Zusammenhänge erklären und anwenden",
            description: "Biologische Konzepte auf den Aufgabenkontext anwenden.",
            expectation: "Erklärungen sind fachlich präzise und vernetzen Material mit Konzeptwissen.",
          },
        ],
      },
      {
        title: "Gewählte Aufgabe 3",
        points: 40,
        description: "Dritte bearbeitete Abituraufgabe.",
        note: "Die nicht gewählte vierte Aufgabe in der Klausurnotiz dokumentieren.",
        tasks: [
          {
            title: "Transfer und Bewertung",
            description: "Ergebnisse übertragen, beurteilen oder begründet bewerten.",
            expectation: "Transfer- und Bewertungsleistungen sind fachlich abgesichert und differenziert.",
          },
        ],
      },
    ],
  },
  {
    id: "physik-abitur-auswahl",
    subject: "Physik",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Physik Abitur · 3 aus 4",
    shortLabel: "Phy Abi",
    description: "Abiturnahe Physikvorlage für das NRW-Auswahlmodell: vier Aufgaben gestellt, drei bewertet.",
    pedagogicalHint:
      "Die Vorlage bildet die drei tatsächlich bearbeiteten Aufgaben ab. Die vierte, nicht gewählte Aufgabe wird in den Notizen dokumentiert, aber nicht bepunktet.",
    standardsNote:
      "NRW Physik Abitur ab 2025: Schule erhält für GK und LK jeweils vier Aufgaben; Prüflinge wählen drei Aufgaben zur Bearbeitung aus. Formelsammlung verpflichtend ab 2027, freiwillig ab 2025.",
    metaTitle: "Physik-Vorabitur / Abiturtraining",
    unit: "Abiturorientierte Aufgabenwahl",
    notes:
      "Abiturorientierte Physik-Vorlage. Auswahl 3 aus 4 dokumentieren und die drei bearbeiteten Aufgaben nach den aktuellen fachlichen Vorgaben ausarbeiten.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 120,
    sections: [
      {
        title: "Gewählte Aufgabe 1",
        points: 40,
        description: "Erste bearbeitete Abituraufgabe.",
        note: "Original-Aufgabentitel und Inhaltsfeld eintragen.",
        tasks: [
          {
            title: "Problem erfassen und modellieren",
            description: "Physikalische Situation, Größen und Modelle strukturieren.",
            expectation: "Der Modellansatz ist fachlich passend und nachvollziehbar begründet.",
          },
        ],
      },
      {
        title: "Gewählte Aufgabe 2",
        points: 40,
        description: "Zweite bearbeitete Abituraufgabe.",
        note: "Original-Aufgabentitel und Inhaltsfeld eintragen.",
        tasks: [
          {
            title: "Berechnen und auswerten",
            description: "Daten, Diagramme oder Experimente quantitativ und qualitativ auswerten.",
            expectation: "Rechenwege, Einheiten, Deutung und Messwertbezug sind fachlich korrekt.",
          },
        ],
      },
      {
        title: "Gewählte Aufgabe 3",
        points: 40,
        description: "Dritte bearbeitete Abituraufgabe.",
        note: "Die nicht gewählte vierte Aufgabe in der Klausurnotiz dokumentieren.",
        tasks: [
          {
            title: "Begründen und bewerten",
            description: "Physikalische Aussagen, Grenzen des Modells oder Anwendungen bewerten.",
            expectation: "Begründungen sind fachsprachlich präzise und fachlich tragfähig.",
          },
        ],
      },
    ],
  },
  {
    id: "informatik-abitur-vorabitur",
    subject: "Informatik",
    schoolStage: "sek2",
    focus: "abitur",
    title: "Informatik Abitur · Vorabitur / Abiturnah",
    shortLabel: "I Abi",
    description: "Abiturnahe Informatikvorlage mit Modellierung, Lösungsentwurf und Analyse/Reflexion.",
    pedagogicalHint: "Sinnvoll für Q2 und Vorabitur, wenn fachliche Tiefe und Begründung explizit im Erwartungshorizont erscheinen sollen.",
    metaTitle: "Informatik-Vorabitur / Abiturtraining",
    unit: "Abiturorientierte Modellierung und Analyse",
    notes:
      "Abiturorientierte Informatik-Vorlage. Notation, Programmiersprache und Materialbasis sollten mit den schulinternen Vorgaben abgestimmt werden.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Modellierung",
        points: 30,
        description: "Abiturnahe Modellierung von Daten, Systemen oder Abläufen.",
        note: "Gut für UML, Automaten, Datenbanken oder Netzmodelle geeignet.",
        tasks: [
          {
            title: "Problem modellieren",
            description: "Die Ausgangslage in ein tragfähiges informatisches Modell überführen.",
            expectation: "Das Modell ist strukturiert, konsistent und fachlich angemessen.",
          },
        ],
      },
      {
        title: "Teil B: Lösungsentwurf und Umsetzung",
        points: 50,
        description: "Algorithmen entwickeln, Programme analysieren oder gezielt ergänzen.",
        note: "Auch vorgelegte Codeausschnitte oder Pseudocode lassen sich hier abbilden.",
        tasks: [
          {
            title: "Algorithmus entwerfen",
            description: "Für die Problemstellung einen belastbaren Lösungsweg entwickeln.",
            expectation: "Der Entwurf ist korrekt strukturiert und prinzipiell umsetzbar.",
          },
          {
            title: "Programmteile bearbeiten",
            description: "Vorliegende Programmfragmente verstehen, ergänzen oder korrigieren.",
            expectation: "Bearbeitungen sind fachlich treffend und lösen das Problem.",
          },
          {
            title: "Datenstruktur begründen",
            description: "Strukturen oder Verfahren begründet auswählen.",
            expectation: "Die Entscheidung zeigt informatisches Abwägen und Fachverständnis.",
          },
        ],
      },
      {
        title: "Teil C: Analyse und Reflexion",
        points: 40,
        description: "Korrektheit, Effizienz, Grenzen und Folgen reflektieren.",
        note: "Besonders geeignet für anspruchsvollere Begründungs- und Bewertungsfragen.",
        tasks: [
          {
            title: "Korrektheit und Testen",
            description: "Lösungen mit Tests, Randfällen oder Invarianten prüfen.",
            expectation: "Die Prüfung ist systematisch und fachlich begründet.",
          },
          {
            title: "Bewertung und Reflexion",
            description: "Effizienz, Wartbarkeit oder Auswirkungen der Lösung diskutieren.",
            expectation: "Die Reflexion bleibt tiefgehend, präzise und informatisch fundiert.",
          },
        ],
      },
    ],
  },
  ...additionalModernForeignLanguages.map(createModernForeignLanguageAbiturBlueprint),
  ...additionalClassicalLanguages.map((language) => createClassicalLanguageBlueprint(language, "sek2", "abitur")),
  ...additionalMaterialSubjects.map((subject) => createMaterialBasedSek2Blueprint(subject, "abitur")),
];

export const createReadingExamTemplate = (): Exam => ({
  ...createBaseExam({
    title: "Englisch-Klassenarbeit Lesen",
    unit: "Leseverstehen · Unit-Text und Aufgaben",
    notes:
      "Sek-I-Bewertungsbogen Englisch NRW. Alle Teile, Aufgaben, Erwartungshorizonte und Gewichtungen sind vollständig editierbar.",
    gradeLevel: "8",
    course: "8b",
  }),
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
        ),
        createTask(
          "Multiple Choice",
          10,
          "Leseverstehen",
          "Wähle die beste Antwort zu Fragen zum Textverständnis aus.",
          "Die Fragen sollten Hauptaussage, Details und gegebenenfalls implizite Informationen abdecken.",
        ),
        createTask(
          "Kurze Antworten",
          10,
          "Leseverstehen",
          "Beantworte Fragen in kurzen, präzisen Sätzen möglichst in eigenen Worten.",
          "Die Antworten sollen textnah sein, aber Verständnis zeigen statt ganze Zeilen zu übernehmen.",
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
        ),
        createTask(
          "Aufbau",
          10,
          "Schreiben",
          "Struktur, Absatzbildung, Kohärenz und passende Textsortenmerkmale.",
          "Der Text soll klar gegliedert sein und zur geforderten Textsorte passen, zum Beispiel E-Mail oder Stellungnahme.",
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
        ),
        createTask(
          "Wortschatz",
          7.5,
          "Sprache im Schreiben",
          "Treffsichere, abwechslungsreiche und zur Schreibaufgabe passende Wortwahl.",
          "Bewertet werden Wortschatzbreite, Angemessenheit, idiomatische Wendungen und Präzision.",
        ),
        createTask(
          "Rechtschreibung",
          7.5,
          "Sprache im Schreiben",
          "Orthografie, Zeichensetzung und formale sprachliche Genauigkeit im Text.",
          "Achte auf korrekt geschriebene Wörter, sinnvolle Zeichensetzung und formale Genauigkeit.",
        ),
        createTask(
          "Ausdrucksvermögen",
          7.5,
          "Sprache im Schreiben",
          "Sprachliche Variabilität, Klarheit und angemessener stilistischer Ausdruck.",
          "Bewertet werden differenzierte Formulierungen, sprachliche Flexibilität und ein passender Stil.",
        ),
      ],
    ),
  ],
});

export const createListeningExamTemplate = () => {
  const template = createTemplateDefinition(sek1Blueprints.find((blueprint) => blueprint.id === "englisch-sek1-kompetenzen")!).build();
  template.meta.title = "Englisch-Klassenarbeit Hören";
  template.meta.unit = "Listening, language practice and writing task";
  template.sections[0].title = "Teil A: Hörverstehen";
  template.sections[0].description = "Hörverstehen mit Global-, Detail- und Transferaufgaben.";
  template.sections[0].note = "Das Audio kann zweimal abgespielt werden; Global- und Detailverstehen sollten getrennt sichtbar bleiben.";
  template.sections[0].tasks = [
    createTask(
      "Global understanding",
      10,
      "Teil A: Hörverstehen",
      "Die Gesamtsituation, Stimmung oder Hauptaussage des Audios erfassen.",
      "Antworten zeigen sicheres Globalverstehen des Hörtexts.",
    ),
    createTask(
      "Detailed information",
      10,
      "Teil A: Hörverstehen",
      "Details wie Gründe, Orte, Zeiten oder Meinungen korrekt herausarbeiten.",
      "Die genannten Informationen sind präzise und hörtextnah erfasst.",
    ),
    createTask(
      "Notes / transfer",
      10,
      "Teil A: Hörverstehen",
      "Stichworte sichern oder Informationen kurz übertragen.",
      "Die Informationen sind verständlich, passend ausgewählt und korrekt wiedergegeben.",
    ),
  ];
  return template;
};

export const createMediationExamTemplate = () => {
  const template = createTemplateDefinition(sek1Blueprints.find((blueprint) => blueprint.id === "englisch-sek1-kompetenzen")!).build();
  template.meta.title = "Englisch-Klassenarbeit Sprachmittlung";
  template.meta.unit = "Mediation, language practice and writing task";
  template.sections[0].title = "Teil A: Sprachmittlung";
  template.sections[0].description = "Sinngemäßes Übertragen in einer adressatenbezogenen Kommunikationssituation.";
  template.sections[0].note = "Es geht um kommunikatives Gelingen, nicht um wörtliche Übersetzung.";
  template.sections[0].tasks = [
    createTask(
      "Selection of relevant content",
      10,
      "Teil A: Sprachmittlung",
      "Relevante Informationen aus dem Ausgangstext auswählen.",
      "Nur die für die Zielperson wirklich nötigen Inhalte werden übernommen.",
    ),
    createTask(
      "Addressing the audience",
      10,
      "Teil A: Sprachmittlung",
      "Mitteilung adressaten- und situationsgerecht formulieren.",
      "Register, Umfang und Kommunikationsziel passen erkennbar zur Situation.",
    ),
    createTask(
      "Clear mediation",
      10,
      "Teil A: Sprachmittlung",
      "Informationen verständlich und sinngemäß auf Englisch übermitteln.",
      "Die Mitteilung bleibt klar, funktional und kommunikativ erfolgreich.",
    ),
  ];
  return template;
};

export const examTemplates: ExamTemplateDefinition[] = [
  ...sek1Blueprints.map(createTemplateDefinition),
  ...sek2Blueprints.map(createTemplateDefinition),
  ...abiturBlueprints.map(createTemplateDefinition),
];
