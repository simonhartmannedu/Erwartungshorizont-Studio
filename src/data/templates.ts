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
  schoolYear = "2025/2026",
}: {
  title: string;
  unit: string;
  notes: string;
  gradeLevel: string;
  course: string;
  schoolYear?: string;
}): Omit<Exam, "sections"> => ({
  id: crypto.randomUUID(),
  meta: {
    schoolYear,
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

interface TemplateTaskSeed {
  title: string;
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
  previewSections: Array<{
    title: string;
    points: number;
    tasks: string[];
  }>;
  build: () => Exam;
}

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
    sections: blueprint.sections.map((section) =>
      createSection(
        section.title,
        roundToTwo((section.points / blueprint.totalPoints) * 100),
        section.description,
        section.note,
        section.tasks.map((task, index) =>
          createTask(
            task.title,
            distributePoints(section.points, section.tasks.length)[index],
            section.title,
            task.description,
            task.expectation,
          ),
        ),
      ),
    ),
  }),
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
    title: "Englisch Sek II · Klausur",
    shortLabel: "E Sek II",
    description: "GOSt-Vorlage mit abiturorientierter 150-Punkte-Struktur für Q-Phase-Klausuren vor Q2.2.",
    pedagogicalHint: "Die Struktur folgt der Standardsicherung-Logik für Q-Phase-Englisch: Hörverstehen plus Schreiben/Leseverstehen ergibt 150 Punkte. EF und schulinterne Klausuren können niedriger skaliert werden.",
    metaTitle: "Englisch-Klausur GOSt",
    unit: "Input, writing task and language performance",
    notes:
      "GOSt-Vorlage Englisch. Inputteil kann als reading, listening oder mediation angelegt werden; language performance bleibt getrennt sichtbar.",
    gradeLevel: "Q1",
    course: "GK",
    totalPoints: 150,
    sections: [
      {
        title: "Teil A: Hörverstehen / Input",
        points: 40,
        description: "Hörverstehen oder materialgebundener Rezeptionsauftakt.",
        note: "Für Klausuren ohne Hörverstehen kann dieser Block im Editor umbenannt oder niedriger gewichtet werden.",
        tasks: [
          {
            title: "Comprehension",
            description: "Core ideas and relevant information from the material identify.",
            expectation: "The response shows secure understanding of the source material.",
          },
          {
            title: "Analysis of input",
            description: "Perspective, message or strategy of the material explain.",
            expectation: "Analytical points are text-based and clearly phrased.",
          },
        ],
      },
      {
        title: "Teil B: Schreiben / Leseverstehen · Inhalt",
        points: 44,
        description: "Inhaltliche Leistung der operatorengeleiteten Textarbeit.",
        note: "Geeignet für comment, article, speech, analysis, re-creation oder mediation product.",
        tasks: [
          {
            title: "Task fulfilment",
            description: "All required aspects of the writing task address appropriately.",
            expectation: "The product responds fully and purposefully to the task.",
          },
          {
            title: "Structure and coherence",
            description: "Build a logically organised and reader-oriented text.",
            expectation: "The text is clearly structured and coherent throughout.",
          },
          {
            title: "Audience and register",
            description: "Adapt style and tone to the intended audience and text type.",
            expectation: "Register and communicative purpose fit the task well.",
          },
        ],
      },
      {
        title: "Teil C: Darstellungsleistung / Sprache",
        points: 66,
        description: "Range, accuracy, register and cohesion separately assess.",
        note: "Der Sprachblock sollte nicht im Inhaltsblock aufgehen.",
        tasks: [
          {
            title: "Accuracy",
            description: "Assess grammar, sentence structure and formal correctness.",
            expectation: "Language is largely accurate and supports communication.",
          },
          {
            title: "Range and precision",
            description: "Assess vocabulary range, idiomatic use and precision.",
            expectation: "Language use is differentiated and appropriate.",
          },
          {
            title: "Cohesion and style",
            description: "Assess linking, flow and stylistic control of the text.",
            expectation: "The text is coherent, readable and stylistically controlled.",
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
            description: "Select and transfer relevant information for the target situation.",
            expectation: "The mediation product is accurate, purposeful and audience-oriented.",
          },
          {
            title: "Mediation language",
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
            description: "Summarise or select central aspects of the source text.",
            expectation: "The response secures source understanding accurately and concisely.",
          },
          {
            title: "Analysis",
            description: "Analyse message, perspective, strategy or language of the source.",
            expectation: "The analysis is text-based, coherent and conceptually precise.",
          },
          {
            title: "Evaluation / re-creation",
            description: "Develop an evaluative, creative or context-based final task.",
            expectation: "The final response is differentiated, task-related and well reasoned.",
          },
        ],
      },
      {
        title: "Teil D: Darstellungsleistung / Sprache",
        points: 66,
        description: "Sprachliche Leistung im integrierten Schreiben/Leseverstehen.",
        note: "Standardsicherung weist diesen Bereich mit 66 Punkten aus.",
        tasks: [
          {
            title: "Communicative text design",
            description: "Assess audience orientation, text type, structure and coherence.",
            expectation: "The text is coherent, purposeful and functionally structured.",
          },
          {
            title: "Range and accuracy",
            description: "Assess vocabulary, grammar, sentence structure and orthography.",
            expectation: "Language is accurate, differentiated and appropriate to the task.",
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
    title: "Mathematik Abitur · Vorabitur / Abiturnah",
    shortLabel: "M Abi",
    description: "Abiturnahe Mathevorlage mit hilfsmittelfreiem Teil, abiturtypischem Hauptteil und Reflexion.",
    pedagogicalHint: "Die Struktur passt für Q2 und Vorabitur, gerade wenn hilfsmittelfreie Kompetenzen und abiturtypische Modellierung getrennt bewertet werden sollen.",
    metaTitle: "Mathematik-Vorabitur / Abiturtraining",
    unit: "Hilfsmittelfrei, Abiturteil und Reflexion",
    notes:
      "Abiturorientierte Mathematik-Vorlage. Für TeX- oder LaTeX-Rendering gibt es im aktuellen System noch keinen Math-Renderer; Aufgaben werden als Klartext gepflegt.",
    gradeLevel: "Q2",
    course: "GK / LK",
    totalPoints: 120,
    sections: [
      {
        title: "Teil A: Hilfsmittelfrei",
        points: 30,
        description: "Abiturnahe Grundkompetenzen ohne Hilfsmittel.",
        note: "Kurzaufgaben und sichere Standardverfahren bündeln.",
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
        title: "Teil B: Abiturteil",
        points: 60,
        description: "Mehrschrittige abiturtypische Aufgaben aus Analysis, Geometrie oder Stochastik.",
        note: "Für GK/LK und Hilfsmittelsetting vor Ort differenzieren.",
        tasks: [
          {
            title: "Ansatz und Modellierung",
            description: "Ein abiturtypisches Problem strukturieren und mathematisch fassen.",
            expectation: "Der mathematische Zugang ist passend gewählt und begründet.",
          },
          {
            title: "Verfahren und Berechnung",
            description: "Die gewählten Schritte sicher und vollständig durchführen.",
            expectation: "Rechnungen und Verfahren bleiben konsistent und fachlich korrekt.",
          },
          {
            title: "Interpretation",
            description: "Ergebnisse fachlich und kontextbezogen deuten.",
            expectation: "Die Deutung zeigt Verständnis für Modell und Resultat.",
          },
        ],
      },
      {
        title: "Teil C: Reflexion und Begründung",
        points: 30,
        description: "Lösungswege prüfen, begründen und abiturtypisch reflektieren.",
        note: "Auch Grenzfälle, Plausibilitätsprüfung oder Verfahrensvergleich passen hier.",
        tasks: [
          {
            title: "Begründung",
            description: "Mathematische Aussagen logisch herleiten oder absichern.",
            expectation: "Begründungen sind schlüssig und präzise formuliert.",
          },
          {
            title: "Plausibilisierung",
            description: "Ergebnisse prüfen, bewerten und alternative Zugänge reflektieren.",
            expectation: "Die Reflexion geht über reine Ergebnisnennung hinaus.",
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
    pedagogicalHint: "Passend für Q2, Vorabitur und klausurnahe Abiturvorbereitung mit Blick auf Formelsammlung und fachsprachliche Präzision.",
    metaTitle: "Chemie-Vorabitur / Abiturtraining",
    unit: "Abiturorientierte Auswertung und Modellierung",
    notes:
      "Abiturorientierte Chemie-Vorlage. Formelsammlung, Hilfsmittel und experimentelle Anteile an die aktuellen Abiturvorgaben der Fachkonferenz anpassen.",
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
