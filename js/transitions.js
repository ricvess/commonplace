// js/transitions.js
(function() {
  // 1. Buat elemen tirai transisi
  const overlay = document.createElement('div');
  overlay.className = 'page-transition-overlay';
  document.body.appendChild(overlay);

  // 2. Saat halaman selesai dimuat, buka tirainya (fade out)
  window.addEventListener('load', () => {
    // Beri jeda sedikit agar browser siap
    setTimeout(() => {
      overlay.classList.remove('is-active');
    }, 50);
  });

  // 3. Intersepsi semua klik link internal
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    
    // Abaikan link kosong, anchor (#), link eksternal, atau buka tab baru
    if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') {
      return;
    }

    // Cegah pindah halaman instan dari browser
    e.preventDefault();

    // 4. Tutup tirai (fade in)
    overlay.classList.add('is-active');

    // 5. Setelah tirai tertutup (0.4 detik), baru pindah halaman
    setTimeout(() => {
      window.location.href = href;
    }, 400); // Harus sama dengan durasi transisi di CSS (0.4s)
  });
})();
