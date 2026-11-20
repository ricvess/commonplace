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

/* Validasi & Supabase Sign Up */
const form = document.getElementById('signup-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const termsInput = document.getElementById('terms');
const submitBtn = document.getElementById('submit-btn');

const nameError = document.getElementById('name-error');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const termsError = document.getElementById('terms-error');

// Hilangkan error saat user mengetik
nameInput.addEventListener('input', () => { if(nameInput.value.length >= 2) { nameError.style.display = 'none'; nameInput.style.borderColor = 'rgba(35, 36, 33, 0.1)'; } });
emailInput.addEventListener('input', () => { if(emailInput.value.includes('@')) { emailError.style.display = 'none'; emailInput.style.borderColor = 'rgba(35, 36, 33, 0.1)'; } });
passwordInput.addEventListener('input', () => { if(passwordInput.value.length >= 8) { passwordError.style.display = 'none'; passwordInput.style.borderColor = 'rgba(35, 36, 33, 0.1)'; } });
termsInput.addEventListener('change', () => { if(termsInput.checked) { termsError.style.display = 'none'; } });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let isValid = true;

  // Validasi
  if (nameInput.value.trim().length < 2) { nameError.style.display = 'block'; nameInput.style.borderColor = '#D96B5A'; isValid = false; }
  if (!emailInput.value.includes('@')) { emailError.style.display = 'block'; emailInput.style.borderColor = '#D96B5A'; isValid = false; }
  if (passwordInput.value.length < 8) { passwordError.style.display = 'block'; passwordInput.style.borderColor = '#D96B5A'; isValid = false; }
  if (!termsInput.checked) { termsError.style.display = 'block'; isValid = false; }

  if (!isValid) return;

  // Loading
  submitBtn.classList.add('loading');

  // Daftar ke Supabase
  const { data, error } = await supabase.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value,
    options: {
      data: { name: nameInput.value.trim() }
    }
  });

  if (error) {
    submitBtn.classList.remove('loading');
    // Tampilkan error (misal: email sudah terdaftar)
    emailError.textContent = error.message;
    emailError.style.display = 'block';
    emailInput.style.borderColor = '#D96B5A';
  } else {
    // Berhasil daftar, langsung ke dashboard
    window.location.href = 'dashboard.html';
  }
});