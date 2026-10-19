-- Richieste di formazione / consulenza inviate dal form pubblico (pagina Formazioni).
-- Chiunque (anche anonimo) può INVIARE una richiesta; solo l'admin autenticato può LEGGERLE.

create table if not exists public.richieste_formazione (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  nome        text not null,
  email       text not null,
  azienda     text,
  messaggio   text not null,
  origine     text default 'sito',
  gestita     boolean not null default false
);

comment on table public.richieste_formazione is 'Lead dal form pubblico Formazioni & Consulenza';

alter table public.richieste_formazione enable row level security;

-- INSERT consentito a tutti (anon + authenticated), con controlli minimi di validità.
drop policy if exists "chiunque puo inviare una richiesta" on public.richieste_formazione;
create policy "chiunque puo inviare una richiesta"
  on public.richieste_formazione
  for insert
  to anon, authenticated
  with check (
    char_length(nome) between 1 and 200
    and char_length(email) between 3 and 320
    and char_length(messaggio) between 1 and 5000
  );

-- SELECT consentito solo all'admin autenticato (unico account; nessun self-signup).
drop policy if exists "solo admin legge le richieste" on public.richieste_formazione;
create policy "solo admin legge le richieste"
  on public.richieste_formazione
  for select
  to authenticated
  using (true);

-- Indice per ordinare le richieste piu recenti in alto nell'Admin Centre.
create index if not exists richieste_formazione_created_at_idx
  on public.richieste_formazione (created_at desc);
