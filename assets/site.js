// ===== Google Analytics (GA4) =====
// Paste your Measurement ID between the quotes, e.g. 'G-ABC123XYZ9'.
// Leave it empty to turn tracking off. This one line covers every page.
var GA_MEASUREMENT_ID = 'G-JTJ71YN59F';
(function () {
  if (!GA_MEASUREMENT_ID) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
})();

// ===== Shared header and footer =====
// Each page has <header data-include="partials/header.html"> and
// <footer data-include="partials/footer.html">. Edit those two files to change
// the header or footer on every page.
//   data-nav="connect"   highlights a menu section (home, new, connect,
//                        events, resources, learn; several allowed, space separated)
//   data-motto="off"     hides the motto line in the footer (used on the homepage)
function loadPartials() {
  var slots = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
  return Promise.all(slots.map(function (el) {
    return fetch(el.getAttribute('data-include'))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) { el.innerHTML = html; })
      .catch(function (err) { console.error('Could not load ' + el.getAttribute('data-include'), err); });
  })).then(function () {
    var header = document.querySelector('.site-header[data-nav]');
    if (header) {
      var keys = header.getAttribute('data-nav').split(/\s+/);
      var labels = { 'new': 'I am New', connect: 'Connect', resources: 'Resources', learn: 'Learn More' };
      keys.forEach(function (k) {
        if (k === 'home' || k === 'events') {
          var a = header.querySelector('a.top[href="' + (k === 'home' ? './' : 'events') + '"]');
          if (a) a.setAttribute('aria-current', 'page');
        } else if (labels[k]) {
          header.querySelectorAll('.has-sub > button.top').forEach(function (b) {
            if (b.textContent.trim() === labels[k]) b.style.color = 'var(--accent-soft)';
          });
        }
      });
    }
    var footer = document.querySelector('.site-footer[data-motto="off"]');
    if (footer) {
      var m = footer.querySelector('.foot-motto');
      if (m) m.remove();
    }
  });
}

// MPA Church redesign concept: shared behavior
document.documentElement.classList.add('js');
loadPartials().then(function () {

  var header = document.querySelector('.site-header');
  var onScroll = function () {
    if (header) header.classList.toggle('scrolled', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    var closeMenu = function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    };
    nav.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a) { closeMenu(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 980) { closeMenu(); } });
  }

  // Submenu toggles (touch and keyboard)
  document.querySelectorAll('.has-sub > button.top').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var li = btn.parentElement;
      var open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      e.stopPropagation();
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('.has-sub.open').forEach(function (li) {
      if (window.innerWidth > 980) {
        li.classList.remove('open');
        li.querySelector('button.top').setAttribute('aria-expanded', 'false');
      }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.has-sub.open').forEach(function (li) { li.classList.remove('open'); });
    }
  });

  // Copy buttons: <button data-copy="#element-id">
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = document.querySelector(btn.getAttribute('data-copy'));
      if (!src) return;
      var text = src.textContent.trim();
      var done = function () {
        var label = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = label; btn.classList.remove('copied'); }, 1800);
      };
      var fallback = function () {
        var t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
    });
  });

  // Scroll reveal
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Highlight the current week in the prayer table and show it at the top
  var rows = document.querySelectorAll('[data-week-start]');
  if (rows.length) {
    var now = new Date();
    var card = document.getElementById('thisweek');
    rows.forEach(function (r) {
      var s = new Date(r.getAttribute('data-week-start') + 'T00:00:00');
      var e = new Date(s.getTime() + 7 * 86400000);
      if (now >= s && now < e) {
        r.classList.add('now');
        var first = r.querySelector('td');
        if (first) first.insertAdjacentHTML('beforeend', '<span class="badge">THIS WEEK</span>');
        if (card) {
          var cells = r.querySelectorAll('td');
          card.querySelector('.tw-date').textContent = cells[0].firstChild.textContent + ', ' + cells[1].textContent;
          card.querySelector('[data-f="country"]').textContent = cells[2].textContent;
          card.querySelector('[data-f="state"]').textContent = cells[3].textContent;
          card.querySelector('[data-f="city"]').textContent = cells[4].textContent;
          card.setAttribute('href', '#' + r.id);
          card.hidden = false;
          card.addEventListener('click', function () {
            r.classList.remove('target-flash');
            void r.offsetWidth;
            r.classList.add('target-flash');
          });
        }
      }
    });
  }
});
