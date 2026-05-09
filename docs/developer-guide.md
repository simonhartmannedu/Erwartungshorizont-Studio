# Developer Guide

This guide is for developers maintaining or extending Erwartungshorizont-Studio.

## Prerequisites

- Node.js compatible with Vite 6.
- npm.
- For local PDF import:
  - Poppler tools: `pdftotext`, `pdfinfo`, `pdftoppm`
  - Tesseract OCR with `deu+eng` language data

The browser-only parts of the app work without Poppler or Tesseract. PDF import needs them when running through the local Vite middleware.

## Commands

```bash
npm install
npm run dev
npm run build
npm run build:demo
npm run preview
npm run test:regression
npm run check:release
```

Command purpose:

- `npm run dev` starts the local Vite app.
- `npm run build` type-checks and builds the production bundle.
- `npm run build:demo` builds with seeded demo behavior.
- `npm run preview` serves the built bundle.
- `npm run test:regression` runs offline regression checks.
- `npm run check:release` runs build plus regression checks.

## Common Development Tasks

### Add or Change an EWH Template

Edit `src/data/templates.ts`.

Each template should include:

- Human-readable metadata for selection and preview.
- A `totalPoints` value.
- Section seeds with titles, descriptions, notes, and tasks.
- A `build()` path through the existing helper functions.

After changing templates, check:

- Guided builder preview.
- Generated section weights.
- Total points.
- Print output for a generated exam.

### Add a New Field to Exams, Sections, or Tasks

1. Update the type in `src/types.ts`.
2. Update factory functions such as template builders and `createSection`/`createTask` helpers.
3. Update storage normalization if existing local data needs defaults.
4. Update backup import/export behavior if needed.
5. Update print/export output if the field is user-facing.
6. Update documentation if the field changes workflows or data privacy.
7. Run `npm run build` and relevant regression checks.

### Change Grading or Point Calculations

Start in:

- `src/utils/calculations.ts`
- `src/utils/grades.ts`
- `src/utils/gradeScaleGenerator.ts`
- `src/utils/sectionWeights.ts`
- `src/utils/scaling.ts`

Then check:

- `SummaryPanel`
- `ReportSummarySection`
- `PrintableReport`
- CSV exports in `src/utils/export.ts`
- Regression tests in `regression/run.cjs`

### Change Student or Class Workflows

Start in:

- `src/utils/students.ts`
- `src/components/StudentRosterPanel.tsx`
- `src/components/StudentSelectionPanel.tsx`
- `src/components/StudentPerformanceView.tsx`
- `src/App.tsx`

Pay attention to protected groups. Sensitive fields may be encrypted, hydrated while a group is unlocked, and scrubbed again when locked.

### Change PDF Import

Browser-side files:

- `src/pdf/client.ts`
- `src/pdf/privacy.ts`
- `src/pdf/options.ts`
- `src/components/PdfImportAssistant.tsx`

Server-side/local middleware files:

- `vite.config.ts`
- `server/pdfRuntime.mjs`
- `server/pdfSuggest.ts`

Keep the privacy preview and consent flow intact when changing PDF import behavior.

## UI Conventions

- Use existing primitives from `src/components/ui.tsx` before adding new controls.
- Keep editor screens dense and scannable.
- Prefer section-level navigation and collapse controls over pagination in the EWH editor.
- Keep print-only and no-print behavior explicit with existing CSS conventions.
- Avoid changing persistent data format from inside a presentational component.

## Testing and Verification

Minimum checks for most changes:

```bash
npm run build
```

Run regression checks when changing business rules:

```bash
npm run test:regression
```

Run the full release check before publishing:

```bash
npm run check:release
```

Manual smoke checks:

- Create a rubric from a template.
- Add, duplicate, move, collapse, and delete sections/tasks.
- Change point totals and verify the summary.
- Create/import a learner group.
- Enter scores for a student.
- Print a student report.
- Export CSV.
- Create an encrypted backup and import it into a fresh profile if the change touched storage.

## Documentation Maintenance

Update documentation in the same change when:

- A workflow changes.
- A command changes.
- A dependency changes.
- A storage, encryption, import, export, or PDF behavior changes.
- A new public module or major component is added.

Recommended documentation targets:

- `README.md` for project overview and quick start.
- `docs/architecture.md` for data flow and implementation decisions.
- `docs/developer-guide.md` for development workflow.
- `docs/data-and-privacy.md` for storage, encryption, privacy, and backup behavior.

## Release Checklist

- `npm run check:release` passes.
- README and docs reflect the current behavior.
- License notices are accurate.
- Demo mode still loads seeded sample data.
- PDF import limitations are still documented if deployment behavior changes.
- Sensitive data behavior has been manually reviewed if student workflows changed.
