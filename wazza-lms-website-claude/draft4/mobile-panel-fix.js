/**
 * mobile-panel-fix.js
 * Patch untuk course.html:
 *   1. Fix butang Modul kekal hijau bila panel tutup
 *   2. Animasi slide sidebar dengan auto-scroll pada mobile
 *   3. Ripple effect pada butang toggle
 *
 * Cara guna: Tambah <script src="mobile-panel-fix.js"></script>
 * dalam course.html, SELEPAS <script src="app.js"></script>
 * dan SELEPAS blok <script> utama (hujung sebelum </body>)
 */

(function () {
  'use strict';

  // ── Tunggu DOM siap ──
  document.addEventListener('DOMContentLoaded', function () {
    patchTogglePanel();
    addRippleEffect();
  });

  // ── Patch fungsi togglePanel ──
  function patchTogglePanel() {
    const btn = document.getElementById('btn-toggle-panel');
    const lms = document.getElementById('lms-layout');
    const sidebar = document.getElementById('pl-sidebar');

    if (!btn || !lms) return;

    // Override fungsi togglePanel global
    window.togglePanel = function () {
      const isOpen = lms.classList.contains('panel-open');

      if (isOpen) {
        // ── TUTUP panel ──
        lms.classList.remove('panel-open');
        btn.classList.remove('panel-open');

        // Mobile: scroll sedikit ke atas supaya pengguna sedar panel tutup
        if (window.innerWidth < 768) {
          // Kira kedudukan topbar
          const topbar = document.querySelector('.topbar');
          const topbarH = topbar ? topbar.offsetHeight : 52;

          // Smooth scroll ke atas (ke video/welcome screen)
          window.scrollTo({
            top: topbarH,
            behavior: 'smooth'
          });
        }
      } else {
        // ── BUKA panel ──
        lms.classList.add('panel-open');
        btn.classList.add('panel-open');

        // Mobile: auto-scroll ke sidebar supaya pengguna nampak senarai modul
        if (window.innerWidth < 768) {
          // Delay sedikit untuk CSS transition bermula dulu
          setTimeout(function () {
            if (sidebar) {
              // Scroll ke sidebar
              const rect = sidebar.getBoundingClientRect();
              const scrollTop = window.pageYOffset + rect.top - 60; // 60px offset dari atas

              window.scrollTo({
                top: Math.max(0, scrollTop),
                behavior: 'smooth'
              });
            }
          }, 100);
        }
      }
    };

    // ── Sync state awal ──
    // Pastikan butang state sesuai dengan lms class
    function syncBtnState() {
      const isOpen = lms.classList.contains('panel-open');
      btn.classList.toggle('panel-open', isOpen);
    }

    // Sync bila window resize (desktop <-> mobile)
    window.addEventListener('resize', syncBtnState);
    syncBtnState();
  }

  // ── Ripple effect bila butang ditekan ──
  function addRippleEffect() {
    const btn = document.getElementById('btn-toggle-panel');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      // Keluarkan ripple lama
      const oldRipple = btn.querySelector('.ripple');
      if (oldRipple) oldRipple.remove();

      // Cipta ripple baru
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
      `;

      btn.appendChild(ripple);

      // Buang selepas animasi selesai
      ripple.addEventListener('animationend', function () {
        ripple.remove();
      });
    });
  }

})();