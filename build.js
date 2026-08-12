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

function mdToHtml(body) {
  const blocks = body.trim().split(/\n\s*\n/);
  return blocks.map(b => {
    const lines = b.split('\n');
    if (lines[0].startsWith('## ')) return `<h2>${inline(lines[0].slice(3).trim())}</h2>`;
    if (lines.every(l => l.startsWith('- '))) {
      return '<ul>' + lines.map(l => `<li>${inline(l.slice(2).trim())}</li>`).join('') + '</ul>';
    }
    return `<p>${inline(lines.join(' ').trim())}</p>`;
  }).join('\n      ');
}

// ---------- pezzi comuni (definiti UNA volta) ----------
const LOGO = 'immagini/Elementi/logo-bussola.png';
const IMG = 'immagini/';

function nav(active) {
  const link = (href, label) => `<a href="${href}"${active === href ? ' class="active"' : ''}>${label}</a>`;
  return `<header class="nav">
  <div class="wrap nav-in">
    <a class="brand" href="index.html"><img class="rose" src="${LOGO}" alt="Bussola AI"> Bussola AI</a>
    <nav class="nav-links">
      ${link('index.html', 'Home')}
      ${link('archivio.html', 'Archivio')}
      ${link('formazioni.html', 'Formazioni')}
    </nav>
    <a class="nav-lock" href="dashboard.html" title="Area riservata">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
      Area riservata
    </a>
  </div>
</header>`;
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
  return `        <article class="card" data-cat="${a.cat}" data-title="${(a.titolo + ' ' + a.categoria).toLowerCase()}">
          <a href="${href}"><div class="card-cover"><img src="${IMG}${a.copertina}" alt=""></div></a>
          <div class="card-body"><div class="card-meta"><span class="tag">${a.categoria}</span><span>${dateIt(a.data)}</span></div><h3><a href="${href}">${a.titolo}</a></h3><p>${a.estratto}</p></div>
        </article>`;
}

// ---------- pagine ----------
function articlePage(a) {
  return `${head(a.titolo + ' — Bussola AI', a.estratto)}

${nav('')}

<main>
  <article class="article read">
    <a class="back" href="archivio.html">← Torna all'archivio</a>
    <div class="article-meta"><span class="tag">${a.categoria}</span><span>${dateIt(a.data)} · ${a.minuti} min di lettura</span></div>
    <h1>${a.titolo}</h1>
    <p class="lead">${a.lead}</p>
    <div class="article-cover"><img src="${IMG}${a.copertina}" alt="${a.titolo}"></div>
    <div class="article-body">
      ${a.bodyHtml}
    </div>
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

${FOOTER}
</body>
</html>`;
}

function homePage(arts) {
  const latest = arts.slice(0, 3).map(card).join('\n\n');
  return `${head("Bussola AI — La tua direzione nell'intelligenza artificiale", "La tua dose settimanale di AI, spiegata semplice, per capire e usare l'intelligenza artificiale nel tuo lavoro.")}

${nav('index.html')}

<main>
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <span class="kicker">Newsletter settimanale · Ticino</span>
        <h1>La tua direzione nell'intelligenza artificiale</h1>
        <p class="lead">Ogni settimana prendo il caos dell'AI e ti do la rotta: cosa conta davvero e come usarlo, spiegato semplice. Partiamo da zero, insieme.</p>
        <form class="subscribe" onsubmit="return false">
          <input type="email" placeholder="La tua email" aria-label="La tua email">
          <button type="submit">Iscriviti</button>
        </form>
        <p class="subnote">Gratis, una email a settimana. Niente spam, disiscrizione con un clic.</p>
      </div>
      <div class="hero-figure">
        <img src="${IMG}Riferimenti/01_ritratto-faro.png" alt="Alessandro con la bussola verso il faro">
      </div>
    </div>
  </section>

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

// ---------- esecuzione ----------
const files = fs.readdirSync(ART_DIR).filter(f => f.endsWith('.md'));
const arts = files.map(f => {
  const { meta, body } = parseFrontMatter(fs.readFileSync(path.join(ART_DIR, f), 'utf8'));
  meta.slug = meta.slug || f.replace(/\.md$/, '');
  meta.minuti = meta.minuti || '4';
  meta.bodyHtml = mdToHtml(body);
  return meta;
}).sort((a, b) => (a.data < b.data ? 1 : -1));

arts.forEach(a => fs.writeFileSync(path.join(DIR, `articolo-${a.slug}.html`), articlePage(a)));
fs.writeFileSync(path.join(DIR, 'index.html'), homePage(arts));
fs.writeFileSync(path.join(DIR, 'archivio.html'), archivioPage(arts));

console.log(`Generati: ${arts.length} articoli + index.html + archivio.html`);
arts.forEach(a => console.log('  - articolo-' + a.slug + '.html  (' + a.titolo + ')'));
