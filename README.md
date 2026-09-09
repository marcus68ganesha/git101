# Student Progress Report App

A web app for teachers to manage student progress reports, lesson plans,
namelists, and media attachments — with PDF export and an AI assistant —
replacing paper-based recordkeeping.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) — deployed on Vercel
- [Supabase](https://supabase.com) — Postgres database, Auth, and file Storage
- [Anthropic Claude API](https://docs.claude.com) — AI assistant for drafting
  report comments and lesson plan ideas
- [`@react-pdf/renderer`](https://react-pdf.org) — generates progress report
  PDFs on demand for download/print

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase + Anthropic keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project status

Being built in phases — see the plan for the full roadmap:

- [x] Phase 0 — project scaffolding
- [ ] Phase 1 — auth (teacher accounts) + student namelist
- [ ] Phase 2 — progress reports + PDF export
- [ ] Phase 3 — lesson plans
- [ ] Phase 4 — photo/video attachments
- [ ] Phase 5 — AI chatbot assistant
