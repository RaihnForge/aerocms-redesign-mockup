// Background parallax: BG facet SVG translates upward at 20% of scrollY,
// giving a slow "depth" feel as the page scrolls. Respects
// prefers-reduced-motion; bails out silently if reduced motion is on.
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  function init() {
    if (document.querySelector('.bg-parallax')) return;
    var bg = document.createElement('div');
    bg.className = 'bg-parallax';
    bg.setAttribute('aria-hidden', 'true');
    document.body.prepend(bg);

    var ticking = false;
    function update() {
      // Move bg up at 33% of scroll speed (parallax depth feel).
      bg.style.transform = 'translate3d(0,' + (-window.scrollY * 0.33) + 'px,0)';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
