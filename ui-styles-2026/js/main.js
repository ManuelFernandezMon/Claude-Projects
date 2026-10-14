/* main.js: shared behaviour only. Style sections never edit this file; they opt in
   through attributes (see README "Section contract"):
   - .style-sec loads css/NN-*.css (its data-css attribute) one viewport before it is needed and
     gets class "css-ready" when that file has loaded (until then it is visibility:hidden).
   - .style-sec gets class "is-active" while it is on screen (gate heavy effects on it).
   - button.show-css[aria-controls=ID]  toggles the .css-recipe#ID element.
   - button.copy-css inside .css-recipe copies its <code> text; .copy-status announces it.
   - button[role=switch] flips aria-checked; optional data-section-class="x" toggles
     class x on the owning section (e.g. a "Reduce transparency" switch).
   - [data-pointer] inside an active section sets --px/--py (0..1) and --mx/--my (-1..1)
     on that element while the pointer moves over it. Skipped under reduced motion. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var sections = Array.prototype.slice.call(document.querySelectorAll('.style-sec'));

  /* ---- Load each style's own stylesheet shortly before its section is needed ---- */
  var readyTimers = {};
  function markReady(sec) {
    sec.classList.add('css-ready');
    window.clearTimeout(readyTimers[sec.id]);
  }
  function loadSectionCss(sec) {
    if (sec.getAttribute('data-css-state')) return;
    sec.setAttribute('data-css-state', 'loading');
    var href = sec.getAttribute('data-css');
    if (!href) {
      markReady(sec);
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    var finish = function () {
      sec.setAttribute('data-css-state', 'loaded');
      markReady(sec);
    };
    link.onload = finish;
    link.onerror = finish;
    document.head.appendChild(link);
    readyTimers[sec.id] = window.setTimeout(finish, 5000); // never leave a section hidden
  }
  if ('IntersectionObserver' in window) {
    var cssIO = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            loadSectionCss(e.target);
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: '100% 0px 100% 0px', threshold: 0 },
    );
    sections.forEach(function (s) {
      cssIO.observe(s);
    });
  } else {
    sections.forEach(loadSectionCss);
  }

  /* Keyboard users: when focus enters a section, make sure it and the next one are loaded so
     Tab never skips controls inside a section that is still visibility:hidden. */
  document.addEventListener('focusin', function (ev) {
    var sec = ev.target.closest && ev.target.closest('.style-sec');
    var i = sec ? sections.indexOf(sec) : sections.indexOf(null);
    if (i < 0) return;
    loadSectionCss(sections[i]);
    if (sections[i + 1]) loadSectionCss(sections[i + 1]);
  });

  /* ---- Activate sections only while visible ---- */
  if ('IntersectionObserver' in window) {
    var activeIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle('is-active', e.isIntersecting);
        });
      },
      { rootMargin: '25% 0px 25% 0px', threshold: 0 },
    );
    sections.forEach(function (s) {
      activeIO.observe(s);
    });
  } else {
    sections.forEach(function (s) {
      s.classList.add('is-active');
    });
  }

  /* ---- Nav active-section indicator ---- */
  var links = {};
  Array.prototype.forEach.call(document.querySelectorAll('.topnav-list a[data-nav]'), function (a) {
    links[a.getAttribute('data-nav')] = a;
  });
  var trackable = sections.concat(document.getElementById('compare') || []);
  var current = null;
  function setCurrent(id) {
    if (id === current || !links[id]) return;
    if (current && links[current]) links[current].removeAttribute('aria-current');
    current = id;
    links[id].setAttribute('aria-current', 'true');
    var list = links[id].closest('.topnav-list');
    if (list) {
      var target = links[id].offsetLeft - (list.clientWidth - links[id].offsetWidth) / 2;
      list.scrollTo({
        left: Math.max(0, target),
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });
    }
  }
  if ('IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) setCurrent(e.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    trackable.forEach(function (s) {
      navIO.observe(s);
    });
  }

  /* ---- Show / hide CSS recipe ---- */
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('show-css')) {
      var box = document.getElementById(btn.getAttribute('aria-controls'));
      if (!box) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      box.hidden = open;
      btn.textContent = open ? 'Show CSS' : 'Hide CSS';
      return;
    }

    if (btn.classList.contains('copy-css')) {
      var recipe = btn.closest('.css-recipe');
      var code = recipe && recipe.querySelector('code');
      var status = recipe && recipe.querySelector('.copy-status');
      if (!code) return;
      var text = code.textContent;
      var done = function (msg) {
        if (status) status.textContent = msg;
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            done('Copied');
          },
          function () {
            fallbackCopy(code, done);
          },
        );
      } else {
        fallbackCopy(code, done);
      }
      return;
    }

    if (btn.getAttribute('role') === 'switch') {
      var on = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(on));
      var cls = btn.getAttribute('data-section-class');
      var sec = btn.closest('.style-sec');
      if (cls && sec) sec.classList.toggle(cls, on);
    }
  });

  function fallbackCopy(code, done) {
    var range = document.createRange();
    range.selectNodeContents(code);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    done(ok ? 'Copied' : 'Press Ctrl+C to copy');
  }

  /* ---- Pointer position for [data-pointer] elements (active sections, motion allowed) ---- */
  var pending = null;
  function applyPointer() {
    var p = pending;
    pending = null;
    if (!p) return;
    var r = p.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var x = Math.min(1, Math.max(0, (p.x - r.left) / r.width));
    var y = Math.min(1, Math.max(0, (p.y - r.top) / r.height));
    p.el.style.setProperty('--px', x.toFixed(3));
    p.el.style.setProperty('--py', y.toFixed(3));
    p.el.style.setProperty('--mx', (x * 2 - 1).toFixed(3));
    p.el.style.setProperty('--my', (y * 2 - 1).toFixed(3));
  }
  document.addEventListener(
    'pointermove',
    function (ev) {
      if (reduceMotion.matches) return;
      var el = ev.target.closest && ev.target.closest('[data-pointer]');
      if (!el) return;
      var sec = el.closest('.style-sec');
      if (sec && !sec.classList.contains('is-active')) return;
      pending = { el: el, x: ev.clientX, y: ev.clientY };
      window.requestAnimationFrame(applyPointer);
    },
    { passive: true },
  );
  document.addEventListener(
    'pointerout',
    function (ev) {
      var el = ev.target.closest && ev.target.closest('[data-pointer]');
      if (el && !el.contains(ev.relatedTarget)) {
        ['--px', '--py', '--mx', '--my'].forEach(function (v) {
          el.style.removeProperty(v);
        });
      }
    },
    { passive: true },
  );
})();
