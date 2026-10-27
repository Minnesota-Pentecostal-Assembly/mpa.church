// MPA Church redesign concept: shared behavior
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');

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
})();
