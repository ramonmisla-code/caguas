(() => {
  'use strict';
  const $ = q => document.querySelector(q);
  const tr = text => window.CRV_I18N?.t(text) || text;
  const locale = () => window.CRV_I18N?.language === 'en' ? 'en-US' : 'es-PR';
  const stages = ['Nuevo interesado', 'Contactado', 'Interesado activo', 'Enviado a VIG', 'Precualificado', 'Seleccionó unidad', 'Opción/depósito', 'Cierre'];
  let adminKey = '', leads = [], filtered = [];
  const esc = text => String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const formatDate = date => date ? new Date(date).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const contact = str => esc(str || '—');
  const api = async (path, options={}) => {
    const res = await fetch(path, { ...options, headers: { 'x-admin-key': adminKey, ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(tr(data.message || 'No se pudo conectar con el servidor.'));
    return data;
  };
  async function load() {
    $('#data-message').textContent = tr('Actualizando...');
    const data = await api('/api/admin/leads');
    leads = data.leads || [];
    filterLeads();
    $('#data-message').textContent = `${tr('Última actualización:')} ${new Date().toLocaleTimeString(locale())}`;
  }
  function filterLeads() {
    const query = $('#search').value.trim().toLocaleLowerCase();
    const status = $('#status-filter').value;
    filtered = leads.filter(l => (!status || l.status === status) && (!query || [l.fullName,l.phone,l.email,l.municipality,l.comments,l.tracking?.utm_source].some(v => String(v||'').toLocaleLowerCase().includes(query))));
    $('#total-count').textContent = String(filtered.length);
    const clicks = filtered.filter(l=>l.vigClickedAt).length;
    $('#vig-count').textContent = String(clicks);
    $('#prequalified-count').textContent = String(filtered.filter(l => ['Precualificado','Seleccionó unidad','Opción/depósito','Cierre'].includes(l.status)).length);
    $('#conversion-count').textContent = filtered.length ? `${Math.round(clicks/filtered.length*100)}%` : '0%';
    $('#empty-state').hidden = filtered.length !== 0;
    $('#lead-rows').innerHTML = filtered.map(l => {
      const options = stages.map(s => `<option value="${esc(s)}" ${s===l.status?'selected':''}>${esc(tr(s))}</option>`).join('');
      return `<tr><td><strong>${formatDate(l.createdAt)}</strong><span class="status-chip">${esc(tr(l.status))}</span></td><td><strong>${esc(l.fullName)}</strong><small>${esc(l.municipality)||'—'}</small></td><td><a href="mailto:${encodeURIComponent(l.email||'')}">${contact(l.email)}</a><br/><a href="tel:${esc((l.phone||'').replace(/[^0-9+]/g,''))}">${contact(l.phone)}</a><small>${tr('Prefiere:')} ${esc(tr(l.contactPreference||'—'))}</small></td><td>${tr('Compra:')} ${esc(tr(l.buyingTimeline||'—'))}<br/>${tr('Financia:')} ${esc(tr(l.needsFinancing||'—'))}<br/><small>${tr('Mercadeo:')} ${l.marketingConsent?tr('Sí'):tr('No')}</small><small title="${esc(l.comments)}">${esc((l.comments||'').slice(0,90))}</small></td><td><strong>${esc(l.tracking?.utm_source||tr('Directo / no indicado'))}</strong><small>${esc(l.tracking?.utm_campaign||'')}</small><small>${esc(l.tracking?.utm_medium||'')}</small></td><td>${l.vigClickedAt?`<span class="vig-yes">${tr('Abrió enlace')}</span><small>${formatDate(l.vigClickedAt)}</small>`:`<span class="vig-no">${tr('Sin clic registrado')}</span>`}</td><td><select class="stage-change" aria-label="${tr('Cambiar etapa')} ${esc(l.fullName)}" data-id="${esc(l.id)}">${options}</select></td></tr>`;
    }).join('');
    document.querySelectorAll('.stage-change').forEach(select => select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        await api('/api/admin/status', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id:select.dataset.id,status:select.value}) });
        const lead = leads.find(l=>l.id===select.dataset.id);
        if (lead) lead.status = select.value;
        $('#data-message').textContent = tr('Etapa actualizada correctamente.');
        filterLeads();
      } catch(e) { $('#data-message').textContent = e.message; select.disabled = false; }
    }));
  }
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    adminKey = $('#admin-key').value.trim();
    $('#login-message').textContent = '';
    try {
      await load();
      $('#login-card').hidden = true;
      $('#dashboard').hidden = false;
      $('#admin-key').value = '';
    } catch(e) { adminKey = ''; $('#login-message').textContent = e.message; }
  });
  $('#search').addEventListener('input', filterLeads);
  $('#status-filter').addEventListener('change', filterLeads);
  $('#reload').addEventListener('click', () => load().catch(e => $('#data-message').textContent=e.message));
  $('#logout').addEventListener('click', () => { adminKey='';leads=[];filtered=[];$('#dashboard').hidden=true;$('#login-card').hidden=false; });
  function csvCell(v) {
    let s = String(v??'').replaceAll('"','""');
    // Evita inyección de fórmulas al abrir el archivo con Excel.
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return '"'+s+'"';
  }
  window.addEventListener('crv:languagechange', () => {
    if ($('#dashboard') && !$('#dashboard').hidden) filterLeads();
    if ($('#data-message')?.textContent.startsWith('Última actualización:') || $('#data-message')?.textContent.startsWith('Last Updated:')) {
      $('#data-message').textContent = tr('Última actualización:') + ' ' + new Date().toLocaleTimeString(locale());
    }
  });
  $('#export-csv').addEventListener('click', () => {
    const fields = ['Fecha','Estado','Nombre','Teléfono','Email','Municipio','Contacto preferido','Plazo compra','Requiere financiamiento','Comentarios','Consiente promoción','Clic VIG','UTM source','UTM medium','UTM campaign','UTM content','UTM term','Referido','Ruta de llegada','ID'];
    const rows = filtered.map(l => [l.createdAt,l.status,l.fullName,l.phone,l.email,l.municipality,l.contactPreference,l.buyingTimeline,l.needsFinancing,l.comments,l.marketingConsent?'Sí':'No',l.vigClickedAt,l.tracking?.utm_source,l.tracking?.utm_medium,l.tracking?.utm_campaign,l.tracking?.utm_content,l.tracking?.utm_term,l.tracking?.referrer,l.tracking?.landingPath,l.id]);
    const csv = '\uFEFF' + [fields.map(tr), ...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
    const href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=href;a.download=`villas-caguas-real-prospectos-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  });
})();
