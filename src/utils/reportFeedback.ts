import { Exam, ExamSummary } from "../types";

export type AutomatedFeedbackStyle = "balanced" | "encouraging" | "direct";

const getPerformanceDescriptor = (percentage: number) => {
  if (percentage >= 90) {
    return {
      balanced: "Du arbeitest insgesamt sehr sicher und präzise.",
      encouraging: "Du zeigst insgesamt eine sehr starke und sichere Leistung.",
      direct: "Insgesamt ist deine Leistung sehr sicher und präzise.",
    };
  }

  if (percentage >= 75) {
    return {
      balanced: "Du erreichst die Anforderungen insgesamt sicher.",
      encouraging: "Du zeigst insgesamt eine sichere und gelungene Leistung.",
      direct: "Insgesamt erfüllst du die Anforderungen sicher.",
    };
  }

  if (percentage >= 60) {
    return {
      balanced: "Du bearbeitest die Aufgaben insgesamt ordentlich und überwiegend sicher.",
      encouraging: "Du hast bereits eine tragfähige Grundlage und viele Aufgaben ordentlich bearbeitet.",
      direct: "Insgesamt ist die Leistung ordentlich, aber noch nicht durchgängig sicher.",
    };
  }

  if (percentage >= 45) {
    return {
      balanced: "Du zeigst in mehreren Teilen brauchbare Ansätze, arbeitest aber noch nicht durchgehend sicher.",
      encouraging: "Es sind erkennbare Ansätze vorhanden, auf denen du gut weiter aufbauen kannst.",
      direct: "Mehrere Anforderungen werden erst teilweise sicher erfüllt.",
    };
  }

  return {
    balanced: "Du brauchst noch mehr Sicherheit in den grundlegenden Anforderungen dieser Arbeit.",
    encouraging: "Es gibt noch deutlichen Übungsbedarf, aber die nächsten Schritte lassen sich klar benennen.",
    direct: "Die grundlegenden Anforderungen werden bisher nur eingeschränkt erfüllt.",
  };
};

const joinTaskTitles = (titles: string[]) => {
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0];
  return `${titles.slice(0, -1).join(", ")} und ${titles[titles.length - 1]}`;
};

const getSectionById = (exam: Exam, sectionId: string) =>
  exam.sections.find((section) => section.id === sectionId) ?? null;

export const generateAutomatedExamFeedback = ({
  exam,
  summary,
  style,
}: {
  exam: Exam;
  summary: ExamSummary;
  style: AutomatedFeedbackStyle;
}) => {
  if (exam.sections.length === 0 || summary.sectionResults.length === 0) {
    return "";
  }

  const sortedSections = [...summary.sectionResults].sort((left, right) => right.percentage - left.percentage);
  const strongestResult = sortedSections[0];
  const weakestResult = sortedSections[sortedSections.length - 1];
  const strongestSection = strongestResult ? getSectionById(exam, strongestResult.sectionId) : null;
  const weakestSection = weakestResult ? getSectionById(exam, weakestResult.sectionId) : null;

  const weakestTaskTitles =
    weakestSection?.tasks
      .slice()
      .sort((left, right) => {
        const leftRatio = left.maxPoints > 0 ? left.achievedPoints / left.maxPoints : 0;
        const rightRatio = right.maxPoints > 0 ? right.achievedPoints / right.maxPoints : 0;
        return leftRatio - rightRatio;
      })
      .slice(0, 2)
      .map((task) => task.title.trim())
      .filter(Boolean) ?? [];

  const strongestSentence = strongestSection
    ? {
        balanced: `Besonders gelungen ist dir der Bereich ${strongestSection.title}.`,
        encouraging: `Besonders positiv fällt dein Ergebnis im Bereich ${strongestSection.title} auf.`,
        direct: `Am stärksten ist dein Ergebnis im Bereich ${strongestSection.title}.`,
      }[style]
    : "";

  const weakestSentence = weakestSection
    ? {
        balanced: `Im Bereich ${weakestSection.title} solltest du noch genauer und strukturierter arbeiten.`,
        encouraging: `Im Bereich ${weakestSection.title} steckt noch das meiste Entwicklungspotenzial.`,
        direct: `Der größte Verbesserungsbedarf liegt im Bereich ${weakestSection.title}.`,
      }[style]
    : "";

  const nextStepTarget = joinTaskTitles(weakestTaskTitles);
  const nextStepSentence = nextStepTarget
    ? {
        balanced: `Achte bei der nächsten Arbeit besonders auf ${nextStepTarget} und überprüfe deine Lösungen dort systematisch.`,
        encouraging: `Wenn du ${nextStepTarget} gezielt übst und deine Lösungen dort Schritt für Schritt prüfst, kannst du dich schnell steigern.`,
        direct: `Nächster Schritt: ${nextStepTarget} gezielt üben und Antworten dort systematisch kontrollieren.`,
      }[style]
    : {
        balanced: "Überprüfe bei der nächsten Arbeit deine Lösungen systematisch auf Genauigkeit und Vollständigkeit.",
        encouraging: "Mit einer systematischen Kontrolle deiner Lösungen kannst du die nächste Arbeit spürbar sicherer bearbeiten.",
        direct: "Nächster Schritt: Lösungen systematisch auf Genauigkeit und Vollständigkeit prüfen.",
      }[style];

  return [
    getPerformanceDescriptor(summary.finalPercentage)[style],
    strongestSentence,
    weakestSentence,
    nextStepSentence,
  ]
    .filter(Boolean)
    .join(" ");
};
