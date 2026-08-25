# PROJECT_MAP — mappa di navigazione del progetto

> Scopo: **risparmiare token**. All'inizio di ogni sessione Claude legge SOLO questo file,
> poi apre i file veri **solo alle righe che servono** (Read con offset/limit, o Grep sull'ancora).
> Non serve rileggere per intero `build.js`, `style.css`, `dashboard.html`, `admin-articoli.js`.
>
> **Regola d'oro:** trova qui *dove* sta la cosa → apri con Grep sull'ancora (nome funzione o
> selettore CSS) → modifica solo quel pezzo. Le ancore (nomi) sono stabili anche se le righe si spostano.

---

## 1. A cosa serve ogni file (in root)

| File | Cosa fa | Quando aprirlo |
|------|---------|----------------|
| `build.js` | Generatore statico (Node, **zero dipendenze**). Legge gli articoli da Supabase e scrive `dist/`. | Modifiche a home, archivio, pagine articolo, footer, newsletter, nav, sitemap |
| `style.css` | **Tutto** il CSS pubblico del sito. | Qualsiasi modifica grafica |
| `formazioni.html` | Pagina Formazioni (**statica**, non generata). | Modifiche alla pagina Formazioni |
| `dashboard.html` | Admin Centre (**statica, GRANDE ~28KB**). | SOLO se si lavora sull'area admin |
| `admin-articoli.js` | Logica CMS articoli (**GRANDE ~37KB**): calendario, editor, numerazione, parcheggio. | SOLO se si lavora sul CMS articoli |
| `login.html` | Login admin (Supabase Auth + MFA). | SOLO area admin/login |
| `supabase-client.js` | Init client Supabase lato browser (piccolo). | Raro |
| `404.html`, `robots.txt` | Pagina 404, robots. | Raro |
| `_headers` | **Security headers + CSP** (Cloudflare). `img-src 'self' data:`, `script-src` include `cdn.jsdelivr.net`. | Se aggiungo risorse esterne o header |
| `_redirects` | Redirect Cloudflare (es. `.html` → URL puliti). | Raro |
| `.env.example` | Elenco variabili d'ambiente (senza segreti). | Nuove env var |
| `package.json` | Nessuna dipendenza (build zero-deps). | Raro |

**Cartelle:** `immagini/` (asset, copiati in dist), `knowledge/` (brand/design/editorial system),
`docs/` (blueprint + architecture + `legacy/`), `supabase/migrations/` (migrazioni DB versionate),
`contenuti/` (vecchi .md, non più fonte: gli articoli ora vengono da Supabase), `dist/` (**output generato, non modificare a mano**).

**Host:** Cloudflare Pages — build `node build.js`, output `dist`. Deploy: Ale fa Push/merge con GitHub Desktop.

---

## 2. `build.js` — dove sta cosa (apri con Grep sul nome funzione)

**Costanti / config:** `SITE` · `LOGO` · `IMG` · `AUTHOR` · `AUTHOR_LINKEDIN` (in `authorHtml`)
**Componenti condivisi (HTML riusato in più pagine):**
- `curveTop(fill, dir)` — divisori curvi SVG (`dir` `'up'`/`'down'`). Le curve della home vanno **alternate**. `curveBottom(fill)` = curva sul bordo inferiore di una sezione.
- `bridgeSections()` — le due sezioni home tra Hero e Ultime uscite: `.value` (bianca, "Una bussola nel mondo dell'AI" + 4 blocchi coordinate 01-04) e `.bridge` (blu, "Capire… Imparare a usarla fa la differenza" + CTA formazioni). Contiene anche lo script `reveal` (IntersectionObserver).
- `nav(active)` — navbar flottante (pillola `.snav`). Link Home/Archivio/Formazioni + CTA Iscriviti.
- `FOOTER` — footer completo (grid). In home diventa **blu** via `.replace(... 'footer footer-blue' + curveTop)`.
- `newsletterSection(mode, blue)` — sezione newsletter riusabile. `mode`: `'home'` (slide + curva) / `'bottom'` (compatta). `blue=true` → variante blu full-bleed (usata in **fondo archivio**).
- `head(title, desc)` — `<head>` + apertura `<body>` (link a `style.css`).
- `card(a)` — scheda articolo per le griglie.
- `authorHtml()` — nome autore (link se `AUTHOR_LINKEDIN` valorizzato — **ora vuoto**).

**Pagine (funzioni che restituiscono l'HTML intero):**
- `homePage(arts)` — home: hero → `.articoli` (Ultime uscite, bianca) → `.formazioni-home` (blu) → `newsletterSection('home')` (bianca) → footer blu.
- `archivioPage(arts)` — archivio: page-head + searchbar + griglia + `newsletterSection('bottom', true)` (blu, **fuori dal `<main>`**).
- `articlePage(a)` — pagina singolo articolo + `newsletterSection('bottom')` (bianca).
- `sitemapXml(arts)` — sitemap.

**Markdown → HTML corpo articolo:** `parseFrontMatter` · `inline` · `escapeText` · `renderBox` · `mdToHtml` (box editoriali `::esempio/::nota/::prompt`…).
**Helper:** `num2(n)` (#04) · `dateIt(iso)` · `coverSrc(a)` (copertina locale o URL).
**Dati:** `fetchArticoli()` — fetch REST a Supabase (solo articoli pubblicati).
**Orchestrazione:** IIFE finale — svuota/crea `dist/`, scrive le pagine, copia i file statici (`PUBLIC_FILES`) e `immagini/`.

---

## 3. `style.css` — dove sta cosa (apri con Grep sul selettore)

⚠️ **File a due strati.** Righe ~1–222 = base grafica originale; dalla ~223 = **"FASE GRAFICA" (home redesign)** che **sovrascrive** la base. In caso di conflitto **vince la regola più in basso**. Quando modifichi la home cerca sempre prima nel blocco basso.

**Design tokens (colori/font):** `:root` — `--blue` `--blue-deep` `--gold` `--ink` `--muted` `--hint` `--line` `--tint` `--wrap` + serif/sans.
**Navbar flottante:** `.snav-wrap` · `.snav`
**Hero:** `.hhero{` · `.hhero h1{` (titolo) · `.hhero h1 .hadj` (parole colorate) · `.hhero-curve` · `.hhero-stars` · `.hcompass`
**Titoli con parole colorate oro/blu:** `.tint-grad`
**Header blu Archivio/Formazioni:** `.page-head`
**Sezioni ponte home (Value bianca + Formazione blu):** `.value` · `.coord` (griglia 2×2 con mirino a coordinate) · `.coord-item`/`.coord-ic`/`.coord-n` · `.bridge` · `.bridge-cta` · `.sec-ornament` · `.alt-curve-b` · animazioni `.reveal`/`.reveal-on`. Sfondi: `bg-value.jpg` (bianca) · `bg-ponte.jpg` (blu montagna/rotta).
**Ultime uscite (home, bianca):** `.articoli{` · `.articoli .card` (bordino blu) · `.articoli h2`
**Formazioni home (blu, stelle animate):** `.formazioni-home` · `.formazioni-home::after` (stelle) · `.form3 .course`
**Newsletter (riusabile):** `.newsletter{` · `.nl-slide` · `.nl-compact` · `.nl-blue` (variante blu archivio) · `.nl-fx` · `.nl-form`
**Barra di ricerca unificata:** `.searchbar` · `.search-btn`
**Footer:** `.footer{` (bianco, attivo alla riga ~441) · `.footer-blue` (variante blu solo home)
**Schede articolo (griglie):** `.card{`
**Etichette/tag CMS:** `.lab` · `.tg`
**Box editoriali (corpo articolo):** cerca `Box editoriali`
**Animazioni:** `@keyframes twinkle` · `glowBreath` · `starDrift` (+ guard `prefers-reduced-motion`)
**Responsive:** `@media` (mobile: molti `white-space:normal`, griglie a 1 colonna)

---

## 4. Curve della home — regola (decisa da Ale)

**Solo la PRIMA e l'ULTIMA linea sono curve; tutte le altre sono dritte (bordo piatto tra i colori).**
1. hero → contenuto: `.hhero-curve` (bianca) — **curva, non toccare**
2. ultima, newsletter → footer: `curveTop('#0a1426','down')` nel footer blu (`homePage`) — **curva, non toccare**
Tutti i divisori intermedi (value→bridge, bridge→articoli, articoli→formazioni, formazioni→newsletter) sono **dritti**. `curveBottom` e `.alt-curve-b` restano definiti ma inutilizzati.

---

## 5. Come testare la build (senza Node nel PATH)

```bash
"/c/Program Files/nodejs/node.exe" build.js
```
Genera `dist/`. Verifico i risultati con Grep su `dist/index.html`, `dist/archivio.html`, ecc.
Ale poi fa **Push/merge con GitHub Desktop** → Cloudflare pubblica.

---

## 6. Debiti tecnici noti (da sistemare quando tocca quella zona)

- `style.css` a due strati con regole duplicate (es. `.footer`, hero): un giorno consolidare.
- `SITE` in `build.js` ha ancora fallback `bussolaai.netlify.app` (Cloudflare passa `CF_PAGES_URL`, quindi in produzione è corretto — ma il default è vecchio).
- `AUTHOR_LINKEDIN` vuoto (nome autore non linkato). URL LinkedIn da chiedere ad Ale.
- Footer: link Privacy/Cookie/Impressum sono segnaposto (pagine non esistono).
- Newsletter: form solo visivo (backend in una fase successiva).
- Formazioni: 3 corsi **hardcoded** (CMS Formazioni = Fase 4).
