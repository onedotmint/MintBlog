# Personal Blog V1

Static personal blog built with Astro and MDX.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` and `npm run dev` both run the content sync script first.
If `private-content/` exists, it is copied into `src/content/blog/` and `public/`
before Astro starts.

## Private content layout

```text
private-content/
  blog/
  assets/
    images/
      blog/
      projects/
    files/
```

## Deployment flow

The repository includes a GitHub Actions workflow that can:

1. checkout the public code repository
2. checkout the private content repository from CI secrets
3. sync content into Astro's expected paths
4. run install and build
5. rsync `dist/` to the target server over SSH

Required secrets:

- `PRIVATE_CONTENT_REPOSITORY`
- `PRIVATE_CONTENT_TOKEN`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_KEY`
