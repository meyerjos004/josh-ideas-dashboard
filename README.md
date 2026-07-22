# Josh's Ideas Dashboard

Live, auto-updating ideas dashboard powered by Google Sheets.

## Setup

### 1. Google Sheet
Sheet ID: `1UA_TX0lA3xwHQHY9k0gIprfkZ9W05nD2tSBEURamuqQ`
Edit link: https://docs.google.com/spreadsheets/d/1UA_TX0lA3xwHQHY9k0gIprfkZ9W05nD2tSBEURamuqQ/edit

Your sheet is already populated with the 3 ideas. Edit it directly to add/update ideas.

**Populate the sheet with your ideas:**
1. Open the sheet above
2. Add headers in row 1: `Category`, `Name`, `Description`, `Priority`, `FullDescription`
3. Add your ideas starting in row 2

**Sample data (paste this into your sheet):**
```
Category,Name,Description,Priority,FullDescription
AI Tools,Wisprflow,Voice-to-text that sounds like you with keyword shortcuts,3,AI-powered voice-to-text that adapts tone based on context (formal in docs, casual in messages, enthusiastic in emails) and works system-wide across any app or website with a text field. Creates voice shortcuts/snippets for frequently used text like intros, links, code blocks, or replies that paste perfectly every time. Cleans filler words, fixes punctuation, formats lists, and applies markdown so text is ready to send. Available on Mac, Windows, Android, and iOS. Free tier + paid subscription.
AI Tools,Granola,Records meetings and calls creates searchable transcripts,3,AI notepad that captures device audio directly with no bot joining your video call, works with any meeting platform (Zoom, Google Meet, Teams, Slack huddles, phone calls) because capture happens at the system audio level. Audio transcribes in real time and deletes immediately with no audio files stored, merges your rough notes with AI-enhanced summary surfacing decisions, action items, and key quotes, and creates a searchable record you can query later. Available for Mac, Windows, iOS, and Android with calendar integration. Free plan available; paid plans unlock integrations with CRM systems and MCP. SOC 2 Type 2 certified (July 2025).
AI Tools,Littlebird,Desktop AI that reads your screen and remembers everything,3,An always-on AI assistant that runs on your desktop (Mac and Windows with iOS/Android companion apps) and reads your screen in real time using OCR and NLP to build a searchable memory of everything you see across all apps without storing screenshots. Transcribes meetings automatically, allows context-aware queries ('What did we decide on pricing in last week's meeting?'), surfaces personalized insights, and provides scheduled AI briefings (Routines) that can be daily, weekly, or monthly. No app integrations required — it works by seeing what's on your screen — but supports hundreds of integrations for deeper access. Granular privacy controls let you pause collection or exclude sensitive apps. Raised $11M as of March 2026 with backing from prominent investors.
```

### 2. Push to GitHub

```bash
# Create new repo on GitHub (via web): https://github.com/new
# Name it: josh-ideas-dashboard
# Then run these commands:

cd josh-ideas-dashboard
git branch -M main
git remote add origin https://github.com/meyerjos004/josh-ideas-dashboard.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo: https://github.com/meyerjos004/josh-ideas-dashboard
2. Settings → Pages
3. Source: Deploy from main branch
4. Save

Your dashboard will be live at: `https://meyerjos004.github.io/josh-ideas-dashboard/`

## How It Works

- The dashboard fetches data from your Google Sheet every 30 seconds
- Edit the sheet → changes appear automatically on the dashboard
- No manual redeployment needed
- The sheet must remain publicly viewable (anyone with link can view)

## Features

- 🔍 Search by name or description
- 📊 Filter by priority level (1-5)
- 🎨 Dark hacker aesthetic
- ⚡ Live auto-updates
- 📱 Mobile responsive
- ✨ Smooth animations
