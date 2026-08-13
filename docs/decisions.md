# Bussola AI — Registro delle decisioni

*Le scelte importanti prese, con il perché. Aggiornato: 13 agosto 2026.*

## D1 — Stack indipendente, non piattaforma chiusa
**Decisione:** costruire un sistema proprio (GitHub + Netlify + Supabase) invece di usare Ghost o Substack.
**Perché:** piena autonomia e controllo, costi bassi (free tier), scalabilità, e la possibilità di far lavorare agenti AI sul progetto. Ghost ha un costo; Substack toglie controllo e possibilità di automazione.

## D2 — Contenuti come dati, non file HTML a mano
**Decisione:** un solo modello (template) + contenuti in database; niente più un file HTML per ogni articolo.
**Perché:** gestibile all'infinito, pubblicabile senza toccare codice, adatto agli agenti AI. Stato di partenza: generatore statico `build.js` da `contenuti/articoli/*.md`, che evolverà verso il CMS su Supabase.

## D3 — Adozione del Blueprint Operativo v2.1
**Decisione:** adottare l'architettura del blueprint sviluppato dal partner web (Supabase + Admin Centre custom + OpenAI + sicurezza/SEO completi).
**Perché:** professionale, coerente con l'obiettivo di "infrastruttura forte e scalabile", mantiene GitHub + Netlify già online e non ricostruisce da zero. Data: 13 agosto 2026.

## D4 — Claude Code come strumento di sviluppo principale
**Decisione:** la costruzione tecnica avviene in Claude Code; Cowork resta per regia, documentazione, blueprint e knowledge base.
**Perché:** Claude Code è fatto per lavorare su un vero codice (migrazioni, test, branch, build); Cowork è migliore per analisi e coordinamento. GitHub resta la source of truth.

## D5 — Infrastruttura prima, grafica dopo
**Decisione:** costruire prima backend, sicurezza, CMS, publish engine, newsletter, SEO; la rifinitura grafica ("abbellimento") viene per ultima.
**Perché:** scelta esplicita del proprietario: prima un sistema tecnico solido e scalabile, poi il design.

## D6 — Sequenza di lancio a fasi (0 → 5 per l'MVP)
**Decisione:** seguire la roadmap del blueprint. Prima pubblicazione seria dopo le fasi 0-5 (Baseline/audit, Foundation, Sicurezza Admin, CMS articoli, CMS formazioni, Frontend dinamico). Poi 6-9 (publish engine, newsletter, SEO+legal, hardening), poi AI (10-11).
**Perché:** non aspettare l'intera roadmap per iniziare a pubblicare; un task alla volta, testabile e reversibile.

## Decisioni ancora aperte (da prendere con Claude Code)
- **Framework frontend** per rendering dinamico/SSR-SSG (es. Astro / Next.js / SvelteKit) — da valutare in audit, mantenendo il design attuale.
- **Provider email (ESP)** per la newsletter — scelta e configurazione.
- **Dominio** definitivo (es. bussolaai.ch) — quando attivarlo.
