# EWH Module

Short overview of the `notenrechner-nrw-english` module.

## Overview

This is a Vite + React module for building and reviewing English assessment rubrics (`Erwartungshorizonte`) for Sekundarstufe I / Gymnasium NRW.

License summary:

- personal, educational, and other noncommercial use is allowed
- commercial use or redistribution requires a separate written license
- full terms are in [LICENSE](LICENSE.MD)

Main capabilities:

- edit section-based assessment sheets
- manage grade scales and weighted scoring
- work with student aliases and locally encrypted student names
- create fully encrypted student-database backups for export and recovery
- save reusable rubric snapshots in the archive
- generate print-friendly report views and browser PDF exports
- switch between light/dark mode and two visual themes

## Usage Notes

Install dependencies and run locally:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Offline regression checks:

```bash
npm run test:regression
```

General behavior:

- draft data, archive entries, and student database state are stored in a browser-local SQLite database persisted in IndexedDB
- theme settings remain in `localStorage`
- student-facing work uses aliases in the UI; full names are only resolved locally during protected print flows
- student database backups are exported as encrypted JSON and require the chosen backup password for restore
- PDF export uses the browser print dialog, not a server-side PDF generator
- the visual theme picker changes the app palette independently of light/dark mode
- subtle one-shot UI feedback sounds are bundled locally from Kenney's CC0 `Interface Sounds` pack; license text is stored in `public/licenses/kenney-interface-sounds-license.txt`

## Caveats

- data is local to the current browser/profile unless exported manually
- if the browser profile is reset or the device changes, recovery depends on a previously exported backup file and its backup password
- on the first start after this storage change, existing browser data is migrated automatically into SQLite
- popup and print handling depend on browser settings; blocked popups or browser-specific PDF behavior can affect export workflows
- password-protected student name decryption only works when the correct class password is available for that session
- print layouts are optimized for browser printing, so exact pagination may vary slightly between browsers
- this repository is source-available, not open-source in the OSI sense, because commercial use is restricted
