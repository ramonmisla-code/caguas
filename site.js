(() => {
  'use strict';
  const $ = (q) => document.querySelector(q);
  // No impedir el funcionamiento visual si el navegador restringe almacenamiento de sesión.
  const getSession = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const setSession = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* sesión privada */ } };
  const header = $('#site-header');
  const menuBtn = $('#menu-toggle');
  const nav = $('#main-nav');
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
  menuBtn?.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));
  $('#year').textContent = new Date().getFullYear();

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px 55px 0px' });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  // Galería con selección accesible y visor fijo (sin modal ni zoom).
  const interiorPreview = $('#interior-preview');
  const featured = interiorPreview?.querySelector('.interior-featured');
  const featuredImage = $('#interior-featured-image');
  const featuredCaption = $('#interior-featured-caption');
  let selectedInterior = null;
  function selectInterior(card) {
    if (!card || card.hidden) return;
    const img = card.querySelector('[data-interior-src]');
    if (!img || !img.src) return;
    selectedInterior = card;
    interiorPreview.querySelectorAll('.interior-preview-card').forEach(item => {
      const active = item === card;
      item.classList.toggle('is-selected', active);
      item.setAttribute('aria-pressed', String(active));
    });
    featuredImage.src = img.src;
    featuredImage.alt = img.alt;
    featuredCaption.textContent = card.querySelector('figcaption')?.textContent || '';
    featured.hidden = false;
  }
  interiorPreview?.querySelectorAll('[data-interior-src]').forEach(img => {
    const card = img.closest('.interior-preview-card');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', 'Ver ' + (card.querySelector('figcaption')?.textContent || 'imagen interior'));
    card.addEventListener('click', () => selectInterior(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectInterior(card); }
    });
    const check = new Image();
    check.onload = () => {
      if (!check.naturalWidth) return;
      img.src = img.dataset.interiorSrc;
      card.hidden = false;
      interiorPreview.hidden = false;
      if (!selectedInterior) selectInterior(card);
    };
    check.onerror = () => {};
    check.src = img.dataset.interiorSrc;
  });

  const media = {
    'plano-villa': ['plano-villa.webp', 'Planta arquitectónica conceptual: unidades tipo espejo.'],
    'piscina-caguas-real': ['piscina-caguas-real.webp', 'Piscina del desarrollo existente. Acceso no confirmado para las nuevas villas.'],
    'amenidades-caguas-real': ['amenidades-caguas-real.webp', 'Instalaciones del desarrollo existente. Acceso sujeto a confirmación.'],
    'vista-aerea-desarrollo': ['vista-aerea-desarrollo.webp', 'Vista aérea ilustrativa del desarrollo existente.'],
    'ubicacion-proyecto': ['ubicacion-proyecto.webp', 'Perímetro ilustrativo del terreno propuesto.']
  };
  // Usar la nueva imagen del área propuesta cuando ya esté disponible en assets.
  // Hasta entonces conservar la imagen publicada para evitar contenido roto.
  const proposedArea = document.querySelector('.location-map img[data-proposed-area]');
  if (proposedArea) {
    const imagePath = proposedArea.dataset.proposedArea;
    const candidate = new Image();
    candidate.onload = () => {
      if (!candidate.naturalWidth) return;
      proposedArea.src = imagePath;
      media['ubicacion-proyecto'] = [imagePath.split('/').pop(), 'Imagen ilustrativa del área propuesta para Villas de Caguas Real.'];
    };
    candidate.onerror = () => { /* Mantener la imagen anterior mientras el archivo no exista. */ };
    candidate.src = imagePath;
  }

  const lightbox = $('#lightbox');
  document.querySelectorAll('[data-lightbox]').forEach(el => el.addEventListener('click', () => {
    const entry = media[el.dataset.lightbox];
    if (!entry || !lightbox?.showModal) return;
    $('#lightbox-img').src = '/assets/' + entry[0];
    $('#lightbox-img').alt = entry[1];
    $('#lightbox-caption').textContent = entry[1];
    lightbox.showModal();
  }));
  $('#lightbox-close')?.addEventListener('click', () => lightbox.close());
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

  const form = $('#lead-form');
  const msg = $('#form-message');
  const submitBtn = $('#submit-lead');
  let sentLeadId = null;
  let sending = false;
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const urlParams = new URLSearchParams(window.location.search);
  const sourceValues = {};
  utmKeys.forEach(key => {
    const val = urlParams.get(key) || getSession('vcr_' + key) || '';
    sourceValues[key] = val.slice(0, 150);
    if (urlParams.has(key)) setSession('vcr_' + key, val.slice(0, 150));
  });
  function showMessage(message, success = false) {
    msg.textContent = message;
    msg.classList.toggle('success', success);
  }
  function validate(obj) {
    if (obj.fullName.length < 3) return 'Escribe tu nombre completo.';
    if (obj.phone.replace(/\D/g, '').length < 10) return 'Escribe un teléfono válido con al menos 10 dígitos.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email)) return 'Verifica tu correo electrónico.';
    if (!obj.privacyConsent) return 'Debes aceptar el aviso de privacidad para atender tu solicitud.';
    return '';
  }
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const fd = new FormData(form);
    const obj = {
      fullName: String(fd.get('fullName') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      email: String(fd.get('email') || '').trim().toLowerCase(),
      municipality: String(fd.get('municipality') || '').trim(),
      contactPreference: String(fd.get('contactPreference') || ''),
      buyingTimeline: String(fd.get('buyingTimeline') || ''),
      needsFinancing: String(fd.get('needsFinancing') || ''),
      comments: String(fd.get('comments') || '').trim(),
      website: String(fd.get('website') || ''),
      privacyConsent: $('#privacyConsent').checked,
      marketingConsent: $('#marketingConsent').checked,
      tracking: {
        ...sourceValues,
        referrer: (document.referrer || '').slice(0, 500),
        landingPath: (location.pathname + location.search).slice(0, 500)
      }
    };
    const error = validate(obj);
    if (error) { showMessage(error); return; }
    sending = true;
    submitBtn.disabled = true;
    submitBtn.firstChild.textContent = 'Enviando registro… ';
    showMessage('');
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.id) throw new Error(payload.message || 'No pudimos guardar tu registro. Inténtalo más tarde.');
      sentLeadId = payload.id;
      setSession('vcr_leadId', sentLeadId);
      $('#registration-panel').hidden = true;
      $('#success-panel').hidden = false;
      $('#success-panel').focus();
    } catch (error) {
      showMessage(error.message || 'No se pudo completar el registro. Intenta nuevamente.');
    } finally {
      sending = false;
      submitBtn.disabled = false;
      submitBtn.firstChild.textContent = 'Quiero recibir información ';
    }
  });
  $('#vig-link')?.addEventListener('click', () => {
    const id = sentLeadId || getSession('vcr_leadId');
    if (!id) return;
    // El enlace abre sin esperar la red. El evento NO significa aprobación ni solicitud completada.
    const json = JSON.stringify({ leadId: id });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/vig', new Blob([json], { type: 'application/json' }));
      else fetch('/api/vig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => {});
    } catch (_) { /* No bloquear el acceso al portal hipotecario. */ }
  });
})();
