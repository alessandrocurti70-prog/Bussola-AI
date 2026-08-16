/* Client Supabase condiviso (usato da login.html e dashboard.html).
   URL e chiave "publishable" sono PUBBLICI: possono stare nel frontend.
   I dati restano protetti dalle regole RLS lato database.
   ⚠️ NON mettere qui la chiave "secret" / service_role. */
const SUPABASE_URL = 'https://jfygkymkzkvzknzfsnfv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_CtNKSg_12cJlbh0X1um-MQ_vZygjHhd';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
