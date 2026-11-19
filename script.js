document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Animasi Reveal
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

  // 2. Logika Three Steps Interaktif
  const steps = document.querySelectorAll('.step');

  if (steps.length > 0) {
    steps.forEach((step, index) => {
      step.addEventListener('click', () => {
        const stepNum = parseInt(step.dataset.step);

        // Reset semua state dulu
        steps.forEach(s => {
          s.classList.remove('active');
          s.classList.remove('line-active');
        });

        // Nyalakan state berdasarkan klik
        if (stepNum === 1) {
          steps[0].classList.add('active');
        } 
        else if (stepNum === 2) {
          steps[0].classList.add('active');
          steps[0].classList.add('line-active'); // Nyalakan garis dari 1 ke 2
          steps[1].classList.add('active');
        } 
        else if (stepNum === 3) {
          steps[0].classList.add('active');
          steps[0].classList.add('line-active'); // Nyalakan garis dari 1 ke 2
          steps[1].classList.add('active');
          steps[1].classList.add('line-active'); // Nyalakan garis dari 2 ke 3
          steps[2].classList.add('active');
        }
      });
    });

    // Hilangkan garis kalau user scroll jauh dari section 'how'
    window.addEventListener('scroll', () => {
      const section = document.getElementById('how');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        steps.forEach(s => {
          s.classList.remove('active');
          s.classList.remove('line-active');
        });
      }
    });
  }
});