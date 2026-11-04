---
id: projects.directory
applies_to:
  - src/pages/projects.mdx
  - src/components/views/GroupView.astro
  - src/components/views/GroupItem.astro
  - src/content/projects/**
tags:
  - projects
  - restoration
---

# Project directory and preserved link data

- Restore the verified `ca826e279870b4d6582403bb3ec4cb75047e7f70` visual baseline, not a new approximation. Projects renders its original `StandardLayout` / `GroupView` / `GroupItem` composition. Links was subsequently removed by explicit owner request, including its data, schema and collection registration.
- Projects uses the original JSON contract (`id`, HTTP(S) `link`, `desc`, `icon`, `category`). The owner-approved content blend appends Diffusion and Siftpath with basic descriptions from preserved project research, alongside the unchanged blog entry. No project data, media, dates or personal contributions are invented for layout.
- The original Projects page has its centred title, existing article/home links, category headings and external project entries. Projects retains the historical Signal background. Do not recreate a Links directory or navigation entry.
- No wheel, graph, media-showcase controller or `/projects/[slug]/` archive belongs to the restored production site. No compatibility redirect or replacement page is introduced for those experimental archive URLs.
- Private experiments and their complete supporting worktree are archived outside production; they must not be imported into the restored site or used to justify retaining a rejected visual system.
- Adding a normal project or link remains a JSON content operation, not a page-layout edit.
