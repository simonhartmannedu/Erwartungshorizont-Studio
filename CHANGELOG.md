# Changelog

All notable changes to EWH-Studio are documented in this file. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] - 2026-08-06

### Added

- ESLint, TypeScript type checking, Vitest, Playwright, release checks, and CI quality gates.
- Unit tests for calculations, normalization, versioned storage envelopes, migrations, backup validation, and import validation.
- A generated XLSX roster compatibility test using only fictitious student data.
- Browser E2E coverage for demo startup, archive-to-group assignment persistence, encrypted backup creation, incorrect passwords, explicit restore confirmation, malformed backup files, and unsupported backup versions.
- Explicit versioned storage and encrypted backup envelopes with backwards-compatible v1 reading, runtime validation, named migrations, safe error boundaries, and non-mutating migration tests.
- A global backup status and a confirmed restore flow with an optional encrypted pre-restore backup.
- Initial `app/`, `domain/`, `features/`, and `infrastructure/` boundaries plus tested workspace command controllers.
- AGPL-3.0-only licensing, visible in-app license notice, Open Core documentation, DCO contribution guidance, security policy, Contributor Covenant, issue templates, CODEOWNERS, funding configuration, Dependabot, CI, and release automation.
- Third-party inventory, technical-debt register, public development guide, and roadmap.

### Changed

- Existing local archives are normalized before strict validation so supported historical archives remain readable.
- Deployment checks run linting, type checking, tests, builds, and Playwright E2E tests before Pages artifacts are published.
- The repository root is the canonical Git worktree; the duplicate historical `V.01/` worktree was removed.
- Personal `public/signature.svg`, local environment overrides, coverage, logs, and generated Playwright artifacts are excluded from Git.
- The personal default-signature asset is no longer referenced by the application; users can still create or import their own local signature in the existing workflow.

### Security

- Backup parsing rejects corrupted, unsupported, and incorrect-password inputs without opening a restore flow.
- Restore requires an explicit overwrite acknowledgement before existing local data can be replaced.
- Sensitive data handling, local-first boundaries, and third-party asset provenance are documented for review.

### Known limitations

- Provenance and licensing of local font and graphic assets still require release approval.
- `xlsx@0.18.5` has known upstream security advisories without an automatic compatible fix; see `docs/technical-debt.md`.

## Planned milestones

- `0.2.0-alpha`: explicit migrations, validated backups, critical E2E flows, and improved error handling.
- `0.3.0-beta`: modular grading workflow, PWA decision, accessibility baseline, and stabilized data formats.
- `1.0.0`: only after stable documented data formats, migrations, backup contract, and support boundaries.
