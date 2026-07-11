<!-- README.md — the AssemblyOps marketing landing site (Astro static, deployed to Firebase/Railway). -->

# AssemblyOps Landing

Static marketing site for AssemblyOps, built with Astro. Ported from the React reference; ships zero JS.

## Setup

```sh
npm install
```

## Development

```sh
npm run dev              # foreground dev server
astro dev --background   # background mode (see AGENTS.md)
```

## Build & preview

```sh
npm run build     # outputs static site to ./dist/
npm run preview   # serve the production build locally
```

## Deployment

`dist/` is served as a static site. Hosting moves from Firebase to a Railway static service in the Phase-2 migration.
