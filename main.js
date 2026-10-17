// C'sae — the record player, the crossfade, parallax, reveals and the booking coupon.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  // ---------- reveal once ----------
  const targets = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) targets.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
    // safety net: anything on screen that is still hidden after load gets shown
    window.addEventListener('load', () => setTimeout(() => {
      targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
    }, 2500));
  }

  // ---------- hero: slow crossfade through the studio ----------
  const frames = $$('.room__stack img');
  if (frames.length > 1 && !reduce) {
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      frames[i].classList.remove('is-on');
      i = (i + 1) % frames.length;
      frames[i].classList.add('is-on');
    }, 5600);
  }

  // ---------- parallax (transform only, one rAF per frame) ----------
  $$('.tiles .tile:nth-child(even) > a').forEach((a) => { a.dataset.parallax = '0.05'; });
  const layers = $$('[data-parallax]').map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0,
    anchor: el.parentElement,
    scale: el.matches('.folder__pic img') ? 1.2 : 1,
  }));
  const giant = $('[data-scale]');
  let ticking = false;
  const paint = () => {
    ticking = false;
    const vh = innerHeight;
    for (const l of layers) {
      const r = l.anchor.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const y = ((r.top + r.height / 2) - vh / 2) * l.speed;
      l.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)${l.scale !== 1 ? ` scale(${l.scale})` : ''}`;
    }
    if (giant) {
      const r = giant.parentElement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / r.height));
      giant.style.transform = `scale(${(0.78 + 0.22 * p).toFixed(4)})`;
    }
  };
  if (!reduce) {
    const ask = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    paint();
  }

  // ---------- the sea loop: only plays when seen ----------
  const sea = $('.follow__video');
  if (sea) {
    if (reduce) { sea.removeAttribute('autoplay'); sea.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) sea.play().catch(() => {}); else sea.pause(); }).observe(sea);
    }
  }

  // ---------- the record ----------
  const listen = $('#listen');
  if (listen) {
    const SIDES = {
      a: {
        id: 'xrqIQxV2ozQ', label: 'A',
        title: 'Journey into the unknown',
        meta: 'Single, 2025. Official lyrics video out 21 June 2025.',
        img: 'assets/img/xrqIQxV2ozQ.jpg', x: 128,
      },
      b: {
        id: 'CJcdyLAKGFk', label: 'B',
        title: 'Anymore (feat. Kyat Cute)',
        meta: 'Single, out 12 August 2025. Official video out 24 August 2025.',
        img: 'assets/img/CJcdyLAKGFk.jpg', x: 120,
      },
    };
    const svg = $('.deck__svg', listen);
    const labelImg = $('.disc__label', listen);
    const title = $('[data-title]', listen);
    const meta = $('[data-meta]', listen);
    const play = $('[data-play]', listen);
    const playLabel = $('[data-play-label]', listen);
    const yt = $('[data-yt]', listen);
    const player = $('[data-player]', listen);
    const tabs = $$('.side', listen);
    let side = 'a';
    let playing = false;

    const setPlaying = (on) => {
      playing = on;
      listen.classList.toggle('is-playing', on);
      document.documentElement.classList.toggle('is-playing', on);
      playLabel.textContent = on ? 'Stop' : `Play side ${SIDES[side].label}`;
    };

    const stop = () => {
      player.innerHTML = '';
      player.hidden = true;
      player.classList.remove('is-open');
      setPlaying(false);
    };

    const start = () => {
      const s = SIDES[side];
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
      f.title = `${s.title} by C'sae`;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.addEventListener('load', () => {
        try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (_) {}
      });
      player.innerHTML = '';
      player.appendChild(f);
      player.hidden = false;
      player.classList.add('is-open');
      setPlaying(true);
    };

    // follow the embedded player: spin while it plays, rest when it pauses or ends
    addEventListener('message', (e) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let data; try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (_) { return; }
      const state = data && data.info && data.info.playerState;
      if (state === undefined || !player.firstChild) return;
      listen.classList.toggle('is-playing', state === 1 || state === 3);
      document.documentElement.classList.toggle('is-playing', state === 1);
    });

    const choose = (next) => {
      if (next === side) return;
      const wasPlaying = playing;
      stop();
      side = next;
      tabs.forEach((t) => { const on = t.dataset.side === next; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); });
      const s = SIDES[next];
      const swap = () => {
        labelImg.setAttribute('href', s.img);
        labelImg.setAttribute('x', s.x);
        title.textContent = s.title;
        meta.textContent = s.meta;
        play.href = yt.href = `https://youtu.be/${s.id}`;
        playLabel.textContent = `Play side ${s.label}`;
        if (wasPlaying) start();
      };
      if (reduce) { swap(); return; }
      svg.classList.remove('is-flipping'); void svg.getBBox(); svg.classList.add('is-flipping');
      setTimeout(swap, 350);
      svg.addEventListener('animationend', () => svg.classList.remove('is-flipping'), { once: true });
    };

    tabs.forEach((t) => t.addEventListener('click', () => choose(t.dataset.side)));
    play.addEventListener('click', (e) => { e.preventDefault(); playing ? stop() : start(); });
    $('.deck', listen).addEventListener('click', () => (playing ? stop() : start()));
  }

})();
