/* ══════════════════════════════════════════════════════════════
   DASHBOARD — Supabase Integration
   ══════════════════════════════════════════════════════════════ */
import { supabase } from './supabase.js';

// ─── Global State ─────────────────────────────────────────
let currentUser = null;
let userItems = [];

// ─── Helpers ──────────────────────────────────────────────
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const TYPE_LABEL = { quote: 'Quote', idea: 'Idea', article: 'Article', note: 'Note' };

// ─── Render: User & Greeting ──────────────────────────────
function renderUser() {
  if (!currentUser) return;
  
  // Ambil nama dari metadata (sesuai yang diketik saat signup)
  const fullName = currentUser.user_metadata?.name || 'Friend';
  const firstName = fullName.split(' ')[0];
  const avatar = firstName.charAt(0).toUpperCase();
  const email = currentUser.email;

  document.getElementById('greeting-name').textContent = firstName + '.';
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-avatar').textContent = avatar;

  // Waktu (Pagi/Siang/Malam)
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  document.getElementById('greeting-time').textContent = greeting;

  // Tanggal
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('current-date').textContent = dateStr;
}

// ─── Render: Stats ────────────────────────────────────────
function renderStats() {
  const counts = {
    total: userItems.length,
    collections: 0,
    quotes: userItems.filter((i) => i.type === 'quote').length,
    notes: userItems.filter((i) => i.type === 'note').length,
  };

  document.querySelectorAll('.stat-value').forEach((el) => {
    const key = el.dataset.stat;
    if (key in counts) el.textContent = counts[key]; // Simplified, hapus animasi sementara agar simpel
  });

  const navCount = document.getElementById('nav-count-items');
  if (navCount) navCount.textContent = userItems.length;
}

// ─── Render: Recent Items ─────────────────────────────────
function renderRecent(filterText) {
  const list = document.getElementById('recent-list');
  if (!list) return;

  let items = userItems;
  if (filterText) {
    const q = filterText.toLowerCase();
    items = items.filter((i) => i.content.toLowerCase().includes(q) || (i.author || '').toLowerCase().includes(q));
  }

  items = items.slice(0, 6);

  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v18M3 12h18" stroke-linecap="round"/></svg>
        </div>
        <h3>No items yet</h3>
        <p>Click "Quick Add" to save your first inspiration.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map((item, idx) => `
    <article class="item-card" data-type="${item.type}" data-id="${item.id}" style="animation-delay: ${idx * 0.04}s;">
      <div class="item-head">
        <span class="item-tag tag-${item.type}">${TYPE_LABEL[item.type] || item.type}</span>
        <button class="item-favorite ${item.is_favorite ? 'active' : ''}" data-fav="${item.id}" aria-label="Toggle favorite">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${item.is_favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" stroke-linecap="round" stroke-linejoin="round"/></svg>
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

// ─── Render: Rediscovery ──────────────────────────────────
function renderRediscovery() {
  // --- TAMBAHKAN INI ---
  const isEnabled = localStorage.getItem('commonplace_rediscovery') !== 'false';
  const card = document.querySelector('.rediscovery-card');
  if (card) card.style.display = isEnabled ? '' : 'none';
  if (!isEnabled) return;
  // ---------------------

  const items = getItems();
  // ... (sisa kode ke bawah biarkan sama)


  if (!userItems.length) {
    contentEl.innerHTML = `<p class="rediscovery-quote">"Your library is empty — for now."</p><span class="rediscovery-meta">— Save your first item</span>`;
    return;
  }

  const random = userItems[Math.floor(Math.random() * userItems.length)];
  const meta = random.author ? escapeHtml(random.author) : `${relativeTime(random.created_at)} · ${TYPE_LABEL[random.type]}`;

  contentEl.innerHTML = `
    <p class="rediscovery-quote">"${escapeHtml(random.content)}"</p>
    <span class="rediscovery-meta">— ${meta}</span>
  `;
}

// ─── Fetch Data dari Supabase ─────────────────────────────
async function fetchData() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Jika tidak ada session login, tendang ke halaman login
    window.location.href = 'login.html';
    return;
  }

  currentUser = session.user;

  // Ambil data items milik user ini
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  userItems = items || [];
  
  renderUser();
  renderStats();
  renderRecent();
  renderRediscovery();
}

// ─── Quick Add Modal Logic ────────────────────────────────
const modal = document.getElementById('quick-add-modal');
const openBtn = document.getElementById('open-quick-add');
const closeBtn = document.getElementById('close-quick-add');
const cancelBtn = document.getElementById('cancel-add');
const form = document.getElementById('quick-add-form');
const contentInput = document.getElementById('add-content');
const authorInput = document.getElementById('add-author');
const contentLabel = document.getElementById('content-label');
const submitBtn = form?.querySelector('button[type="submit"]');

let currentType = 'quote';

const TYPE_PLACEHOLDER = { quote: 'Paste a quote...', idea: 'Write down an idea...', article: 'Paste article title...', note: 'Write a note...' };
const TYPE_LABEL_FIELD = { quote: 'Quote', idea: 'Idea', article: 'Article', note: 'Note' };

function setType(type) {
  currentType = type;
  document.querySelectorAll('.type-tab').forEach((t) => t.classList.toggle('active', t.dataset.type === type));
  if (contentInput) { contentInput.placeholder = TYPE_PLACEHOLDER[type]; contentInput.value = ''; }
  if (authorInput) authorInput.value = '';
  if (contentLabel) contentLabel.textContent = TYPE_LABEL_FIELD[type];
  
  const authorField = document.getElementById('field-author');
  if (authorField) authorField.style.display = (type === 'idea' || type === 'note') ? 'none' : 'flex';
}

function openModal(type) {
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setType(type || 'quote');
  setTimeout(() => contentInput && contentInput.focus(), 100);
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  if (form) form.reset();
}

if (openBtn) openBtn.addEventListener('click', () => openModal('quote'));
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.hidden) closeModal(); });
document.querySelectorAll('.type-tab').forEach((tab) => tab.addEventListener('click', () => setType(tab.dataset.type)));
document.querySelectorAll('.quick-link').forEach((link) => link.addEventListener('click', () => openModal(link.dataset.type)));

// ─── Simpan Item Baru ke Supabase ─────────────────────────
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = contentInput.value.trim();
    if (!content) { contentInput.focus(); return; }

    // Ubah tombol jadi loading
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Saving...';
    submitBtn.disabled = true;

    const newItem = {
      user_id: currentUser.id,
      type: currentType,
      content: content,
      author: authorInput.value.trim(),
      is_favorite: false
    };

    const { data, error } = await supabase.from('items').insert([newItem]).select();

    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;

    if (error) {
      alert('Failed to save: ' + error.message);
    } else {
      closeModal();
      // Update array lokal agar UI langsung berubah tanpa refresh
      if (data && data.length > 0) {
        userItems.unshift(data[0]);
        renderStats();
        renderRecent();
        renderRediscovery();
        showToast('Saved to your library');
      }
    }
  });
}

// ─── Toggle Favorite di Supabase ──────────────────────────
const recentList = document.getElementById('recent-list');
if (recentList) {
  recentList.addEventListener('click', async (e) => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      e.stopPropagation();
      const itemId = favBtn.dataset.fav;
      const item = userItems.find(i => i.id === itemId);
      if (!item) return;

      // Update UI langsung (Optimistic UI)
      item.is_favorite = !item.is_favorite;
      renderRecent(document.getElementById('search-input').value.trim());

      // Update ke Supabase
      await supabase.from('items').update({ is_favorite: item.is_favorite }).eq('id', itemId);
    }
  });
}

// ─── Search, Sidebar, Logout ──────────────────────────────
const searchInput = document.getElementById('search-input');
if (searchInput) {
  let t;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => renderRecent(e.target.value.trim()), 200);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchInput.focus(); }
  });
}

const refreshBtn = document.getElementById('refresh-rediscovery');
if (refreshBtn) refreshBtn.addEventListener('click', renderRediscovery);

const sidebar = document.getElementById('dash-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (confirm('Sign out?')) {
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    }
  });
}

// ─── Toast Notifikasi ─────────────────────────────────────
function showToast(message) {
  const existing = document.querySelector('.dash-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'dash-toast';
  toast.textContent = message;
  toast.style.cssText = `position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px); background: #232421; color: #FAF9F6; padding: 0.75rem 1.25rem; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; z-index: 200; opacity: 0; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 8px 24px rgba(35,36,33,0.2);`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(20px)'; setTimeout(() => toast.remove(), 300); }, 2200);
}

// ─── Init ─────────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && reveals.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach((el) => observer.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

fetchData(); // Jalankan saat halaman dimuat