# Bussola AI — Regole per Claude Code

> File breve, prescrittivo e sempre aggiornato. Il documento completo è in `docs/`.
> Prima di qualsiasi modifica architetturale, leggi `docs/Bussola_AI_Blueprint_Operativo_v2.1.docx` e `docs/architecture.md`.

## Cos'è il progetto
Bussola AI è un blog + newsletter settimanale sull'intelligenza artificiale, spiegata semplice, per il mercato ticinese (Svizzera italiana). Angolo: **semplicità + formazione**. Volto del brand: **Alessandro** (avatar illustrato). Tre sezioni pubbliche — Home, Archivio, Formazioni — più un'area privata (Admin Centre).

Il proprietario (Ale) **non è tecnico**: spiega ogni scelta in modo semplice, procedi a piccoli passi e non dare nulla per scontato.

## Stack di destinazione
- **GitHub** = source of truth (repository ufficiale, commit, branch, rollback).
- **Netlify** = deploy (Deploy Preview + produzione).
- **Supabase** = backend (Database PostgreSQL, Auth, MFA, RLS, Storage, Edge Functions).
- **OpenAI API** (Responses API) = Assistente Editoriale AI, solo lato server.
- Stato attuale: sito statico generato da `build.js` (Node, zero dipendenze) da `contenuti/articoli/*.md`. **Non riscrivere da zero**: si evolve questo verso lo stack di destinazione.

## Regole non negoziabili
- Non riscrivere il progetto da zero. Conserva il lavoro esistente.
- Mantieni il design pubblico attuale salvo richiesta esplicita. La grafica si rifinisce **dopo** l'infrastruttura.
- GitHub è la source of truth. Netlify è il deployment target. Supabase è il backend target.
- **Nessun segreto / API key nel frontend o nel repository.** Solo variabili d'ambiente lato server. La `service_role` di Supabase e la `OPENAI_API_KEY` non devono mai comparire nel bundle browser, in DevTools o in Git.
- Ogni modifica al DB deve avere una **migrazione versionata** in `supabase/migrations/`.
- Prima di modifiche strutturali: **piano breve + elenco dei file coinvolti**, poi implementazione.
- Dopo ogni task: test, build pulita, riepilogo delle modifiche e dei rischi.
- **Publish / newsletter / delete** richiedono controlli e conferme esplicite (human-in-the-loop). L'AI non pubblica né invia autonomamente.
- Un articolo programmato non deve essere pubblico né in sitemap prima dell'orario. La newsletter parte **solo dopo** che l'articolo è live (live check → send), con idempotency key per evitare doppi invii.
- RLS attiva su ogni tabella: un anonimo o un utente non-admin non deve poter leggere/scrivere dati riservati, nemmeno chiamando l'API direttamente.
- Niente self-signup: esiste un solo account admin, con MFA TOTP obbligatoria per le azioni sensibili.

## Ciclo di lavoro per ogni task
1. Task piccolo e ben definito (una sola capacità). 2. Branch dedicato. 3. Analizza i file coinvolti. 4. Piano minimo. 5. Implementa. 6. Test automatici + locale. 7. Verifica build. 8. Commit. 9. Push. 10. Deploy Preview Netlify. 11. Test funzionale/sicurezza. 12. Merge su main. 13. Deploy produzione. 14. Verifica post-deploy.

Non chiedere mai "costruisci tutto il backend" o "implementa tutto il blueprint": scomponi ogni milestone in task piccoli, testabili e reversibili.

## Base di conoscenza (versionata in `knowledge/`)
- `brand_system.md` — strategia, voce, posizionamento, funnel.
- `design_system.md` — colori, font, layout, regole visive del sito.
- `image_design_system.md` — protagonista Alessandro, stile immagini, prompt.
- `editorial_system.md` — format dei contenuti, categorie, workflow editoriale.
- `newsletter_system.md` — struttura uscita, opt-in, invio, unsubscribe.
- `seo_guidelines.md` — SEO tecnica, structured data, sitemap.
- `assistant_instructions.md` — istruzioni dell'Assistente Editoriale AI.

Mantieni `knowledge/` allineata: se cambia una regola, aggiorna il file e cita la fonte.

## Sicurezza e qualità (checklist minima)
- `.env.example` senza valori segreti; ogni nuova env var va documentata lì.
- Migrazioni Supabase versionate e riproducibili.
- Deploy Preview per modifiche importanti; mai modificare la produzione in modo non replicabile dal repo.
- Prima di task ad alto rischio: crea un punto di rollback/commit stabile.
- I log non devono contenere password, token o API key.

## Primo task consigliato: SOLO AUDIT
Analizza questa codebase **senza apportare modifiche**. Identifica framework, routing, componenti, dipendenze, dati hardcoded, configurazione Netlify, stato dell'Admin Centre, gestione dei contenuti e rischi di sicurezza. Confronta lo stato attuale con il Blueprint (`docs/`) e produci una **gap analysis** con una migrazione incrementale per task indipendenti. Non implementare ancora nulla.
