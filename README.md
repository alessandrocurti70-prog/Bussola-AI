# Bussola AI

Blog + newsletter settimanale sull'intelligenza artificiale, spiegata semplice, per il mercato ticinese. Volto del brand: **Alessandro** (avatar illustrato). Tagline: *La tua direzione nell'intelligenza artificiale*.

Questo repository è la **source of truth** del progetto (GitHub → deploy Netlify).

## Direzione del progetto
Il sito evolve da generatore statico a **prodotto editoriale dinamico** (backend Supabase + Admin Centre sicuro + newsletter automatica + SEO + Assistente Editoriale AI), secondo il **Blueprint Operativo v2.1** in `docs/`. Ordine: **prima l'infrastruttura, poi la grafica**. Non si riscrive da zero: si costruisce sopra a quanto esiste.

Lo sviluppo tecnico avviene in **Claude Code**. Prima di iniziare, leggi `CLAUDE.md`.

## Struttura del repository
```
Sito/  (repo)
├─ CLAUDE.md            → regole per Claude Code (leggere per prime)
├─ README.md
├─ .env.example        → template variabili ambiente (senza segreti)
├─ docs/               → blueprint, architettura, registro decisioni
│   ├─ Bussola_AI_Blueprint_Operativo_v2.1.docx
│   ├─ architecture.md
│   └─ decisions.md
├─ knowledge/          → base di conoscenza versionata (brand, design, editoriale, SEO, AI)
├─ supabase/
│   └─ migrations/     → migrazioni DB versionate (in arrivo)
├─ contenuti/articoli/ → articoli attuali (.md) — stato di partenza
├─ build.js            → generatore statico attuale
├─ style.css
├─ index.html · archivio.html · articolo-*.html · formazioni.html · dashboard.html
└─ netlify.toml
```

## Stato attuale (generatore statico)
Il sito oggi è generato da `build.js` (Node, zero dipendenze): legge `contenuti/articoli/*.md` e produce le pagine HTML. Per aggiungere un articolo: crei un file `.md` con front-matter (`titolo, slug, data, categoria, cat, copertina, minuti, estratto, lead` + testo) in `contenuti/articoli/`, poi `node build.js`. Questo meccanismo resta valido finché il CMS su Supabase non lo sostituisce.

## Deploy
GitHub + Netlify (build command `node build.js`, publish `.`). Aggiornamento: commit + push → Netlify ricostruisce.

## Sicurezza
Nessun segreto o API key nel frontend o nel repository. Il file `.env` reale è ignorato da Git; usa `.env.example` come riferimento. La `service_role` di Supabase e la `OPENAI_API_KEY` vivono solo lato server.

## Primo passo con Claude Code
Aprire questo repository in Claude Code e chiedere **solo un audit** (nessuna modifica): framework, routing, dati hardcoded, config Netlify, stato Admin, rischi di sicurezza; poi gap analysis contro il blueprint. Dettagli in `CLAUDE.md`.
