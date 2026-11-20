import { supabase } from './supabase.js';

let currentUser = null;
let colItems = [];
let currentSearch = '';
let collectionId = null;

const TYPE_LABEL = { quote: 'Quote', idea: 'Idea', article: 'Article', note: 'Note' };

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function relativeTime(iso) { const diff = Date.now() - new Date(iso).getTime(); const hr = Math.floor(diff / 3600000); if (hr < 24) return hr === 0 ? 'Just now' : `${hr}h ago`; return `${Math.floor(hr / 24)}d ago`; }

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;
  
  // Ambil ID koleksi dari URL (misal: collection-detail.html?id=123)
  const urlParams = new URLSearchParams(window.location.search);
  collectionId = urlParams.get('id');

  if (!collectionId) {
    alert('Collection ID not found.');
    window.location.href = 'collections.html';
    return;
  }

  renderUserSidebar();
  await fetchCollectionDetails();
  await fetchItems();

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();
    renderGrid();
  });
  
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (confirm('Sign out?')) { await supabase.auth.signOut(); window.location.href = 'login.html'; }
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('dash-sidebar')?.classList.toggle('open');
  });
}

function renderUserSidebar() {
  const fullName = currentUser.user_metadata?.name || 'Friend';
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = fullName.charAt(0).toUpperCase();
}

async function fetchCollectionDetails() {
  const { data, error } = await supabase.from('collections').select('name, description').eq('id', collectionId).single();
  if (!error && data) {
    document.getElementById('col-name').textContent = data.name;
    document.getElementById('col-desc').textContent = data.description || 'No description.';
    document.title = `${data.name} — COMMONPLACE`;
  }
}

async function fetchItems() {
  // Mengambil item yang berelasi dengan koleksi ini
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      item_id,
      items ( id, type, content, author, created_at )
    `)
    .eq('collection_id', collectionId);

  if (!error) {
    colItems = data.map(d => d.items); // Ambil objek items-nya saja
    renderGrid();
  }
}

function renderGrid() {
  const grid = document.getElementById('items-grid');
  
  let filtered = colItems.filter(i => i); // Filter null items (jaga-jaga)
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(i => i.content.toLowerCase().includes(q) || (i.author || '').toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem; border: 1px dashed var(--line); border-radius: 2px; color: var(--text-muted);">
        <h3 style="color: var(--text); margin-bottom: 0.5rem;">This collection is empty</h3>
        <p>Go to All Items, click the folder icon, and add items here.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <article class="item-card" data-type="${item.type}">
      <div class="item-head">
        <span class="item-tag tag-${item.type}">${TYPE_LABEL[item.type]}</span>
        <button class="action-btn delete" data-remove="${item.id}" title="Remove from collection">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round"/></svg>
        </button>
      </div>
      <p class="item-body">${escapeHtml(item.content)}</p>
      <div class="item-meta">
        ${item.author ? `<span>${escapeHtml(item.author)}</span><span class="item-meta-dot"></span>` : ''}
        <span>${relativeTime(item.created_at)}</span>
      </div>
    </article>
  `).join('');
}

// Event: Remove item dari koleksi (bukan hapus dari DB utama)
document.getElementById('items-grid')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-remove]');
  if (btn) {
    if (confirm('Remove this item from the collection? (It stays in All Items)')) {
      const itemId = btn.dataset.remove;
      await supabase.from('collection_items').delete().match({ collection_id: collectionId, item_id: itemId });
      await fetchItems(); // Refresh
    }
  }
});

init();
