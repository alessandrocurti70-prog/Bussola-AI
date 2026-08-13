# Bussola AI — Linee guida SEO e legale

## Principio
Il pubblico deve essere **crawlable**: rendering SSG/SSR, mai contenuto solo client-side (una SPA client-only non si indicizza). Verificare sempre l'HTML finale servito.

## Elementi SEO per ogni articolo
- `title` e `description` unici.
- **Canonical URL** univoco.
- **Article JSON-LD** (structured data).
- **Open Graph** per anteprima nella condivisione.
- Redirect **301** al cambio slug (niente link rotti).

## Sitemap e indicizzazione
- Sitemap generata dal CMS, contiene **solo** URL pubblici e canonici.
- Admin, preview e draft: **noindex** e non elencati in sitemap.
- Google Search Console per monitorare l'indicizzazione.

## Pagine legali (necessarie per raccogliere email)
- **Privacy**, **Cookie**, **Impressum**.
- Conformità **LPD/FADP (Svizzera) + GDPR**.
- Le pagine devono documentare gli strumenti **realmente attivi**, non template generici.
- Il form newsletter registra consenso e stato; unsubscribe sempre disponibile.

## Checklist di accettazione SEO/privacy
- Sitemap con soli URL pubblici e canonici.
- Admin/preview/draft in noindex.
- Ogni articolo con title, description, canonical, OG e Article JSON-LD.
- Form newsletter con consenso/stato e unsubscribe.
- Privacy/cookie coerenti con gli strumenti attivi.

## Riferimenti
Google Search: Article structured data, Build and submit a sitemap, Canonical URLs. (Link nella sezione 18 del blueprint.)
