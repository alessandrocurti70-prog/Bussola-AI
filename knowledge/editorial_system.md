# Bussola AI — Sistema editoriale

## Prodotto centrale
Una **newsletter settimanale** (il cuore del progetto), stesso giorno, stesso formato riconoscibile. Ogni uscita è anche un articolo pubblicato nell'Archivio del sito.

## Struttura consigliata di ogni uscita
- Una notizia/novità AI della settimana spiegata semplice.
- Un'applicazione pratica ("come lo usi tu, oggi").
- Uno strumento o un trucco veloce.
- Un invito soft (a un webinar, a rispondere, a condividere).

**Regola d'oro:** ogni uscita deve lasciare al lettore almeno una cosa che può fare subito. Se non è applicabile, non è Bussola AI.
**Cadenza:** 1 uscita/settimana. Sostenibile e costante batte "tanto ma irregolare".

## Voce
Prima persona (il volto è Alessandro). Semplice, caldo, concreto; ogni parola difficile viene spiegata; frasi corte, esempi reali. Vedi `brand_system.md` per il tono completo.

## Categorie / temi
Categorie in uso (con colore, gestite dal CMS): "Per iniziare", "Automazioni", "Strumenti". Estendibili dall'Admin. Ogni articolo ha una categoria e un colore associato.

## Campi di un articolo (modello di contenuto)
Titolo, slug, data, numero editoriale (assegnato alla pubblicazione), categoria + colore, copertina (immagine 16:9 secondo `image_design_system.md`), minuti di lettura, estratto, lead, corpo (markdown), metadati SEO (title, description, canonical, OG). Stato: bozza / programmato / pubblicato.

## Workflow editoriale
1. Creo una **bozza** dall'Admin.
2. L'Assistente AI può proporre titolo, outline, SEO e testo newsletter — **senza pubblicare** (vedi `assistant_instructions.md`).
3. Programmo per una data futura (`scheduled_at`) o pubblico subito.
4. Prima dell'orario, l'URL non è pubblico né in sitemap.
5. All'orario: il sistema assegna il numero editoriale, pubblica, aggiorna Home e Archivio.
6. Solo dopo la disponibilità live parte **una** newsletter (vedi `newsletter_system.md`).
7. Una modifica successiva non provoca un secondo invio. Evento e invio restano nell'audit log.

## Principi
Semplicità + formazione. Le notizie sono la porta d'ingresso, la formazione è la destinazione. Ogni contenuto serve il funnel: catturare (Home) → nutrire (Archivio/newsletter) → convertire (Formazioni).
