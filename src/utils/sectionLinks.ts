import { Exam, Section } from "../types";

const normalizeTitle = (value: string) => value.trim().toLocaleLowerCase("de-DE");

const isLegacyWritingPair = (first: Section, second: Section) =>
  normalizeTitle(first.title).includes("teil c: schreiben") &&
  normalizeTitle(second.title).includes("teil d: sprache");

export const areSectionsLinked = (
  first: Section | null | undefined,
  second: Section | null | undefined,
) =>
  Boolean(
    first &&
      second &&
      first.linkedSectionId === second.id &&
      second.linkedSectionId === first.id,
  );

export const getLinkedSectionPartnerIndex = (
  sections: Section[],
  index: number,
) => {
  const section = sections[index];
  if (!section?.linkedSectionId) return -1;

  const partnerIndex = sections.findIndex((entry) => entry.id === section.linkedSectionId);
  if (partnerIndex === -1 || Math.abs(partnerIndex - index) !== 1) return -1;

  return areSectionsLinked(section, sections[partnerIndex]) ? partnerIndex : -1;
};

export const isLinkedSectionLeader = (sections: Section[], index: number) =>
  areSectionsLinked(sections[index], sections[index + 1]);

export const isLinkedSectionFollower = (sections: Section[], index: number) =>
  areSectionsLinked(sections[index - 1], sections[index]);

export const normalizeSectionLinks = (exam: Exam): Exam => {
  const sections = exam.sections.map((section) => ({
    ...section,
    linkedSectionId: section.linkedSectionId ?? null,
  }));
  const normalizedSections: Section[] = sections.map((section) => ({
    ...section,
    linkedSectionId: null,
  }));

  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = sections[index]!;
    const next = sections[index + 1]!;
    const shouldLink =
      current.linkedSectionId === next.id ||
      next.linkedSectionId === current.id ||
      isLegacyWritingPair(current, next);

    if (!shouldLink) continue;

    normalizedSections[index] = {
      ...normalizedSections[index]!,
      linkedSectionId: next.id,
    };
    normalizedSections[index + 1] = {
      ...normalizedSections[index + 1]!,
      linkedSectionId: current.id,
    };
    index += 1;
  }

  return {
    ...exam,
    sections: normalizedSections,
  };
};
