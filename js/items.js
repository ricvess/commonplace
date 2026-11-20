import { supabase } from './supabase.js';

let currentUser = null;
let allItems = [];
let currentFilter = 'all';
let currentSearch = '';

const TYPE_LABEL = { quote: 'Quote', idea: 'Idea', article: 'Article', note: 'Note' };

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;
  renderUserSidebar();
  await fetchItems();
}

function renderUserSidebar() {
  const fullName = currentUser.user_metadata?.name || 'Friend';
  const firstName = fullName.split(' ')[0];
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = firstName.charAt(0).toUpperCase();
}

async function fetchItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetch items:', error);
    alert('Gagal memuat data: ' + error.message);
    return;
  }

  allItems = data || [];
  const navBadge = document.getElementById('nav-count-items');
  if (navBadge) navBadge.textContent = allItems.length;
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('items-grid');
  if (!grid) return;
  
  let filtered = allItems;
  if (currentFilter !== 'all') filtered = filtered.filter(i => i.type === currentFilter);
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(i => i.content.toLowerCase().includes(q) || (i.author || '').toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--text-muted);">Belum ada item.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <article class="item-card" data-type="${item.type}" data-id="${item.id}">
      <div class="item-head">
        <span class="item-tag tag-${item.type}">${TYPE_LABEL[item.type]}</span>
        <div class="item-actions">
          <button class="action-btn add-to-col" data-collect="${item.id}" aria-label="Add to Collection">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h6l2 2h10v10H3V7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="action-btn edit" data-edit="${item.id}" aria-label="Edit">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="action-btn delete" data-delete="${item.id}" aria-label="Delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <p class="item-body">${escapeHtml(item.content)}</p>
      <div class="item-meta">
        ${item.author ? `<span>${escapeHtml(item.author)}</span><span class="item-meta-dot"></span>` : ''}
        <span>${relativeTime(item.created_at)}</span>
      </div>
    </article>
  `).join('');
}

document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderGrid();
  });
});

document.getElementById('search-input')?.addEventListener('input', (e) => {
  currentSearch = e.target.value.trim();
  renderGrid();
});

// Quick Add Modal
const modal = document.getElementById('item-modal');
const form = document.getElementById('item-form');
const idInput = document.getElementById('edit-item-id');
const contentInput = document.getElementById('add-content');
const authorInput = document.getElementById('add-author');
const modalTitle = document.getElementById('modal-title');
const submitBtn = document.getElementById('submit-btn');
let currentType = 'quote';

function openModal(type = 'quote', item = null) {
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  
  if (item) {
    modalTitle.textContent = 'Edit Item';
    submitBtn.querySelector('.btn-text').textContent = 'Update Item';
    idInput.value = item.id;
    contentInput.value = item.content;
    authorInput.value = item.author || '';
    setType(item.type);
  } else {
    modalTitle.textContent = 'Add Item';
    submitBtn.querySelector('.btn-text').textContent = 'Save Item';
    form.reset();
    idInput.value = '';
    setType(type);
  }
  setTimeout(() => contentInput.focus(), 100);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  form.reset();
}

function setType(type) {
  currentType = type;
  document.querySelectorAll('.type-tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));
  const authorField = document.getElementById('field-author');
  if (authorField) authorField.style.display = (type === 'idea' || type === 'note') ? 'none' : 'flex';
  const placeholders = { quote: 'Write a quote...', idea: 'Write an idea...', article: 'Article title...', note: 'Write a note...' };
  contentInput.placeholder = placeholders[type] || 'Write here...';
}

document.getElementById('open-quick-add')?.addEventListener('click', () => openModal());
document.getElementById('close-modal')?.addEventListener('click', closeModal);
document.getElementById('cancel-modal')?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.querySelectorAll('.type-tab').forEach(tab => { tab.addEventListener('click', () => setType(tab.dataset.type)); });

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = contentInput.value.trim();
  if (!content) return;

  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Saving...';
  submitBtn.disabled = true;

  const isEdit = !!idInput.value;
  const payload = { type: currentType, content: content, author: authorInput.value.trim() };

  let error;
  if (isEdit) {
    const { error: err } = await supabase.from('items').update(payload).eq('id', idInput.value);
    error = err;
  } else {
    const { error: err } = await supabase.from('items').insert([{ ...payload, user_id: currentUser.id }]);
    error = err;
  }

  submitBtn.innerHTML = originalText;
  submitBtn.disabled = false;

  if (error) alert('Error: ' + error.message);
  else { closeModal(); await fetchItems(); }
});

// Event Delegation (Edit/Delete/Add to Collection)
document.getElementById('items-grid')?.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    const item = allItems.find(i => i.id === editBtn.dataset.edit);
    if (item) openModal(item.type, item);
    return;
  }

  const deleteBtn = e.target.closest('[data-delete]');
  if (deleteBtn) {
    if (confirm('Delete this item?')) {
      const { error } = await supabase.from('items').delete().eq('id', deleteBtn.dataset.delete);
      if (!error) await fetchItems();
    }
    return;
  }

  const colBtn = e.target.closest('[data-collect]');
  if (colBtn) {
    openColModal(colBtn.dataset.collect);
    return;
  }
});

// Add to Collection Modal
const colModal = document.getElementById('col-modal');
const colForm = document.getElementById('col-form');
const colSelect = document.getElementById('col-select');
const colItemIdInput = document.getElementById('col-item-id');

async function openColModal(itemId) {
  if (!colModal) return;
  colModal.hidden = false;
  document.body.style.overflow = 'hidden';
  colItemIdInput.value = itemId;
  colSelect.innerHTML = '<option value="">Loading...</option>';

  const { data, error } = await supabase.from('collections').select('id, name');
  
  if (error || !data || data.length === 0) {
    colSelect.innerHTML = '<option value="">Belum ada folder. Buat dulu di Collections.</option>';
    return;
  }

  colSelect.innerHTML = '<option value="">-- Pilih Folder --</option>' + data.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

document.getElementById('close-col-modal')?.addEventListener('click', () => { colModal.hidden = true; document.body.style.overflow = ''; });
document.getElementById('cancel-col-btn')?.addEventListener('click', () => { colModal.hidden = true; document.body.style.overflow = ''; });

colForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const colId = colSelect.value;
  const itemId = colItemIdInput.value;
  if (!colId) return;

  const btn = colForm.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const { error } = await supabase.from('collection_items').insert([{ collection_id: colId, item_id: itemId }]);

  btn.textContent = originalText;
  btn.disabled = false;

  if (error) {
    if (error.code === '23505') alert('Item is already in this collection!');
    else alert('Failed: ' + error.message);
  } else {
    colModal.hidden = true;
    document.body.style.overflow = '';
    alert('Successfully added to collection!');
  }
});

// Logout & Sidebar
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  if (confirm('Sign out?')) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  }
});

document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  document.getElementById('dash-sidebar')?.classList.toggle('open');
});

// ─── Animasi Reveal (Memunculkan elemen saat di-scroll) ───
function setupReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { 
          entry.target.classList.add('is-visible'); 
          observer.unobserve(entry.target); 
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }
}

// Panggil fungsinya di dalam init()

init();
