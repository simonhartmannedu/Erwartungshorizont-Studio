import { describe, expect, it } from "vitest";
import { createLocalSearchIndex, searchLocalIndex } from "./localSearch";

const index = createLocalSearchIndex([
  { title: "Analyse der Erzählperspektive", content: "Deutsch, Textbelege begründen" },
  { title: "Textbelege", content: "Deutsch, Analyse der Erzählperspektive" },
  { title: "Straßen und Grüße", content: "Geographie" },
], (item) => [{ text: item.title, weight: 10 }, { text: item.content, weight: 2 }]);
const titles = (query: string) => searchLocalIndex(index, query).map((entry) => entry.item.title);

describe("Lokale Volltextsuche", () => {
  it("ordnet Titel vor Inhalt und behandelt mehrere Begriffe unabhängig von ihrer Reihenfolge", () => {
    expect(titles("Analyse")[0]).toBe("Analyse der Erzählperspektive");
    expect(titles("Deutsch Analyse")).toHaveLength(2);
    expect(titles("Analyse Biologie")).toHaveLength(0);
    expect(titles("")).toHaveLength(3);
  });
  it("findet Wortanfänge, Umlaute, ß und vertauschte Buchstaben", () => {
    expect(titles("Erzahlpersp")[0]).toBe("Analyse der Erzählperspektive");
    expect(titles("Anaylse")[0]).toBe("Analyse der Erzählperspektive");
    expect(titles("Strassen Grusse")).toEqual(["Straßen und Grüße"]);
    expect(titles("Analysse")[0]).toBe("Analyse der Erzählperspektive");
    expect(titles("xyz")).toHaveLength(0);
  });
  it("unterstützt exakte Phrasen und ausgeschlossene Wörter", () => {
    expect(titles('"der Erzählperspektive"')).toHaveLength(2);
    expect(titles('"Perspektive der"')).toHaveLength(0);
    expect(titles("Analyse -Deutsch")).toHaveLength(0);
    expect(titles('-Geographie')).toHaveLength(2);
    expect(titles('"')).toHaveLength(3);
  });
});
