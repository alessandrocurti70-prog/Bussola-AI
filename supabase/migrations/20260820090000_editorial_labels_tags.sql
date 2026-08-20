-- Migrazione: modello editoriale a due livelli (Etichetta + Tag) + campi articolo.
-- Fase 3, Blocco A (A1+A2+A3). Basata sulla specifica editoriale adottata.
-- RLS coerente col resto: pubblico legge, admin con verifica a due fattori (aal2) gestisce.

-- ===== A1) ETICHETTE (tabella categories) =====================================
-- Aggiunge is_active (per attivare/disattivare dal cruscotto) e imposta le 5
-- etichette ufficiali coi loro colori (sostituiscono quelle di esempio).
alter table public.categories
  add column if not exists is_active boolean not null default true;

delete from public.categories where slug in ('funzione', 'esempio-pratico', 'news');

insert into public.categories (slug, nome, colore, ordine, is_active) values
  ('strumenti',   'STRUMENTI',   '#6C63FF', 1, true),
  ('metodo',      'METODO',      '#0B3D91', 2, true),
  ('novita',      'NOVITÀ',      '#E0A93B', 3, true),
  ('casi-uso',    'CASI D''USO', '#20A77A', 4, true),
  ('riflessioni', 'RIFLESSIONI', '#E56B6F', 5, true)
on conflict (slug) do update
  set nome = excluded.nome, colore = excluded.colore, ordine = excluded.ordine, is_active = true;

-- ===== A2) TAG tematici (nuova tabella + relazione molti-a-molti) =============
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

comment on table public.tags is 'Tag tematici degli articoli (argomenti). Lettura pubblica; gestione admin (aal2).';

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

alter table public.tags enable row level security;

create policy "pubblico_legge_tag"
  on public.tags for select to anon, authenticated using (true);
create policy "admin_inserisce_tag"
  on public.tags for insert to authenticated with check ((auth.jwt() ->> 'aal') = 'aal2');
create policy "admin_modifica_tag"
  on public.tags for update to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2') with check ((auth.jwt() ->> 'aal') = 'aal2');
create policy "admin_elimina_tag"
  on public.tags for delete to authenticated using ((auth.jwt() ->> 'aal') = 'aal2');

-- Collegamento articoli <-> tag (un articolo può avere più tag)
create table if not exists public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id     uuid not null references public.tags(id)     on delete cascade,
  primary key (article_id, tag_id)
);

alter table public.article_tags enable row level security;

-- Pubblico: vede i tag SOLO degli articoli pubblicati e non nel futuro.
create policy "pubblico_legge_article_tags"
  on public.article_tags for select to anon, authenticated
  using (exists (
    select 1 from public.articles a
    where a.id = article_id
      and a.stato = 'pubblicato'
      and a.published_at is not null
      and a.published_at <= now()
  ));
-- Admin (aal2): gestione completa dei collegamenti.
create policy "admin_legge_article_tags"
  on public.article_tags for select to authenticated using ((auth.jwt() ->> 'aal') = 'aal2');
create policy "admin_inserisce_article_tags"
  on public.article_tags for insert to authenticated with check ((auth.jwt() ->> 'aal') = 'aal2');
create policy "admin_elimina_article_tags"
  on public.article_tags for delete to authenticated using ((auth.jwt() ->> 'aal') = 'aal2');

-- ===== A3) Campi aggiuntivi su ARTICLES ======================================
-- category_id = l'unica Etichetta (obbligatoria alla pubblicazione, gestita dall'app).
-- copertina_alt = testo alternativo dell'immagine. parole = conteggio per i minuti.
alter table public.articles
  add column if not exists category_id   uuid references public.categories(id) on delete set null,
  add column if not exists copertina_alt text,
  add column if not exists parole        integer;
