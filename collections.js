/* ══════════════════════════════════════════════════════════════
   COLLECTIONS — Logic & Supabase
   ══════════════════════════════════════════════════════════════ */
import { supabase } from './supabase.js';

let currentUser = null;
let collections = [];
let searchQuery = '';

// ─── Helpers ──────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Init ─────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = session.user;
  renderUserSidebar();
  await fetchCollections();
  setupReveal();
}

function renderUserSidebar() {
  const fullName = currentUser.user_metadata?.name || 'Friend';
  const firstName = fullName.split(' ')[0];
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = firstName.charAt(0).toUpperCase();
}

// ─── Fetch & Render ───────────────────────────────────────
async function fetchCollections() {
  // Ambil collections beserta jumlah item di dalamnya
  const { data, error } = await supabase
    .from('collections')
    .select(`
      *,
      collection_items ( item_id )
    `)
    .order('created_at', { ascending: false });

  if (!error) {
    collections = data || [];
    renderGrid();
  }
}

function renderGrid() {
  const grid = document.getElementById('collections-grid');
  if (!grid) return;

  let filtered = collections;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.description || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="collections-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h6l2 2h10v10H3V7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>No collections yet</h3>
        <p>Create a collection to start grouping your items.</p>
      </div>
    `;
    return;
  }

    grid.innerHTML = filtered.map((c, index) => `
    <a href="collection-detail.html?id=${c.id}" style="text-decoration: none; color: inherit;">
    <article class="collection-card" data-id="${c.id}" style="animation: cardIn 0.5s var(--ease) both; animation-delay: ${index * 0.05}s;">
      <div class="collection-actions">
        <button class="action-btn edit" data-edit="${c.id}" aria-label="Edit">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="action-btn delete" data-delete="${c.id}" aria-label="Delete">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      
      <div class="collection-icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h6l2 2h10v10H3V7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      
      <h3 class="collection-name">${escapeHtml(c.name)}</h3>
      <p class="collection-desc">${escapeHtml(c.description || 'No description')}</p>
      
      <div class="collection-meta">
        <span>${c.collection_items ? c.collection_items.length : 0} items</span>
        ${c.is_public ? `<span class="public-badge">Public</span>` : ''}
      </div>
    </article>
  `).join('');
}

// ─── Modal Add/Edit Logic ─────────────────────────────────
const modal = document.getElementById('collection-modal');
const form = document.getElementById('collection-form');
const idInput = document.getElementById('edit-collection-id');
const nameInput = document.getElementById('collection-name');
const descInput = document.getElementById('collection-desc');
const publicInput = document.getElementById('collection-public');
const modalTitle = document.getElementById('modal-title');
const submitBtn = document.getElementById('submit-btn');

function openModal(collection = null) {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  
  if (collection) {
    modalTitle.textContent = 'Edit Collection';
    submitBtn.querySelector('.btn-text').textContent = 'Update Collection';
    idInput.value = collection.id;
    nameInput.value = collection.name;
    descInput.value = collection.description || '';
    publicInput.checked = collection.is_public;
  } else {
    modalTitle.textContent = 'New Collection';
    submitBtn.querySelector('.btn-text').textContent = 'Create Collection';
    form.reset();
    idInput.value = '';
  }
  
  setTimeout(() => nameInput.focus(), 100);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  form.reset();
}

// Event Listeners Modal
document.getElementById('open-collection-modal')?.addEventListener('click', () => openModal());
document.getElementById('close-modal')?.addEventListener('click', closeModal);
document.getElementById('cancel-modal')?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

// ─── Submit Form ──────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Saving...';
  submitBtn.disabled = true;

  const isEdit = !!idInput.value;
  const payload = {
    name: name,
    description: descInput.value.trim(),
    is_public: publicInput.checked
  };

  let error;
  if (isEdit) {
    const { error: err } = await supabase.from('collections').update(payload).eq('id', idInput.value);
    error = err;
  } else {
    const { error: err } = await supabase.from('collections').insert([{ ...payload, user_id: currentUser.id }]);
    error = err;
  }

  submitBtn.innerHTML = originalText;
  submitBtn.disabled = false;

  if (error) {
    alert('Error: ' + error.message);
  } else {
    closeModal();
    await fetchCollections(); // Refresh data
  }
});

// ─── Edit & Delete Buttons ────────────────────────────────
document.getElementById('collections-grid')?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    e.stopPropagation();
    const col = collections.find(c => c.id === editBtn.dataset.edit);
    if (col) openModal(col);
    return;
  }

  const deleteBtn = e.target.closest('[data-delete]');
  if (deleteBtn) {
    e.stopPropagation();
    if (confirm('Delete this collection? (Items inside will not be deleted)')) {
      const { error } = await supabase.from('collections').delete().eq('id', deleteBtn.dataset.delete);
      if (!error) {
        collections = collections.filter(c => c.id !== deleteBtn.dataset.delete);
        renderGrid();
      }
    }
  }
});

// ─── Search & Sidebar ─────────────────────────────────────
document.getElementById('search-input')?.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderGrid();
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  if (confirm('Sign out?')) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  }
});

const sidebar = document.getElementById('dash-sidebar');
document.getElementById('sidebar-toggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));

// ─── Reveal Animations ────────────────────────────────────
function setupReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }
}

init();