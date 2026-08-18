-- Migrazione: crea la tabella "articles" (articoli del blog) con protezioni RLS.
-- Fase 3, Passo 1 — prima tabella dati del progetto Bussola AI.
--
-- Regole di sicurezza (RLS):
--   * Pubblico (sito): legge SOLO gli articoli "pubblicato" e non nel futuro.
--   * Admin (autenticato con verifica a due fattori, aal2): gestisce tutto.
-- Così una password rubata SENZA il secondo fattore non può leggere le bozze
-- né scrivere/cancellare (le regole richiedono aal2 per ogni operazione admin).

-- 1) Tabella --------------------------------------------------------------
create table if not exists public.articles (
  id                uuid primary key default gen_random_uuid(),

  -- Identità / indirizzo
  slug              text not null unique,

  -- Contenuto
  titolo            text not null,
  occhiello         text,          -- kicker (opzionale)
  lead              text,          -- frase di apertura
  estratto          text,          -- testo per le anteprime/card
  corpo             text,          -- corpo dell'articolo in markdown

  -- Categoria (per ora come testo, come il sito attuale)
  categoria         text,          -- etichetta visibile (es. "Per iniziare")
  cat               text,          -- slug per filtri/colore (es. "iniziare")

  -- Media
  copertina         text,          -- percorso/URL dell'immagine di copertina

  -- Lettura
  minuti            integer default 4,

  -- SEO
  seo_title         text,
  seo_description   text,
  canonical_url     text,

  -- Workflow editoriale (e "pronto per gli agenti AI")
  stato             text not null default 'bozza',
  numero_editoriale integer,       -- assegnato alla pubblicazione
  scheduled_at      timestamptz,   -- quando pubblicare (se programmato)
  published_at      timestamptz,   -- quando e' diventato pubblico

  -- Origine (umano/AI) e audit
  fonte             text not null default 'umano',   -- 'umano' | 'ai'
  created_by        uuid default auth.uid() references auth.users(id) on delete set null,

  -- Timestamp
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint articles_stato_check
    check (stato in ('idea','bozza','proposta','programmato','pubblicato')),
  constraint articles_fonte_check
    check (fonte in ('umano','ai'))
);

comment on table public.articles is
  'Articoli del blog Bussola AI. RLS: pubblico legge solo i pubblicati; admin (aal2) gestisce tutto.';

-- 2) Indice per le query pubbliche (lista dei pubblicati, piu' recenti prima)
create index if not exists articles_pubblicati_idx
  on public.articles (stato, published_at desc);

-- 3) Aggiorna automaticamente updated_at a ogni modifica ------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- 4) Row Level Security ---------------------------------------------------
alter table public.articles enable row level security;

-- 4a) Lettura pubblica: solo articoli pubblicati e non nel futuro
create policy "pubblico_legge_pubblicati"
  on public.articles for select
  to anon, authenticated
  using (
    stato = 'pubblicato'
    and published_at is not null
    and published_at <= now()
  );

-- 4b) Admin (aal2): legge tutto, incluse le bozze
create policy "admin_legge_tutto"
  on public.articles for select
  to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2');

-- 4c) Admin (aal2): inserimento
create policy "admin_inserisce"
  on public.articles for insert
  to authenticated
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- 4d) Admin (aal2): modifica
create policy "admin_modifica"
  on public.articles for update
  to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- 4e) Admin (aal2): eliminazione
create policy "admin_elimina"
  on public.articles for delete
  to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2');
