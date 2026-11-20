import { supabase } from './supabase.js';

let currentUser = null;
let savedContents = new Set();

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  currentUser = session.user;

  // Render User Sidebar
  const fullName = currentUser.user_metadata?.name || 'Friend';
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = fullName.charAt(0).toUpperCase();

  // Ambil data item yang sudah disave agar tombolnya jadi "Saved"
  const { data: existing } = await supabase
    .from('items')
    .select('content')
    .eq('user_id', currentUser.id);
  (existing || []).forEach(i => savedContents.add(i.content));

  // Load data
  await loadQuoteOfTheDay();
  await loadQuotes();

  // Event Listeners
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (confirm('Sign out?')) { await supabase.auth.signOut(); window.location.href = 'login.html'; }
  });
  
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('dash-sidebar')?.classList.toggle('open');
  });

  document.getElementById('refresh-quotes')?.addEventListener('click', loadQuotes);

  document.getElementById('quotes-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.save-quote');
    if (!btn || btn.disabled) return;
    saveQuote(btn.dataset.quote, btn.dataset.author, btn);
  });
}

async function loadQuoteOfTheDay() {
  try {
    const res = await fetch('https://dummyjson.com/quotes?limit=100');
    const data = await res.json();
    const quotes = data.quotes || [];
    if (!quotes.length) return;

    const seed = new Date().toISOString().slice(0, 10);
    const index = hashString(seed) % quotes.length;
    const q = quotes[index];

    document.getElementById('qotd-quote').textContent = `"${q.quote}"`;
    document.getElementById('qotd-author').textContent = `— ${q.author}`;

    const btn = document.getElementById('qotd-save');
    btn.disabled = false;
    btn.onclick = () => saveQuote(q.quote, q.author, btn);
  } catch (err) {
    console.error(err);
    document.getElementById('qotd-quote').textContent = 'Gagal memuat quote. Cek koneksi.';
  }
}

async function loadQuotes() {
  const grid = document.getElementById('quotes-grid');
  grid.innerHTML = '<p style="padding:2rem;color:var(--text-muted)">Memuat quote...</p>';

  try {
    const res = await fetch('https://dummyjson.com/quotes?limit=60'); // Ambil 60 quotes
    const data = await res.json();
    const quotes = data.quotes || [];

    grid.innerHTML = quotes.map((q, index) => {
      const alreadySaved = savedContents.has(q.quote);
      const delay = (index % 20) * 0.05; // Efek muncul satu per satu
      
      return `
        <article class="quote-card" style="animation-delay: ${delay}s">
          <blockquote>"${escapeHtml(q.quote)}"</blockquote>
          <footer>
            <span class="author">${escapeHtml(q.author)}</span>
            <button class="save-quote ${alreadySaved ? 'saved' : ''}"
              data-quote="${escapeHtml(q.quote)}"
              data-author="${escapeHtml(q.author)}"
              ${alreadySaved ? 'disabled' : ''}>
              ${alreadySaved ? 'Saved' : 'Save'}
            </button>
          </footer>
        </article>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<p style="padding:2rem;color:var(--text-muted)">Gagal memuat. Coba refresh.</p>';
  }
}

async function saveQuote(content, author, btn) {
  if (savedContents.has(content)) return;
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const { error } = await supabase.from('items').insert([{
    user_id: currentUser.id,
    type: 'quote',
    content,
    author,
    is_favorite: false
  }]);

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Save';
    alert('Gagal menyimpan: ' + error.message);
  } else {
    savedContents.add(content);
    btn.textContent = 'Saved';
    btn.classList.add('saved');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

init();