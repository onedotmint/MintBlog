# Architecture Decision Log

This directory records project decisions that should outlive a task, chat session, or commit message.

Add a decision record when a change:

- changes the project architecture or deployment model
- adds, removes, or rejects runtime infrastructure
- changes dependency or generated-output budgets
- changes how public code and private content are separated
- creates a project boundary that future maintainers should not rediscover

Keep records short. Use [template.md](./template.md), choose the next numeric prefix, and name files with kebab-case summaries.

## Current Decisions

- [001 - Use Astro Static Output for V1](./001-use-astro-static-output-for-v1.md)
- [002 - Keep Real Content in a Private Sync Source](./002-keep-real-content-in-private-sync-source.md)
- [003 - Keep Dependency and Runtime Budgets Small](./003-keep-dependency-and-runtime-budgets-small.md)
- [004 - Do Not Add a CMS or Runtime Backend for V1](./004-no-cms-or-runtime-backend-for-v1.md)
