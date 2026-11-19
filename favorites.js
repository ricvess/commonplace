/* ══════════════════════════════════════════════════════════════
   FAVORITES — Logic & Supabase
   ══════════════════════════════════════════════════════════════ */
import { supabase } from './supabase.js';

let currentUser = null;
let favoriteItems = [];
let currentSearch = '';

// ─── Helpers ──────────────────────────────────────────────
const TYPE_LABEL = { quote: 'Quote', idea: 'Idea', article: 'Article', note: 'Note' };

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const hr = Math.floor(diff / 3600000);
  if (hr < 24) return hr === 0 ? 'Just now' : `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// ─── Fetch Data ───────────────────────────────────────────
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  currentUser = session.user;
  renderUserSidebar();

  await fetchFavorites();
  setupReveal();
}

function renderUserSidebar() {
  const fullName = currentUser.user_metadata?.name || 'Friend';
  const firstName = fullName.split(' ')[0];
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = firstName.charAt(0).toUpperCase();
}

async function fetchFavorites() {
  // Hanya ambil item yang is_favorite = true
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('is_favorite', true)
    .order('created_at', { ascending: false });

  if (!error) {
    favoriteItems = data || [];
    renderGrid();
  }
}

// ─── Render Grid ──────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('favorites-grid');
  
  let filtered = favoriteItems;
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(i => i.content.toLowerCase().includes(q) || (i.author || '').toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="items-empty" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; border: 1px dashed var(--line); border-radius: var(--r-md); color: var(--text-muted);">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; color: var(--warm-gray);"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3 style="color: var(--text); margin-bottom: 0.5rem;">No favorites yet</h3>
        <p>Click the heart icon on any item to add it here.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((item, index) => `
    <article class="item-card" data-type="${item.type}" data-id="${item.id}" style="animation: cardIn 0.5s var(--ease) both; animation-delay: ${index * 0.05}s;">
      <div class="item-head">
        <span class="item-tag tag-${item.type}">${TYPE_LABEL[item.type]}</span>
        <button class="item-favorite active" data-unfav="${item.id}" aria-label="Remove from favorites" title="Remove from favorites">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" stroke-linecap="round" stroke-linejoin="round"/></svg>
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

// ─── Hapus dari Favorites (Unfavorite) ────────────────────
document.getElementById('favorites-grid')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-unfav]');
  if (btn) {
    e.stopPropagation();
    const id = btn.dataset.unfav;
    
    // Hapus langsung dari UI
    favoriteItems = favoriteItems.filter(i => i.id !== id);
    renderGrid();

    // Update di database (set is_favorite = false)
    await supabase.from('items').update({ is_favorite: false }).eq('id', id);
  }
});

// ─── Search Logic ─────────────────────────────────────────
document.getElementById('search-input')?.addEventListener('input', (e) => {
  currentSearch = e.target.value.trim();
  renderGrid();
});

// ─── Logout & Sidebar ─────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  if (confirm('Sign out?')) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  }
});

const sidebar = document.getElementById('dash-sidebar');
document.getElementById('sidebar-toggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));

// ─── Animasi Reveal ───────────────────────────────────────
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