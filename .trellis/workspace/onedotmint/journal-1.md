# Journal - onedotmint (Part 1)

> AI development session journal
> Started: 2026-05-22

---



## Session 1: Article metadata and budget checks

**Date**: 2026-05-22
**Task**: Article metadata and budget checks
**Branch**: `main`

### Summary

Added dependency/runtime budget checks, centralized article data helpers, and extended blog frontmatter lifecycle with draft, featured, and updatedAt metadata.

### Main Changes

- Removed the fake `#` project link and omitted placeholder email contact data.
- Split article and reading utility logic into Astro-free core modules for focused unit tests.
- Made `scripts/check-content.mjs` export `validateContent()` while preserving CLI behavior.
- Added Node test coverage for article utilities, reading utilities, and content validation fixtures.
- Documented the lightweight `npm test` convention in frontend quality guidelines.

### Git Commits

| Hash | Message |
|------|---------|
| `e9201b9` | (see git log) |
| `75d9bed` | (see git log) |

### Testing

- [OK] `npm test`
- [OK] `npm run check`
- [OK] `npm run check:budget`
- [OK] `npm run build`

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Advance ADR and article data tasks

**Date**: 2026-05-22
**Task**: Advance ADR and article data tasks
**Branch**: `main`

### Summary

Added architecture decision log documentation and verified the centralized article data utility task against Astro check, build, and budget checks.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f4fea7c` | (see git log) |
| `75d9bed` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Site identity and article series

**Date**: 2026-05-23
**Task**: Site identity and article series
**Branch**: `main`

### Summary

Centralized public site identity data, then added optional article series metadata, helpers, index/detail routes, and sample series content.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `573088b` | (see git log) |
| `8d27b1d` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: Discovery metadata and content checks

**Date**: 2026-05-23
**Task**: Discovery metadata and content checks
**Branch**: `main`

### Summary

Added static RSS, sitemap, canonical/social metadata, production site origin wiring, and dependency-free content quality checks.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5cf6e1a` | (see git log) |
| `e647aac` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Docker deployment and project detail pages

**Date**: 2026-05-23
**Task**: Docker deployment and project detail pages
**Branch**: `main`

### Summary

Added Docker Compose static deployment with Nginx and added three static project detail pages with sitemap coverage.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e3af9b0` | (see git log) |
| `c541d83` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Add design screenshot baseline

**Date**: 2026-05-23
**Task**: Add design screenshot baseline
**Branch**: `main`

### Summary

Added a dependency-free design baseline workflow that builds the Astro site, captures desktop and mobile screenshots for representative pages, and documents the refresh process.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c9b5c54` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Add blog tags and now page

**Date**: 2026-05-23
**Task**: Add blog tags and now page
**Branch**: `main`

### Summary

Added static blog tag archives and related-article links, then added a static Now page linked from nav and sitemap. Verified with npm run check:content, npm run check, and npm run build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f2ed571` | (see git log) |
| `fa93aad` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Harden private content sync

**Date**: 2026-05-23
**Task**: Harden private content sync
**Branch**: `main`

### Summary

Moved public sample content into sample-content, made sync rebuild Astro mount points, added strict private-content publishing checks, and documented the new flow.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ac4ba3b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Add reading resources pages

**Date**: 2026-05-23
**Task**: Add reading resources pages
**Branch**: `main`

### Summary

Added a static /reading index plus per-resource detail pages, wired reading content sync and sitemap entries, and passed check:content, check, and build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `42dbb46` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Article reading navigation

**Date**: 2026-05-23
**Task**: Article reading navigation
**Branch**: `main`

### Summary

Archived the Docker Compose docs task after validation, then added static article table-of-contents and adjacent article navigation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ca8da31` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Blog discovery and social metadata

**Date**: 2026-05-23
**Task**: Blog discovery and social metadata
**Branch**: `main`

### Summary

Added static blog archive pages, default social preview metadata, and updated frontend specs.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `fc3ddc5` | (see git log) |
| `ea8232e` | (see git log) |
| `a682ec4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: Placeholder cleanup and utility tests

**Date**: 2026-05-23
**Task**: Placeholder cleanup and utility tests
**Branch**: `main`

### Summary

Removed fake public project/contact data, added Node-based utility and content validation tests, and documented the lightweight test convention.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5da660a` | (see git log) |
| `8bc69b5` | (see git log) |
| `3c02519` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Harden content validation parser

**Date**: 2026-05-23
**Task**: Harden content validation parser
**Branch**: `main`

### Summary

Improved build-time MDX frontmatter parsing for quoted arrays, block arrays, inline series data, and empty tag errors; added regression tests and documented the content validation contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `5b5447f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: Move project data to content collection

**Date**: 2026-05-23
**Task**: Move project data to content collection
**Branch**: `main`

### Summary

Moved project metadata into the Astro projects content collection, updated sync/content validation/tests, and documented the new project content contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3702d7d` | (see git log) |
| `893b831` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: Add CI quality workflow

**Date**: 2026-05-23
**Task**: Add CI quality workflow
**Branch**: `main`

### Summary

Added GitHub Actions quality workflow for push and pull_request, running npm ci, check, tests, and build; documented the CI quality contract in frontend specs.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3037049` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 16: Strengthen content validation

**Date**: 2026-05-23
**Task**: Strengthen content validation
**Branch**: `main`

### Summary

Strengthened build-time MDX content validation for blog, reading, and project metadata, added regression tests, and documented the validation contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `76a5bf5` | (see git log) |
| `08c817a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Add RSS and sitemap tests

**Date**: 2026-05-23
**Task**: Add RSS and sitemap tests
**Branch**: `main`

### Summary

Added pure RSS and sitemap XML builders, covered feed and sitemap output with node:test, and documented the XML output test contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c70aa14` | (see git log) |
| `3ca60f5` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Improve article reading experience

**Date**: 2026-05-23
**Task**: Improve article reading experience
**Branch**: `main`

### Summary

Improved static article prose, table-of-contents, adjacent navigation, code/table overflow handling, refreshed visual baselines, and documented the reading-page contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `cbb5a3e` | (see git log) |
| `5c10dda` | (see git log) |
| `aca80d5` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: Harden deployment origin checks

**Date**: 2026-05-23
**Task**: Harden deployment origin checks
**Branch**: `main`

### Summary

Changed deployment install to npm ci, added a production PUBLIC_SITE_ORIGIN guard with tests, wired deploy builds through the guard, and documented the deployment guard contract.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `7f52104` | (see git log) |
| `e0c713b` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Document deployment troubleshooting

**Date**: 2026-05-23
**Task**: Document deployment troubleshooting
**Branch**: `main`

### Summary

Added concise README troubleshooting guidance for common GitHub Actions deployment failures, covering strict content sync, production origin, private content checkout, SSH setup, and rsync target checks. Verified with npm run check, npm test, and npm run build.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c29cee2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: Add deploy configuration preflight

**Date**: 2026-05-23
**Task**: Add deploy configuration preflight
**Branch**: `main`

### Summary

Added a deployment environment preflight script and tests, wired it into the GitHub Actions deploy workflow before private content checkout, updated README deployment flow, and recorded the deploy preflight contract in the backend quality spec. Verified missing and configured deploy env paths plus npm test, npm run check, npm run build, and npm run check:budget.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c231ca7` | (see git log) |
| `3970b53` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Improve content format checks

**Date**: 2026-05-23
**Task**: Improve content format checks
**Branch**: `main`

### Summary

Tightened build-time content validation for blog series metadata, reading resource error aggregation, and project ordering/link contracts; updated tests and backend quality spec.

### Main Changes

- Added checks for missing blog `series.title` when `series` is present.
- Kept reading validation aggregated after invalid `image` paths.
- Added project `order`, `group.order`, `link`, `links.href`, and detail `links` validation.
- Added regression tests for the new content validation behavior.
- Updated backend quality spec with the content validation contract.

### Git Commits

| Hash | Message |
|------|---------|
| `198dd56` | fix: tighten content format validation |
| `b94758f` | docs: document content validation contracts |

### Testing

- [OK] `npm test`
- [OK] `npm run check`
- [OK] `npm run build`

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 23: Article metadata and reading category cleanup

**Date**: 2026-05-23
**Task**: Article metadata and reading category cleanup
**Branch**: `main`

### Summary

Added article-specific sharing metadata and JSON-LD output, then constrained reading resource category values with content validation and tests.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ef9d3d0` | (see git log) |
| `81cffd0` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
