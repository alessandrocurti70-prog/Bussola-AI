-- Migrazione: AUTO-PUBBLICAZIONE degli articoli programmati (Fase 3+, opzione B).
-- ------------------------------------------------------------------------------
-- Un "programmatore" dentro Supabase: ogni minuto controlla se ci sono articoli
-- PROGRAMMATI la cui ora è arrivata, li rende PUBBLICATI e ricostruisce il sito
-- (chiama il Deploy Hook di Cloudflare). Così un articolo esce DA SOLO all'orario.
--
-- La decisione umana resta la PROGRAMMAZIONE: nel cruscotto Ale sceglie l'articolo
-- (già completo: titolo, etichetta, copertina, alt), la data/ora e il numero. Il
-- programmatore esegue soltanto all'orario scelto (human-in-the-loop rispettato).
--
-- Sicurezza: gira come funzione del database (bypassa RLS in modo controllato),
-- non espone segreti nel frontend. Il Deploy Hook è lo stesso già usato dal
-- cruscotto. Per SPEGNERLO: vedi in fondo "PER DISATTIVARE".

-- 1) Estensioni necessarie (già disponibili su Supabase, anche piano Free) -------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Funzione che pubblica i programmati scaduti e triggera il rebuild ----------
create or replace function public.pubblica_programmati()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_pubblicati int;
begin
  with fatti as (
    update public.articles
      set stato = 'pubblicato',
          published_at = coalesce(scheduled_at, now())
      where stato = 'programmato'
        and scheduled_at is not null
        and scheduled_at <= now()
      returning id
  )
  select count(*) into n_pubblicati from fatti;

  -- Solo se qualcosa è diventato pubblico: ricostruisci il sito (una volta).
  if n_pubblicati > 0 then
    perform net.http_post(
      url  := 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/ec443777-12df-4f43-9643-9495f260dec6',
      body := '{}'::jsonb
    );
  end if;
end;
$$;

comment on function public.pubblica_programmati is
  'Pubblica gli articoli programmati la cui ora è arrivata e ricostruisce il sito (Deploy Hook Cloudflare). Eseguita da pg_cron ogni minuto.';

-- 3) Programma il job ogni minuto (rimuove prima un eventuale doppione) ---------
do $$
begin
  perform cron.unschedule('pubblica-programmati');
exception when others then
  null; -- il job non esisteva ancora: va bene
end;
$$;

select cron.schedule(
  'pubblica-programmati',
  '* * * * *',                                   -- ogni minuto
  $$select public.pubblica_programmati()$$
);

-- ------------------------------------------------------------------------------
-- PER DISATTIVARE l'auto-pubblicazione (se un giorno volessi tornare al manuale):
--   select cron.unschedule('pubblica-programmati');
-- Gli articoli resteranno "programmati" finché non li pubblichi con "Pubblica ora".
-- ------------------------------------------------------------------------------
