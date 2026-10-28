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
      var hrefs = { home: './', events: 'events', 'new': 'im-new', connect: 'connect', resources: 'resources', learn: 'learn-more' };
      keys.forEach(function (k) {
        var a = hrefs[k] && header.querySelector('a.top[href="' + hrefs[k] + '"]');
        if (!a) return;
        if (k === 'home' || k === 'events') a.setAttribute('aria-current', 'page');
        else a.style.color = 'var(--accent-soft)';
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

// Scroll reveal. Runs right away (it does not wait for the header and footer).
// Anything already on screen at load is shown immediately with no fade, so the
// main content paints fast; content further down fades in as you scroll to it.
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var fold = window.innerHeight || document.documentElement.clientHeight;
  items.forEach(function (el) {
    if (el.getBoundingClientRect().top < fold) el.classList.add('in', 'instant');
  });
  document.documentElement.classList.add('js');
  var rest = items.filter(function (el) { return !el.classList.contains('in'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    rest.forEach(function (el) { io.observe(el); });
  } else {
    rest.forEach(function (el) { el.classList.add('in'); });
  }
})();

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
  document.querySelectorAll('.has-sub > .sub-toggle').forEach(function (btn) {
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
        li.querySelector('.sub-toggle').setAttribute('aria-expanded', 'false');
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
          // Small maps beside the names (files in assets/maps, named after the place)
          var slug = function (name) {
            return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
              .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          };
          var maps = {
            country: 'assets/maps/countries/' + slug(cells[2].textContent) + '.svg',
            state: 'assets/maps/states/' + slug(cells[3].textContent) + '.svg',
            city: 'assets/maps/states/minnesota.svg'
          };
          Object.keys(maps).forEach(function (k) {
            var img = card.querySelector('[data-map="' + k + '"]');
            if (!img) return;
            // Keep the map on the same line as the last word of the name
            var label = img.parentNode.querySelector('[data-f]');
            if (label && !img.parentNode.querySelector('.tw-nowrap')) {
              var words = label.textContent.trim().split(/\s+/);
              var last = words.pop();
              label.textContent = words.length ? words.join(' ') + ' ' : '';
              var keep = document.createElement('span');
              keep.className = 'tw-nowrap';
              keep.textContent = last;
              keep.appendChild(img);
              label.parentNode.appendChild(keep);
            }
            img.onload = function () { img.hidden = false; };
            img.onerror = function () { img.hidden = true; };
            img.src = maps[k];
          });
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
