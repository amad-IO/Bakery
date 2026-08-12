// KAYA Bakery — Landing Page Animations
// GSAP + ScrollTrigger + Lenis smooth scroll

// ── Respect prefers-reduced-motion ────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Lenis Smooth Scroll ────────────────────────────────────────
let lenis;
if (!prefersReduced && window.Lenis) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    smooth: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// ── GSAP Setup ─────────────────────────────────────────────────
if (!prefersReduced && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Connect Lenis with GSAP ScrollTrigger
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  // ── Hero Animations ────────────────────────────────────────
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTl
    .fromTo('#hero-badge', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8 }, 0.3)
    .fromTo('#hero-title', { opacity: 0, y: 60, skewY: 2 }, { opacity: 1, y: 0, skewY: 0, duration: 1 }, 0.5)
    .fromTo('#hero-subtitle', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, 0.9)
    .fromTo('#hero-ctas', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, 1.1)
    .fromTo('.float-stack-card', { opacity: 0, x: 60, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.7, stagger: 0.12 }, 0.6);

  // ── Section Reveals ────────────────────────────────────────
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0, duration: 0.85, ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // ── Product Cards Stagger ──────────────────────────────────
  function animateProductCards() {
    gsap.fromTo('.product-card',
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#product-grid',
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // Observe product grid for when products load
  const observer = new MutationObserver(() => {
    if (document.querySelectorAll('.product-card').length > 0) {
      animateProductCards();
      ScrollTrigger.refresh();
      observer.disconnect();
    }
  });
  const grid = document.getElementById('product-grid');
  if (grid) observer.observe(grid, { childList: true });

  // ── Feature Cards ──────────────────────────────────────────
  gsap.fromTo('.feature-card',
    { opacity: 0, y: 50 },
    {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '#features', start: 'top 80%' }
    }
  );

  // ── Stats Counter ──────────────────────────────────────────
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      onEnter: () => {
        gsap.fromTo({ val: 0 }, { val: target, duration: 1.5, ease: 'power2.out',
          onUpdate: function() { el.textContent = Math.round(this.targets()[0].val).toLocaleString('id') + '+'; }
        });
      },
      once: true
    });
  });

  // ── Testimoni Cards ────────────────────────────────────────
  gsap.fromTo('.testi-card',
    { opacity: 0, y: 40 },
    {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '#testimonials', start: 'top 80%' }
    }
  );

  // ── Parallax on hero ───────────────────────────────────────
  gsap.to('#hero-bg-glow', {
    y: -80,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 }
  });

} // end if !prefersReduced
