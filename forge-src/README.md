# Forge

Josh and Jake's business brainstorm space: dump product ideas, explore them, score them blind, and pick the one to build.

Live: https://meyerjos004.github.io/josh-ideas-dashboard/forge/

## Stack
React (Vite) · Tailwind v4 · Motion · dnd-kit · Recharts · Supabase (same project as Pandora's Box, `forge_*` tables)

## Develop
```
cd forge-src
npm install
npm run dev
```

## Deploy
```
npm run build
rm -rf ../forge && cp -r dist ../forge
```
Commit and push to `main`. GitHub Pages serves `/forge/`.
