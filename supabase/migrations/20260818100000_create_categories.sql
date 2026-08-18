-- Migrazione: crea la tabella "categories" (etichette/temi degli articoli).
-- Fase 3, Passo 2 — etichette DINAMICHE: Ale crea i temi e i colori dal cruscotto,
-- niente colori scritti nel codice. Ogni tema ha SEMPRE lo stesso codice colore.
--
-- Legame con gli articoli: articles.cat = categories.slug (collegamento morbido).
-- RLS: le etichette sono metadati PUBBLICI (nome + colore) → tutti le leggono;
--      solo l'admin con verifica a due fattori (aal2) le crea/modifica/elimina.

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,               -- es. "news" (usato da articles.cat)
  nome       text not null,                      -- etichetta visibile, es. "News"
  colore     text not null default '#2E7DF6',    -- codice colore HEX (es. #E0A93B)
  icona      text,                               -- chiave icona (opzionale)
  ordine     integer not null default 0,         -- ordine di visualizzazione
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,

  constraint categories_colore_check check (colore ~ '^#[0-9A-Fa-f]{6}$')
);

comment on table public.categories is
  'Etichette/temi degli articoli (nome + colore + icona), gestite dall''admin. Lettura pubblica.';

create index if not exists categories_ordine_idx on public.categories (ordine);

-- Riusa la funzione set_updated_at() creata con la tabella articles.
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.categories enable row level security;

-- Lettura pubblica di tutte le etichette (servono a colorare le schede sul sito)
create policy "pubblico_legge_categorie"
  on public.categories for select
  to anon, authenticated
  using (true);

-- Admin (aal2): inserimento
create policy "admin_inserisce_categorie"
  on public.categories for insert
  to authenticated
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- Admin (aal2): modifica
create policy "admin_modifica_categorie"
  on public.categories for update
  to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- Admin (aal2): eliminazione
create policy "admin_elimina_categorie"
  on public.categories for delete
  to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2');

-- Etichette di esempio (Ale può rinominarle, ricolorarle o eliminarle a piacere)
insert into public.categories (slug, nome, colore, icona, ordine) values
  ('funzione',        'Funzione',        '#2E7DF6', 'lines', 1),
  ('esempio-pratico', 'Esempio pratico', '#0E9F6E', 'bolt',  2),
  ('news',            'News',            '#E0A93B', 'news',  3)
on conflict (slug) do nothing;
