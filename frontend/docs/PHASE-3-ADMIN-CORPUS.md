# Phase 3 — Admin Policy Corpus

## Summary
Redesigned the admin-only Policy Corpus screen (`Corpus` in `src/views/Management.jsx`) with plain-language category labels, clause search and category filtering, progressive disclosure for clause text, honest empty/unavailable states, and a responsive summary. Removed the `[PLACEHOLDER]` paragraph and the "Index status"/"Last indexed" presentation. The add-clause form remains bound to the `createPolicy` service, which cannot save until the Phase 4 backend is connected.

## Changes
- `src/views/Management.jsx`
  - Replaced `Corpus` with a scoped `corpus-view` layout: unavailable-backend notice, corpus-missing warning, summary metrics (recorded clauses, source documents, categories covered), search + category filter, and a clean clause table.
  - Mapped raw rule keys to visible labels: Attendance, Task alignment, Documents; unknown keys render as "Uncategorized".
  - Clause text is revealed behind a "Read clause" disclosure instead of a long table column.
  - Empty states distinguish "No policy clauses yet" from "No clauses match" (active filters).
  - Removed the crashing `db.policyCorpus.map` (defensive `Array.isArray` guard).
- `src/views/corpus.css` (new) — responsive summary grid and disclosure styling using design tokens.
- `tests/corpus.test.js` (new) — asserts human labels, unavailable-save notice, empty/unavailable states, removal of index-status/placeholder content, and the `createPolicy` service boundary.
- `scripts/validate.mjs` — added `tests/corpus.test.js`.
- `scripts/smoke.mjs` — added admin Corpus landmark assertions.

## Limitations
- New clauses cannot be persisted; the form failure surfaces the "backend not connected" notice.
- Clause contents are institutional data; none are invented in this module.
