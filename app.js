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

  /* Ссылка вида /faq/#vopros-… открывает нужный ответ сразу.
     Без этого переход приводил к свёрнутому пункту: человек попадал
     на свой вопрос и всё равно должен был нажать, чтобы увидеть ответ. */
  var openByHash = function () {
    var id = decodeURIComponent(String(location.hash || '').slice(1));
    if (!id) return;
    var item = document.getElementById(id);
    if (!item || !item.classList.contains('faq__item')) return;
    var group = item.closest('.faq');
    if (group) {
      group.querySelectorAll('.faq__item[data-open="true"]').forEach(function (o) {
        o.setAttribute('data-open', 'false');
        o.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
      });
    }
    item.setAttribute('data-open', 'true');
    item.querySelector('.faq__q').setAttribute('aria-expanded', 'true');
    item.scrollIntoView({ block: 'start' });
  };
  openByHash();
  window.addEventListener('hashchange', openByHash);

  /* --- Переключатель темы --------------------------------------------- */
  var sw = document.querySelector('[data-theme-switch]');
  if (sw) {
    /* Порядок обхода: от «как в системе» к ручному выбору и обратно. */
    var NEXT = { system: 'light', light: 'dark', dark: 'system' };
    var LABELS = { system: 'Как в системе', light: 'Светлая', dark: 'Тёмная' };
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
      sw.dataset.mode = mode;
      var label = LABELS[mode];
      sw.querySelector('[data-theme-label]').textContent = label;
      /* Читалке нужно и текущее состояние, и что случится по нажатию —
         иначе кнопка со словом «Тёмная» звучит как «включить тёмную». */
      /* Подпись показывает текущий режим. Чтобы её не прочли как «переключить
         на светлую», подсказка при наведении говорит, что будет по нажатию. */
      var next = LABELS[NEXT[mode]].toLowerCase();
      sw.setAttribute('aria-label', 'Тема: ' + label.toLowerCase() + '. Переключить на ' + next);
      sw.setAttribute('title', 'Нажмите, чтобы переключить на ' + next);
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
    sw.addEventListener('click', function () {
      document.documentElement.classList.add('theme-anim');
      apply(NEXT[sw.dataset.mode] || 'light', true);
      setTimeout(function () {
        document.documentElement.classList.remove('theme-anim');
      }, 300);
    });
  }

  /* Год в подвале — тоже текущий, а не из даты последней сборки. */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

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
    /* Видимость держим флагами, а не замером в кадре.
       Прежде netVisible() вызывался из netFrame шестьдесят раз в секунду,
       а внутри — getComputedStyle и getBoundingClientRect: браузер обязан
       пересчитать раскладку немедленно, и весь этот пересчёт ложился
       в основной поток (Style & Layout 756 мс, Rendering 730 мс в замере).
       IntersectionObserver сообщает о попадании в экран сам, даром. */
    var netInView = false;
    var netShown = function () { return getComputedStyle(cv).display !== 'none'; };
    var netVisible = function () { return !document.hidden && netInView && netShown(); };
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
    /* Попадание в экран — дело наблюдателя, а не обработчика прокрутки:
       тот дёргал бы getBoundingClientRect на каждый пиксель пролистывания. */
    new IntersectionObserver(function (es) {
      netInView = es[0].isIntersecting;
      if (netInView) netEnsure(); else netOn = false;
    }).observe(cv);
    addEventListener('resize', function () { if (netOn) sizeNet(); });
    document.addEventListener('visibilitychange', netEnsure);
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
    /* Плашка нужна, когда главной кнопки не видно. Раньше считали по доле
       высоты hero — на длинном первом экране это давало две одинаковые
       зелёные кнопки одновременно. Следим за самой кнопкой. */
    var heroBtn = hero && hero.querySelector('.btn--primary');
    var useObserver = heroBtn && 'IntersectionObserver' in window;
    var btnGone = false;
    var toggle = function () {
      var passedHero = useObserver
        ? btnGone
        : (hero ? window.scrollY > hero.offsetHeight * 0.8 : false);
      var inStop = false;
      if (stopZone) {
        var r = stopZone.getBoundingClientRect();
        inStop = r.top < window.innerHeight && r.bottom > 0;
      }
      sticky.classList.toggle('sticky-cta--on', passedHero && !inStop);
    };
    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
    if (useObserver) {
      new IntersectionObserver(function (es) {
        btnGone = !es[0].isIntersecting;
        toggle();
      }, { threshold: 0 }).observe(heroBtn);
    }
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

  var rmarquee = document.querySelector('[data-reviews-marquee]');
  var rtrack = document.querySelector('[data-reviews-track]');

  function startReviewsMarquee() {
    if (!rmarquee || !rtrack) return;
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;           // остаётся лентой с ручным горизонтальным скроллом
    var cards = Array.prototype.slice.call(rtrack.children);
    if (!cards.length) return;
    // Дублируем один раз — на границе дублей анимация просто уходит в цикл незаметно.
    cards.forEach(function (c) { rtrack.appendChild(c.cloneNode(true)); });
    rtrack.style.animationDuration = Math.max(30, cards.length * 3.5) + 's';
    rtrack.classList.add('is-running');

    var pause = function () { rmarquee.classList.add('is-paused'); };
    var resume = function () { rmarquee.classList.remove('is-paused'); };
    rmarquee.addEventListener('pointerdown', pause);
    rmarquee.addEventListener('pointerup', resume);
    rmarquee.addEventListener('pointercancel', resume);
    rmarquee.addEventListener('pointerleave', resume);
  }

  if (rtrack && window.fetch) {
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
        rtrack.appendChild(card);
      });
    }).catch(function () { /* бэкенда нет (демо) — секция живёт без подгрузки */ })
      .then(startReviewsMarquee);
  } else {
    startReviewsMarquee();
  }

  /* --- Вторая половина воронки с внешних каналов ---------------------
     Первая половина — /go/bot/?src=... — уже записала метку в
     sessionStorage и отправила «пришёл на сайт». Здесь — общий для всех
     страниц кусок: ловим клик по ЛЮБОЙ кнопке «в бота» (их много, они
     стоят по всему сайту) и, если метка ещё не протухла, шлём «дошёл
     до бота». Без этого куска первая половина показывала бы только
     «зашли на сайт», а не «дошли ли до бота или потерялись». */
  /* --- Страница /proverka/: показать IP и страну, тест WebRTC -------
     Адрес отдаёт наш же приёмник (endpoint /ip) и не записывает его.
     Тест WebRTC запускается ТОЛЬКО по кнопке: он отправляет один
     служебный запрос на публичный STUN-сервер — ровно так утечка и
     происходит, поэтому честная проверка без этого запроса невозможна.
     Автоматически страница ничего внешнего не дёргает. */
  var ipBox = document.querySelector('[data-ip-check]');
  if (ipBox && window.fetch) {
    var ipVal = ipBox.querySelector('[data-ip-value]');
    var ipGeo = ipBox.querySelector('[data-ip-country]');
    var ipVerdict = ipBox.querySelector('[data-ip-verdict]');
    var myIp = '';
    var COUNTRY = {RU:'Россия', KZ:'Казахстан', BY:'Беларусь', DE:'Германия',
      NL:'Нидерланды', FI:'Финляндия', PL:'Польша', IT:'Италия', US:'США',
      TR:'Турция', AE:'ОАЭ', GE:'Грузия', AM:'Армения', RS:'Сербия',
      TH:'Таиланд', IN:'Индия', FR:'Франция', GB:'Великобритания',
      KG:'Киргизия', UZ:'Узбекистан'};
    fetch('https://stat.prostokey.com/watch-api/ip')
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        myIp = d.ip || '';
        ipVal.textContent = myIp || 'не удалось определить';
        var c = (d.country || '').toUpperCase();
        ipGeo.textContent = c ? (COUNTRY[c] || ('код страны: ' + c)) : '—';
        // Вердикт не утверждает, включён ли VPN: по одному адресу это
        // неизвестно. Человек за границей без туннеля увидит чужую
        // страну — и старая формулировка бодро сообщала ему, что
        // «соединение работает». Показываем факт и объясняем, с чем
        // его сравнить: сравнение до/после делает только сам человек.
        if (c) {
          ipVerdict.textContent = 'Это адрес, который видят сайты прямо ' +
            'сейчас. Чтобы понять, работает ли VPN, сравните: выключите ' +
            'его, обновите страницу — адрес и страна должны смениться. ' +
            'Не сменились — трафик идёт мимо туннеля.';
        }
      })
      .catch(function () {
        ipVal.textContent = 'сервер проверки недоступен';
      });

    var wBtn = document.querySelector('[data-webrtc-btn]');
    var wOut = document.querySelector('[data-webrtc-result]');
    if (wBtn && wOut) wBtn.addEventListener('click', function () {
      wBtn.disabled = true;
      wOut.textContent = 'проверяем…';
      var found = {};
      var pc;
      try {
        pc = new RTCPeerConnection({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
      } catch (e) {
        wOut.textContent = 'Браузер не поддерживает WebRTC — утечки этим путём нет.';
        return;
      }
      pc.createDataChannel('t');
      pc.onicecandidate = function (ev) {
        if (!ev.candidate) { finish(); return; }
        var m = / ([0-9a-f.:]+) \d+ typ (host|srflx)/.exec(ev.candidate.candidate);
        if (m && m[1].indexOf('.local') === -1) found[m[1]] = m[2];
      };
      pc.createOffer().then(function (o) { return pc.setLocalDescription(o); });
      var done = false;
      function finish() {
        if (done) return; done = true;
        try { pc.close(); } catch (e) {}
        var ips = Object.keys(found);
        var leak = ips.filter(function (a) {
          return found[a] === 'srflx' && a !== myIp;
        });
        if (leak.length) {
          wOut.textContent = 'Утечка есть: WebRTC отдаёт адрес ' + leak[0] +
            ', отличный от видимого (' + (myIp || '—') + '). Так бывает ' +
            'с VPN-расширениями браузера — полноценный клиент закрывает этот путь.';
        } else if (ips.length) {
          wOut.textContent = 'Утечки не видно: WebRTC не раскрывает адрес, ' +
            'отличный от видимого сайтами.';
        } else {
          wOut.textContent = 'WebRTC не вернул адресов — утечки этим путём нет.';
        }
      }
      setTimeout(finish, 4000);
    });
  }

  var REF_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 часа — дольше сессии в браузере не считаем
  var BOT_HREF_RE = /^https:\/\/t\.me\/vpn_prosto_bot\b/;

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || !BOT_HREF_RE.test(link.href)) return;

    var raw;
    try { raw = sessionStorage.getItem('vpnp_ref'); } catch (err) { return; }
    if (!raw) return;

    var ref;
    try { ref = JSON.parse(raw); } catch (err) { return; }
    if (!ref || !ref.src || Date.now() - ref.ts > REF_MAX_AGE_MS) return;

    try {
      fetch('https://stat.prostokey.com/watch-api/ref?src=' + encodeURIComponent(ref.src) + '&evt=convert',
            { mode: 'no-cors', keepalive: true });
    } catch (err) { /* не блокирует переход в бота */ }

    try { sessionStorage.removeItem('vpnp_ref'); } catch (err) {} // не считать дважды с двух кнопок подряд
  }, true); // capture — сработает раньше, чем браузер уйдёт по ссылке

  /* --- Пауза бегущей строки ------------------------------------------- */
  /* Выбор человека держим до конца сессии: если он остановил строку, она
     не должна поехать снова на другой странице. */
  var mq = document.querySelector('[data-marquee]');
  if (mq) {
    var band = mq.closest('.trust');
    var stop = false;
    try { stop = sessionStorage.getItem('vpnp_marquee') === 'off'; } catch (e) {}
    /* Не «apply»: весь файл — одна функция, и var с этим именем уже занято
       переключателем темы. Совпадение имён затирало его молча — тема
       переставала переключаться, а ошибки в консоли не было. */
    var syncPause = function () {
      band.classList.toggle('is-paused', stop);
      mq.setAttribute('aria-pressed', stop ? 'true' : 'false');
      mq.setAttribute('aria-label', stop ? 'Возобновить прокрутку' : 'Остановить прокрутку');
    };
    syncPause();
    mq.addEventListener('click', function () {
      stop = !stop;
      try { sessionStorage.setItem('vpnp_marquee', stop ? 'off' : 'on'); } catch (e) {}
      syncPause();
    });
  }

  /* --- Свой счёт посещений -------------------------------------------- */
  /* Считаем сами и обезличенно: без cookie, без идентификаторов, без
     передачи кому-либо. На сервере событие превращается в +1 к счётчику
     и исчезает — журнала посещений нет, как и обещано на сайте.

     Логов у GitHub Pages для нас не существует, поэтому другого способа
     узнать, что происходит на сайте, просто нет. */
  var HIT = 'https://stat.prostokey.com/watch-api/hit';

  /* Автоматические браузеры в статистику не идут.

     21.08.2026 замеры скорости и проверки вёрстки, гонявшиеся с сервера
     весь день, положили в счётчик 136 просмотров вместо двух настоящих —
     и картина дня стала выдумкой: 123 захода с ширины 390 пикселей, на
     которой шли тесты, и 125 «из Казахстана», где стоит сервер. Отличить
     их по адресу или часовому поясу нельзя: живые казахстанские посетители
     выглядят так же. А вот webdriver честно выставляют и Playwright,
     и Lighthouse, и любой автоматический обход. */
  var АВТОМАТ = navigator.webdriver === true;

  var send = function (params) {
    if (АВТОМАТ) return;
    var qs = Object.keys(params)
      .filter(function (k) { return params[k] !== undefined && params[k] !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
      .join('&');
    var url = HIT + '?' + qs;
    /* sendBeacon переживает уход со страницы — обычный запрос браузер
       отменил бы на полпути, и события «ушёл» терялись бы чаще всего. */
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
    } catch (e) {}
    try { fetch(url, { mode: 'no-cors', keepalive: true }); } catch (e) {}
  };

  /* Откуда пришёл. Полный адрес не берём — только узнаваемый источник:
     подробнее и не нужно, а хранить чужие адреса незачем. */
  var source = function () {
    var m;
    try { m = new URL(location.href).searchParams.get('src'); } catch (e) {}
    if (m) return 'канал:' + m;
    var r = document.referrer;
    if (!r) return 'прямой';
    var host;
    try { host = new URL(r).hostname.replace(/^www\./, ''); } catch (e) { return 'иное'; }
    if (host === location.hostname) return 'внутренний';
    if (/(^|\.)google\./.test(host)) return 'google';
    if (/(^|\.)(yandex|ya)\./.test(host)) return 'yandex';
    if (/(^|\.)bing\./.test(host)) return 'bing';
    if (/duckduckgo/.test(host)) return 'duckduckgo';
    if (/(^|\.)mail\./.test(host)) return 'mail';
    if (/rambler/.test(host)) return 'rambler';
    if (/(^|\.)(t|telegram)\./.test(host)) return 'telegram';
    return 'иное';
  };

  var device = function () {
    var w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  };
  var widthBucket = function () {
    var w = window.innerWidth;
    return w < 480 ? 'xs' : w < 768 ? 'sm' : w < 1200 ? 'md' : w < 1600 ? 'lg' : 'xl';
  };

  var firstInSession = false;
  try {
    if (!sessionStorage.getItem('vpnp_seen')) {
      sessionStorage.setItem('vpnp_seen', '1');
      firstInSession = true;
    }
  } catch (e) {}

  var page = location.pathname;
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}

  send({
    e: 'view', p: page, r: source(), d: device(), w: widthBucket(),
    t: document.documentElement.getAttribute('data-theme') ||
       (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    tz: tz, n: firstInSession ? '1' : '0'
  });

  /* Глубина чтения: каждую четверть отмечаем один раз. */
  var marks = { 25: false, 50: false, 75: false, 100: false };
  var onScroll = function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    var pct = Math.round((window.scrollY / h) * 100);
    [25, 50, 75, 100].forEach(function (m) {
      if (!marks[m] && pct >= m) {
        marks[m] = true;
        send({ e: 'scroll', p: page, s: String(m) });
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Клики по важному. Что именно нажали — по виду ссылки, а не по тексту. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a, button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var kind =
      /t\.me|tg:\/\//.test(href) ? (/channel|svoboda/i.test(a.textContent) ? 'channel' : 'bot') :
      /^\/blog\//.test(href) ? 'article' :
      a.closest('.toc') ? 'toc' :
      a.classList.contains('faq__q') ? 'faq' :
      a.closest('.foot') ? 'foot' : null;
    if (kind) send({ e: 'click', k: kind });
  }, true);

  /* Ошибки скриптов: поломка должна находиться сразу, а не через месяц. */
  window.addEventListener('error', function (ev) {
    send({ e: 'error', m: String((ev && ev.message) || 'unknown').slice(0, 80) });
  });

  /* Уход со страницы: сколько пробыл и дочитал ли хоть до четверти. */
  var started = Date.now();
  var reported = false;
  var onLeave = function () {
    if (reported) return;
    reported = true;
    send({
      e: 'leave', p: page,
      sec: String(Math.round((Date.now() - started) / 1000)),
      s: marks[25] ? 'read' : 'bounce'
    });
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') onLeave();
  });
  window.addEventListener('pagehide', onLeave);
})();
