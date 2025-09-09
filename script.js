console.log('Hello world from script.js');

/* DOM initial setup */
const h1 = document.querySelector('h1');
h1.textContent += ' from JS';
h1.style.color = 'purple';

const h2 = document.createElement('h2');
h2.textContent = 'Welcome to the DOM';
h1.insertAdjacentElement('afterend', h2);

/* Horloge */
const h3 = document.createElement('h3');
h2.insertAdjacentElement('afterend', h3);
function updateTime() {
    const now = new Date();
    h3.textContent = 'Heure actuelle : ' + now.toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

/* Liste d'exemple */
const ul = document.createElement('ul');
ul.id = 'my-list';
const li1 = document.createElement('li'); li1.textContent = 'Élément 1'; ul.appendChild(li1);
const li2 = document.createElement('li'); li2.textContent = 'Élément 2'; ul.appendChild(li2);
h3.insertAdjacentElement('afterend', ul);
ul.removeChild(li1);
const li3 = document.createElement('li'); li3.textContent = 'Élément ajouté en JS'; ul.appendChild(li3);

/* Image */
const img = document.getElementById('main-image');

/* --- TABLE CREATION --- */
function createTableElement() {
    const tbl = document.createElement('table');
    tbl.id = 'table-users';
    const caption = document.createElement('caption');
    caption.textContent = 'People';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Name</th><th>User name</th><th>Email</th></tr>';
    const tbody = document.createElement('tbody');
    tbl.append(caption, thead, tbody);
    const ref = document.getElementById('btn-toggle-img') || document.getElementById('btn-toggle-img') || img;
    ref.insertAdjacentElement('afterend', tbl);
    return tbl;
}

let table = document.getElementById('table-users') || createTableElement();

/* --- TOGGLE SHAKE --- */
function isShaking(el) {
    return el && el.classList.contains('shake');
}

/**
 * Toggle shake class on element with given id.
 * Updates the provided button text to reflect the new state.
 * @param {string} id - id of the element to toggle
 * @param {HTMLButtonElement} btn - button to update label
 */
function toggleShakeById(id, btn) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`Element with id="${id}" not found`);
        return;
    }
    const willShake = !isShaking(el);
    el.classList.toggle('shake', willShake);
    btn.textContent = willShake ? getUnshakeLabelFor(id) : getShakeLabelFor(id);
}

function getShakeLabelFor(id) {
    return id === 'main-image' ? 'Shake Image' : 'Shake Table';
}
function getUnshakeLabelFor(id) {
    return id === 'main-image' ? 'Unshake Image' : 'Unshake Table';
}

/* Create single toggle buttons (image and table) */
const btnToggleImg = document.createElement('button');
btnToggleImg.id = 'btn-toggle-img';
btnToggleImg.textContent = isShaking(img) ? getUnshakeLabelFor('main-image') : getShakeLabelFor('main-image');
img.insertAdjacentElement('afterend', btnToggleImg);

const btnToggleTable = document.createElement('button');
btnToggleTable.id = 'btn-toggle-table';
btnToggleTable.textContent = isShaking(table) ? getUnshakeLabelFor('table-users') : getShakeLabelFor('table-users');
table.insertAdjacentElement('afterend', btnToggleTable);

/* Attach handlers */
btnToggleImg.addEventListener('click', () => toggleShakeById('main-image', btnToggleImg));
btnToggleTable.addEventListener('click', () => toggleShakeById('table-users', btnToggleTable));

/* --- FETCH USERS + gestion des erreurs / cas vide --- */
function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}

async function loadUsers() {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="3">Chargement...</td></tr>';
    try {
        const res = await fetch('https://jsonplaceholder.typicode.com/users');
        if (!res.ok) {
            // gestion des erreurs HTTP explicite
            tbody.innerHTML = `<tr><td colspan="3">Erreur lors de la récupération : HTTP ${res.status}</td></tr>`;
            console.error(`Fetch failed: HTTP ${res.status}`);
            return;
        }
        const users = await res.json();
        if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">Aucun utilisateur trouvé.</td></tr>`;
            return;
        }
        tbody.innerHTML = ''; // reset
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(u.email)}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erreur lors du chargement des utilisateurs :', err);
        tbody.innerHTML = `<tr><td colspan="3">Impossible de charger les utilisateurs. Vérifiez votre connexion.</td></tr>`;
    }
}

loadUsers();