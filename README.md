# EWH Module

Browser-based tool for building, editing, assigning, archiving, and printing `Erwartungshorizonte` and correction sheets for NRW school contexts.

## Screenshot

Add a current screenshot here once one is available.

```md
![App screenshot](./docs/screenshot-current-state.png)
```

## Current App State

This Vite + React app has grown beyond the original English-only rubric editor. It now covers the full workflow around expectation horizons, learner groups, correction progress, protected student data, reusable templates, and print-ready exports.

The UI is primarily German, but the app content itself is no longer restricted to English. Current presets and guidance cover multiple subjects, and English-specific workflows now live alongside broader NRW-oriented exam builder flows.

## Main Capabilities

- guided `EWH-Builder` with NRW rule/guidance checks for `Sek I` and `Sek II`
- manual `EWH-Editor` for section-based expectation horizons and grading structures
- reusable subject templates for more than one subject, including:
  `Deutsch`, `Englisch`, `Mathematik`, `Geschichte`, `Chemie`, and `Informatik`
- separate workflows for learner groups, student assignment, and correction progress
- local student database with aliases in the UI and encrypted full names
- password-protected group unlock flow for revealing student names only when needed
- editable grade scales, weighted sections, linked sections, and section point targets
- archive dashboard for reusable expectation horizons and opening/duplicating old entries
- workspace-style draft handling with stored versions/snapshots
- browser print layouts for individual reports, class PDFs, class overview PDFs, and grade-scale PDFs
- encrypted backup export/import for the full app state
- encrypted backup export/import for the student database
- CSV/TXT/XLSX import for student rosters
- signature support, teacher comments, absent-state handling, and correction tracking
- light/dark mode plus multiple visual themes
- bundled local UI feedback sounds

## App Structure

The current app is organized around four main areas:

- `Lerngruppen`: manage classes, import rosters, protect names with passwords, and track correction state
- `EWH-Builder`: guided setup with subject selection, school stage, NRW guidance, presets, and optional template start
- `EWH-Editor`: direct editing of sections, tasks, expectations, grade scales, and print settings
- `EWH-Archiv`: search, reopen, duplicate, and reuse archived expectation horizons

## Tech Stack

- `Vite`
- `React 18`
- `TypeScript`
- `Tailwind CSS`
- `sql.js`
- `xlsx`

## Local Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

Run offline regression checks:

```bash
npm run test:regression
```

## Data and Storage

- draft workspaces, archive entries, and student database state are stored locally in a browser-side SQLite database persisted through IndexedDB
- theme and visual-theme preferences remain in `localStorage`
- legacy local browser data is migrated into the SQLite-backed storage on first start after the storage upgrade
- this `V.01` publishable copy ships without bundled student records and without a preloaded signature asset
- student-facing workflows use aliases by default; full names are only resolved locally after the relevant group is unlocked
- no server-side persistence is included in this repository

## Import, Export, and Printing

- full working-state backups are exported as encrypted JSON and require the chosen passphrase for restore
- student database backups are also encrypted and restored locally
- student imports accept `CSV`, `TXT`, and spreadsheet files such as `XLSX`
- PDF export uses the browser print dialog rather than a server-side PDF renderer
- print layouts include individual report sheets, class-level printouts, class overview sheets, and grade-scale exports

## Notes and Limitations

- data is local to the current browser/profile unless exported manually
- if the browser profile is reset or the device changes, recovery depends on previously exported backups and their passphrases
- popup and print behavior depends on browser settings; blocked popups can affect export workflows
- exact print pagination can vary slightly between browsers
- password-protected student-name decryption only works when the correct class password is available in the current session
- the package name still contains the historical `notenrechner-nrw-english` identifier even though the app now covers multiple subjects and broader workflows
- this repository is source-available, not open-source in the OSI sense, because commercial use is restricted

## License

License summary:

- personal, educational, and other noncommercial use is allowed
- commercial use or redistribution requires a separate written license
- full terms are in [LICENSE](LICENSE)
