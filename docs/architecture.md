# Bussola AI — Architettura di destinazione

*Sintesi operativa del Blueprint v2.1. La fonte completa è `Bussola_AI_Blueprint_Operativo_v2.1.docx`.*

## Visione d'insieme
Bussola AI evolve da sito statico a **prodotto editoriale dinamico**: contenuti in database, area amministrativa sicura, pubblicazione affidabile (immediata o programmata), newsletter automatica, SEO tecnica, privacy conforme e un Assistente Editoriale AI con supervisione umana. Il design pubblico esistente si mantiene; l'infrastruttura si costruisce sotto.

## I quattro pilastri
1. **GitHub** — source of truth del codice: commit, branch, cronologia, rollback.
2. **Netlify** — deploy: build da Git, Deploy Preview per le modifiche, produzione.
3. **Supabase** — backend: PostgreSQL, Auth + MFA TOTP, Row Level Security (RLS), Storage per i media, Edge Functions per la logica server-side.
4. **OpenAI (Responses API)** — Assistente Editoriale AI, chiamato solo lato server (mai chiavi nel browser).

## Area pubblica
Home (ultime 3 uscite), Archivio (storico filtrabile), Formazioni (webinar/corsi), pagina articolo, pagine legali (Privacy, Cookie, Impressum). Il pubblico riflette **automaticamente** i dati del CMS. Rendering crawlable (SSG/SSR): niente contenuto solo client-side, altrimenti la SEO non funziona.

## Admin Centre (area privata `/admin`)
CMS custom protetto: CRUD articoli e formazioni, editor, categorie con colori, numerazione editoriale, gestione media, programmazione, stato iscritti/newsletter, statistiche, audit log. Accesso con account unico + MFA TOTP; nessun self-signup.

## Modello dati (indicativo)
Tabelle principali: `articles` (con slug, stato bozza/programmato/pubblicato, numero editoriale, categoria, copertina, SEO, date), `formazioni`, `subscribers` (con consenso e stato), `outbox_events`, `audit_log`. Ogni tabella con **policy RLS** testate per anonimo / autenticato / admin.

## Workflow di pubblicazione
Bozza → (AI può proporre titolo/outline/SEO/newsletter, senza pubblicare) → programmazione `scheduled_at` → all'orario il sistema assegna il numero editoriale, pubblica, aggiorna Home/Archivio → **live check** → invio di **una** newsletter. Affidabilità garantita da **outbox pattern** + **idempotency key** + `sent_at`: una modifica successiva non provoca un secondo invio.

## Newsletter
Provider email (ESP) con template, doppio opt-in, unsubscribe sempre disponibile, webhook per bounce/unsubscribe, trigger post-live. Sincronizzazione stato contatti; retention definita.

## Sicurezza
MFA TOTP obbligatoria per azioni sensibili; RLS su ogni tabella; segreti solo in env server-side; CSP e rate limiting; audit log senza dati sensibili; nessuna chiave di produzione nel frontend o in Git.

## SEO e legale
Sitemap (solo URL pubblici e canonici), canonical URL, Article JSON-LD, Open Graph, Google Search Console; redirect 301 al cambio slug. Admin/preview/draft in noindex. Privacy/cookie conformi a LPD/FADP (Svizzera) + GDPR, che documentano gli strumenti realmente attivi.

## Assistente Editoriale AI
OpenAI Responses API con: istruzioni (`knowledge/assistant_instructions.md`), Knowledge Base (file search / vector store da `knowledge/`), memoria di conversazione, e strumenti sul CMS (`search_articles`, `create_article_draft`, `publish_article` che **richiede conferma**). Human-in-the-loop su ogni azione sensibile. Evoluzione futura (V2): ricerca fonti, pgvector, similarità, link interni, concept immagini.

## Separazione (anti lock-in)
Adapter separati per: AI provider, email provider, storage, publish engine. Così un fornitore si può cambiare senza riscrivere il sistema.

## Riferimenti tecnici ufficiali
OpenAI Responses API, File Search, Function calling, Conversation state · Supabase RLS, MFA TOTP, Edge Functions, pgvector · Netlify Continuous Deployment, Scheduled Functions · Google Search: Article structured data, Sitemap, Canonical URLs. (Link completi nella sezione 18 del blueprint.)
