/* ══════════════════════════════════════════════════════════════
   SETTINGS — Logic & Supabase
   ══════════════════════════════════════════════════════════════ */
import { supabase } from './supabase.js';

let currentUser = null;

// ─── Init ─────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = session.user;
  renderUserSidebar();
  populateForm();
  setupPreferences(); // <-- Ini yang benar (menggantikan setupThemeToggle)
  setupReveal();
}

function renderUserSidebar() {
  const fullName = currentUser.user_metadata?.name || 'Friend';
  const firstName = fullName.split(' ')[0];
  document.getElementById('user-name').textContent = fullName;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = firstName.charAt(0).toUpperCase();
}

// ─── Form Logic ───────────────────────────────────────────
function populateForm() {
  document.getElementById('set-name').value = currentUser.user_metadata?.name || '';
  document.getElementById('set-email').value = currentUser.email;
}

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newName = document.getElementById('set-name').value.trim();
  if (!newName) return;

  const btn = document.getElementById('save-profile-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Saving...';
  btn.disabled = true;

  // 1. Update di Auth Metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { name: newName }
  });

  // 2. Update juga di tabel Profiles
  if (!authError) {
    await supabase.from('profiles').update({ display_name: newName }).eq('id', currentUser.id);
    
    // Update UI Sidebar
    currentUser.user_metadata.name = newName;
    renderUserSidebar();
    
    showToast('Profile updated successfully');
  } else {
    alert('Error updating profile: ' + authError.message);
  }

  btn.innerHTML = originalText;
  btn.disabled = false;
});

// ─── Discovery Preferences Logic (Baru) ───────────────────
function setupPreferences() {
  const rediscoveryToggle = document.getElementById('rediscovery-toggle');
  const exportBtn = document.getElementById('export-btn');

  // 1. Logika Toggle Daily Rediscovery
  if (rediscoveryToggle) {
    const savedPref = localStorage.getItem('commonplace_rediscovery');
    rediscoveryToggle.checked = savedPref !== 'false'; // Default-nya true

    rediscoveryToggle.addEventListener('change', (e) => {
      localStorage.setItem('commonplace_rediscovery', e.target.checked);
      showToast(`Daily Rediscovery ${e.target.checked ? 'enabled' : 'disabled'}`);
    });
  }

  // 2. Logika Export Data ke JSON
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.textContent = 'Exporting...';
      exportBtn.disabled = true;

      const { data, error } = await supabase.from('items').select('*');
      
      if (error) {
        alert('Failed to export data.');
      } else {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `commonplace_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('Library exported successfully!');
      }

      exportBtn.textContent = 'Export';
      exportBtn.disabled = false;
    });
  }
}

// ─── Logout & Sidebar Toggle ──────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  if (confirm('Sign out?')) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  }
});

const sidebar = document.getElementById('dash-sidebar');
document.getElementById('sidebar-toggle')?.addEventListener('click', () => sidebar.classList.toggle('open'));

// ─── Toast ────────────────────────────────────────────────
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