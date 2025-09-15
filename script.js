document.addEventListener('DOMContentLoaded', () => {
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const createEl = (tag, attrs = {}) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'after' && v instanceof Element) v.insertAdjacentElement('afterend', el);
      else el.setAttribute(k, v);
    }
    return el;
  };

  // Header + clock
  const h1 = $('h1');
  if (h1) { h1.textContent = h1.textContent + ' from JS'; h1.style.color = 'purple'; }
  const h2 = createEl('h2', { text: 'Welcome to the DOM' });
  h1?.insertAdjacentElement('afterend', h2);
  const h3 = createEl('h3'); h2.insertAdjacentElement('afterend', h3);
  const startClock = () => {
    const update = () => { h3.textContent = 'Heure actuelle : ' + new Date().toLocaleTimeString(); };
    update(); setInterval(update, 1000);
  };
  startClock();

  // Example list
  const ul = createEl('ul', { id: 'my-list' });
  ul.append(createEl('li', { text: 'Élément 1' }));
  ul.append(createEl('li', { text: 'Élément 2' }));
  h3.insertAdjacentElement('afterend', ul);
  if (ul.firstElementChild) ul.removeChild(ul.firstElementChild);
  ul.append(createEl('li', { text: 'Élément ajouté en JS' }));

  const img = $('#main-image');

  // Table creation
  function ensureTable() {
    let tbl = $('#table-users');
    if (tbl) return tbl;
    tbl = createEl('table', { id: 'table-users' });
    tbl.append(createEl('caption', { text: 'People' }));
    tbl.append(createEl('thead', { html: '<tr><th>Name</th><th>User name</th><th>Email</th></tr>' }));
    tbl.append(createEl('tbody'));
    const ref = img || h3 || document.body;
    ref.insertAdjacentElement('afterend', tbl);
    return tbl;
  }
  const table = ensureTable();
  const tbody = table.querySelector('tbody');

  // Utilities
  const escapeHtml = s => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const isShaking = el => !!el && el.classList.contains('shake');
  const labelFor = id => id === 'main-image' ? 'Image' : (id === 'table-users' ? 'Table' : id);

  function setToggleLabel(btn, id) {
    btn.textContent = isShaking(document.getElementById(id)) ? `Unshake ${labelFor(id)}` : `Shake ${labelFor(id)}`;
  }

  function toggleShakeById(id, btn) {
    const el = document.getElementById(id);
    if (!el) { console.warn(`Element with id="${id}" not found`); return; }
    const willShake = !isShaking(el);
    el.classList.toggle('shake', willShake);
    setToggleLabel(btn, id);
  }

  function makeToggleButton(targetId) {
    const btn = createEl('button', { id: `btn-toggle-${targetId}` });
    setToggleLabel(btn, targetId);
    const refEl = document.getElementById(targetId) || table;
    refEl.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', () => toggleShakeById(targetId, btn));
    return btn;
  }

  const btnToggleImg = img ? makeToggleButton('main-image') : null;
  const btnToggleTable = makeToggleButton('table-users');

  // Fetch with timeout and rendering
  async function fetchJsonWithTimeout(url, ms = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  function setTbodyMessage(msg) {
    tbody.innerHTML = '';
    const tr = createEl('tr');
    const td = createEl('td', { text: msg });
    td.setAttribute('colspan', '3');
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderUsers(users) {
    tbody.innerHTML = '';
    for (const u of users) {
      const tr = createEl('tr');
      const td1 = createEl('td', { text: escapeHtml(u.name) });
      const td2 = createEl('td', { text: escapeHtml(u.username) });
      const td3 = createEl('td', { text: escapeHtml(u.email) });
      tr.append(td1, td2, td3);
      tbody.appendChild(tr);
    }
  }

  async function loadUsers() {
    setTbodyMessage('Chargement...');
    try {
      const res = await fetchJsonWithTimeout('https://jsonplaceholder.typicode.com/users', 8000);
      if (!res.ok) {
        setTbodyMessage(`Erreur lors de la récupération : HTTP ${res.status}`);
        console.error(`Fetch failed: HTTP ${res.status}`);
        return;
      }
      const users = await res.json();
      if (!Array.isArray(users) || users.length === 0) {
        setTbodyMessage('Aucun utilisateur trouvé.');
        return;
      }
      renderUsers(users);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs :', err);
      if (err.name === 'AbortError') setTbodyMessage('Temps de connexion dépassé.');
      else setTbodyMessage('Impossible de charger les utilisateurs. Vérifiez votre connexion.');
    }
  }

  loadUsers();

  // Optional: refresh on caption double click
  table.querySelector('caption')?.addEventListener('dblclick', loadUsers);
});