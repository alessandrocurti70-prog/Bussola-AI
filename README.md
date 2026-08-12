# Come funziona il sito Bussola AI

Questo sito è **auto-generato**: non si scrivono pagine HTML a mano. C'è **un solo modello** e gli articoli sono **contenuti** separati. Aggiungere un articolo = aggiungere un file, non toccare il codice. È pensato per essere gestito facilmente anche dagli **agenti AI**.

## Struttura

```
Sito/
├─ contenuti/
│   └─ articoli/        → un file .md per ogni articolo (il CONTENUTO)
├─ build.js             → il generatore (il MOTORE)
├─ style.css            → il design
├─ index.html           ┐
├─ archivio.html        │ generati da build.js — NON modificare a mano
├─ articolo-*.html      ┘
├─ formazioni.html      → pagina statica (per ora)
└─ dashboard.html       → area riservata (mock)
```

## Aggiungere un articolo (in 2 passi)

1. Crea un file in `contenuti/articoli/`, es. `nuovo-articolo.md`, con questa intestazione (front-matter) + il testo:

```markdown
---
titolo: Il titolo dell'articolo
slug: nuovo-articolo
data: 2026-08-15
categoria: Novità
cat: novita
copertina: 03_yacht-schermo.png
minuti: 4
estratto: Una frase breve che appare nelle anteprime.
lead: La frase introduttiva in corsivo in cima all'articolo.
---
Qui il testo. Usa ## per i sottotitoli, - per gli elenchi,
**grassetto** e *corsivo*. Lascia una riga vuota tra i paragrafi.
```

2. Lancia il generatore: `node build.js`
   → il sito si rigenera da solo (home, archivio, pagina articolo, link, filtri).

La `copertina` è un nome file dentro `../Immagini/Riferimenti/` (o `../Immagini/Copertine/` quando avrai le copertine dedicate — in quel caso aggiorna il percorso in `build.js`).

## Per gli agenti AI

Per pubblicare un articolo: (1) genera testo + metadati, (2) scrivi UN file `.md` in `contenuti/articoli/` col front-matter sopra, (3) esegui `node build.js`. Non serve toccare l'HTML. Le regole di brand (voce in prima persona, stile immagini, ecc.) sono in `00_Sistema/`.

## Prossimi passi (quando andiamo online)

- Mettere il sito su **Netlify** (build automatico: esegue `node build.js` a ogni modifica).
- Collegare un **pannello di scrittura** (Decap CMS) per pubblicare dal web senza codice.
- Rendere anche **formazioni** e le **pagine** dei contenuti (come gli articoli).
- Collegare **Kit** per iscritti e newsletter, e la **dashboard** completa.
