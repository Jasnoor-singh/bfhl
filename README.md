# BFHL Hierarchy Analyser

Chitkara Full Stack Engineering Challenge — Round 1

## Setup

```bash
npm install
cp .env.example .env   # edit credentials if needed
npm start              # http://localhost:3000
```

Dev mode (auto-restart):
```bash
npm run dev
```

## API

**POST /bfhl**

```json
{ "data": ["A->B", "A->C", "B->D"] }
```

Returns hierarchies, invalid entries, duplicate edges, and summary stats.

## Deploy

Works on Render, Railway, Vercel (with adapter), or any Node host.
Set environment variables `USER_ID`, `EMAIL_ID`, `COLLEGE_ROLL` on your host.
