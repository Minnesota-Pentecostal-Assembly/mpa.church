// ===== Google Analytics (GA4) =====
// Paste your Measurement ID between the quotes, e.g. 'G-ABC123XYZ9'.
// Leave it empty to turn tracking off. This one line covers every page.
var GA_MEASUREMENT_ID = 'G-JTJ71YN59F';
// Analytics loads after the page has finished loading (or as soon as the visitor
// scrolls, taps or types), so it never slows down the first view of the page.
(function () {
  if (!GA_MEASUREMENT_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
  var started = false;
  var events = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
  function start() {
    if (started) return;
    started = true;
    events.forEach(function (e) { window.removeEventListener(e, start, true); });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(s);
  }
  events.forEach(function (e) { window.addEventListener(e, start, { capture: true, passive: true, once: true }); });
  function later() { setTimeout(start, 3500); }
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later);
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

  // Belief page: highlight the statement being read in the contents list
  var toc = document.querySelector('.bf-toc');
  if (toc) {
    var links = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var setOn = function (id) {
      Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === id); });
      var a = links[id], ol = toc.querySelector('ol');
      if (a && ol && ol.scrollWidth > ol.clientWidth) ol.scrollTo({ left: a.offsetLeft - 8, behavior: 'smooth' });
    };
    var items = Array.prototype.slice.call(document.querySelectorAll('.bf-item'));
    var current = '';
    var update = function () {
      var line = window.innerWidth > 900 ? 130 : 170;
      var id = items.length ? items[0].id : '';
      items.forEach(function (el) { if (el.getBoundingClientRect().top - line <= 0) id = el.id; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && items.length) {
        var last = items[items.length - 1];
        if (last.getBoundingClientRect().top < window.innerHeight) id = last.id;
      }
      if (id !== current) { current = id; setOn(id); }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
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

/* ---- Home: latest video (click to load YouTube) and upcoming dates ---- */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.yt-facade');
    if (!b) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.dataset.yt) + '?autoplay=1&rel=0';
    f.title = b.getAttribute('aria-label') || 'YouTube video';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    var wrap = document.createElement('div');
    wrap.className = 'al-frame';
    wrap.appendChild(f);
    b.replaceWith(wrap);
  });

  var list = document.getElementById('coming-up');
  if (!list) return;
  // Regular schedule. weeks: which week of the month (1 = first); omit for every week.
  // day: 0 = Sunday ... 6 = Saturday. mins: start time, used to sort same-day items.
  // c: '' orange (St. Paul Park), 'c2' red (Bloomington), 'c3' blue (Rochester).
  var SCHEDULE = [
    { day: 0, mins: 570, title: 'Sunday Services', info: '9:30 AM English, 11:00 AM International &middot; St. Paul Park', c: '', once: true },
    { day: 6, weeks: [1], mins: 630, title: 'Fasting Prayer', info: '10:30 AM', c: '' },
    { day: 6, weeks: [1, 3], mins: 1110, title: 'Malayalam Service', info: '6:30 PM', c: '' },
    { day: 0, weeks: [2, 4], mins: 1020, title: 'Bloomington Campus', info: '5 to 7 PM &middot; Room 200, 2300 E 88th St', c: 'c2' },
    { day: 0, weeks: [3], mins: 1020, title: 'Rochester Campus', info: '5 to 7 PM &middot; Living Hope Church', c: 'c3' }
  ];
  var SHOW = 5, DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var out = [], used = {}, d = new Date();
  d.setHours(12, 0, 0, 0);
  for (var i = 0; i < 70 && out.length < SHOW; i++, d.setDate(d.getDate() + 1)) {
    var week = Math.ceil(d.getDate() / 7), today = [];
    SCHEDULE.forEach(function (ev, n) {
      if (ev.day !== d.getDay() || (ev.weeks && ev.weeks.indexOf(week) < 0) || (ev.once && used[n])) return;
      used[n] = true;
      today.push(ev);
    });
    today.sort(function (a, b) { return a.mins - b.mins; });
    for (var k = 0; k < today.length && out.length < SHOW; k++) {
      var ev = today[k];
      out.push('<li><span class="d' + (ev.c ? ' ' + ev.c : '') + '"><b>' + d.getDate() + '</b>' + MONTHS[d.getMonth()] +
        '</span><div><strong>' + ev.title + '</strong><span>' + DAYS[d.getDay()] + ' &middot; ' + ev.info + '</span></div></li>');
    }
  }
  if (out.length) list.innerHTML = out.join('');
})();

/* ---- Events: campus filter, Add to calendar, hide past events ---- */
(function () {
  var box = document.getElementById('upcoming');
  if (!box) return;
  var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

  // Hide events that ended since the list was last updated.
  box.querySelectorAll('.up-list li').forEach(function (li) {
    if (li.dataset.end && li.dataset.end < now) li.remove();
  });

  function refresh(f) {
    var shown = 0;
    box.querySelectorAll('.up-grp').forEach(function (g) {
      var n = 0;
      g.querySelectorAll('li').forEach(function (li) {
        var on = f === 'all' || li.dataset.c === f;
        li.hidden = !on;
        if (on) n++;
      });
      g.hidden = n === 0;
      shown += n;
    });
    var none = box.querySelector('.up-none');
    if (none) none.hidden = shown > 0 || !box.querySelector('.up-grp');
  }
  refresh('all');

  box.querySelectorAll('.chip').forEach(function (c) {
    c.addEventListener('click', function () {
      box.querySelectorAll('.chip').forEach(function (x) {
        var on = x === c;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      closeMenu();
      refresh(c.dataset.f);
    });
  });

  function closeMenu() {
    var m = box.querySelector('.cal-menu');
    if (m) {
      m.previousElementSibling.setAttribute('aria-expanded', 'false');
      m.remove();
    }
  }

  function icsEsc(s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }

  function links(d) {
    var allDay = d.start.length === 8;
    var rep = d.rrule && d.lstart;   // weekly event: add as repeating, in Minnesota time
    var TZ = 'America/Chicago';
    var gDates = rep ? d.lstart + '/' + d.lstop : d.start + '/' + d.stop;
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(d.title) + '&dates=' + gDates +
      (rep ? '&ctz=' + TZ + '&recur=' + encodeURIComponent('RRULE:' + d.rrule) : '') +
      '&details=' + encodeURIComponent(d.desc || '') + '&location=' + encodeURIComponent(d.loc || '');
    function iso(v) {
      return allDay ? v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6, 8)
        : v.replace(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z/, '$1-$2-$3T$4:$5:$6Z');
    }
    var o = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent' +
      '&subject=' + encodeURIComponent(d.title) + '&startdt=' + iso(d.start) + '&enddt=' + iso(d.stop) +
      (allDay ? '&allday=true' : '') + '&body=' + encodeURIComponent(d.desc || '') + '&location=' + encodeURIComponent(d.loc || '');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MPA Church//Website//EN', 'BEGIN:VEVENT',
      'UID:' + d.start + '-' + d.title.replace(/\W+/g, '') + '@mpa.church', 'DTSTAMP:' + now];
    if (rep) {
      lines.push('DTSTART;TZID=' + TZ + ':' + d.lstart, 'DTEND;TZID=' + TZ + ':' + d.lstop, 'RRULE:' + d.rrule);
    } else {
      var dt = allDay ? ';VALUE=DATE:' : ':';
      lines.push('DTSTART' + dt + d.start, 'DTEND' + dt + d.stop);
    }
    lines.push('SUMMARY:' + icsEsc(d.title), 'LOCATION:' + icsEsc(d.loc), 'DESCRIPTION:' + icsEsc(d.desc),
      'END:VEVENT', 'END:VCALENDAR');
    var a = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
    return [['Google Calendar' + (rep ? ' (repeats weekly)' : ''), g, ''],
      ['Apple / iPhone' + (rep ? ' (repeats weekly)' : ''), a, d.title.replace(/[^\w ]+/g, '').trim() + '.ics'],
      ['Outlook' + (rep ? ' (next date only)' : ''), o, '']];
  }

  box.addEventListener('click', function (e) {
    var btn = e.target.closest('.add');
    if (!btn) return;
    e.stopPropagation();
    var open = btn.getAttribute('aria-expanded') === 'true';
    closeMenu();
    if (open) return;
    var li = btn.closest('li');
    var menu = document.createElement('div');
    menu.className = 'cal-menu';
    menu.setAttribute('role', 'menu');
    links(li.dataset).forEach(function (l) {
      var a = document.createElement('a');
      a.textContent = l[0];
      a.href = l[1];
      a.setAttribute('role', 'menuitem');
      if (l[2]) a.download = l[2]; else { a.target = '_blank'; a.rel = 'noopener'; }
      menu.appendChild(a);
    });
    btn.after(menu);
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('a').focus();
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.cal-menu')) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
})();
