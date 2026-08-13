# Bussola AI — Sistema newsletter

## Principio
Un articolo pubblicato (live) genera **una** newsletter, senza doppi invii. La sequenza è sempre: articolo live → live check → send.

## Iscrizione (opt-in)
- Form di iscrizione su Home e in fondo agli articoli.
- **Doppio opt-in** (conferma via email) consigliato per qualità lista e conformità.
- Registrare **consenso e stato** di ogni contatto (data, sorgente).
- Unsubscribe sempre disponibile in ogni email.

## Invio
- Provider email (ESP) da scegliere e configurare (decisione aperta, vedi `docs/decisions.md`).
- Template email coerente col brand (vedi `design_system.md`): serif, bianco, accento blu.
- Trigger **post-live**: la newsletter parte solo dopo che l'articolo è online.
- Affidabilità: **outbox pattern** + **idempotency key** + `sent_at`. Una modifica successiva all'articolo non riparte come nuovo invio.

## Gestione contatti
- Webhook dal provider per sincronizzare bounce e unsubscribe.
- Retention definita per contatti non più attivi.
- Nessuna lista email esportabile senza necessità e senza audit.

## Conformità
Consenso e stato tracciati; unsubscribe con un clic; privacy/cookie che documentano gli strumenti realmente attivi (LPD/FADP Svizzera + GDPR). Vedi `seo_guidelines.md` per la parte tecnica e le pagine legali.
