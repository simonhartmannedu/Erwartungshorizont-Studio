import { describe, expect, it } from "vitest";
import { MultipleResponseAnswerBlock, TrueFalseAnswerBlock } from "../types";
import { calculateSelectableAnswerPoints, getSelectableAnswerMaximum } from "./answerSheets";

const multiSelect: MultipleResponseAnswerBlock = {
  id: "multi", type: "multipleResponse", title: "Mehrfachauswahl", taskId: "task", optionLabels: ["A", "B", "C", "D"],
  correctAnswers: [["A", "C"], ["B"]], answerPoints: [2, 1],
};

const trueFalse: TrueFalseAnswerBlock = {
  id: "binary", type: "trueFalse", title: "Richtig / Falsch", taskId: "task", optionLabels: ["Richtig", "Falsch"],
  correctAnswers: ["Richtig", "Falsch"], answerPoints: [1, 1],
};

describe("Bogencheck-Auswertung", () => {
  it("vergibt Mehrfachauswahl-Punkte nur bei exakt vollständiger Auswahl", () => {
    expect(calculateSelectableAnswerPoints(multiSelect, [["A", "C"], ["B"]])).toBe(3);
    expect(calculateSelectableAnswerPoints(multiSelect, [["A"], ["B"]])).toBe(1);
    expect(calculateSelectableAnswerPoints(multiSelect, [["A", "C", "D"], ["B"]])).toBe(1);
  });

  it("wertet binäre Aussagen und maximale Punkte zeilenweise", () => {
    expect(calculateSelectableAnswerPoints(trueFalse, [["Richtig"], ["Richtig"]])).toBe(1);
    expect(getSelectableAnswerMaximum(trueFalse)).toBe(2);
  });
});
