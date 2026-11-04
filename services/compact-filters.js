/* Compact search and icon-led filters for AMAN.C.
   Existing select controls and filtering logic remain the source of truth. */
(() => {
  const icons = {
    company: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V5l7-2v18M19 21V9l-7-2M8 8h1m-1 4h1m-1 4h1m7-4h1m-1 4h1"/></svg>',
    status: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
    type: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v4H4zM4 11h10v4H4zM4 17h16v3H4z"/></svg>',
    generic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>'
  };
  function iconFor(label) {
    const value = label.toLowerCase();
    if (/الشركة|شركات/.test(value)) return icons.company;
    if (/الحالة|حاله/.test(value)) return icons.status;
    if (/النوع|العملية/.test(value)) return icons.type;
    return icons.generic;
  }
  function prepare(row) {
    if (!row || row.dataset.compactFiltersReady === 'true') return;
    const search = row.querySelector('.toolbar-search') ||
      [...row.children].find(el => el.querySelector('input[type="search"],input:not([type]),input[type="text"]'));
    if (search) search.classList.add('compact-search');
    const candidates = row.classList.contains('admin-filter-grid')
      ? [...row.children]
      : [...row.querySelectorAll('.toolbar-filter')];
    candidates.forEach((item) => {
      const select = item.querySelector('select.field');
      const label = item.querySelector('.field-label');
      if (!select || !label || item.dataset.compactFilterReady === 'true') return;
      const title = label.textContent.trim();
      const control = document.createElement('div');
      control.className = 'compact-filter-control';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'compact-filter-icon';
      toggle.setAttribute('aria-label', 'فتح فلتر ' + title);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.title = title;
      toggle.innerHTML = iconFor(title);
      const caption = document.createElement('span');
      caption.className = 'compact-filter-caption';
      caption.textContent = title;
      control.append(toggle, caption);
      item.classList.add('compact-filter');
      item.append(control);
      label.hidden = true;
      select.hidden = true;
      select.setAttribute('aria-label', title);
      toggle.addEventListener('click', () => {
        const opening = select.hidden;
        row.querySelectorAll('.compact-filter select').forEach((other) => {
          other.hidden = true;
          const button = other.closest('.compact-filter').querySelector('.compact-filter-icon');
          button.setAttribute('aria-expanded', 'false');
        });
        if (opening) {
          select.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
          select.focus();
        }
      });
      item.dataset.compactFilterReady = 'true';
    });
    row.classList.add('compact-filter-row');
    row.dataset.compactFiltersReady = 'true';
  }
  function init() {
    document.querySelectorAll('.customer-toolbar,.admin-filter-grid').forEach(prepare);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('aman:admin-screenchange', init);
})();
