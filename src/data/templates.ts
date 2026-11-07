import { BuilderSchoolStage } from "../data/builderResearch";
import { Exam, Section, Task } from "../types";
import { createDefaultGradeScale } from "../utils/grades";

const createTask = (
  title: string,
  maxPoints: number,
  category: string,
): Task => ({
  id: crypto.randomUUID(),
  title,
  description: "",
  category,
  maxPoints,
  achievedPoints: 0,
  expectation: "",
});

const createSection = (
  title: string,
  _legacyWeight: number,
  description: string,
  note: string,
  tasks: Task[],
): Section => ({
  id: crypto.randomUUID(),
  title,
  description,
  linkedSectionId: null,
  maxPointsOverride: null,
  note,
  tasks,
});

const createBaseExam = ({
  title: _title,
  unit: _unit,
  notes: _notes,
  gradeLevel: _gradeLevel,
  course: _course,
  subject: _subject = "",
  schoolYear: _schoolYear = "",
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
    schoolYear: "",
    subject: "",
    gradeLevel: "",
    course: "",
    teacher: "",
    examDate: "",
    title: "",
    unit: "",
    notes: "",
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
}

interface TemplateSectionSeed {
  title: string;
  points: number;
  description: string;
  note: string;
  tasks: TemplateTaskSeed[];
}

type TemplateFocus = "general" | "abitur";
export type TemplateSchoolForm = "grundschule" | "realschule" | "sek1" | "sek2";

interface TemplateBlueprint {
  id: string;
  subject: string;
  schoolStage: BuilderSchoolStage;
  schoolForm?: TemplateSchoolForm;
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
  schoolForm: TemplateSchoolForm;
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
  schoolForm: blueprint.schoolForm ?? blueprint.schoolStage,
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
      subject: blueprint.subject,
    }),
    sections: blueprint.sections.map((section) => {
      const taskPoints = resolveTaskPoints(section);
      return createSection(
        section.title,
        roundToTwo((section.points / blueprint.totalPoints) * 100),
        section.description,
        section.note,
        section.tasks.map((task, index) =>
          createTask(task.title, taskPoints[index] ?? 0, section.title),
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
        },
        {
          title: "Detailverstehen",
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
        },
        {
          title: "Wortschatz",
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
        },
        {
          title: "Aufbau und Textsorte",
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
        },
        {
          title: "Ausdruck und Kohärenz",
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
        },
        {
          title: "Sachwissen anwenden",
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
        },
        {
          title: "Darstellungsleistung / Sprache",
          points: 30,
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
        },
        {
          title: "Analyse",
          points: 17,
        },
        {
          title: "Commentaire / production",
          points: 15,
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
        },
        {
          title: "Ausdruck / sprachliche Mittel",
          points: 22,
        },
        {
          title: "Sprachrichtigkeit",
          points: 22,
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
        },
        {
          title: "Fachmethodisch auswerten",
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
        },
        {
          title: "Zusammenhänge erklären",
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
        },
        {
          title: "Transfer herstellen",
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
        },
        {
          title: "Zusammenhänge erklären",
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
        },
        {
          title: "Begründen oder bewerten",
        },
      ],
    },
  ],
});

/** School-form-specific examples based on the current NRW curriculum structure. */
const schoolFormBlueprints: TemplateBlueprint[] = [
  {
    id: "grundschule-deutsch-lesen-schreiben",
    subject: "Deutsch",
    schoolStage: "sek1",
    schoolForm: "grundschule",
    focus: "general",
    title: "Grundschule · Deutsch Klasse 4 · Lesen und Schreiben",
    shortLabel: "GS D 4",
    description: "Kompetenzorientierte Lernzielkontrolle mit Leseverstehen, Schreiben und Sprachbewusstheit.",
    pedagogicalHint: "Für Klasse 4: lebensnahe, überschaubare Aufgaben und klar beobachtbare Teilkompetenzen statt einer Sek-I-Klassenarbeitslogik.",
    standardsNote: "Orientiert am Lehrplan Primarstufe NRW (Deutsch, 2025): Lesen, Schreiben und Sprache in kommunikativen Zusammenhängen. Als Bestandteil der Leistungsbewertung an Lernstand, Förderung und schulinterne Vereinbarungen anpassen.",
    metaTitle: "",
    unit: "",
    notes: "",
    gradeLevel: "",
    course: "",
    totalPoints: 30,
    sections: [
      {
        title: "Lesen: Text verstehen",
        points: 12,
        description: "Einen altersgemäßen erzählenden oder sachlichen Text erschließen.",
        note: "Kurze Texte, deutliche Aufgabenformate und bei Bedarf Lesestrategien oder Visualisierungen bereitstellen.",
        tasks: [
          { title: "Wichtige Informationen finden",},
          { title: "Text verstehen und begründen",},
        ],
      },
      {
        title: "Schreiben: Für andere schreiben",
        points: 12,
        description: "Einen kurzen, adressatenbezogenen Text planen und verfassen.",
        note: "Zum Beispiel Einladung, Bericht, Fortsetzung oder kurze Beschreibung; Textsorte transparent machen.",
        tasks: [
          { title: "Inhalt und Reihenfolge",},
          { title: "Passende Sprache",},
        ],
      },
      {
        title: "Sprache: Wörter und Sätze untersuchen",
        points: 6,
        description: "Sprachliche Regelmäßigkeiten erkennen und für das eigene Schreiben nutzen.",
        note: "Auf zuvor im Unterricht gesicherte Schwerpunkte wie Wortarten, Satzzeichen oder Rechtschreibstrategien begrenzen.",
        tasks: [
          { title: "Strategie anwenden",},
        ],
      },
    ],
  },
  {
    id: "grundschule-mathematik-alltag",
    subject: "Mathematik",
    schoolStage: "sek1",
    schoolForm: "grundschule",
    focus: "general",
    title: "Grundschule · Mathematik Klasse 4 · Rechnen im Alltag",
    shortLabel: "GS M 4",
    description: "Kompetenzorientierte Lernzielkontrolle mit Zahlen und Operationen, Größen sowie Modellieren und Begründen.",
    pedagogicalHint: "Verbindet mathematische Inhalte mit prozessbezogenen Kompetenzen und lässt Lösungswege sichtbar werden.",
    standardsNote: "Orientiert am Lehrplan Primarstufe NRW (Mathematik, 2025): Problemlösen, Modellieren, Kommunizieren, Argumentieren und Darstellen werden mit Zahlen und Operationen sowie Größen und Messen verknüpft.",
    metaTitle: "",
    unit: "",
    notes: "",
    gradeLevel: "",
    course: "",
    totalPoints: 30,
    sections: [
      {
        title: "Zahlen und Operationen",
        points: 10,
        description: "Sichere Rechenverfahren und Zahlvorstellungen anwenden.",
        note: "Aufgabenformate an eingeführte Verfahren und den Lernstand der Lerngruppe anpassen.",
        tasks: [
          { title: "Rechenwege nutzen",},
          { title: "Ergebnisse prüfen",},
        ],
      },
      {
        title: "Größen und Messen",
        points: 10,
        description: "Größen aus der Lebenswelt schätzen, umrechnen und berechnen.",
        note: "Zum Beispiel Geld, Zeit, Länge oder Masse in einem kindnahen Kontext einsetzen.",
        tasks: [
          { title: "Mit Größen rechnen",},
          { title: "Ergebnis einordnen",},
        ],
      },
      {
        title: "Modellieren und begründen",
        points: 10,
        description: "Eine Sachsituation mathematisch darstellen, lösen und erklären.",
        note: "Eine bildliche Darstellung, Tabelle oder Skizze kann als Unterstützung zugelassen oder erwartet werden.",
        tasks: [
          { title: "Situation darstellen",},
          { title: "Lösungsweg erklären",},
        ],
      },
    ],
  },
  {
    id: "realschule-deutsch-textproduktion-6",
    subject: "Deutsch",
    schoolStage: "sek1",
    schoolForm: "realschule",
    focus: "general",
    title: "Realschule · Deutsch 5/6 · Text verstehen und schreiben",
    shortLabel: "RS D 5/6",
    description: "Klassenarbeitsvorlage für die Erprobungsstufe mit Rezeption, Produktion sowie Reflektieren und Beurteilen.",
    pedagogicalHint: "Folgt der KLP-Vernetzung von Lesen/Zuhören, Schreiben/Sprechen sowie Reflexion über Sprache, Texte, Kommunikation und Medien.",
    standardsNote: "Orientiert am Kernlehrplan Realschule NRW Deutsch (2022), Kompetenzerwartungen für die Doppeljahrgangsstufe 5/6. Textsorte, Material und Bewertung an den schulinternen Lehrplan und die Fachkonferenz anpassen.",
    metaTitle: "",
    unit: "",
    notes: "",
    gradeLevel: "",
    course: "",
    totalPoints: 60,
    sections: [
      {
        title: "Rezeption: Text erschließen",
        points: 24,
        description: "Zentrale Aussagen, Informationen und Gestaltung eines Textes erschließen.",
        note: "Für literarische oder Sachtexte nutzbar; Lesestrategie und Operatoren in der Aufgabenstellung klar benennen.",
        tasks: [
          { title: "Informationen sichern",},
          { title: "Textstellen deuten",},
        ],
      },
      {
        title: "Produktion: Text verfassen",
        points: 24,
        description: "Einen kohärenten und adressatenorientierten Text schreiben.",
        note: "Zum Beispiel Bericht, Beschreibung, Brief oder begründete Stellungnahme; Textsortenmerkmale vorher sichern.",
        tasks: [
          { title: "Inhalt und Aufbau",},
          { title: "Formulieren und überarbeiten",},
        ],
      },
      {
        title: "Reflektieren und beurteilen",
        points: 12,
        description: "Sprache, Texte oder Medien mit fachlichen Kriterien untersuchen.",
        note: "An den Unterrichtsschwerpunkt anbinden, etwa Wortarten, Satzbau, Rechtschreibstrategien oder Wirkung eines Mediums.",
        tasks: [
          { title: "Sprachliche Entscheidung begründen",},
        ],
      },
    ],
  },
  {
    id: "realschule-englisch-communication-6",
    subject: "Englisch",
    schoolStage: "sek1",
    schoolForm: "realschule",
    focus: "general",
    title: "Realschule · Englisch 5/6 · Reading und Writing",
    shortLabel: "RS E 5/6",
    description: "Klassenarbeitsvorlage mit funktionaler kommunikativer Kompetenz, Text- und Medienkompetenz sowie dienenden sprachlichen Mitteln.",
    pedagogicalHint: "Die Sprache wird nicht isoliert, sondern als Mittel erfolgreicher Kommunikation bewertet; Reading und Writing können über eine vertraute Alltagssituation verbunden werden.",
    standardsNote: "Orientiert am Kernlehrplan Realschule NRW Englisch (2021), Erprobungsstufe: funktionale kommunikative Kompetenz umfasst u. a. Leseverstehen und Schreiben; sprachliche Mittel dienen der Kommunikation. Aufgabenformat und Gewichtung schulisch abstimmen.",
    metaTitle: "",
    unit: "",
    notes: "",
    gradeLevel: "",
    course: "",
    totalPoints: 60,
    sections: [
      {
        title: "Reading: Informationen verstehen",
        points: 20,
        description: "Einen altersangemessenen Text global und im Detail erschließen.",
        note: "Mit vertrauten Themen und klarer, altersangemessener Standardsprache arbeiten.",
        tasks: [
          { title: "Global understanding",},
          { title: "Detailed information",},
        ],
      },
      {
        title: "Writing: Kommunikation gestalten",
        points: 25,
        description: "Eine kurze Mitteilung für eine konkrete Kommunikationssituation verfassen.",
        note: "Zum Beispiel email, message oder invitation; Aufgabe, Adressat und erwartete Textsorte eindeutig angeben.",
        tasks: [
          { title: "Content and task fulfilment",},
          { title: "Text and audience",},
        ],
      },
      {
        title: "Language in context",
        points: 15,
        description: "Wortschatz, Grammatik und Orthografie funktional für die Kommunikationsaufgabe nutzen.",
        note: "Sprachliche Mittel nicht losgelöst vom Schreibprodukt, sondern mit Bezug zur Verständlichkeit bewerten.",
        tasks: [
          { title: "Vocabulary and structures",},
        ],
      },
    ],
  },
];

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
          },
          {
            title: "Aussagen prüfen",
          },
          {
            title: "Textbelege nutzen",
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
          },
          {
            title: "Aufbau erklären",
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
          },
          {
            title: "Textaufbau",
          },
          {
            title: "Überarbeitung",
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
          },
          {
            title: "Ausdruck und Kohärenz",
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
          },
          {
            title: "Detailed information",
          },
          {
            title: "Own wording / transfer",
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
          },
          {
            title: "Vocabulary in context",
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
          },
          {
            title: "Structure",
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
          },
          {
            title: "Vocabulary and expression",
          },
          {
            title: "Spelling and coherence",
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
          },
          {
            title: "Begriffe und Darstellungen",
          },
          {
            title: "Kontrolle einfacher Ergebnisse",
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
          },
          {
            title: "Berechnen",
          },
          {
            title: "Ergebnisse deuten",
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
          },
          {
            title: "Lösungsweg dokumentieren",
          },
          {
            title: "Verfahren reflektieren",
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
          },
          {
            title: "Informationen herausarbeiten",
          },
          {
            title: "Perspektive reflektieren",
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
          },
          {
            title: "Zusammenhänge erklären",
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
          },
          {
            title: "Transfer herstellen",
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
          },
          {
            title: "Modelle anwenden",
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
          },
          {
            title: "Deutung ableiten",
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
          },
          {
            title: "Begründen",
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
          },
          {
            title: "Beziehungen erläutern",
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
          },
          {
            title: "Code oder Ablauf prüfen",
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
          },
          {
            title: "Entscheidungen begründen",
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
    pedagogicalHint: "Die Punktverteilung orientiert sich an einer oberstufentypischen Trennung von Inhalt und Darstellungsleistung.",
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
          },
          {
            title: "Gestaltung untersuchen",
          },
          {
            title: "Beleggestützt argumentieren",
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
          },
          {
            title: "Argumentativ verdichten",
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
          },
          {
            title: "Vergleichen oder weiterführen",
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
          },
          {
            title: "Sprache und Fachlichkeit",
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
          },
          {
            title: "Listening tasks",
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
          },
          {
            title: "Analysis",
            points: 17,
          },
          {
            title: "Evaluation / re-creation",
            points: 15,
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
          },
          {
            title: "Range / linguistic resources",
            points: 22,
          },
          {
            title: "Sprachrichtigkeit: Wortschatz",
            points: 9,
          },
          {
            title: "Sprachrichtigkeit: Grammatik",
            points: 9,
          },
          {
            title: "Sprachrichtigkeit: Orthografie",
            points: 4,
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
          },
          {
            title: "Mediation language / text construction",
            points: 30,
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
          },
          {
            title: "Analysis",
            points: 17,
          },
          {
            title: "Evaluation / re-creation",
            points: 15,
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
          },
          {
            title: "Range / linguistic resources",
            points: 22,
          },
          {
            title: "Sprachrichtigkeit: Wortschatz",
            points: 9,
          },
          {
            title: "Sprachrichtigkeit: Grammatik",
            points: 9,
          },
          {
            title: "Sprachrichtigkeit: Orthografie",
            points: 4,
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
          },
          {
            title: "Zwischenschritte notieren",
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
          },
          {
            title: "Verfahren durchführen",
          },
          {
            title: "Kontext deuten",
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
          },
          {
            title: "Reflektieren",
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
          },
          {
            title: "Analytische Deutung",
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
          },
          {
            title: "Zusammenhänge erläutern",
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
          },
          {
            title: "Werturteil / Reflexion",
          },
          {
            title: "Darstellung",
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
          },
          {
            title: "Fachsprache nutzen",
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
          },
          {
            title: "Deutung ableiten",
          },
          {
            title: "Zusammenhänge erklären",
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
          },
          {
            title: "Modellieren oder rechnen",
          },
          {
            title: "Begründen und bewerten",
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
          },
          {
            title: "Modell erläutern",
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
          },
          {
            title: "Code analysieren oder ergänzen",
          },
          {
            title: "Datenstrukturen nutzen",
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
          },
          {
            title: "Lösung bewerten",
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
          },
          {
            title: "Gestaltung funktional deuten",
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
          },
          {
            title: "Zusatzmaterial funktional nutzen",
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
          },
          {
            title: "Sprachliche Korrektheit",
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
          },
          {
            title: "Listening tasks",
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
          },
          {
            title: "Mediation language",
            points: 30,
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
          },
          {
            title: "Analysis",
            points: 17,
          },
          {
            title: "Evaluation / re-creation",
            points: 15,
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
          },
          {
            title: "Range / linguistic resources",
            points: 22,
          },
          {
            title: "Sprachrichtigkeit: Wortschatz",
            points: 9,
          },
          {
            title: "Sprachrichtigkeit: Grammatik",
            points: 9,
          },
          {
            title: "Sprachrichtigkeit: Orthografie",
            points: 4,
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
          },
          {
            title: "Darstellung",
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
          },
          {
            title: "Darstellung",
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
          },
          {
            title: "Analysieren",
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
          },
          {
            title: "Zusammenhänge differenzieren",
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
          },
          {
            title: "Reflexion und Werturteil",
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
          },
          {
            title: "Fachlich deuten",
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
          },
          {
            title: "Rechnen oder modellieren",
          },
          {
            title: "Bewerten",
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
          },
          {
            title: "Programmteile bearbeiten",
          },
          {
            title: "Datenstruktur begründen",
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
          },
          {
            title: "Bewertung und Reflexion",
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
      "Sek-I-Bewertungsbogen Englisch NRW. Alle Teile, Aufgaben, Erwartungshorizonte und Punkte sind vollständig editierbar.",
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
          "Leseverstehen"
        ),
        createTask(
          "Multiple Choice",
          10,
          "Leseverstehen"
        ),
        createTask(
          "Kurze Antworten",
          10,
          "Leseverstehen"
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
          "Sprache"
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
          "Schreiben"
        ),
        createTask(
          "Aufbau",
          10,
          "Schreiben"
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
          "Sprache im Schreiben"
        ),
        createTask(
          "Wortschatz",
          7.5,
          "Sprache im Schreiben"
        ),
        createTask(
          "Rechtschreibung",
          7.5,
          "Sprache im Schreiben"
        ),
        createTask(
          "Ausdrucksvermögen",
          7.5,
          "Sprache im Schreiben"
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
      "Teil A: Hörverstehen"
    ),
    createTask(
      "Detailed information",
      10,
      "Teil A: Hörverstehen"
    ),
    createTask(
      "Notes / transfer",
      10,
      "Teil A: Hörverstehen"
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
      "Teil A: Sprachmittlung"
    ),
    createTask(
      "Addressing the audience",
      10,
      "Teil A: Sprachmittlung"
    ),
    createTask(
      "Clear mediation",
      10,
      "Teil A: Sprachmittlung"
    ),
  ];
  return template;
};

export const examTemplates: ExamTemplateDefinition[] = [
  ...sek1Blueprints.map(createTemplateDefinition),
  ...schoolFormBlueprints.map(createTemplateDefinition),
  ...sek2Blueprints.map(createTemplateDefinition),
  ...abiturBlueprints
    .filter((blueprint) => blueprint.title.includes("Vorabitur") || blueprint.title.includes("Abiturnah"))
    .map(createTemplateDefinition),
];
