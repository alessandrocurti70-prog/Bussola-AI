/*
  Bussola AI — Generatore del sito
  --------------------------------------------------
  Legge i contenuti da /contenuti/articoli/*.md e genera:
    - index.html (home con le ultime uscite)
    - archivio.html (tutte le uscite, con filtri)
    - articolo-<slug>.html (una pagina per articolo, da UN solo modello)
  Uso:  node build.js
  Aggiungere un articolo = aggiungere un file .md in /contenuti/articoli/ e rilanciare.
*/
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const ART_DIR = path.join(DIR, 'contenuti', 'articoli');
// URL pubblico canonico del sito. Su Netlify arriva da process.env.URL;
// in locale usa il fallback. Serve per generare la sitemap con link assoluti.
const SITE = (process.env.SITE_URL || process.env.URL || process.env.CF_PAGES_URL || 'https://bussolaai.netlify.app').replace(/\/$/, '');

// Backend Supabase — chiave PUBBLICA: grazie alle regole RLS, legge SOLO gli
// articoli pubblicati. Il sito resta statico (SSG) ma i contenuti vengono dal DB.
const SUPABASE_URL = 'https://jfygkymkzkvzknzfsnfv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CtNKSg_12cJlbh0X1um-MQ_vZygjHhd';

// ---------- utilità ----------
function parseFrontMatter(raw) {
  const meta = {};
  let body = raw;
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    const fm = raw.slice(3, end).trim();
    body = raw.slice(end + 4).replace(/^\s+/, '');
    fm.split('\n').forEach(line => {
      const i = line.indexOf(':');
      if (i > -1) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  }
  return { meta, body };
}

function inline(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function escapeText(t) { return (t || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

// Box editoriali. Nel testo si scrivono così (una riga vuota prima e dopo):
//   ::pratica  Questo è un box "In pratica".
//   ::nota  Un richiamo.   ::attenzione  Un avviso.   ::esempio  Un esempio.
//   ::citazione  Una frase in evidenza.
//   ::prompt  Testo del prompt da copiare (può andare a capo).
const BOX_LABEL = { esempio: 'Esempio', pratica: 'In pratica', nota: 'Nota', attenzione: 'Attenzione', ricorda: 'Da ricordare' };
function renderBox(tipo, text) {
  if (tipo === 'citazione') return `<blockquote class="ed-quote"><p>${inline(text)}</p></blockquote>`;
  if (tipo === 'prompt') return `<div class="ed-prompt"><div class="ed-prompt-h"><span>Prompt da copiare</span><button class="ed-copy" type="button">Copia</button></div><pre>${escapeText(text)}</pre></div>`;
  return `<div class="ed-box ed-${tipo}"><div class="ed-box-h">${BOX_LABEL[tipo] || tipo}</div><p>${inline(text)}</p></div>`;
}

const BOXRE = /^::(esempio|pratica|nota|attenzione|ricorda|prompt|citazione)\b\s*(.*)$/i;
// Lettura riga-per-riga (robusta: funziona con o senza righe vuote tra i blocchi).
// Ogni riga di testo = un paragrafo; ## e ### = titoli; - = elenco; ::tipo = box.
function mdToHtml(body) {
  const lines = (body || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let list = [];
  const flushList = () => { if (list.length) { out.push('<ul>' + list.map(li => `<li>${inline(li)}</li>`).join('') + '</ul>'); list = []; } };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) { flushList(); continue; }
    if (/^-{3,}$/.test(t)) { flushList(); out.push('<hr class="ed-hr">'); continue; }
    const boxM = t.match(BOXRE);
    if (boxM) {
      flushList();
      const tipo = boxM[1].toLowerCase();
      const content = [boxM[2]];
      if (tipo === 'prompt') {
        while (i + 1 < lines.length && lines[i + 1].trim() && !/^(##\s|###\s|-\s)/.test(lines[i + 1].trim()) && !BOXRE.test(lines[i + 1].trim())) {
          content.push(lines[i + 1]); i++;
        }
      }
      out.push(renderBox(tipo, content.map(s => s.trim()).filter(Boolean).join(tipo === 'prompt' ? '\n' : ' ')));
      continue;
    }
    if (t.startsWith('### ')) { flushList(); out.push(`<h3>${inline(t.slice(4).trim())}</h3>`); continue; }
    if (t.startsWith('## ')) { flushList(); out.push(`<h2>${inline(t.slice(3).trim())}</h2>`); continue; }
    if (t.startsWith('- ')) { list.push(t.slice(2).trim()); continue; }
    flushList();
    out.push(`<p>${inline(t)}</p>`);
  }
  flushList();
  return out.join('\n      ');
}

// ---------- pezzi comuni (definiti UNA volta) ----------
const LOGO = 'immagini/Elementi/logo-bussola.png';
const IMG = 'immagini/';

// Autore mostrato nelle schede. Il nome diventa un link cliccabile SOLO quando
// qui sotto è presente l'URL del profilo LinkedIn. Finché è vuoto, resta testo.
// ⬇️ INSERISCI QUI l'URL LinkedIn di Alessandro (es. https://www.linkedin.com/in/...)
const AUTHOR = 'Alessandro Curti';
const AUTHOR_LINKEDIN = '';
function authorHtml() {
  return AUTHOR_LINKEDIN
    ? `<a class="by" href="${AUTHOR_LINKEDIN}" target="_blank" rel="noopener noreferrer">${AUTHOR}</a>`
    : `<span class="by">${AUTHOR}</span>`;
}
// Numero editoriale a due cifre: 1 → #01
function num2(n) { return '#' + String(n).padStart(2, '0'); }

function nav(active) {
  const link = (href, label) => `<a href="${href}"${active === href ? ' class="active"' : ''}>${label}</a>`;
  return `<div class="snav-wrap">
  <nav class="snav" aria-label="Principale">
    <a class="hbrand" href="index.html"><img src="${LOGO}" alt=""><span>Bussola AI<small>di Alessandro Curti</small></span></a>
    <div class="hnav-links">
      ${link('index.html', 'Home')}
      ${link('archivio.html', 'Archivio')}
      ${link('formazioni.html', 'Formazioni')}
    </div>
    <a class="hnav-cta" href="index.html#iscriviti">Iscriviti</a>
  </nav>
</div>`;
}

const FOOTER = `<footer class="footer">
  <div class="wrap">
    <span>© 2026 Bussola AI — La tua direzione nell'intelligenza artificiale</span>
    <span>Ticino · Svizzera italiana</span>
  </div>
</footer>`;

function head(title, desc) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="stylesheet" href="style.css">
</head>
<body>`;
}

function dateIt(iso) {
  const m = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const d = new Date(iso);
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

function card(a) {
  const href = `articolo-${a.slug}.html`;
  const badge = a.categoria ? `<span class="lab" style="--c:${a.colore}">${a.categoria}</span>` : '';
  // In anteprima mostriamo al massimo UN tag, per schede più pulite.
  const tag = (a.tags || []).slice(0, 1).map(t => `<span class="tg">${t.name}</span>`).join('');
  const num = a.numero != null ? `${num2(a.numero)} | ` : '';
  const tagsHash = (a.tags || []).map(t => t.slug).join(' ');
  return `        <article class="card" data-cat="${a.cat}" data-title="${(a.titolo + ' ' + a.categoria + ' ' + tagsHash).toLowerCase()}">
          <a class="card-cover-link" href="${href}"><div class="card-cover"><img src="${coverSrc(a)}" alt="${a.copertinaAlt || ''}"></div></a>
          <div class="card-body">
            <div class="card-labels">${badge}${tag}</div>
            <h3><a href="${href}">${num}${a.titolo}</a></h3>
            <p>${a.estratto}</p>
            <div class="card-meta"><span>${a.minuti} min di lettura</span><span class="sep">·</span>${authorHtml()}</div>
          </div>
        </article>`;
}

// ---------- pagine ----------
function articlePage(a) {
  return `${head(a.titolo + ' — Bussola AI', a.estratto)}

${nav('')}

<main>
  <article class="article read">
    <a class="back" href="archivio.html">← Torna all'archivio</a>
    <div class="article-meta"><span class="lab" style="--c:${a.colore}">${a.categoria}</span><span>${a.numero != null ? num2(a.numero) + ' · ' : ''}${a.minuti} min di lettura · ${AUTHOR}</span></div>
    <h1>${a.titolo}</h1>
    <p class="lead">${a.lead}</p>
    <div class="article-cover"><img src="${coverSrc(a)}" alt="${a.copertinaAlt || a.titolo}"></div>
    <div class="article-body">
      ${a.bodyHtml}
    </div>
    ${(a.tags && a.tags.length) ? `<div class="article-tags"><span class="tags-label">Tag:</span>${a.tags.map(t => `<span class="tg">${t.name}</span>`).join('')}</div>` : ''}
    <div class="end-cta">
      <h3>Non perdere la rotta della settimana</h3>
      <p>Ogni settimana una dose di AI spiegata semplice, con una cosa concreta da fare subito.</p>
      <form class="subscribe" onsubmit="return false">
        <input type="email" placeholder="La tua email" aria-label="La tua email">
        <button type="submit">Iscriviti</button>
      </form>
    </div>
  </article>
</main>

<script>
  document.querySelectorAll('.ed-copy').forEach(btn => btn.addEventListener('click', () => {
    const pre = btn.closest('.ed-prompt').querySelector('pre');
    try { navigator.clipboard.writeText(pre.innerText); } catch (e) {}
    const t = btn.textContent; btn.textContent = 'Copiato ✓'; setTimeout(() => (btn.textContent = t), 1500);
  }));
</script>

${FOOTER}
</body>
</html>`;
}

function homePage(arts) {
  const latest = arts.slice(0, 3).map(card).join('\n\n');
  return `${head("Bussola AI — La tua direzione nell'intelligenza artificiale", "La tua dose settimanale di AI, spiegata semplice, per capire e usare l'intelligenza artificiale nel tuo lavoro.")}

<section class="hhero">
  <div class="hhero-stars" aria-hidden="true"></div>
  <div class="hhero-nav">
    <nav class="hnav" aria-label="Principale">
      <a class="hbrand" href="index.html"><img src="${LOGO}" alt=""><span>Bussola AI<small>di Alessandro Curti</small></span></a>
      <div class="hnav-links">
        <a href="index.html" class="active">Home</a>
        <a href="archivio.html">Archivio</a>
        <a href="formazioni.html">Formazioni</a>
      </div>
      <a class="hnav-cta" href="#iscriviti">Iscriviti</a>
    </nav>
  </div>

  <div class="hhero-in">
    <div class="hhero-copy">
      <h1>Diffondo conoscenza AI,<br>in modo <span class="hadj">pratico, chiaro e utile.</span></h1>
      <p class="hlead">Ogni settimana condivido articoli, risorse e percorsi formativi per capire e usare l'intelligenza artificiale — con consapevolezza e orientati al risultato.</p>
    </div>
    <div class="hhero-visual">
      <div class="hcompass">
        <div class="hcompass-glow" aria-hidden="true"></div>
        <img src="${IMG}Elementi/compass-hero.png" alt="Bussola AI — rosa dei venti">
      </div>
    </div>
  </div>

  <div class="hhero-curve" aria-hidden="true">
    <svg viewBox="0 0 1440 70" preserveAspectRatio="none"><path d="M0,70 L0,34 C360,0 1080,0 1440,34 L1440,70 Z" fill="#ffffff"/></svg>
  </div>
</section>

<main>
  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <h2>Ultime uscite</h2>
        <a href="archivio.html">Vedi tutto l'archivio →</a>
      </div>
      <div class="grid">

${latest}

      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="band">
        <div>
          <span class="kicker" style="color:#9fc0f7">Formazioni</span>
          <h2>Non solo notizie: impara a usarla davvero</h2>
          <p>Webinar e corsi, gratuiti e a pagamento, per passare da "confuso" a "capace". Un passo alla volta, insieme.</p>
          <a class="btn-gold" href="formazioni.html">Scopri le formazioni</a>
        </div>
        <div class="hero-figure" style="aspect-ratio:4/3">
          <img src="${IMG}Riferimenti/05_plancia-globo.png" alt="">
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="iscriviti">
    <div class="wrap">
      <div class="end-cta">
        <h3>Non perdere la rotta della settimana</h3>
        <p>Ogni settimana una dose di AI spiegata semplice, con una cosa concreta da fare subito.</p>
        <form class="subscribe" onsubmit="return false">
          <input type="email" placeholder="La tua email" aria-label="La tua email">
          <button type="submit">Iscriviti</button>
        </form>
      </div>
    </div>
  </section>
</main>

${FOOTER}
</body>
</html>`;
}

function archivioPage(arts) {
  const cats = [];
  arts.forEach(a => { if (!cats.find(c => c.cat === a.cat)) cats.push({ cat: a.cat, label: a.categoria }); });
  const chips = ['<button class="chip active" data-f="all">Tutti</button>']
    .concat(cats.map(c => `<button class="chip" data-f="${c.cat}">${c.label}</button>`)).join('\n        ');
  const cards = arts.map(card).join('\n\n');
  return `${head('Archivio — Bussola AI', 'Tutte le uscite settimanali di Bussola AI, filtrabili per tema.')}

${nav('archivio.html')}

<main>
  <section class="section" style="border-top:none;padding-top:44px">
    <div class="wrap">
      <span class="kicker">Archivio</span>
      <h1 style="font-size:40px;margin:8px 0 8px">Tutte le uscite</h1>
      <p class="lead" style="margin-bottom:30px">Sfoglia lo storico delle uscite settimanali. Filtra per tema o cerca un argomento.</p>

      <div class="filters">
        <input type="text" id="search" placeholder="Cerca un argomento…">
        ${chips}
      </div>

      <div class="grid" id="archive">

${cards}

      </div>
      <p id="empty" class="sans" style="display:none;color:var(--hint);padding:20px 0">Nessuna uscita trovata per questa ricerca.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="end-cta" style="margin:0">
        <h3>Non perdere la rotta della settimana</h3>
        <p>Ogni settimana una dose di AI spiegata semplice, con una cosa concreta da fare subito.</p>
        <form class="subscribe" onsubmit="return false">
          <input type="email" placeholder="La tua email" aria-label="La tua email">
          <button type="submit">Iscriviti</button>
        </form>
      </div>
    </div>
  </section>
</main>

${FOOTER}

<script>
  const cards=[...document.querySelectorAll('#archive .card')];
  const chips=[...document.querySelectorAll('.chip')];
  const search=document.getElementById('search');
  const empty=document.getElementById('empty');
  let filter='all';
  function apply(){
    const q=search.value.trim().toLowerCase();
    let shown=0;
    cards.forEach(c=>{
      const okCat=filter==='all'||c.dataset.cat===filter;
      const okQ=!q||c.dataset.title.includes(q);
      const vis=okCat&&okQ; c.style.display=vis?'':'none'; if(vis)shown++;
    });
    empty.style.display=shown?'none':'';
  }
  chips.forEach(ch=>ch.addEventListener('click',()=>{
    chips.forEach(x=>x.classList.remove('active')); ch.classList.add('active');
    filter=ch.dataset.f; apply();
  }));
  search.addEventListener('input',apply);
</script>

</body>
</html>`;
}

// ---------- sitemap (solo URL pubblici; l'area riservata è esclusa) ----------
function sitemapXml(arts) {
  const pages = [
    { loc: SITE + '/', lastmod: arts[0] && arts[0].data },
    { loc: SITE + '/archivio.html', lastmod: arts[0] && arts[0].data },
    { loc: SITE + '/formazioni.html' }
  ];
  arts.forEach(a => pages.push({ loc: `${SITE}/articolo-${a.slug}.html`, lastmod: a.data }));
  const urls = pages.map(p =>
    `  <url><loc>${p.loc}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ---------- lettura articoli dal database (Supabase) ----------
function coverSrc(a) { return a.copertina && /^https?:\/\//.test(a.copertina) ? a.copertina : IMG + a.copertina; }

async function fetchArticoli() {
  const select = 'titolo,slug,lead,estratto,corpo,copertina,copertina_alt,minuti,numero_editoriale,published_at,categories(nome,slug,colore),article_tags(tags(name,slug))';
  const url = `${SUPABASE_URL}/rest/v1/articles?select=${select}&order=published_at.desc`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + (await res.text()));
  const rows = await res.json();
  return rows.map(r => ({
    titolo: r.titolo || '',
    slug: r.slug,
    lead: r.lead || '',
    estratto: r.estratto || '',
    bodyHtml: mdToHtml(r.corpo || ''),
    copertina: r.copertina || '',
    copertinaAlt: r.copertina_alt || '',
    minuti: r.minuti || 4,
    numero: r.numero_editoriale ?? null,
    data: r.published_at,
    categoria: (r.categories && r.categories.nome) || '',
    cat: (r.categories && r.categories.slug) || '',
    colore: (r.categories && r.categories.colore) || '#64748B',
    tags: (r.article_tags || []).map(x => x.tags).filter(Boolean)
  }));
}

// ---------- esecuzione ----------
(async () => {
  const DIST = path.join(DIR, 'dist');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const arts = await fetchArticoli();

  arts.forEach(a => fs.writeFileSync(path.join(DIST, `articolo-${a.slug}.html`), articlePage(a)));
  fs.writeFileSync(path.join(DIST, 'index.html'), homePage(arts));
  fs.writeFileSync(path.join(DIST, 'archivio.html'), archivioPage(arts));
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemapXml(arts));

  // File pubblici scritti a mano → copiati in dist/ (elenco esplicito: SOLO il pubblico).
  const PUBLIC_FILES = ['style.css', 'robots.txt', 'formazioni.html', 'dashboard.html', 'login.html', '404.html', 'supabase-client.js', 'admin-articoli.js', '_headers', '_redirects'];
  PUBLIC_FILES.forEach(f => {
    const src = path.join(DIR, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST, f));
  });
  if (fs.existsSync(path.join(DIR, 'immagini'))) {
    fs.cpSync(path.join(DIR, 'immagini'), path.join(DIST, 'immagini'), { recursive: true });
  }

  console.log(`Generati in dist/ da Supabase: ${arts.length} articoli pubblicati + index + archivio + sitemap`);
  arts.forEach(a => console.log('  - articolo-' + a.slug + '.html  (' + a.titolo + ')'));
})().catch(e => { console.error('BUILD FALLITO:', e.message || e); process.exit(1); });
