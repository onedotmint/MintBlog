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
* `/about/`

## Notes

These screenshots are a manual design baseline. They are not pixel-diff tests and they do not run in CI.

Refresh them after intentional visual changes, then review the changed PNGs before committing.
