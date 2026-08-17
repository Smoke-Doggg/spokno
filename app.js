/* Прогрессивное улучшение: без этого файла страница полностью работает.
   Только transform/opacity, всё гасится при prefers-reduced-motion. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Бордер у шапки после прокрутки ------------------------------- */
  var head = document.getElementById('head');
  if (head) {
    var onScroll = function () {
      head.classList.toggle('head--scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Мобильное меню ------------------------------------------------ */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('nav--open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('nav--open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Аккордеон FAQ -------------------------------------------------- */
  document.querySelectorAll('.faq__q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq__item');
      var open = item.getAttribute('data-open') === 'true';
      // одновременно открыт только один пункт
      var group = item.closest('.faq');
      if (group) {
        group.querySelectorAll('.faq__item[data-open="true"]').forEach(function (other) {
          other.setAttribute('data-open', 'false');
          other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
        });
      }
      item.setAttribute('data-open', String(!open));
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* --- Переключатель темы --------------------------------------------- */
  var sw = document.querySelector('[data-theme-switch]');
  if (sw) {
    sw.hidden = false;
    var metaL = document.querySelector('meta[name="theme-color"][media*="light"]');
    var metaD = document.querySelector('meta[name="theme-color"][media*="dark"]');
    var apply = function (mode, save) {
      if (mode === 'light' || mode === 'dark') {
        document.documentElement.setAttribute('data-theme', mode);
      } else {
        document.documentElement.removeAttribute('data-theme');
        mode = 'system';
      }
      sw.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.set === mode));
      });
      /* шторка браузера в цвет темы при ручном выборе */
      if (metaL && metaD) {
        if (mode === 'light') { metaL.media = 'all'; metaD.media = 'not all'; }
        else if (mode === 'dark') { metaD.media = 'all'; metaL.media = 'not all'; }
        else { metaL.media = '(prefers-color-scheme: light)'; metaD.media = '(prefers-color-scheme: dark)'; }
      }
      if (save) {
        try {
          if (mode === 'system') localStorage.removeItem('theme');
          else localStorage.setItem('theme', mode);
        } catch (e) {}
      }
    };
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    apply(saved || 'system', false);
    sw.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      document.documentElement.classList.add('theme-anim');
      apply(b.dataset.set, true);
      setTimeout(function () {
        document.documentElement.classList.remove('theme-anim');
      }, 300);
    });
  }

  /* --- Б1: дата «проверено сегодня» — всегда текущая ------------------ */
  var MONTHS = ['января','февраля','марта','апреля','мая','июня',
                'июля','августа','сентября','октября','ноября','декабря'];
  var now = new Date();
  var todayText = now.getDate() + ' ' + MONTHS[now.getMonth()];
  document.querySelectorAll('[data-today]').forEach(function (el) {
    el.textContent = todayText;
  });
  var dd = String(now.getDate()).padStart(2, '0') + '.' + String(now.getMonth() + 1).padStart(2, '0');
  document.querySelectorAll('[data-today-short]').forEach(function (el) {
    el.textContent = dd;
  });

  /* --- Б3: счётчик цифр доверия --------------------------------------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var fmtCount = function (n) {
      // разряды через узкий неразрывный пробел, как в money() на сборке
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
    };
    var runCount = function (el) {
      var target = Number(el.dataset.count);
      if (reduced || !Number.isFinite(target) || target === 0) {
        el.textContent = fmtCount(target);
        return;
      }
      var start = performance.now(), dur = 800;
      var step = function (now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);           // ease-out
        el.textContent = fmtCount(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window && !reduced) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          runCount(e.target);
          cio.unobserve(e.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(runCount);
    }
  }


  /* --- Панель статусов: печать при появлении + перепрос ---------------- */
  var stRows = [].slice.call(document.querySelectorAll('.panel__list [data-st]'));
  if (stRows.length && !reduced && 'IntersectionObserver' in window) {
    var typed = false;
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting || typed) return;
        typed = true;
        pio.disconnect();
        stRows.forEach(function (el, idx) {
          var full = el.dataset.st;
          setTimeout(function () {
            el.textContent = '';
            var k = 0;
            var tt = setInterval(function () {
              el.textContent = full.slice(0, ++k);
              if (k >= full.length) clearInterval(tt);
            }, 22);
          }, 350 * idx);
        });
        /* перепрос случайной строки — панель «дышит» */
        setInterval(function () {
          if (document.hidden) return;
          var lis = document.querySelectorAll('.panel__list li');
          var li = lis[Math.floor(Math.random() * lis.length)];
          li.classList.add('is-hot');
          setTimeout(function () { li.classList.remove('is-hot'); }, 900);
        }, 9000);
      });
    }, { threshold: .5 });
    pio.observe(stRows[0]);
  }

  /* --- Мокап: проигрываемый сценарий диалога -------------------------- */
  var device = document.querySelector('[data-chat]');
  if (device && !reduced) {
    var feed = device.querySelector('[data-feed]');
    var msgs = [].slice.call(feed.querySelectorAll('.msg'));
    var peer = device.querySelector('[data-peer-status]');
    var kb = device.querySelector('[data-kb]');
    device.setAttribute('data-chat', 'on');

    var dtimers = [];
    var dclear = function () { dtimers.forEach(clearTimeout); dtimers = []; };
    var dat = function (ms, fn) { dtimers.push(setTimeout(fn, ms)); };
    var dshow = function (i) {
      if (!msgs[i]) return;
      msgs[i].classList.add('is-shown');
      feed.scrollTop = feed.scrollHeight;
    };

    var dplay = function () {
      dclear();
      msgs.forEach(function (m) { m.classList.remove('is-shown', 'is-gone'); });
      if (kb) kb.classList.remove('is-pressed');
      if (peer) { peer.textContent = 'бот'; peer.classList.remove('is-typing'); }

      dat(300,  function () { dshow(0); });                       /* приветствие */
      dat(1900, function () { if (kb) kb.classList.add('is-pressed'); });
      dat(2250, function () { if (kb) kb.classList.remove('is-pressed'); dshow(1); });
      dat(2900, function () {                                      /* печатает */
        dshow(2);
        if (peer) { peer.textContent = 'печатает…'; peer.classList.add('is-typing'); }
      });
      dat(4300, function () {                                      /* ключ + активация */
        msgs[2].classList.add('is-gone');
        if (peer) { peer.textContent = 'бот'; peer.classList.remove('is-typing'); }
        dshow(3);
      });
      dat(13000, dplay);                                           /* долгий финальный кадр */
    };

    var drunning = false;
    var ddio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !drunning) { drunning = true; dplay(); }
        else if (!e.isIntersecting && drunning) { drunning = false; dclear(); }
      });
    }, { threshold: .35 });
    ddio.observe(device);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { dclear(); drunning = false; }
    });
  }

  /* --- Живая сеть в hero (только светлая тема) ------------------------ */
  var cv = document.querySelector('[data-net]');
  if (cv && !reduced) {
    var cx = cv.getContext('2d');
    var W, H, nodes = [], pulsesN = [], netOn = false;
    var colInk = 'rgba(9,74,48,', colAc = 'rgba(22,199,132,';  /* тёмно-зелёные узлы вместо серых */
    var sizeNet = function () {
      var r = cv.getBoundingClientRect();
      W = cv.width = Math.max(1, r.width * devicePixelRatio);
      H = cv.height = Math.max(1, r.height * devicePixelRatio);
    };
    var NCOUNT = innerWidth < 960 ? 16 : 26;
    for (var ni = 0; ni < NCOUNT; ni++) {
      nodes.push({ x: Math.random(), y: Math.random(),
        vx: (Math.random() - .5) * .0004, vy: (Math.random() - .5) * .0004, f: 0 });
    }
    var netVisible = function () {
      return !document.hidden && getComputedStyle(cv).display !== 'none' &&
        cv.getBoundingClientRect().bottom > 0;
    };
    var netFrame = function () {
      if (!netOn) return;
      if (!netVisible()) { netOn = false; return; }
      cx.clearRect(0, 0, W, H);
      var s = devicePixelRatio;
      nodes.forEach(function (n) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
        if (n.f > 0) n.f -= .03;
      });
      for (var i = 0; i < NCOUNT; i++) for (var k = i + 1; k < NCOUNT; k++) {
        var a = nodes[i], b2 = nodes[k];
        var dx = (a.x - b2.x) * W, dy = (a.y - b2.y) * H, d = Math.hypot(dx, dy);
        if (d < W * .24) {
          cx.strokeStyle = colInk + (0.20 * (1 - d / (W * .24))) + ')';
          cx.lineWidth = s;
          cx.beginPath(); cx.moveTo(a.x * W, a.y * H); cx.lineTo(b2.x * W, b2.y * H); cx.stroke();
        }
      }
      if (Math.random() < .02 && pulsesN.length < 5) {
        var i1 = Math.floor(Math.random() * NCOUNT), i2 = Math.floor(Math.random() * NCOUNT);
        if (i1 !== i2) pulsesN.push({ a: i1, b: i2, t: 0 });
      }
      pulsesN = pulsesN.filter(function (p2) {
        p2.t += .016;
        var a = nodes[p2.a], b2 = nodes[p2.b];
        var x = (a.x + (b2.x - a.x) * p2.t) * W, y = (a.y + (b2.y - a.y) * p2.t) * H;
        cx.fillStyle = colAc + '.9)';
        cx.beginPath(); cx.arc(x, y, 2.8 * s, 0, 7); cx.fill();
        if (p2.t >= 1) { nodes[p2.b].f = 1; return false; }
        return true;
      });
      nodes.forEach(function (n) {
        cx.fillStyle = n.f > 0 ? colAc + (0.45 + n.f * .55) + ')' : colInk + '.45)';
        cx.beginPath(); cx.arc(n.x * W, n.y * H, (n.f > 0 ? 3.6 : 2.6) * s, 0, 7); cx.fill();
      });
      requestAnimationFrame(netFrame);
    };
    var netEnsure = function () {
      if (netVisible() && !netOn) { sizeNet(); netOn = true; netFrame(); }
    };
    netEnsure();
    addEventListener('resize', function () { if (netOn) sizeNet(); });
    document.addEventListener('visibilitychange', netEnsure);
    addEventListener('scroll', netEnsure, { passive: true });
    /* переключение темы прячет/показывает canvas — следим за атрибутом */
    new MutationObserver(netEnsure)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (matchMedia('(prefers-color-scheme: dark)').addEventListener) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', netEnsure);
    }
  }

  if (reduced) return;

  /* --- Появление блоков при прокрутке --------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.dataset.delay || 0);
        setTimeout(function () { el.classList.add('reveal--in'); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('reveal--in'); });
  }

  /* --- Лёгкий параллакс панели в первом экране ------------------------ */
  var panel = document.querySelector('[data-parallax]');
  if (panel) {
    var ticking = false;
    var move = function () {
      var shift = Math.min(window.scrollY * 0.06, 10);
      panel.style.transform = 'translateY(' + shift + 'px)';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(move); }
    }, { passive: true });
  }

  /* --- Липкая кнопка на мобильном ------------------------------------- */
  var sticky = document.querySelector('.sticky-cta');
  var stopZone = document.getElementById('price');
  if (sticky) {
    var hero = document.querySelector('.hero');
    var toggle = function () {
      var passedHero = hero ? window.scrollY > hero.offsetHeight * 0.8 : false;
      var inStop = false;
      if (stopZone) {
        var r = stopZone.getBoundingClientRect();
        inStop = r.top < window.innerHeight && r.bottom > 0;
      }
      sticky.classList.toggle('sticky-cta--on', passedHero && !inStop);
    };
    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
  }

  /* --- Отзывы: отправка формы и подгрузка одобренных ------------------- */
  var rform = document.querySelector('[data-review-form]');
  if (rform && window.fetch) {
    var note = rform.querySelector('[data-review-note]');
    var say = function (msg, ok) {
      note.textContent = msg;
      note.hidden = false;
      note.className = 'review-form__note ' + (ok ? 'is-ok' : 'is-err');
    };
    rform.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = rform.querySelector('button[type="submit"]');
      btn.disabled = true;
      fetch(rform.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nick: rform.nick.value,
          text: rform.text.value,
          website: rform.website.value
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) {
          say('Спасибо! Отзыв ушёл на проверку — после одобрения появится здесь.', true);
          rform.reset();
        } else {
          say(d.error || 'Не получилось отправить. Попробуйте ещё раз.', false);
          btn.disabled = false;
        }
      }).catch(function () {
        say('Не получилось отправить. Напишите отзыв в бота — тоже дойдёт.', false);
        btn.disabled = false;
      });
    });
  }

  var rgrid = document.querySelector('[data-reviews-grid]');
  if (rgrid && window.fetch) {
    fetch('/api/reviews').then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (list) {
      list.slice(0, 9).forEach(function (rv) {
        if (!rv || !rv.nick || !rv.text) return;
        var card = document.createElement('div');
        card.className = 'card card--hover review is-shown';
        var src = document.createElement('p');
        src.className = 'review__src';
        src.innerHTML = '<span class="mono">с сайта</span>';
        var txt = document.createElement('p');
        txt.className = 'review__text';
        txt.textContent = rv.text;                 // textContent — без XSS
        var who = document.createElement('p');
        who.className = 'review__who';
        var b = document.createElement('b');
        b.textContent = rv.nick;
        who.appendChild(b);
        card.appendChild(src); card.appendChild(txt); card.appendChild(who);
        rgrid.appendChild(card);
      });
    }).catch(function () { /* бэкенда нет (демо) — секция живёт без подгрузки */ });
  }
})();
