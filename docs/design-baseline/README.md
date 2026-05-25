# Design Screenshot Baseline

This directory stores visual reference screenshots for the public sample site.

## Refresh

```bash
npm run design:baseline
```

The command builds the Astro site, serves `dist/` locally, and captures PNG screenshots with local Chrome or Chromium. If the browser is not on `PATH`, set `CHROME_PATH`:

```bash
CHROME_PATH=/path/to/chrome npm run design:baseline
```

## Review Artifact

Run the `Design Baseline` GitHub Actions workflow manually when a change may
affect layout, typography, spacing, navigation, or page composition.

The workflow uses public sample content, runs the existing
`npm run design:baseline` command, and uploads the PNG output as a
`design-baseline-screenshots` artifact. Download the artifact from the workflow
run and compare the screenshots against the committed baseline in this
directory.

## Viewports

* Desktop: `1440x1200`
* Mobile: `390x900`

## Captured Routes

* `/`
* `/blog/`
* `/blog/cs61a-week-1/`
* `/blog/series/`
* `/blog/series/cs61a-notes/`
* `/projects/`
* `/projects/build-pipeline-sketches/`
* `/talks/`
* `/about/`

## Notes

These screenshots are a manual design baseline. They are not pixel-diff tests
and they run only through the manual `Design Baseline` workflow.

Refresh them after intentional visual changes, then review the changed PNGs before committing.
