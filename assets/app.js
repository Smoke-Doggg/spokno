/* «Спокойно»: проверка адреса и обезличенный счёт посещений.
   Своя копия, не общий файл с основным сайтом. Значения в двойных
   подчёркиваниях подставляет spokno/build.py из spokno/config.py —
   адрес приёмника меняется одной строкой там, а не здесь.

   Что уходит на приёмник: путь страницы, вид источника (поиск, прямой,
   внутренний), тип и ширина экрана, тема, часовой пояс, домен сайта (h)
   и вид события. Ни cookie, ни localStorage, ни идентификаторов.
   В sessionStorage один флажок «эта вкладка уже открывала сайт» — он
   исчезает вместе с вкладкой. */
(function () {
  'use strict';

  var STAT = 'https://api.spokno.fyi/watch-api';
  var HOSTS = ["spokno.fyi", "www.spokno.fyi"];
  var host = HOSTS.indexOf(location.hostname) !== -1 ? location.hostname : 'иное';

  /* --- Проверка адреса (страница с data-probe) ------------------------ */
  var probe = document.querySelector('[data-probe]');
  var NAMES = {
    RU: 'Россия', KZ: 'Казахстан', BY: 'Беларусь', UZ: 'Узбекистан', KG: 'Киргизия',
    AM: 'Армения', GE: 'Грузия', AZ: 'Азербайджан', TR: 'Турция', AE: 'ОАЭ',
    DE: 'Германия', NL: 'Нидерланды', FI: 'Финляндия', SE: 'Швеция', PL: 'Польша',
    FR: 'Франция', GB: 'Великобритания', US: 'США', RS: 'Сербия', HK: 'Гонконг'
  };
  function ask() {
    var ipOut = probe.querySelector('[data-probe-ip]');
    var ccOut = probe.querySelector('[data-probe-cc]');
    ipOut.textContent = 'определяем…';
    ccOut.textContent = '…';
    fetch(STAT + '/ip', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) {
        ipOut.textContent = d.ip || 'не определён';
        var cc = String(d.country || '').toUpperCase();
        ccOut.textContent = cc ? (NAMES[cc] || cc) : 'не определена';
      })
      .catch(function () {
        ipOut.textContent = 'сервер не ответил';
        ccOut.textContent = '—';
      });
  }
  if (probe && window.fetch) {
    ask();
    var again = probe.querySelector('[data-probe-again]');
    if (again) again.addEventListener('click', ask);
  }

  /* --- Счёт посещений ------------------------------------------------- */
  /* Автоматические браузеры не считаем: флаг webdriver и метка ?lh=1
     у прогонов замера скорости. */
  var AUTO = navigator.webdriver === true || /(^|[?&])lh=1(&|$)/.test(location.search);
  if (AUTO || !window.fetch) return;

  var page = location.pathname;

  function qs(params) {
    params.h = host;
    return Object.keys(params)
      .filter(function (k) { return params[k] !== undefined && params[k] !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }
  function send(params) {
    try { fetch(STAT + '/hit?' + qs(params), { keepalive: true }).catch(function () {}); }
    catch (e) {}
  }
  function sendLast(params) {
    var url = STAT + '/hit?' + qs(params);
    try { if (navigator.sendBeacon && navigator.sendBeacon(url)) return; } catch (e) {}
    try { fetch(url, { mode: 'no-cors', keepalive: true }); } catch (e) {}
  }

  function source() {
    var tag = null;
    try { tag = new URL(location.href).searchParams.get('src'); } catch (e) {}
    if (tag) return 'канал:' + tag.slice(0, 32);
    var ref = document.referrer;
    if (!ref) return 'прямой';
    var h;
    try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return 'иное'; }
    if (h === location.hostname.replace(/^www\./, '')) return 'внутренний';
    if (/(^|\.)google\./.test(h)) return 'google';
    if (/(^|\.)(yandex|ya)\./.test(h)) return 'yandex';
    if (/(^|\.)bing\./.test(h)) return 'bing';
    if (/duckduckgo/.test(h)) return 'duckduckgo';
    if (/(^|\.)mail\./.test(h)) return 'mail';
    if (/(^|\.)(t|telegram)\./.test(h)) return 'telegram';
    if (/(^|\.)(chatgpt\.com|perplexity\.ai|claude\.ai|copilot\.microsoft\.com|deepseek\.com)$/.test(h)) return 'ИИ';
    return 'иное';
  }
  var w = window.innerWidth;
  var fresh = false;
  try {
    if (!sessionStorage.getItem('spk_tab')) { sessionStorage.setItem('spk_tab', '1'); fresh = true; }
  } catch (e) {}
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}

  send({
    e: 'view', p: page, r: source(),
    d: w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop',
    w: w < 480 ? 'xs' : w < 768 ? 'sm' : w < 1200 ? 'md' : w < 1600 ? 'lg' : 'xl',
    t: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    tz: tz, n: fresh ? '1' : '0'
  });

  /* Глубина чтения: каждая четверть — один раз. */
  var marks = { 25: false, 50: false, 75: false, 100: false };
  function depth() {
    var span = document.documentElement.scrollHeight - window.innerHeight;
    if (span <= 0) return 100;
    return Math.round(window.scrollY / span * 100);
  }

  /* Признак «живой»: один раз за просмотр, если было действие человека
     (настоящее событие браузера, isTrusted) и при этом страница была
     видна не меньше 10 секунд суммарно или прочитана на четверть. */
  var acted = false, liveSent = false;
  var shownMs = 0;
  var shownFrom = document.visibilityState === 'visible' ? Date.now() : 0;
  function shown() { return shownMs + (shownFrom ? Date.now() - shownFrom : 0); }
  function tryLive() {
    if (liveSent || !acted) return;
    if (shown() >= 10000 || marks[25]) {
      liveSent = true;
      send({ e: 'live', p: page });
    }
  }
  function onAct(ev) {
    if (ev && ev.isTrusted === false) return;
    acted = true;
    tryLive();
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (name) {
    window.addEventListener(name, onAct, { passive: true, capture: true });
  });
  var ticker = setInterval(function () {
    tryLive();
    if (liveSent) clearInterval(ticker);
  }, 1000);

  window.addEventListener('scroll', function () {
    var pct = depth();
    [25, 50, 75, 100].forEach(function (m) {
      if (!marks[m] && pct >= m) { marks[m] = true; send({ e: 'scroll', p: page, s: String(m) }); }
    });
    tryLive();
  }, { passive: true });

  /* Клик по кнопке бота — вид ссылки, а не её текст. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var kind = a.classList.contains('to-bot') ? 'bot' :
      a.closest('.toc') ? 'toc' :
      a.closest('[data-foot]') ? 'foot' :
      /^\/[a-z0-9-]+\/$/.test(href) ? 'article' : null;
    if (kind) send({ e: 'click', k: kind, p: page });
  }, true);

  /* Уход: сколько была видна и дочитана ли до четверти. */
  var left = false;
  function leave() {
    if (left) return;
    left = true;
    sendLast({ e: 'leave', p: page, sec: String(Math.round(shown() / 1000)), s: marks[25] ? 'read' : 'bounce' });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (shownFrom) { shownMs += Date.now() - shownFrom; shownFrom = 0; }
      leave();
    } else if (!shownFrom) {
      shownFrom = Date.now();
    }
  });
  window.addEventListener('pagehide', leave);
})();
