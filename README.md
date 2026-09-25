# Pandora's Box — Josh's Ideas Dashboard

A live database of ideas to look into: tools, projects, and anything else worth exploring. Ideas are grouped by category into 3D card carousels, and each one has a priority, a status and a favorite flag.

**Live site:** https://meyerjos004.github.io/josh-ideas-dashboard/

## Stack

- **Frontend:** a single static `index.html` (vanilla HTML/CSS/JS, no build step)
- **Backend:** Supabase (Postgres + Realtime)
- **Animation:** anime.js
- **Hosting:** GitHub Pages, deployed from `main`. A push to `main` updates the live site.

## Features

- **Category carousels:** each category gets its own 3D carousel with momentum scrolling (a fast, repeated scroll flicks through cards)
- **Card details:** click a card for the full description; cards can have a custom brand color
- **Search:** filter by name or description
- **Priority filter:** P1–P5 (P1 = highest, P5 = lowest)
- **Status filter:** Ideating / Building / Shipped
- **Favorites:** star ideas and filter to show only favorites
- **Sort:** by name (A–Z)
- **Stats bar:** quick counts across the dashboard
- **Card management:** add, edit and delete cards in the UI
- **Category management:** add, rename and remove categories in the UI
- **Realtime sync:** changes in Supabase show up instantly, no refresh needed
- **Active users:** a live count of who's viewing the dashboard
- **Collapsible sidebar**, mobile responsive

## Data model (Supabase)

| Table | Holds |
|---|---|
| `ideas` | The cards: name, short description, full description, category, priority, color |
| `categories` | Category list (the source of truth for category names) |
| `idea_statuses` | Status per idea (Ideating / Building / Shipped) |
| `favorites` | Which ideas are favorited |
| `active_sessions` | Presence tracking for the active-user counter |

## Adding ideas

Ideas can be added two ways:

1. **In the UI:** use **+ Add Card** / **+ Add Category**.
2. **Through Claude:** say "website ideas" or `/addidea`, then give `What - Name - Desc - 1/5`. Claude researches the idea, writes the full description, picks a brand color from the palette, matches it to an existing category (or creates the category first), and inserts it into Supabase.

Always reuse existing category names exactly. `AI Tools` and `AI tool` would become two separate categories.

## Files

| File | What it is |
|---|---|
| `index.html` | The live dashboard (Supabase-backed) |
| `index-anime.html` | Earlier anime.js prototype that still reads from the old Google Sheet; kept for reference |
