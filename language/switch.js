(() => {
  'use strict';
  const dictionary = window.CRV_TRANSLATIONS || {};
  const originals = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatableAttributes = ['alt', 'aria-label', 'placeholder', 'title', 'content'];
  const isPrivacyPage = /\/privacidad(?:\.html)?\/?$/.test(location.pathname);
  const storeKey = 'crv-language';
  const readSaved = () => { try { return localStorage.getItem(storeKey); } catch { return null; } };
  const save = lang => { try { localStorage.setItem(storeKey, lang); } catch {} };
  const requested = new URL(location.href).searchParams.get('lang');
  let language = requested === 'en' || requested === 'es' ? requested : (readSaved() === 'en' ? 'en' : 'es');
  const translate = source => language === 'en' ? (dictionary[source] || source) : source;
  const isTranslatableText = node => {
    const el = node.parentElement;
    return el && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'SVG'].includes(el.tagName);
  };
  const nodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (!isTranslatableText(walker.currentNode)) continue;
    const node = walker.currentNode;
    const raw = node.nodeValue;
    if (!raw.trim()) continue;
    originals.set(node, raw);
    nodes.push(node);
  }
  const attributes = [];
  document.querySelectorAll('body *, head meta[content], head title').forEach(el => {
    const values = {};
    translatableAttributes.forEach(attr => {
      if (el.hasAttribute(attr)) {
        values[attr] = el.getAttribute(attr);
      }
    });
    if (Object.keys(values).length) {
      originalAttributes.set(el, values);
      attributes.push(el);
    }
  });
  const originalTitle = document.title;
  const headTitle = document.querySelector('head title');
  const selectors = [...document.querySelectorAll('[data-language]')];
  function localizedURL(value) {
    const url = new URL(value, location.origin);
    if (language === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    return url.pathname + url.search + url.hash;
  }
  function updateLinks() {
    document.querySelectorAll('a[href]').forEach(a => {
      const original = a.dataset.originalHref || a.getAttribute('href');
      if (!a.dataset.originalHref) a.dataset.originalHref = original;
      if (original === '/' || original === '/privacidad' || original === '/privacidad.html') {
        a.setAttribute('href', localizedURL(original));
      }
    });
  }
  function paint() {
    document.documentElement.lang = language === 'en' ? 'en' : 'es-PR';
    document.documentElement.dataset.language = language;
    nodes.forEach(node => {
      const raw = originals.get(node) || '';
      const key = raw.trim();
      // Preserve leading and trailing whitespace in mixed-format headings and legal paragraphs.
      const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (!match) return;
      const replacement = language === 'en' ? dictionary[key] : null;
      node.nodeValue = replacement === undefined || replacement === null ? raw : match[1] + replacement + match[3];
    });
    attributes.forEach(el => {
      const values = originalAttributes.get(el);
      for (const [attr, original] of Object.entries(values)) {
        const mapped = language === 'en' ? (dictionary[original] || original) : original;
        if (mapped !== el.getAttribute(attr)) el.setAttribute(attr, mapped);
      }
    });
    document.title = language === 'en' ? (dictionary[originalTitle] || originalTitle) : originalTitle;
    if (headTitle) headTitle.textContent = document.title;
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', language === 'en' ? 'en_US' : 'es_PR');
    selectors.forEach(button => {
      const active = button.dataset.language === language;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    document.querySelectorAll('.language-switch').forEach(s => {
      s.setAttribute('aria-label', language === 'en' ? 'Select website language' : 'Seleccionar idioma del sitio');
    });
    updateLinks();
  }
  function setLanguage(next, updateURL = true) {
    if (!['en', 'es'].includes(next)) return;
    language = next;
    save(next);
    if (updateURL) {
      const url = new URL(location.href);
      if (language === 'en') url.searchParams.set('lang', 'en');
      else url.searchParams.delete('lang');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    paint();
    window.dispatchEvent(new CustomEvent('crv:languagechange', { detail: { language } }));
  }
  selectors.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  window.CRV_I18N = {
    get language() { return language; },
    t(value) { return translate(value); },
    setLanguage,
    isPrivacyPage
  };
  setLanguage(language, false);
})();
