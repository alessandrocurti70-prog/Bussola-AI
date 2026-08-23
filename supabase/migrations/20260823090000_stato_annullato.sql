-- Migrazione: nuovo stato "annullato" (articoli tolti dalla programmazione).
-- Fase 3+ — "parcheggio manuale".
-- ------------------------------------------------------------------------------
-- Quando l'admin toglie un articolo dalla programmazione, NON torna in bozza:
-- resta "da recuperare" (mostrato in rosso nel cruscotto), da cui potrà essere
-- RIPROGRAMMATO o ELIMINATO. Conserva scheduled_at come memoria della data che
-- era stata scelta.
--
-- Sicurezza / effetti:
--   * L'auto-pubblicazione (pg_cron, vedi 20260821090000) tocca SOLO gli articoli
--     'programmato': gli 'annullato' non vengono mai pubblicati da soli.
--   * La lettura pubblica (RLS) mostra solo i 'pubblicato': gli 'annullato'
--     restano privati (visibili solo all'admin aal2).
--   * Nessuna perdita di dati: il nuovo vincolo è un sovrainsieme del precedente
--     (tutte le righe esistenti restano valide).

alter table public.articles drop constraint if exists articles_stato_check;

alter table public.articles
  add constraint articles_stato_check
  check (stato in ('idea','bozza','proposta','programmato','pubblicato','annullato'));
