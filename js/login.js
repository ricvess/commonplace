import { supabase } from './supabase.js';

/* 3D Tilt */
const card = document.getElementById('tilt-card');
document.addEventListener('mousemove', (e) => {
  if (window.innerWidth < 900) return;
  const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
  const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
  card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
});
document.addEventListener('mouseleave', () => {
  card.style.transform = `rotateY(0deg) rotateX(0deg)`;
  card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
});
document.addEventListener('mouseenter', () => { card.style.transition = 'transform 0.1s ease'; });

/* Toggle Icon Mata */
const toggleBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const eyeIcon = toggleBtn.querySelector('svg');
toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  if (isHidden) {
    eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else {
    eyeIcon.innerHTML = `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`;
  }
});

/* Form Validasi & Login */
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submit-btn');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');

emailInput.addEventListener('input', () => {
  if (emailInput.value.includes('@')) { emailError.style.display = 'none'; emailInput.style.borderColor = 'rgba(35, 36, 33, 0.1)'; }
});
passwordInput.addEventListener('input', () => {
  if (passwordInput.value.length > 0) { passwordError.style.display = 'none'; passwordInput.style.borderColor = 'rgba(35, 36, 33, 0.1)'; }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let isValid = true;
  if (!emailInput.value || !emailInput.value.includes('@')) { emailError.style.display = 'block'; emailInput.style.borderColor = '#D96B5A'; isValid = false; }
  if (!passwordInput.value) { passwordError.style.display = 'block'; passwordInput.style.borderColor = '#D96B5A'; isValid = false; }
  if (!isValid) return;

  submitBtn.classList.add('loading');
  const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput.value.trim(), password: passwordInput.value });
  
  if (error) {
    submitBtn.classList.remove('loading');
    passwordError.textContent = error.message;
    passwordError.style.display = 'block';
    passwordInput.style.borderColor = '#D96B5A';
  } else {
    window.location.href = 'dashboard.html';
  }
});

/* ══════════════════════════════════════════════════════════════
   LOGIKA FORGOT PASSWORD
   ══════════════════════════════════════════════════════════════ */
const forgotLink = document.getElementById('forgot-link');
const forgotModal = document.getElementById('forgot-modal');
const closeForgot = document.getElementById('close-forgot');
const forgotForm = document.getElementById('forgot-form');
const resetEmailInput = document.getElementById('reset-email');
const resetBtn = document.getElementById('reset-btn');
const resetError = document.getElementById('reset-error');
const resetSuccess = document.getElementById('reset-success');

// Buka Modal
if (forgotLink) {
  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal.hidden = false;
    forgotForm.reset();
    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';
    resetBtn.classList.remove('loading');
    setTimeout(() => resetEmailInput.focus(), 100);
  });
}

// Tutup Modal
if (closeForgot) {
  closeForgot.addEventListener('click', () => {
    forgotModal.hidden = true;
  });
}

// Tutup jika klik di luar kotak modal
if (forgotModal) {
  forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) forgotModal.hidden = true;
  });
}

// Submit Form Reset
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = resetEmailInput.value.trim();
    
    if (!email || !email.includes('@')) {
      resetError.style.display = 'block';
      return;
    }

    resetBtn.classList.add('loading');
    resetError.style.display = 'none';

    // Mengirim email reset via Supabase
    // Ganti URL di bawah ini jika kamu sudah deploy (misal: https://domainkamu.vercel.app/pages/reset-password.html)
    // Mengambil base URL secara dinamis agar cocok di localhost maupun GitHub Pages
    const baseUrl = window.location.href.split('/pages/')[0];
    const redirectUrl = `${baseUrl}/pages/reset-password.html`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    resetBtn.classList.remove('loading');

    if (error) {
      resetError.textContent = error.message;
      resetError.style.display = 'block';
    } else {
      // Jika berhasil, sembunyikan form dan tampilkan pesan sukses
      forgotForm.style.display = 'none';
      resetSuccess.style.display = 'block';
      
      // Kembalikan form setelah 4 detik (opsional)
      setTimeout(() => {
        forgotForm.style.display = 'block';
        resetSuccess.style.display = 'none';
        forgotModal.hidden = true;
      }, 4000);
    }
  });
}
