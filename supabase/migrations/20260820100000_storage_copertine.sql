-- Migrazione: Storage per le immagini di copertina degli articoli.
-- Fase 3, Blocco A4. Crea un bucket pubblico "copertine" (le copertine sono
-- pubbliche sul sito) e le protezioni: chiunque le può VEDERE, ma solo l'admin
-- con verifica a due fattori (aal2) può CARICARE / modificare / eliminare.

-- Bucket pubblico, max 5 MB, solo immagini.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('copertine', 'copertine', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- Lettura pubblica delle copertine.
create policy "copertine_lettura_pubblica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'copertine');

-- Caricamento: solo admin (aal2).
create policy "copertine_admin_carica"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'copertine' and (auth.jwt() ->> 'aal') = 'aal2');

-- Modifica: solo admin (aal2).
create policy "copertine_admin_modifica"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'copertine' and (auth.jwt() ->> 'aal') = 'aal2')
  with check (bucket_id = 'copertine' and (auth.jwt() ->> 'aal') = 'aal2');

-- Eliminazione: solo admin (aal2).
create policy "copertine_admin_elimina"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'copertine' and (auth.jwt() ->> 'aal') = 'aal2');
