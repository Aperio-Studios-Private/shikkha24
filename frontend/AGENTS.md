# Frontend — Astro-specific notes

> ⚠️ **This file is NOT the project rule set.** The mandatory agent rules (1–13)
> live in the repository-root mirrors — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md` —
> which are byte-identical and must be read before any work. The Astro CLI
> generator writes its own `AGENTS.md` / `CLAUDE.md` into this directory; they
> were removed deliberately so they cannot shadow the root mirrors.

## Dev server

```sh
npm run dev -w frontend
```

Astro 7 can run the dev server in background mode:

```sh
astro dev --background
astro dev status
astro dev logs
astro dev stop
```

## What this workspace is

Astro 7 static output, deployed to DianaHost `public_html`. It is **built in CI only** —
Astro 7 and Vite 8 cannot run on DianaHost's Node 20.18.2
(`docs/hosting-and-deployment.md` §5).

- `src/styles/global.css` — design tokens + Bengali typography floor
- `src/styles/fonts.css` — auto-generated; regenerate with `node scripts/fetch-fonts.mjs`
- `src/lib/feature-flags.ts` — build-time feature flags
- `public/.htaccess` — Apache security headers and the strict CSP profile

## Astro documentation

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)
