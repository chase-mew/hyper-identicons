## What this changes

<!-- And why. If it changes what an address renders to, say so here — that is the
     one kind of change reviewers need to look at differently. -->

## How you checked it

<!-- For art: which view convinced you, at native size. A screenshot of the sheet or
     the relevant pairs grid is worth more than a description.
     For colour: `npx tsx scripts/audit-colors.ts` reporting zero failures. -->

## Before merging

- [ ] `pnpm build`, `pnpm typecheck` and `pnpm test` pass
- [ ] Generators re-run and their output committed, if art changed
- [ ] `pnpm vectors` re-run, if output changed
- [ ] `spec/v1.md` updated in this commit, if behaviour changed
- [ ] `AGENTS.md` updated, if this makes something in it wrong or teaches something new
