/* Admin — gestione Articoli. Usa il client `sb` (supabase-client.js).
   Tutte le scritture passano dalle policy RLS: servono login + MFA (aal2). */
(function () {
  const $ = (id) => document.getElementById(id);
  const WPM = 220;
  // Deploy hook di Cloudflare: ricostruisce il sito alla pubblicazione.
  // Da compilare con l'URL generato in Cloudflare (Settings → Build → Deploy hooks).
  const DEPLOY_HOOK_URL = '';

  let etichette = [];     // categories
  let tagsCache = [];     // tags
  let editingId = null;   // id articolo in modifica (null = nuovo)
  let coverFile = null;   // File copertina selezionato
  let selectedTags = [];  // [{id?, name, slug}]

  const slugify = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const countWords = (t) => ((t || '').trim().match(/\S+/g) || []).length;
  const readingMin = (w) => Math.max(1, Math.ceil(w / WPM));
  const escapeHtml = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num3 = (n) => '#' + String(n).padStart(3, '0');

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
    const { data, error } = await sb.from('articles')
      .select('id, titolo, slug, stato, minuti, numero_editoriale, category_id, updated_at')
      .order('updated_at', { ascending: false });
    renderLista(data || [], error);
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
    coverFile = null; selectedTags = [];
    const sel = $('f-etichetta');
    sel.innerHTML = '<option value="">— scegli —</option>' +
      etichette.filter((e) => e.is_active).map((e) => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('');
    ['f-titolo', 'f-slug', 'f-occhiello', 'f-lead', 'f-estratto', 'f-corpo', 'f-alt'].forEach((k) => ($(k).value = ''));
    sel.value = ''; $('f-cover-preview').innerHTML = ''; $('f-cover-name').textContent = 'Nessun file scelto';
    $('f-cover').value = '';
    msg(''); $('form-title').textContent = id ? 'Modifica articolo' : 'Nuovo articolo';
    renderSelectedTags(); updateStats();

    if (id) {
      const { data } = await sb.from('articles').select('*').eq('id', id).single();
      if (data) {
        $('f-titolo').value = data.titolo || ''; $('f-slug').value = data.slug || '';
        $('f-occhiello').value = data.occhiello || ''; $('f-lead').value = data.lead || '';
        $('f-estratto').value = data.estratto || ''; $('f-corpo').value = data.corpo || '';
        $('f-alt').value = data.copertina_alt || ''; sel.value = data.category_id || '';
        if (data.copertina) $('f-cover-preview').innerHTML = `<img src="${data.copertina}" alt="">`;
        const { data: links } = await sb.from('article_tags').select('tag_id, tags(name, slug)').eq('article_id', id);
        selectedTags = (links || []).map((l) => ({ id: l.tag_id, name: l.tags && l.tags.name, slug: l.tags && l.tags.slug }));
        renderSelectedTags();
      }
      updateStats();
    }
    showModal('modal-articolo');
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
  async function salvaBozza() {
    const btn = $('f-salva'); btn.disabled = true; msg('Salvataggio…', 'ok');
    try {
      const titolo = $('f-titolo').value.trim();
      if (!titolo) { msg('Aggiungi almeno il titolo.', 'err'); btn.disabled = false; return; }
      const stats = updateStats();
      let currentCover = null;
      if (editingId) { const { data } = await sb.from('articles').select('copertina').eq('id', editingId).single(); currentCover = data && data.copertina; }
      const coverUrl = await uploadCoverIfNeeded(currentCover);
      const payload = {
        titolo,
        slug: ($('f-slug').value.trim() || slugify(titolo)),
        occhiello: $('f-occhiello').value.trim() || null,
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
      msg('Bozza salvata ✓', 'ok');
      await loadArticoli();
      setTimeout(() => hideModal('modal-articolo'), 800);
    } catch (e) { msg('Errore nel salvataggio: ' + (e.message || e), 'err'); }
    btn.disabled = false;
  }
  const msg = (t, k) => { const m = $('f-msg'); m.className = 'a-msg ' + (k || ''); m.textContent = t || ''; };

  // ---------- Pubblica / Elimina ----------
  async function pubblica(id) {
    const { data: a } = await sb.from('articles').select('*').eq('id', id).single();
    if (!a) return;
    const problemi = [];
    if (!a.titolo) problemi.push('il titolo');
    if (!a.category_id) problemi.push("l'etichetta");
    if (!a.copertina) problemi.push('la copertina');
    if (!a.copertina_alt) problemi.push("l'alt della copertina");
    if (problemi.length) { alert('Prima di pubblicare manca: ' + problemi.join(', ') + '.'); return; }
    if (!confirm('Pubblicare «' + a.titolo + '»? Diventerà visibile sul sito.')) return;
    let numero = a.numero_editoriale;
    if (!numero) {
      const { data: mx } = await sb.from('articles').select('numero_editoriale').not('numero_editoriale', 'is', null).order('numero_editoriale', { ascending: false }).limit(1);
      numero = ((mx && mx[0] && mx[0].numero_editoriale) || 0) + 1;
    }
    const { error } = await sb.from('articles').update({ stato: 'pubblicato', numero_editoriale: numero, published_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('Errore: ' + error.message); return; }
    await loadArticoli();
    let extra = '\n\nPer mostrarlo sul sito serve ricostruire (te lo configuro col deploy hook).';
    if (DEPLOY_HOOK_URL) {
      try { await fetch(DEPLOY_HOOK_URL, { method: 'POST' }); extra = '\n\nSito in ricostruzione (~1-2 min): tra poco sarà online.'; } catch (e) {}
    }
    alert('Pubblicato! Numero ' + num3(numero) + '.' + extra);
  }
  async function elimina(id) {
    if (!confirm('Eliminare definitivamente questo articolo?')) return;
    const { error } = await sb.from('articles').delete().eq('id', id);
    if (error) { alert('Errore: ' + error.message); return; }
    await loadArticoli();
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

    $('btn-nuovo').onclick = () => openForm(null);
    $('btn-etichette').onclick = () => { renderEtichette(); showModal('modal-etichette'); };
    $('f-salva').onclick = salvaBozza;
    $('et-add').onclick = addEtichetta;
    $('f-corpo').addEventListener('input', updateStats);
    $('f-tag-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTagByName($('f-tag-input').value); $('f-tag-input').value = ''; }
    });
    $('f-cover').addEventListener('change', () => {
      const f = $('f-cover').files[0]; if (!f) return;
      coverFile = f; $('f-cover-name').textContent = f.name;
      const r = new FileReader(); r.onload = (ev) => ($('f-cover-preview').innerHTML = `<img src="${ev.target.result}" alt="">`); r.readAsDataURL(f);
    });
    document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => hideModal(b.dataset.close)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
