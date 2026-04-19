export type BuilderSchoolStage = "sek1" | "sek2";

export interface BuilderSourceLink {
  label: string;
  url: string;
}

export interface BuilderSectionPreset {
  title: string;
  weight: number;
  description: string;
}

export interface BuilderLevelGuidance {
  label: string;
  stageSummary: string;
  legalBullets: string[];
  subjectBullets: string[];
  planningBullets: string[];
  caution: string;
  preset: {
    totalPoints: number;
    sections: BuilderSectionPreset[];
  };
  sources: BuilderSourceLink[];
}

export interface BuilderSubjectProfile {
  key: string;
  label: string;
  aliases: string[];
  teaser: string;
  sek1: BuilderLevelGuidance;
  sek2: BuilderLevelGuidance;
}

const GENERAL_SOURCES: BuilderSourceLink[] = [
  {
    label: "APO-S I / VVzAPO-S I",
    url: "https://bass.schule.nrw/12691.htm",
  },
  {
    label: "APO-GOSt / VVzAPO-GOSt",
    url: "https://bass.schule.nrw/9607.htm",
  },
  {
    label: "Klassenarbeiten und Hausaufgaben an allgemeinbildenden Schulen",
    url: "https://bass.schule.nrw/15325.htm",
  },
  {
    label: "Standardsicherung NRW",
    url: "https://standardsicherung.schulministerium.nrw.de/",
  },
];

const subjectPage = (label: string, url: string): BuilderSourceLink => ({ label, url });

export const BUILDER_SUBJECT_OPTIONS = [
  "Deutsch",
  "Englisch",
  "Mathematik",
  "Geschichte",
  "Chemie",
  "Informatik",
] as const;

const profiles: BuilderSubjectProfile[] = [
  {
    key: "deutsch",
    label: "Deutsch",
    aliases: ["deutsch", "german"],
    teaser: "Textverstehen, Analyse, Schreiben und sprachliche Darstellung sauber trennen.",
    sek1: {
      label: "Sekundarstufe I",
      stageSummary:
        "In Sek I sind schriftliche Klassenarbeiten in Deutsch verpflichtend; in Klasse 10 ist Deutsch zudem ZP10-Fach.",
      legalBullets: [
        "Schriftliche Klassenarbeiten sind in Sek I verbindlich in Deutsch, Mathematik, den Fremdsprachen und im Wahlpflichtunterricht vorgesehen.",
        "Es dürfen in Sek I grundsätzlich höchstens zwei Klassenarbeiten pro Woche und nur eine pro Tag geschrieben werden; an Klassenarbeitstagen sollen keine weiteren schriftlichen Leistungsüberprüfungen stattfinden.",
        "Klassenarbeiten dürfen nicht am Nachmittag geschrieben werden.",
        "Einmal pro Schuljahr kann pro Fach eine Klassenarbeit durch eine andere gleichwertige Leistungsüberprüfung ersetzt werden; für Klasse 10 greifen zusätzlich die Vorgaben der ZP10 in Deutsch.",
      ],
      subjectBullets: [
        "Für Deutsch in Klasse 10 muss mindestens eine schriftliche Arbeit im zweiten Halbjahr zur Vorbereitung auf ZP10 abgesichert sein, wenn die Schule in diesen Bildungsgängen ZP10 schreibt.",
        "Für schriftliche Deutsch-Arbeiten in Sek I ist eine klare Trennung zwischen Textgrundlage, Aufgabenformaten und Darstellungsleistung sinnvoll, weil sprachliche Richtigkeit und Struktur sichtbar bewertet werden müssen.",
      ],
      planningBullets: [
        "Sinnvolle Grundstruktur: Textverstehen, sprachliche Arbeit am Material, Schreibauftrag, Darstellungsleistung.",
        "Operatoren und Textsorten sollten im Erwartungshorizont explizit gespiegelt werden.",
      ],
      caution:
        "Die konkrete Zahl und Dauer der Klassenarbeiten hängt in Sek I von Schulform und Jahrgang ab. Die Schule muss zusätzlich ihre Fachkonferenz- und Schulkonferenzbeschlüsse beachten.",
      preset: {
        totalPoints: 100,
        sections: [
          { title: "Textverstehen", weight: 30, description: "Aussagen sichern, Informationen entnehmen, zentrale Deutungen belegen." },
          { title: "Analyse", weight: 20, description: "Sprache, Aufbau, Erzählsituation oder Argumentationsweise untersuchen." },
          { title: "Schreiben", weight: 30, description: "Textproduktion oder materialgestütztes Schreiben passend zur Aufgabenstellung." },
          { title: "Darstellungsleistung", weight: 20, description: "Gliederung, sprachliche Richtigkeit, Fachsprache und Kohärenz bewerten." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("ZP10 Deutsch", "https://www.standardsicherung.schulministerium.nrw.de/zentrale-pruefungen-10/faecher/deutsch-gym"),
      ],
    },
    sek2: {
      label: "Sekundarstufe II",
      stageSummary:
        "In GOSt ist Deutsch ein klausurrelevantes Kernfach; in der Einführungsphase ist zudem eine zentrale Klausur vorgesehen.",
      legalBullets: [
        "In der Einführungsphase sind in Deutsch pro Halbjahr zwei Klausuren zu schreiben; eine davon wird landeseinheitlich zentral gestellt.",
        "In den ersten drei Halbjahren der Qualifikationsphase gehören Deutsch-Klausuren zu den klausurrelevanten Fächern, sofern Deutsch Abiturfach ist oder als verpflichtendes Klausurfach geführt wird.",
        "In der Qualifikationsphase ersetzt nach Festlegung der Schule eine Facharbeit eine Klausur; bei Belegung eines Projektkurses entfällt die Facharbeitspflicht.",
        "In einer Woche sollen in GOSt für einzelne Schülerinnen und Schüler nicht mehr als drei Klausuren angesetzt werden, in der Regel nur eine pro Tag.",
      ],
      subjectBullets: [
        "Deutsch-Klausuren in GOSt müssen auf die Anforderungen der Abiturprüfung vorbereiten; Darstellungsleistung und sprachliche Richtigkeit sind ausdrücklich mitzudenken.",
        "Für die EF-Zentralklausur und das Zentralabitur veröffentlicht Standardsicherung NRW eigene fachliche Vorgaben, Operatoren und Konstruktionshinweise.",
      ],
      planningBullets: [
        "Sinnvolle Grundstruktur: Analyse, Deutung/Argumentation, Transfer oder materialgestützter Teil, Darstellungsleistung.",
        "Für Oberstufenklausuren sollte ein eigener Erwartungshorizont für Inhalt und Darstellungsleistung getrennt geführt werden.",
      ],
      caution:
        "Die Aufgabenart muss zu Kernlehrplan, Kursart und Schulhalbjahr passen; Fachkonferenzbeschlüsse zur Klausurdauer und Aufgabenkonstruktion bleiben maßgeblich.",
      preset: {
        totalPoints: 120,
        sections: [
          { title: "Analyse", weight: 40, description: "Textanalyse mit Belegen, Struktur- und Sprachuntersuchung." },
          { title: "Deutung und Argumentation", weight: 25, description: "Interpretationsansatz oder Erörterung der Textaussagen." },
          { title: "Transfer", weight: 15, description: "Vergleich, Kontextualisierung oder materialgestützte Weiterführung." },
          { title: "Darstellungsleistung", weight: 20, description: "Aufbau, Kohärenz, Fachsprache und sprachliche Richtigkeit." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Deutsch GOSt", "https://www.standardsicherung.schulministerium.nrw.de/zentralabitur-gost/faecher/deutsch"),
        subjectPage("Zentrale Klausur EF Deutsch", "https://www.standardsicherung.schulministerium.nrw.de/zentrale-klausuren-einfuehrungsphase/faecher/deutsch"),
      ],
    },
  },
  {
    key: "englisch",
    label: "Englisch",
    aliases: ["englisch", "english"],
    teaser: "Kommunikative Kompetenzen, Schreibprodukt und Sprachleistung getrennt abbilden.",
    sek1: {
      label: "Sekundarstufe I",
      stageSummary:
        "Englisch ist in Sek I ein schriftliches Kernfach; im letzten Jahr der Sek I wird eine Klassenarbeit verpflichtend durch eine gleichwertige mündliche Prüfung ersetzt.",
      legalBullets: [
        "Schriftliche Klassenarbeiten sind in Sek I in den Fremdsprachen verpflichtend.",
        "Einmal pro Schuljahr kann eine schriftliche Klassenarbeit durch eine gleichwertige Form der mündlichen Leistungsüberprüfung ersetzt werden; im Fach Englisch ist dies im letzten Schuljahr verpflichtend.",
        "Mündliche Leistungsüberprüfungen anstelle einer Klassenarbeit zählen bei der Wochenbelastung mit und dürfen im Rahmen der Unterrichtszeit auch am Nachmittag stattfinden.",
        "In Klasse 10 ist Englisch zusätzlich ZP10-Fach; die mündliche Englischprüfung ersetzt keine ZP10-Prüfung, sondern eine Klassenarbeit und geht als Vornotenbestandteil ein.",
      ],
      subjectBullets: [
        "Standardsicherung NRW empfiehlt in der mündlichen Englischprüfung die Bereiche zusammenhängendes Sprechen und an Gesprächen teilnehmen gleichermaßen zu berücksichtigen.",
        "Für Sek-I-Klassenarbeiten sind Leseverstehen, Hörverstehen, Sprachmittlung, Schreiben und sprachliche Korrektheit typische Bausteine; die konkrete Mischung richtet sich nach dem schulinternen Curriculum.",
      ],
      planningBullets: [
        "Für schriftliche Arbeiten ist eine vierteilige Struktur bewährt: Rezeption, Sprache, Schreiben, sprachliche Schreibbewertung.",
        "Für die verpflichtende mündliche Prüfung sollte der Erwartungshorizont eigenständige Kriterien für Inhalt, Interaktion und sprachliche Leistung ausweisen.",
      ],
      caution:
        "Die konkrete Prüfungsform in Englisch muss mit Fachkonferenzbeschlüssen, Jahrgang und Schulform abgestimmt werden. Für die mündliche Ersatzprüfung sollte Anlage 55 bzw. das landeseinheitliche Raster berücksichtigt werden.",
      preset: {
        totalPoints: 100,
        sections: [
          { title: "Rezeption", weight: 30, description: "Reading, listening oder mediation passend zur Unit-Struktur." },
          { title: "Sprache", weight: 20, description: "Grammatik, Wortschatz und kontrollierte Sprachverwendung." },
          { title: "Schreiben", weight: 20, description: "Content und structure des Schreibprodukts." },
          { title: "Sprachliche Leistung", weight: 30, description: "Grammatik, vocabulary, expression und spelling im Schreibprodukt." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Mündliche Prüfungen Sek I", "https://www.standardsicherung.schulministerium.nrw.de/standardsicherung-nrw/im-fokus/muendliche-kompetenzen-entwickeln-und-pruefen/muendliche-pruefungen"),
        subjectPage("Mündliche Kompetenzen Sek I", "https://www.standardsicherung.schulministerium.nrw.de/cms/muendliche-kompetenzen-entwickeln-und-pruefen/angebot-sekundarstufe-i/"),
        subjectPage("ZP10 Englisch", "https://www.standardsicherung.schulministerium.nrw.de/zentrale-pruefungen-10/faecher/englisch-gym"),
      ],
    },
    sek2: {
      label: "Sekundarstufe II",
      stageSummary:
        "In GOSt gehören Englisch-Klausuren zu den regelmäßigen Klausurfächern; in einem der ersten drei Qualifikationshalbjahre wird eine Klausur durch eine mündliche Kommunikationsprüfung ersetzt.",
      legalBullets: [
        "In der Einführungsphase sind in den Fremdsprachen pro Halbjahr zwei Klausuren zu schreiben.",
        "In einem der ersten drei Halbjahre der Qualifikationsphase ersetzt in den modernen Fremdsprachen eine gleichwertige mündliche Leistungsüberprüfung eine Klausur.",
        "Die mündliche Leistungsüberprüfung darf nicht in demselben Halbjahr liegen, in dem in diesem Fach die Facharbeit geschrieben wird.",
        "Klausuren und kommunikative Prüfungsformate in GOSt müssen auf das Abitur vorbereiten.",
      ],
      subjectBullets: [
        "Standardsicherung NRW stellt für Englisch GOSt Operatoren, Konstruktionshinweise, Bewertungsraster, Zieltextformate und Hinweise zum Hörverstehen bereit.",
        "Seit dem Zentralabitur ab 2025 gehört das Aufgabenformat Hörverstehen verbindlich zum fachlichen Bezugsrahmen; schulinterne Klausuren in GOSt müssen diese Entwicklung mitdenken.",
      ],
      planningBullets: [
        "Sinnvolle Oberstufenstruktur: reading/listening/mediation input, writing task, sprachliche Leistung als eigener Bewertungsblock.",
        "Wenn die Klausur eine Kommunikationsprüfung ersetzt, sollte der Erwartungshorizont statt schriftlicher Teilaufgaben auf speaking performance umgestellt werden.",
      ],
      caution:
        "Die konkrete Aufgabenart hängt von Halbjahr, Kursart und Kernlehrplanbindung ab. Für Klausuren und Kommunikationsprüfungen gelten fachbezogene Vorgaben von Standardsicherung NRW.",
      preset: {
        totalPoints: 120,
        sections: [
          { title: "Rezeption und Input", weight: 30, description: "Reading, listening oder mediation als materialgebundene Basis." },
          { title: "Writing Task", weight: 35, description: "Textproduktion mit klarer operatorengeleiteter Aufgabenstellung." },
          { title: "Language Performance", weight: 25, description: "Range, accuracy, register, coherence und vocabulary." },
          { title: "Transfer / Reflection", weight: 10, description: "Comment, re-creation, mediation focus oder contextual transfer." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Englisch GOSt", "https://www.standardsicherung.schulministerium.nrw.de/zentralabitur-gost/faecher/englisch-gost"),
      ],
    },
  },
  {
    key: "mathematik",
    label: "Mathematik",
    aliases: ["mathematik", "mathe", "math"],
    teaser: "Basiskompetenzen, Verfahren, Modellierung und Argumentation sichtbar gewichten.",
    sek1: {
      label: "Sekundarstufe I",
      stageSummary:
        "Mathematik ist in Sek I ein schriftliches Kernfach; in Klasse 10 ist Mathematik zugleich ZP10-Fach.",
      legalBullets: [
        "Mathematik gehört in Sek I zu den Fächern mit verpflichtenden Klassenarbeiten.",
        "Es gelten die allgemeinen Sek-I-Regeln zu höchstens zwei Klassenarbeiten pro Woche, einer pro Tag und keinem Nachmittagstermin.",
        "In Klasse 10 greifen für Mathematik zusätzlich die Vorgaben der ZP10.",
      ],
      subjectBullets: [
        "Standardsicherung NRW veröffentlicht für ZP10 Mathematik fachliche Hinweise und zugelassene Formelsammlungen.",
        "Für Mathe-Arbeiten ist eine Trennung zwischen basalen Verfahren, problemlösendem Anwenden und mathematischer Begründung hilfreich, damit der Erwartungshorizont nicht nur Rechenergebnisse dokumentiert.",
      ],
      planningBullets: [
        "Sinnvolle Struktur: Basisaufgaben, Anwendungsaufgaben, Argumentation/Begründung.",
        "Hilfsmittelregelung und Teilaufgaben mit/ohne Hilfsmittel sollten im Erwartungshorizont explizit markiert werden.",
      ],
      caution:
        "Die Zahl der Klassenarbeiten richtet sich nach Schulform und Jahrgang. Für Klasse 10 sollten ZP10-Aufgabenformate und die eingeführte Formelsammlung mitgedacht werden.",
      preset: {
        totalPoints: 100,
        sections: [
          { title: "Basiskompetenzen", weight: 30, description: "Rechnen, Terme, Routinen, sichere Grundverfahren." },
          { title: "Anwendung", weight: 40, description: "Textaufgaben, Modellierung, mehrschrittige Verfahren." },
          { title: "Argumentation", weight: 30, description: "Begründungen, Darstellungen, Lösungswege und Reflexion." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("ZP10 Mathematik", "https://www.standardsicherung.schulministerium.nrw.de/zentrale-pruefungen-10/faecher/mathematik-gym"),
      ],
    },
    sek2: {
      label: "Sekundarstufe II",
      stageSummary:
        "Mathematik ist in GOSt ein regelhaftes Klausurfach; in der EF gibt es eine landeseinheitlich zentrale Klausur.",
      legalBullets: [
        "In der Einführungsphase sind in Mathematik pro Halbjahr zwei Klausuren zu schreiben; eine ist landeseinheitlich zentral gestellt.",
        "In der Qualifikationsphase gehört Mathematik regelmäßig zu den verpflichtenden Klausurfächern, wenn es Abiturfach ist oder als Kernfach im Klausurblock geführt wird.",
        "Klausuren sind auf die Anforderungen der Abiturprüfung auszurichten.",
      ],
      subjectBullets: [
        "Standardsicherung NRW stellt für Mathematik GOSt Abiturvorgaben und Hinweise bereit; für die EF gibt es eigene Zentrale-Klausur-Hinweise.",
        "Für Mathematik sind in Oberstufenklausuren häufig hilfsmittelfreie und hilfsmittelgestützte Phasen didaktisch sinnvoll, auch wenn die konkrete Klausurstruktur schulisch aus dem Kernlehrplan abgeleitet werden muss.",
      ],
      planningBullets: [
        "Sinnvolle Struktur: hilfsmittelfreier Grundlagenteil, material- oder modellierungsbezogener Hauptteil, Begründung/Reflexion.",
        "Bei graphikfähigen Werkzeugen sollten Operatoren, Zwischenschritte und Bewertung der Darstellung mitgedacht werden.",
      ],
      caution:
        "Dauer und konkrete Aufgabenstruktur ergeben sich aus Fachkonferenzbeschlüssen, EF-Zentralklausurvorgaben und dem jeweiligen Kernlehrplanstand.",
      preset: {
        totalPoints: 120,
        sections: [
          { title: "Hilfsmittelfrei", weight: 30, description: "Sichere Grundkompetenzen ohne digitale Hilfsmittel." },
          { title: "Modellierung und Verfahren", weight: 45, description: "Mehrschrittige Aufgaben mit Verfahren und Anwendung." },
          { title: "Begründung und Reflexion", weight: 25, description: "Argumentieren, interpretieren, Ergebnisse prüfen." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Mathematik GOSt", "https://www.standardsicherung.schulministerium.nrw.de/zentralabitur-gost/faecher/mathematik"),
        subjectPage("Zentrale Klausur EF Mathematik", "https://www.standardsicherung.schulministerium.nrw.de/cms/zentrale-klausuren-s-ii/faecher/"),
      ],
    },
  },
  {
    key: "geschichte",
    label: "Geschichte",
    aliases: ["geschichte", "history"],
    teaser: "Quellen, Kontext, Sachurteil und Werturteil getrennt sichtbar machen.",
    sek1: {
      label: "Sekundarstufe I",
      stageSummary:
        "Geschichte ist in Sek I nicht generell ein verpflichtendes Klassenarbeitsfach; schriftliche Arbeiten hängen hier stärker von Schulform, Fachintegration und schulinternen Leistungsformaten ab.",
      legalBullets: [
        "Die verpflichtenden Sek-I-Klassenarbeitsfächer sind vor allem Deutsch, Mathematik, Fremdsprachen und Wahlpflichtfächer; Geschichte gehört nicht generell dazu.",
        "Schriftliche Überprüfungen in Geschichte müssen sich deshalb besonders sauber aus Fachkonferenzbeschlüssen und dem schulinternen Curriculum ableiten.",
      ],
      subjectBullets: [
        "Wenn Geschichte schriftlich geprüft wird, sollten Materialauswertung, Kontextwissen und Urteilsbildung getrennt erfasst werden.",
        "Gerade in integrierten Lernbereichen oder binnendifferenzierten Formaten ist eine klare Aufgabenprogression wichtig: erschließen, einordnen, beurteilen.",
      ],
      planningBullets: [
        "Sinnvolle Struktur: Quellen-/Materialanalyse, historischer Kontext, Urteil und Transfer.",
        "Operatoren und Materialart sollten im Erwartungshorizont explizit ausgewiesen sein.",
      ],
      caution:
        "Vor dem Anlegen einer klassischen Geschichte-Arbeit in Sek I sollte geprüft werden, ob das Fach in der konkreten Schulform/Jahrgangsstufe überhaupt als Klassenarbeitsfach geführt wird.",
      preset: {
        totalPoints: 90,
        sections: [
          { title: "Materialanalyse", weight: 35, description: "Quelle oder Darstellung erschließen, Informationen sichern." },
          { title: "Kontextwissen", weight: 35, description: "Historisch einordnen, Zusammenhänge erklären." },
          { title: "Urteil und Transfer", weight: 30, description: "Sachurteil, Perspektiven und Gegenwartsbezug entwickeln." },
        ],
      },
      sources: GENERAL_SOURCES,
    },
    sek2: {
      label: "Sekundarstufe II",
      stageSummary:
        "Geschichte kann in GOSt reguläres Klausur- und Abiturfach sein; Standardsicherung NRW stellt dafür eigene Operatoren und Hinweise bereit.",
      legalBullets: [
        "In GOSt gelten die allgemeinen Klausurregeln der APO-GOSt für Geschichte wie für andere gesellschaftswissenschaftliche Fächer.",
        "Klausuren müssen auf die Anforderungen der Abiturprüfung vorbereiten; für Geschichte sind Darstellungsleistung und Operatorensicherheit zentral.",
      ],
      subjectBullets: [
        "Standardsicherung NRW veröffentlicht für Geschichte GOSt Operatoren, Konstruktionsvorgaben, Hinweise zur Darstellungsleistung und Korrekturhinweise.",
        "Materialgebundene Analyse und historisches Urteil sollten als getrennte Bewertungsdimensionen auftauchen.",
      ],
      planningBullets: [
        "Sinnvolle Oberstufenstruktur: Quellen-/Materialanalyse, historische Einordnung, Urteil/Erörterung.",
        "Darstellungsleistung sollte als eigener Bewertungsblock sichtbar sein, nicht nur implizit mitlaufen.",
      ],
      caution:
        "Die genaue Klausurform hängt von Halbjahr, Kursart und den jeweils gültigen fachlichen Vorgaben für das Zentralabitur ab.",
      preset: {
        totalPoints: 110,
        sections: [
          { title: "Materialanalyse", weight: 40, description: "Quelle oder Darstellung erschließen und analysieren." },
          { title: "Historische Einordnung", weight: 35, description: "Kontexte, Entwicklungen und Zusammenhänge darstellen." },
          { title: "Urteil und Darstellungsleistung", weight: 25, description: "Sachurteil, Werturteil und stringente Darstellung." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Geschichte GOSt", "https://www.standardsicherung.schulministerium.nrw.de/zentralabitur-gost/faecher/geschichte-gost"),
      ],
    },
  },
  {
    key: "chemie",
    label: "Chemie",
    aliases: ["chemie", "chemistry"],
    teaser: "Fachwissen, Deutung von Daten/Experimenten und Transfer getrennt planen.",
    sek1: {
      label: "Sekundarstufe I",
      stageSummary:
        "Chemie ist in Sek I nicht generell ein verpflichtendes Klassenarbeitsfach; schriftliche Arbeiten sind vor allem dann typisch, wenn Chemie als Wahlpflicht- oder Schwerpunktfach geführt wird.",
      legalBullets: [
        "Sek-I-Klassenarbeiten sind rechtlich vor allem in Deutsch, Mathematik, Fremdsprachen und Wahlpflichtfächern verankert.",
        "Chemie kann je nach Schulform im naturwissenschaftlich-technischen Schwerpunkt des Wahlpflichtunterrichts Klassenarbeitsfach sein.",
      ],
      subjectBullets: [
        "Für schriftliche Chemie-Leistungsüberprüfungen sind Fachwissen, Auswertung von Material oder Experiment und Transfer voneinander zu trennen.",
        "Auch in Sek I sollte der Erwartungshorizont nicht nur Ergebnisse, sondern Deutung und Fachsprache erfassen.",
      ],
      planningBullets: [
        "Sinnvolle Struktur: Fachwissen, Daten-/Materialauswertung, Experiment/Dokumentation oder Transfer.",
        "Wenn das Aufgabenformat experimentbezogen ist, sollten Beobachtung, Auswertung und Erklärung getrennt bewertet werden.",
      ],
      caution:
        "Vor dem Einsatz als klassische Klassenarbeit sollte geprüft werden, ob Chemie in der konkreten Lerngruppe Pflichtfach ohne Klassenarbeiten oder Wahlpflichtfach mit Klassenarbeiten ist.",
      preset: {
        totalPoints: 90,
        sections: [
          { title: "Fachwissen", weight: 30, description: "Begriffe, Modelle, Reaktionswissen und Grundverständnis." },
          { title: "Auswertung", weight: 35, description: "Material, Versuchsdaten oder Darstellungen deuten." },
          { title: "Transfer", weight: 35, description: "Anwenden, erklären, begründen und fachsprachlich darstellen." },
        ],
      },
      sources: GENERAL_SOURCES,
    },
    sek2: {
      label: "Sekundarstufe II",
      stageSummary:
        "Chemie ist in GOSt als Naturwissenschaft regulär klausurfähig; für praktische oder experimentelle Anteile kann die Arbeitszeit verlängert werden.",
      legalBullets: [
        "In GOSt gelten die allgemeinen Klausurregeln der APO-GOSt; Chemie kann als naturwissenschaftliches Klausurfach geführt werden.",
        "Für Schülerexperimente und praktische Arbeiten in Naturwissenschaften kann die Fachkonferenz die Arbeitszeit in der EF um bis zu 45 Minuten, in der Qualifikationsphase um bis zu 60 Minuten verlängern.",
      ],
      subjectBullets: [
        "Standardsicherung NRW veröffentlicht für Chemie GOSt Abiturvorgaben, Formelsammlungsregeln, Operatoren und Beispielaufgaben.",
        "Für Abiturformate ab 2025 ist die ländergemeinsame mathematisch-naturwissenschaftliche Formelsammlung bzw. ein zulässiger Auszug verbindlicher Bezugsrahmen.",
      ],
      planningBullets: [
        "Sinnvolle Oberstufenstruktur: Theorie/Fachwissen, Daten- oder Materialauswertung, Transfer bzw. Modellierung.",
        "Bei experimentellen Aufgaben sollten Beobachtung, fachliche Deutung und begründete Schlussfolgerung getrennt bewertet werden.",
      ],
      caution:
        "Hilfsmittel, Klausurdauer und Aufgabenarten müssen mit Fachkonferenzbeschlüssen und den aktuellen Chemie-Standardsicherungsvorgaben abgestimmt sein.",
      preset: {
        totalPoints: 120,
        sections: [
          { title: "Fachwissen", weight: 25, description: "Modelle, Konzepte und Reaktionswissen sicher anwenden." },
          { title: "Daten- und Materialauswertung", weight: 35, description: "Messwerte, Diagramme oder Versuchsbefunde analysieren." },
          { title: "Transfer und Modellierung", weight: 40, description: "Erklären, begründen, rechnen und auf neue Kontexte übertragen." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Chemie GOSt", "https://www.standardsicherung.schulministerium.nrw.de/zentralabitur-gost/faecher/chemie"),
      ],
    },
  },
  {
    key: "informatik",
    label: "Informatik",
    aliases: ["informatik", "informatics", "computer science"],
    teaser: "Modellierung, Algorithmik und Reflexion nicht zu einem einzigen Block vermischen.",
    sek1: {
      label: "Sekundarstufe I",
      stageSummary:
        "Informatik ist in Sek I je nach Schulform Pflichtfach oder Wahlpflichtangebot, aber nicht allgemein als verpflichtendes Klassenarbeitsfach festgelegt.",
      legalBullets: [
        "Sek-I-Klassenarbeiten sind rechtlich vor allem in Deutsch, Mathematik, Fremdsprachen und Wahlpflichtfächern verankert.",
        "Informatik kann im Wahlpflichtunterricht Klassenarbeitsfach sein, etwa im Gymnasium oder Realschulschwerpunkt.",
      ],
      subjectBullets: [
        "Wenn Informatik schriftlich geprüft wird, sollten Modellierung, Algorithmik/Umsetzung und Analyse/Reflexion klar getrennt werden.",
        "Nur fertige Code-Ergebnisse zu bewerten ist zu eng; auch Strukturierung, Problemlöseweg und Fachsprache gehören in den Erwartungshorizont.",
      ],
      planningBullets: [
        "Sinnvolle Struktur: Konzepte und Modellierung, algorithmische Umsetzung, Analyse/Reflexion.",
        "Bei papierbasierten Arbeiten sollten Notation, Datenmodell und Nachvollziehbarkeit stärker gewichtet werden als bloß syntaktische Details.",
      ],
      caution:
        "Vor dem Anlegen einer klassischen Informatik-Arbeit in Sek I sollte geklärt werden, ob die Lerngruppe Informatik als Klassenarbeitsfach oder als Fach mit anderen Leistungsnachweisen führt.",
      preset: {
        totalPoints: 90,
        sections: [
          { title: "Konzepte und Modellierung", weight: 35, description: "Daten, Abläufe und Strukturen modellieren." },
          { title: "Algorithmik und Umsetzung", weight: 35, description: "Algorithmen entwickeln, lesen oder verbessern." },
          { title: "Analyse und Reflexion", weight: 30, description: "Fehler finden, Lösungen vergleichen, Entscheidungen begründen." },
        ],
      },
      sources: GENERAL_SOURCES,
    },
    sek2: {
      label: "Sekundarstufe II",
      stageSummary:
        "Informatik ist in GOSt ein reguläres Klausur- und Abiturfach; für praktische Arbeiten kann die Klausurzeit verlängert werden.",
      legalBullets: [
        "Für Informatik gelten in GOSt die allgemeinen Klausurregeln der APO-GOSt.",
        "Für praktische Arbeiten in Informatik kann die Fachkonferenz die Arbeitszeit in der EF um bis zu 45 Minuten und in der Qualifikationsphase um bis zu 60 Minuten verlängern.",
      ],
      subjectBullets: [
        "Standardsicherung NRW stellt für Informatik GOSt Operatoren, Konstruktionsvorgaben, Korrekturhinweise und Beispielaufgaben bereit.",
        "Gerade in Oberstufenklausuren sollten Modellierung, algorithmische Lösung und Analyse/Begründung nicht in einem einzigen Punktblock verschwimmen.",
      ],
      planningBullets: [
        "Sinnvolle Oberstufenstruktur: Modellierung, Algorithmik/Programmierung, Analyse/Reflexion.",
        "Bei codebezogenen Aufgaben sollte der Erwartungshorizont Teilschritte, Datenstrukturen und Begründung der Lösung mit ausweisen.",
      ],
      caution:
        "Kursart, Schulhalbjahr und das eingesetzte Material bestimmen, wie stark praktische, pseudocodebasierte oder theoretische Anteile ausfallen dürfen.",
      preset: {
        totalPoints: 120,
        sections: [
          { title: "Modellierung", weight: 30, description: "Datenstrukturen, Zustände, Abläufe und Systemmodelle entwickeln." },
          { title: "Algorithmik und Programmierung", weight: 40, description: "Lösungen entwerfen, lesen, ergänzen oder optimieren." },
          { title: "Analyse und Reflexion", weight: 30, description: "Komplexität, Korrektheit, Fehleranalyse und Bewertung." },
        ],
      },
      sources: [
        ...GENERAL_SOURCES,
        subjectPage("Informatik GOSt", "https://www.standardsicherung.schulministerium.nrw.de/zentralabitur-gost/faecher/informatik-gost"),
      ],
    },
  },
];

const customFallback: BuilderSubjectProfile = {
  key: "custom",
  label: "Eigenes Fach",
  aliases: [],
  teaser: "Allgemeine NRW-Regeln laden und die Struktur fachspezifisch anpassen.",
  sek1: {
    label: "Sekundarstufe I",
    stageSummary:
      "Für ein eigenes Fach gelten zunächst die allgemeinen Sek-I-Regeln; ob Klassenarbeiten verpflichtend sind, hängt stark von Schulform und Fachstatus ab.",
    legalBullets: [
      "In Sek I sind schriftliche Klassenarbeiten vor allem in Deutsch, Mathematik, Fremdsprachen und Wahlpflichtfächern verbindlich.",
      "Es gelten die allgemeinen Belastungsregeln mit höchstens zwei Klassenarbeiten pro Woche und einer pro Tag.",
      "Klassenarbeiten dürfen nicht am Nachmittag geschrieben werden.",
    ],
    subjectBullets: [
      "Für ein eigenes Fach sollte zuerst geprüft werden, ob es im konkreten Bildungsgang überhaupt Klassenarbeitsfach ist.",
      "Danach sollte die Arbeit in inhaltlich trennbare Kompetenzbereiche zerlegt werden.",
    ],
    planningBullets: [
      "Empfehlung: Wissen, Anwendung und Reflexion als Startstruktur nutzen.",
    ],
    caution:
      "Die Fachkonferenz und das schulinterne Curriculum sind hier besonders wichtig, weil es keine belastbare landesweite Fachschablone für alle eigenen Fächer gibt.",
    preset: {
      totalPoints: 90,
      sections: [
        { title: "Fachwissen", weight: 30, description: "Grundlagen, Begriffe und sicheres Verständnis." },
        { title: "Anwendung", weight: 40, description: "Aufgabenbearbeitung im fachlichen Kontext." },
        { title: "Reflexion", weight: 30, description: "Begründung, Bewertung oder Transfer." },
      ],
    },
    sources: GENERAL_SOURCES,
  },
  sek2: {
    label: "Sekundarstufe II",
    stageSummary:
      "Für ein eigenes GOSt-Fach greifen zunächst die allgemeinen APO-GOSt-Klausurregeln; die Fachvorgaben müssen dann fachbezogen ergänzt werden.",
    legalBullets: [
      "In GOSt regelt § 14 APO-GOSt die Zahl und Lage der Klausuren.",
      "Eine Facharbeit ersetzt in der Qualifikationsphase eine Klausur, sofern kein Projektkurs belegt ist.",
      "In der Regel sollen höchstens drei Klausuren pro Woche und nur eine pro Tag angesetzt werden.",
    ],
    subjectBullets: [
      "Für ein eigenes Fach sollte zusätzlich geprüft werden, ob Standardsicherung NRW oder der Lehrplannavigator spezielle Vorgaben bereitstellt.",
      "Die Bewertungsstruktur sollte Inhalt, Anwendung und Darstellungs- bzw. Reflexionsleistung getrennt ausweisen.",
    ],
    planningBullets: [
      "Empfehlung: Analyse bzw. Wissen, Anwendung und Transfer als Startstruktur nutzen.",
    ],
    caution:
      "Für nicht vordefinierte Fächer ist der Kernlehrplan die eigentliche Leitplanke. Die hier vorgeschlagene Struktur ist nur ein belastbarer Ausgangspunkt.",
    preset: {
      totalPoints: 110,
      sections: [
        { title: "Grundlagen", weight: 30, description: "Begriffe, Theorien oder Materialbasis." },
        { title: "Anwendung", weight: 40, description: "Kompetenzorientierte Bearbeitung des Kernauftrags." },
        { title: "Transfer", weight: 30, description: "Reflexion, Bewertung oder weiterführende Übertragung." },
      ],
    },
    sources: GENERAL_SOURCES,
  },
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const getBuilderSubjectProfile = (subject: string) => {
  const normalized = normalize(subject);
  return (
    profiles.find((profile) => [profile.label, ...profile.aliases].some((entry) => normalize(entry) === normalized)) ??
    customFallback
  );
};

export const getBuilderGuidance = (subject: string, stage: BuilderSchoolStage) => {
  const profile = getBuilderSubjectProfile(subject);
  return profile[stage];
};
