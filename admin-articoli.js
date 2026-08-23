/* Admin — gestione Articoli. Usa il client `sb` (supabase-client.js).
   Tutte le scritture passano dalle policy RLS: servono login + MFA (aal2). */
(function () {
  const $ = (id) => document.getElementById(id);
  const WPM = 220;
  // Deploy hook di Cloudflare: ricostruisce il sito alla pubblicazione.
  // Da compilare con l'URL generato in Cloudflare (Settings → Build → Deploy hooks).
  const DEPLOY_HOOK_URL = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/ec443777-12df-4f43-9643-9495f260dec6';

  let etichette = [];     // categories
  let tagsCache = [];     // tags
  let editingId = null;   // id articolo in modifica (null = nuovo)
  let editingStato = null; // stato dell'articolo aperto in modifica
  let coverFile = null;   // File copertina selezionato
  let selectedTags = [];  // [{id?, name, slug}]

  const slugify = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const countWords = (t) => ((t || '').trim().match(/\S+/g) || []).length;
  const readingMin = (w) => Math.max(1, Math.ceil(w / WPM));
  const escapeHtml = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num3 = (n) => '#' + String(n).padStart(3, '0');

  // Chiede a Cloudflare di rigenerare il sito pubblico (deploy hook).
  async function triggerRebuild() {
    if (!DEPLOY_HOOK_URL) return;
    try { await fetch(DEPLOY_HOOK_URL, { method: 'POST', mode: 'no-cors' }); } catch (e) {}
  }

  // ---------- Caricamento dati ----------
  async function loadEtichette() {
    const { data } = await sb.from('categories').select('*').order('ordine');
    etichette = data || [];
  }
  async function loadTags() {
    const { data } = await sb.from('tags').select('*').order('name');
    tagsCache = data || [];
  }
  async function loadArticoli() {
    // Le idee (stato 'idea') vivono nella Lavagna, non nell'elenco articoli.
    const { data, error } = await sb.from('articles')
      .select('id, titolo, slug, stato, minuti, numero_editoriale, category_id, updated_at')
      .neq('stato', 'idea')
      .order('updated_at', { ascending: false });
    renderLista(data || [], error);
  }

  // Ricarica elenco + calendario dopo una modifica ai dati.
  async function refreshArticoli() {
    await loadArticoli();
    await loadPianificazione();
    renderCalendar();
  }

  // ---------- Elenco ----------
  const etById = (id) => etichette.find((e) => e.id === id);

  function renderLista(arts, error) {
    const box = $('articoli-lista');
    if (error) { box.innerHTML = '<div class="a-empty">Errore nel caricamento. Ricarica la pagina.</div>'; return; }
    if (!arts.length) { box.innerHTML = '<div class="a-empty">Nessun articolo ancora. Clicca <strong>+ Nuovo articolo</strong> per iniziare.</div>'; return; }
    const rows = arts.map((a) => {
      const et = etById(a.category_id);
      const badge = et ? `<span class="a-badge" style="--c:${et.colore}">${escapeHtml(et.nome)}</span>` : '<span class="a-badge a-none">nessuna</span>';
      const stato = a.stato === 'pubblicato'
        ? '<span class="a-stato pub">Pubblicato</span>'
        : `<span class="a-stato bozza">${escapeHtml(a.stato || 'bozza')}</span>`;
      const meta = [a.numero_editoriale ? num3(a.numero_editoriale) : '', a.minuti ? a.minuti + ' min' : ''].filter(Boolean).join(' · ');
      return `<tr>
        <td>${badge}</td>
        <td class="a-tit">${escapeHtml(a.titolo || '(senza titolo)')}<div class="a-sub">${meta}</div></td>
        <td>${stato}</td>
        <td class="a-actions">
          <button class="a-link" data-edit="${a.id}">Modifica</button>
          ${a.stato !== 'pubblicato' ? `<button class="a-link pub" data-pub="${a.id}">Pubblica</button>` : ''}
          <button class="a-link del" data-del="${a.id}">Elimina</button>
        </td>
      </tr>`;
    }).join('');
    box.innerHTML = `<table class="a-table"><thead><tr><th>Etichetta</th><th>Titolo</th><th>Stato</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    box.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => openForm(b.dataset.edit)));
    box.querySelectorAll('[data-pub]').forEach((b) => (b.onclick = () => pubblica(b.dataset.pub)));
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => elimina(b.dataset.del)));
  }

  // ---------- Form articolo ----------
  async function openForm(id) {
    editingId = id || null;
    editingStato = null;
    coverFile = null; selectedTags = [];
    const sel = $('f-etichetta');
    sel.innerHTML = '<option value="">— scegli —</option>' +
      etichette.filter((e) => e.is_active).map((e) => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('');
    ['f-titolo', 'f-slug', 'f-lead', 'f-estratto', 'f-corpo', 'f-alt'].forEach((k) => ($(k).value = ''));
    sel.value = ''; $('f-cover-preview').innerHTML = ''; $('f-cover-name').textContent = 'Nessun file scelto';
    $('f-cover').value = '';
    msg(''); $('form-title').textContent = id ? 'Modifica articolo' : 'Nuovo articolo';
    $('f-salva').textContent = 'Salva bozza';
    renderSelectedTags(); updateStats();

    if (id) {
      const { data } = await sb.from('articles').select('*').eq('id', id).single();
      if (data) {
        $('f-titolo').value = data.titolo || ''; $('f-slug').value = data.slug || '';
        $('f-lead').value = data.lead || '';
        $('f-estratto').value = data.estratto || ''; $('f-corpo').value = data.corpo || '';
        $('f-alt').value = data.copertina_alt || ''; sel.value = data.category_id || '';
        if (data.copertina) $('f-cover-preview').innerHTML = `<img src="${data.copertina}" alt="">`;
        const { data: links } = await sb.from('article_tags').select('tag_id, tags(name, slug)').eq('article_id', id);
        selectedTags = (links || []).map((l) => ({ id: l.tag_id, name: l.tags && l.tags.name, slug: l.tags && l.tags.slug }));
        renderSelectedTags();
        editingStato = data.stato;
        $('f-salva').textContent = (data.stato === 'pubblicato') ? 'Salva e aggiorna online' : 'Salva bozza';
      }
      updateStats();
    }
    updateEditorActions();
    updatePreview();
    showModal('modal-articolo');
  }

  // I comandi "Pubblica ora" e "Programma" non hanno senso su un articolo già pubblicato.
  function updateEditorActions() {
    const isPub = editingStato === 'pubblicato';
    const bP = $('f-pubblica'), bG = $('f-programma');
    if (bP) bP.style.display = isPub ? 'none' : '';
    if (bG) bG.style.display = isPub ? 'none' : '';
  }

  function updateStats() {
    const w = countWords($('f-corpo').value);
    const m = readingMin(w);
    let label = 'Target', cls = 'ok';
    if (m < 5) { label = 'Sotto il target'; cls = 'low'; }
    else if (m >= 8) { label = 'Approfondimento'; cls = 'deep'; }
    $('f-stats').innerHTML = `<strong>${w}</strong> parole · <strong>${m}</strong> min di lettura · <span class="a-tgt ${cls}">${label}</span>`;
    return { w, m };
  }

  // Inserisce un marcatore (es. "::pratica ") al punto del cursore, andando a capo se serve.
  // Conserva scroll e selezione: la vista NON salta in fondo.
  function insertAtCursor(text) {
    const ta = $('f-corpo');
    const body = ta.closest('.a-dialog-body');
    const taScroll = ta.scrollTop, bodyScroll = body ? body.scrollTop : 0, winY = window.scrollY;
    const pos0 = ta.selectionStart;
    const before = ta.value.slice(0, pos0), after = ta.value.slice(pos0);
    const prefix = (before.length > 0 && !before.endsWith('\n')) ? '\n' : '';
    const ins = prefix + text;
    ta.value = before + ins + after;
    const pos = pos0 + ins.length;
    ta.setSelectionRange(pos, pos);
    try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
    ta.scrollTop = taScroll;
    if (body) body.scrollTop = bodyScroll;
    window.scrollTo(0, winY);
    updateStats();
    updatePreview();
  }

  // ---------- Anteprima live (rispecchia mdToHtml di build.js) ----------
  const PV_BOX_LABEL = { esempio: 'Esempio', pratica: 'In pratica', nota: 'Nota', attenzione: 'Attenzione', ricorda: 'Da ricordare' };
  const PV_BOXRE = /^::(esempio|pratica|nota|attenzione|ricorda|prompt|citazione)\b\s*(.*)$/i;
  function pvInline(t) {
    return escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  function pvBox(tipo, text) {
    if (tipo === 'citazione') return `<blockquote class="ed-quote"><p>${pvInline(text)}</p></blockquote>`;
    if (tipo === 'prompt') return `<div class="ed-prompt"><div class="ed-prompt-h"><span>Prompt da copiare</span></div><pre>${escapeHtml(text)}</pre></div>`;
    return `<div class="ed-box ed-${tipo}"><div class="ed-box-h">${PV_BOX_LABEL[tipo] || tipo}</div><p>${pvInline(text)}</p></div>`;
  }
  function mdPreview(body) {
    const lines = (body || '').replace(/\r\n/g, '\n').split('\n');
    const out = []; let list = [];
    const flush = () => { if (list.length) { out.push('<ul>' + list.map(li => `<li>${pvInline(li)}</li>`).join('') + '</ul>'); list = []; } };
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { flush(); continue; }
      if (/^-{3,}$/.test(t)) { flush(); out.push('<hr class="ed-hr">'); continue; }
      const m = t.match(PV_BOXRE);
      if (m) {
        flush();
        const tipo = m[1].toLowerCase(); const content = [m[2]];
        if (tipo === 'prompt') {
          while (i + 1 < lines.length && lines[i + 1].trim() && !/^(##\s|###\s|-\s)/.test(lines[i + 1].trim()) && !PV_BOXRE.test(lines[i + 1].trim())) {
            content.push(lines[i + 1]); i++;
          }
        }
        out.push(pvBox(tipo, content.map(s => s.trim()).filter(Boolean).join(tipo === 'prompt' ? '\n' : ' ')));
        continue;
      }
      if (t.startsWith('### ')) { flush(); out.push(`<h3>${pvInline(t.slice(4).trim())}</h3>`); continue; }
      if (t.startsWith('## ')) { flush(); out.push(`<h2>${pvInline(t.slice(3).trim())}</h2>`); continue; }
      if (t.startsWith('- ')) { list.push(t.slice(2).trim()); continue; }
      flush(); out.push(`<p>${pvInline(t)}</p>`);
    }
    flush();
    return out.join('\n');
  }
  function updatePreview() {
    const box = $('f-preview'); if (!box) return;
    const tit = $('f-titolo').value.trim();
    const lead = $('f-lead').value.trim();
    const bodyHtml = mdPreview($('f-corpo').value);
    if (!tit && !lead && !bodyHtml) { box.innerHTML = '<div class="pv-empty">Scrivi il titolo e il testo: qui vedrai l\'anteprima dell\'articolo.</div>'; return; }
    box.innerHTML =
      (tit ? `<h1 class="pv-title">${escapeHtml(tit)}</h1>` : '') +
      (lead ? `<p class="pv-lead">${escapeHtml(lead)}</p>` : '') +
      bodyHtml;
  }

  // ---------- Tag ----------
  function renderSelectedTags() {
    const box = $('f-tags-selected');
    box.innerHTML = selectedTags.map((t, i) => `<span class="a-chip">${escapeHtml(t.name)}<button data-rmtag="${i}" title="Rimuovi">×</button></span>`).join('');
    box.querySelectorAll('[data-rmtag]').forEach((b) => (b.onclick = () => { selectedTags.splice(+b.dataset.rmtag, 1); renderSelectedTags(); }));
    const input = $('f-tag-input');
    input.disabled = selectedTags.length >= 4;
    input.placeholder = selectedTags.length >= 4 ? 'Massimo 4 tag' : 'Scrivi un tag e premi Invio';
  }
  function addTagByName(raw) {
    const name = (raw || '').trim(); if (!name || selectedTags.length >= 4) return;
    const slug = slugify(name); if (!slug) return;
    if (selectedTags.some((t) => t.slug === slug)) return;
    const existing = tagsCache.find((t) => t.slug === slug);
    selectedTags.push(existing ? { id: existing.id, name: existing.name, slug: existing.slug } : { name, slug });
    renderSelectedTags();
  }
  async function ensureTagIds() {
    const ids = [];
    for (const t of selectedTags) {
      if (t.id) { ids.push(t.id); continue; }
      let found = tagsCache.find((x) => x.slug === t.slug);
      if (!found) {
        const { data, error } = await sb.from('tags').insert({ name: t.name, slug: t.slug }).select().single();
        if (error) {
          const { data: again } = await sb.from('tags').select('*').eq('slug', t.slug).single();
          found = again;
        } else { found = data; tagsCache.push(data); }
      }
      if (found) ids.push(found.id);
    }
    return ids;
  }

  // ---------- Copertina ----------
  async function uploadCoverIfNeeded(currentUrl) {
    if (!coverFile) return currentUrl || null;
    const ext = (coverFile.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from('copertine').upload(path, coverFile, { contentType: coverFile.type });
    if (error) throw error;
    return sb.storage.from('copertine').getPublicUrl(path).data.publicUrl;
  }

  // ---------- Salva bozza ----------
  // Salva i dati correnti dell'articolo (senza chiudere). Ritorna l'id, o null se manca il titolo.
  async function persistArticolo() {
    const titolo = $('f-titolo').value.trim();
    if (!titolo) { msg('Aggiungi almeno il titolo.', 'err'); return null; }
    const stats = updateStats();
    let currentCover = null;
    if (editingId) { const { data } = await sb.from('articles').select('copertina').eq('id', editingId).single(); currentCover = data && data.copertina; }
    const coverUrl = await uploadCoverIfNeeded(currentCover);
    const payload = {
      titolo,
      slug: ($('f-slug').value.trim() || slugify(titolo)),
      lead: $('f-lead').value.trim() || null,
      estratto: $('f-estratto').value.trim() || null,
      corpo: $('f-corpo').value,
      category_id: $('f-etichetta').value || null,
      copertina: coverUrl,
      copertina_alt: $('f-alt').value.trim() || null,
      parole: stats.w,
      minuti: stats.m
    };
    let artId = editingId;
    if (editingId) {
      const { error } = await sb.from('articles').update(payload).eq('id', editingId);
      if (error) throw error;
    } else {
      const { data, error } = await sb.from('articles').insert(payload).select('id').single();
      if (error) throw error; artId = data.id;
    }
    const tagIds = await ensureTagIds();
    await sb.from('article_tags').delete().eq('article_id', artId);
    if (tagIds.length) await sb.from('article_tags').insert(tagIds.map((tid) => ({ article_id: artId, tag_id: tid })));
    editingId = artId;
    return artId;
  }

  async function salvaBozza() {
    const btn = $('f-salva'); btn.disabled = true; msg('Salvataggio…', 'ok');
    try {
      const artId = await persistArticolo();
      if (!artId) { btn.disabled = false; return; }
      await refreshArticoli();
      if (editingStato === 'pubblicato') {
        await triggerRebuild();
        msg('Modifiche salvate. Sito in ricostruzione (~1-2 min): tra poco saranno online.', 'ok');
      } else {
        msg('Bozza salvata ✓', 'ok');
      }
      setTimeout(() => hideModal('modal-articolo'), 1400);
    } catch (e) { msg('Errore nel salvataggio: ' + (e.message || e), 'err'); }
    btn.disabled = false;
  }

  // "Pubblica ora" dall'editor: salva, poi apre il flusso di pubblicazione (con i controlli).
  async function pubblicaDaEditor() {
    const btn = $('f-pubblica'); btn.disabled = true; msg('Salvataggio…', 'ok');
    try {
      const artId = await persistArticolo();
      if (!artId) { btn.disabled = false; return; }
      await refreshArticoli();
      msg('');
      const ok = await pubblica(artId);
      if (ok) hideModal('modal-articolo');
    } catch (e) { msg('Errore: ' + (e.message || e), 'err'); }
    btn.disabled = false;
  }

  // "Programma" dall'editor: salva, chiude l'editor e apre la finestrella data/ora.
  async function programmaDaEditor() {
    const btn = $('f-programma'); btn.disabled = true; msg('Salvataggio…', 'ok');
    try {
      const artId = await persistArticolo();
      if (!artId) { btn.disabled = false; return; }
      await refreshArticoli();
      const { data } = await sb.from('articles').select('titolo, scheduled_at').eq('id', artId).single();
      hideModal('modal-articolo');
      openPrograma(artId, data && data.titolo, data && data.scheduled_at);
    } catch (e) { msg('Errore: ' + (e.message || e), 'err'); }
    btn.disabled = false;
  }
  const msg = (t, k) => { const m = $('f-msg'); m.className = 'a-msg ' + (k || ''); m.textContent = t || ''; };

  // ---------- Pubblica / Elimina ----------
  async function pubblica(id) {
    const { data: a } = await sb.from('articles').select('*').eq('id', id).single();
    if (!a) return false;
    const problemi = [];
    if (!a.titolo) problemi.push('il titolo');
    if (!a.category_id) problemi.push("l'etichetta");
    if (!a.copertina) problemi.push('la copertina');
    if (!a.copertina_alt) problemi.push("l'alt della copertina");
    if (problemi.length) { alert('Prima di pubblicare manca: ' + problemi.join(', ') + '.'); return false; }
    let proposto = a.numero_editoriale;
    if (!proposto) {
      const { data: mx } = await sb.from('articles').select('numero_editoriale').not('numero_editoriale', 'is', null).order('numero_editoriale', { ascending: false }).limit(1);
      proposto = ((mx && mx[0] && mx[0].numero_editoriale) || 0) + 1;
    }
    const risposta = prompt('Pubblicare «' + a.titolo + '»?\n\nNumero editoriale (proposto: ' + proposto + ') — confermalo o cambialo:', String(proposto));
    if (risposta === null) return false;
    const numero = parseInt(risposta, 10);
    if (!numero || numero < 1) { alert('Numero non valido.'); return false; }
    const { error } = await sb.from('articles').update({ stato: 'pubblicato', numero_editoriale: numero, published_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('Errore: ' + error.message); return false; }
    await refreshArticoli();
    await triggerRebuild();
    alert('Pubblicato! Numero ' + num3(numero) + '.\n\nSito in ricostruzione (~1-2 min): tra poco sarà online.');
    return true;
  }
  async function elimina(id) {
    if (!confirm('Eliminare definitivamente questo articolo?')) return;
    const { error } = await sb.from('articles').delete().eq('id', id);
    if (error) { alert('Errore: ' + error.message); return; }
    await refreshArticoli();
  }

  // ---------- Calendario editoriale ----------
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const DOW = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  let calYear, calMonth;      // mese visualizzato (0-11)
  let pianif = [];            // articoli con date rilevanti

  async function loadPianificazione() {
    const { data } = await sb.from('articles')
      .select('id, titolo, stato, scheduled_at, published_at, numero_editoriale')
      .in('stato', ['bozza', 'proposta', 'programmato', 'pubblicato'])
      .order('scheduled_at', { ascending: true });
    pianif = data || [];
  }

  // "In ritardo": programmato per una data ormai passata ma mai pubblicato → rosso, da recuperare.
  const isLate = (a) => a.stato === 'programmato' && a.scheduled_at && !a.published_at && new Date(a.scheduled_at) < new Date();

  function itemsForMonth(y, m) {
    const map = {};
    pianif.forEach((a) => {
      let d = null, cls = null;
      if (a.stato === 'pubblicato' && a.published_at) { d = new Date(a.published_at); cls = 'pub'; }
      else if (a.stato === 'programmato' && a.scheduled_at) { d = new Date(a.scheduled_at); cls = isLate(a) ? 'late' : 'prog'; }
      if (!d || isNaN(d.getTime())) return;
      if (d.getFullYear() === y && d.getMonth() === m) {
        const day = d.getDate();
        (map[day] = map[day] || []).push({ id: a.id, titolo: a.titolo || '(senza titolo)', numero: a.numero_editoriale, cls });
      }
    });
    return map;
  }

  function fmtWhen(iso) {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${MESI[d.getMonth()].slice(0, 3).toLowerCase()} ${d.getFullYear()}, ${hh}:${mm}`;
  }

  function renderCalendar() {
    const wrap = $('cal-wrap'); if (!wrap) return;
    if (calYear == null) { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); }
    const y = calYear, m = calMonth;
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // Lunedì = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const map = itemsForMonth(y, m);
    const today = new Date();
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
      const dots = (map[d] || []).map((it) => {
        const n = it.numero ? '#' + String(it.numero).padStart(3, '0') : '•';
        return `<span class="cal-dot ${it.cls}" data-openart="${it.id}" title="${escapeHtml(it.titolo)}">${escapeHtml(n)}</span>`;
      }).join('');
      const dotsWrap = dots ? `<div class="cal-dots">${dots}</div>` : '';
      cells += `<div class="cal-cell${isToday ? ' today' : ''}"><span class="d">${d}</span>${dotsWrap}</div>`;
    }
    const dow = DOW.map((x) => `<div class="cal-dow">${x}</div>`).join('');
    wrap.innerHTML = `
      <div class="cal-head">
        <div class="cal-nav">
          <button id="cal-prev" title="Mese precedente">‹</button>
          <span class="cal-title">${MESI[m]} ${y}</span>
          <button id="cal-next" title="Mese successivo">›</button>
        </div>
        <button class="a-link" id="cal-oggi">Oggi</button>
      </div>
      <div class="cal-grid">${dow}${cells}</div>
      <div class="cal-legend"><span><i class="prog"></i>Programmato</span><span><i class="pub"></i>Pubblicato</span><span><i class="late"></i>Da recuperare</span></div>
      <div id="pl-listwrap"></div>`;
    $('cal-prev').onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); };
    $('cal-next').onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); };
    $('cal-oggi').onclick = () => { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); renderCalendar(); };
    wrap.querySelectorAll('[data-openart]').forEach((el) => (el.onclick = () => openForm(el.dataset.openart)));
    renderProgrammazioneListe();
  }

  function renderProgrammazioneListe() {
    const wrap = $('pl-listwrap'); if (!wrap) return;
    const late = pianif.filter(isLate);
    const prog = pianif.filter((a) => a.stato === 'programmato' && !isLate(a));
    const pronti = pianif.filter((a) => a.stato === 'bozza' || a.stato === 'proposta');
    const lateHtml = late.map((a) => `<div class="pl-row late">
        <span class="pl-when">${a.scheduled_at ? fmtWhen(a.scheduled_at) : '—'}</span>
        <span class="pl-tit">${escapeHtml(a.titolo || '(senza titolo)')}</span>
        <button class="a-link pub" data-pubnow="${a.id}">Pubblica ora</button>
        <button class="a-link" data-reprog="${a.id}">Riprogramma</button>
        <button class="a-link del" data-del="${a.id}">Elimina</button>
      </div>`).join('');
    const progHtml = prog.length ? prog.map((a) => `<div class="pl-row">
        <span class="pl-when">${a.scheduled_at ? fmtWhen(a.scheduled_at) : '—'}</span>
        <span class="pl-tit">${escapeHtml(a.titolo || '(senza titolo)')}</span>
        <button class="a-link pub" data-pubnow="${a.id}">Pubblica ora</button>
        <button class="a-link" data-reprog="${a.id}">Cambia data</button>
        <button class="a-link del" data-unprog="${a.id}">Annulla</button>
      </div>`).join('') : '<div class="pl-empty">Nessun articolo programmato.</div>';
    const prontiHtml = pronti.length ? pronti.map((a) => `<div class="pl-row">
        <span class="pl-tit">${escapeHtml(a.titolo || '(senza titolo)')}</span>
        <button class="a-link" data-prog="${a.id}">Programma…</button>
      </div>`).join('') : '<div class="pl-empty">Nessuna bozza pronta. Crea o completa un articolo per programmarlo.</div>';
    wrap.innerHTML =
      (late.length ? `<div class="pl-h">🔴 Da recuperare — programmati mai pubblicati</div><div class="pl-list">${lateHtml}</div>` : '') +
      `<div class="pl-h">Programmati</div><div class="pl-list">${progHtml}</div>
      <div class="pl-h">Pronti da programmare</div><div class="pl-list">${prontiHtml}</div>`;
    wrap.querySelectorAll('[data-prog]').forEach((b) => (b.onclick = () => { const a = pianif.find((x) => x.id === b.dataset.prog); openPrograma(a.id, a.titolo, null); }));
    wrap.querySelectorAll('[data-reprog]').forEach((b) => (b.onclick = () => { const a = pianif.find((x) => x.id === b.dataset.reprog); openPrograma(a.id, a.titolo, a.scheduled_at); }));
    wrap.querySelectorAll('[data-unprog]').forEach((b) => (b.onclick = () => annullaProgramma(b.dataset.unprog)));
    wrap.querySelectorAll('[data-pubnow]').forEach((b) => (b.onclick = () => pubblica(b.dataset.pubnow)));
    wrap.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => elimina(b.dataset.del)));
  }

  // ---------- Programmazione (modale) ----------
  let progId = null;
  const progMsg = (t, k) => { const m = $('prog-msg'); m.className = 'a-msg ' + (k || ''); m.textContent = t || ''; };
  function defaultSchedule() { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }
  async function openPrograma(id, tit, iso) {
    progId = id;
    $('prog-tit').textContent = 'Articolo: ' + (tit || '(senza titolo)');
    const d = iso ? new Date(iso) : defaultSchedule();
    $('prog-data').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    $('prog-ora').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    progMsg(''); showModal('modal-programma');
    // Numero editoriale proposto: quello già assegnato oppure il prossimo libero.
    const { data: a } = await sb.from('articles').select('numero_editoriale').eq('id', id).single();
    let proposto = a && a.numero_editoriale;
    if (!proposto) {
      const { data: mx } = await sb.from('articles').select('numero_editoriale').not('numero_editoriale', 'is', null).order('numero_editoriale', { ascending: false }).limit(1);
      proposto = ((mx && mx[0] && mx[0].numero_editoriale) || 0) + 1;
    }
    $('prog-numero').value = proposto;
  }
  async function salvaProgramma() {
    const data = $('prog-data').value, ora = $('prog-ora').value || '09:00';
    if (!data) { progMsg('Scegli una data.', 'err'); return; }
    const dt = new Date(`${data}T${ora}`);
    if (isNaN(dt.getTime())) { progMsg('Data/ora non valide.', 'err'); return; }
    const numero = parseInt($('prog-numero').value, 10);
    if (!numero || numero < 1) { progMsg('Inserisci un numero editoriale valido.', 'err'); return; }
    // L'articolo esce da solo all'orario: dev'essere già completo (come per la pubblicazione).
    const { data: a } = await sb.from('articles').select('titolo, category_id, copertina, copertina_alt').eq('id', progId).single();
    const manca = [];
    if (!a || !a.titolo) manca.push('il titolo');
    if (!a || !a.category_id) manca.push("l'etichetta");
    if (!a || !a.copertina) manca.push('la copertina');
    if (!a || !a.copertina_alt) manca.push('il testo alternativo della copertina');
    if (manca.length) { progMsg('Prima di programmare manca: ' + manca.join(', ') + '.', 'err'); return; }
    const { error } = await sb.from('articles').update({ stato: 'programmato', scheduled_at: dt.toISOString(), numero_editoriale: numero }).eq('id', progId);
    if (error) { progMsg('Errore: ' + error.message, 'err'); return; }
    hideModal('modal-programma');
    await refreshArticoli();
  }
  async function annullaProgramma(id) {
    if (!confirm('Annullare la programmazione? L\'articolo torna in bozza.')) return;
    const { error } = await sb.from('articles').update({ stato: 'bozza', scheduled_at: null }).eq('id', id);
    if (error) { alert('Errore: ' + error.message); return; }
    await refreshArticoli();
  }

  // ---------- Lavagna delle idee ----------
  let idee = [];
  const ideaMsg = (t, k) => { const m = $('idea-msg'); m.className = 'a-msg ' + (k || ''); m.textContent = t || ''; };
  async function loadIdee() {
    const { data } = await sb.from('articles').select('id, titolo, estratto, updated_at').eq('stato', 'idea').order('updated_at', { ascending: false });
    idee = data || []; renderIdee();
  }
  function renderIdee() {
    const box = $('idee-lista'); if (!box) return;
    const cards = idee.map((a) => `<div class="idea">
        <h4>${escapeHtml(a.titolo || '(senza titolo)')}</h4>
        <p>${escapeHtml(a.estratto || '')}</p>
        <div class="idea-actions">
          <button class="promote" data-promote="${a.id}" title="Trasforma in bozza d'articolo">→ Bozza</button>
          <button class="edit" data-editidea="${a.id}">Modifica</button>
          <button class="del" data-delidea="${a.id}">Elimina</button>
        </div>
      </div>`).join('');
    box.innerHTML = `<div class="idee-grid">${cards}<button class="idea-add" id="idea-new">+ Nuova idea</button></div>`;
    $('idea-new').onclick = () => openIdea(null);
    box.querySelectorAll('[data-promote]').forEach((b) => (b.onclick = () => promoteIdea(b.dataset.promote)));
    box.querySelectorAll('[data-editidea]').forEach((b) => (b.onclick = () => openIdea(b.dataset.editidea)));
    box.querySelectorAll('[data-delidea]').forEach((b) => (b.onclick = () => eliminaIdea(b.dataset.delidea)));
  }
  let ideaId = null;
  function openIdea(id) {
    ideaId = id || null;
    const a = id ? idee.find((x) => x.id === id) : null;
    $('idea-h').textContent = id ? 'Modifica idea' : 'Nuova idea';
    $('idea-tit').value = a ? (a.titolo || '') : '';
    $('idea-nota').value = a ? (a.estratto || '') : '';
    ideaMsg(''); showModal('modal-idea');
  }
  async function uniqueSlug(base) {
    let s = base || 'idea', n = 1;
    while (n <= 50) {
      const { data } = await sb.from('articles').select('id').eq('slug', s).limit(1);
      if (!data || !data.length) return s;
      n++; s = base + '-' + n;
    }
    return base + '-' + Date.now().toString(36);
  }
  async function salvaIdea() {
    const tit = $('idea-tit').value.trim();
    if (!tit) { ideaMsg('Scrivi almeno il titolo dell\'idea.', 'err'); return; }
    const nota = $('idea-nota').value.trim() || null;
    try {
      if (ideaId) {
        const { error } = await sb.from('articles').update({ titolo: tit, estratto: nota }).eq('id', ideaId);
        if (error) throw error;
      } else {
        const slug = await uniqueSlug(slugify(tit) || 'idea');
        const { error } = await sb.from('articles').insert({ titolo: tit, estratto: nota, slug, stato: 'idea' });
        if (error) throw error;
      }
      hideModal('modal-idea'); await loadIdee();
    } catch (e) { ideaMsg('Errore: ' + (e.message || e), 'err'); }
  }
  async function promoteIdea(id) {
    const { error } = await sb.from('articles').update({ stato: 'bozza' }).eq('id', id);
    if (error) { alert('Errore: ' + error.message); return; }
    await loadIdee();
    await refreshArticoli();
    openForm(id);
  }
  async function eliminaIdea(id) {
    if (!confirm('Eliminare questa idea?')) return;
    const { error } = await sb.from('articles').delete().eq('id', id);
    if (error) { alert('Errore: ' + error.message); return; }
    await loadIdee();
  }

  // ---------- Etichette (gestione) ----------
  function renderEtichette() {
    $('et-lista').innerHTML = etichette.map((e) => `<div class="et-row">
      <span class="a-badge" style="--c:${e.colore}">${escapeHtml(e.nome)}</span>
      <code>${e.colore}</code>
      <span class="et-state ${e.is_active ? 'on' : 'off'}">${e.is_active ? 'attiva' : 'disattivata'}</span>
      <button class="a-link" data-toggle="${e.id}">${e.is_active ? 'Disattiva' : 'Attiva'}</button>
    </div>`).join('');
    $('et-lista').querySelectorAll('[data-toggle]').forEach((b) => (b.onclick = async () => {
      const e = etichette.find((x) => x.id === b.dataset.toggle);
      await sb.from('categories').update({ is_active: !e.is_active }).eq('id', e.id);
      await loadEtichette(); renderEtichette();
    }));
  }
  async function addEtichetta() {
    const nome = $('et-nome').value.trim(); const colore = $('et-colore').value.trim();
    if (!nome || !/^#[0-9A-Fa-f]{6}$/.test(colore)) { alert('Serve un nome e un colore valido tipo #RRGGBB.'); return; }
    const ordine = etichette.reduce((m, e) => Math.max(m, e.ordine || 0), 0) + 1;
    const { error } = await sb.from('categories').insert({ nome, slug: slugify(nome), colore, ordine, is_active: true });
    if (error) { alert('Errore: ' + error.message); return; }
    $('et-nome').value = ''; await loadEtichette(); renderEtichette();
  }

  // ---------- Modali ----------
  const showModal = (id) => $(id).classList.add('open');
  const hideModal = (id) => $(id).classList.remove('open');

  // ---------- Init ----------
  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return; // il guard reindirizza al login
    await loadEtichette(); await loadTags(); await loadArticoli();
    await loadPianificazione(); renderCalendar();
    await loadIdee();

    $('btn-nuovo').onclick = () => openForm(null);
    $('btn-etichette').onclick = () => { renderEtichette(); showModal('modal-etichette'); };
    const btnAgg = $('btn-aggiorna');
    if (btnAgg) btnAgg.onclick = async () => {
      btnAgg.disabled = true; const t = btnAgg.textContent; btnAgg.textContent = 'In corso…';
      await triggerRebuild();
      alert('Sito in ricostruzione (~1-2 min). Ricarica la pagina pubblica tra poco per vedere gli aggiornamenti.');
      btnAgg.textContent = t; btnAgg.disabled = false;
    };
    $('f-salva').onclick = salvaBozza;
    $('f-pubblica').onclick = pubblicaDaEditor;
    $('f-programma').onclick = programmaDaEditor;
    $('et-add').onclick = addEtichetta;
    $('prog-salva').onclick = salvaProgramma;
    $('idea-salva').onclick = salvaIdea;
    $('f-corpo').addEventListener('input', () => { updateStats(); updatePreview(); });
    ['f-titolo', 'f-lead'].forEach((k) => $(k).addEventListener('input', updatePreview));
    $('f-tag-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTagByName($('f-tag-input').value); $('f-tag-input').value = ''; }
    });
    $('f-cover').addEventListener('change', () => {
      const f = $('f-cover').files[0]; if (!f) return;
      coverFile = f; $('f-cover-name').textContent = f.name;
      const r = new FileReader(); r.onload = (ev) => ($('f-cover-preview').innerHTML = `<img src="${ev.target.result}" alt="">`); r.readAsDataURL(f);
    });
    document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => hideModal(b.dataset.close)));
    // Barra pulsanti: inserisce i marcatori nel testo
    document.querySelectorAll('.a-toolbar [data-ins]').forEach((b) => (b.onclick = () => insertAtCursor(b.dataset.ins)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
