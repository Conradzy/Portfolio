/*
 * app.js — Conradzz Portfolio
 * Standalone vanilla-JS port of the Claude Design component (Conradzz Portfolio.dc.html).
 * The original prototype ran inside the proprietary DCLogic / <x-dc> runtime (support.js);
 * this rewrite keeps the same markup, styling and behaviour but bootstraps itself with
 * plain DOM APIs. The "tweak" props that were editor-exposed in the design tool are pinned
 * to their defaults below.
 */
'use strict';

class CZPortfolio {
  constructor() {
    // Design-tool tweaks, pinned to their declared defaults.
    this.props = {
      accentColor: '#353535',
      enableParticles: true,
      enableSpotlight: true
    };
  }

  componentDidMount() {
    const ids = ['root','progress','spotlight','scope','nav','particles','typed','portrait','filters','carousel','track','timeline','tlfill','grid','form','formmsg','modal','mbd','mcard','loader'];
    this.el = {};
    ids.forEach(k => { this.el[k] = document.getElementById('cz-' + k); });
    this.el.hero = document.querySelector('[data-sec="cz-hero"]');
    // If a project image file is missing (e.g. an unsupplied screenshot), swap the broken
    // <img> for the striped "screenshot placeholder" card instead of a broken-image icon.
    window.__czImgFallback = (img) => {
      try {
        img.insertAdjacentHTML('afterend', this.phMarkup(img.dataset.label || 'image', img.dataset.h || 'auto'));
        img.remove();
      } catch (e) {}
    };
    this.applyAccent();
    this.initLoader();
    this.initTyping();
    // Use the native cursor; no pointer-following overlay.
    this.initScroll();
    this.initReveal();
    this.initParticles();
    this.initTech();
    this.initProjects();
    this.initForm();
    this.initInteractiveSurfaces();
    this.initToolsGallery();
  }

  initToolsGallery() {
    const section = document.getElementById('tools');
    const gallery = document.getElementById('cz-tools-gallery');
    const heading = document.getElementById('cz-tools-typed');
    if (!section || !gallery || !heading) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cards = Array.from(gallery.querySelectorAll('.cz-tool'));
    const prev = document.getElementById('cz-tools-prev');
    const next = document.getElementById('cz-tools-next');
    const position = document.getElementById('cz-tools-position');
    const title = 'The Tools Behind My Work';
    const events = new AbortController();
    let typingStarted = false, timer, frame, active = 0, drag = null;
    const typeHeading = () => {
      if (typingStarted) return;
      typingStarted = true;
      let count = 0;
      const tick = () => {
        count = motion.matches ? title.length : count + 1;
        heading.textContent = title.slice(0, count);
        if (count < title.length) timer = setTimeout(tick, 55);
      };
      tick();
    };
    const update = () => {
      frame = null;
      const bounds = gallery.getBoundingClientRect();
      const center = bounds.left + bounds.width / 2;
      let nearest = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - center);
        const focus = Math.max(0, 1 - distance / (rect.width * 1.4));
        card.style.setProperty('--tool-scale', (.76 + .38 * focus).toFixed(3));
        if (distance < nearest) { nearest = distance; active = index; }
      });
      position.textContent = (active + 1) + ' / ' + cards.length;
      prev.disabled = active === 0;
      next.disabled = active === cards.length - 1;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const go = index => {
      const card = cards[Math.max(0, Math.min(cards.length - 1, index))];
      const rect = card.getBoundingClientRect(), bounds = gallery.getBoundingClientRect();
      gallery.scrollTo({ left: gallery.scrollLeft + rect.left + rect.width / 2 - bounds.left - bounds.width / 2,
        behavior: motion.matches ? 'instant' : 'smooth' });
    };
    gallery.addEventListener('scroll', schedule, { passive:true, signal:events.signal });
    window.addEventListener('resize', schedule, { passive:true, signal:events.signal });
    prev.addEventListener('click', () => go(active - 1), { signal:events.signal });
    next.addEventListener('click', () => go(active + 1), { signal:events.signal });
    gallery.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      go(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
    }, { signal:events.signal });
    gallery.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { x:event.clientX, left:gallery.scrollLeft };
      gallery.setPointerCapture(event.pointerId);
      gallery.classList.add('is-dragging');
    }, { signal:events.signal });
    gallery.addEventListener('pointermove', event => {
      if (drag) gallery.scrollLeft = drag.left - (event.clientX - drag.x);
    }, { signal:events.signal });
    const endDrag = () => { if (!drag) return; drag = null; gallery.classList.remove('is-dragging'); update(); go(active); };
    ['pointerup','pointercancel','lostpointercapture'].forEach(name =>
      gallery.addEventListener(name, endDrag, { signal:events.signal }));
    // Vertical wheel input browses the gallery; at either end normal page scrolling resumes.
    gallery.addEventListener('wheel', event => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? gallery.clientWidth : 1);
      const max = gallery.scrollWidth - gallery.clientWidth;
      if ((delta < 0 && gallery.scrollLeft <= 1) || (delta > 0 && gallery.scrollLeft >= max - 1)) return;
      event.preventDefault();
      gallery.scrollBy({ left:delta, behavior:'instant' });
    }, { passive:false, signal:events.signal });
    let observer;
    if ('IntersectionObserver' in window) {
      if (!motion.matches) heading.textContent = '';
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          section.classList.toggle('is-visible', entry.isIntersecting);
          if (entry.isIntersecting) { typeHeading(); schedule(); }
        });
      }, { threshold:.1 });
      observer.observe(section);
    } else { section.classList.add('is-visible'); typeHeading(); }
    motion.addEventListener('change', () => {
      if (motion.matches) { clearTimeout(timer); heading.textContent = title; typingStarted = true; }
    }, { signal:events.signal });
    schedule();
    this._toolsCleanup = () => { events.abort(); clearTimeout(timer); cancelAnimationFrame(frame); if (observer) observer.disconnect(); };
  }

  initInteractiveSurfaces() {
    document.querySelectorAll('[data-skill]').forEach(card => {
      card.addEventListener('mouseenter', () => { card.style.borderColor = 'rgba(87,87,87,.55)'; card.style.boxShadow = '0 22px 50px rgba(0,0,0,.45), 0 0 38px rgba(53,53,53,.22)'; card.style.background = 'linear-gradient(165deg,rgba(87,87,87,.12),rgba(255,255,255,.02))'; });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - .5) * -5;
        const ry = ((e.clientX - r.left) / r.width - .5) * 5;
        card.style.transform = 'translateY(-4px) perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      });
      card.addEventListener('mouseleave', () => { card.style.transform = 'none'; card.style.borderColor = 'rgba(255,255,255,.08)'; card.style.boxShadow = 'none'; card.style.background = 'linear-gradient(165deg,rgba(255,255,255,.045),rgba(255,255,255,.01))'; });
    });
    document.querySelectorAll('.cz-stat').forEach(s => {
      s.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)';
      s.addEventListener('mouseenter', () => { s.style.transform = 'translateY(-6px)'; const big = s.querySelector('[data-count]'); if (big) big.style.textShadow = '0 0 18px rgba(117,117,117,.6)'; });
      s.addEventListener('mouseleave', () => { s.style.transform = ''; const big = s.querySelector('[data-count]'); if (big) big.style.textShadow = ''; });
    });
  }

  initLoader() {
    const lo = this.el.loader; if (!lo) return;
    document.body.style.overflow = 'hidden';
    const bar = document.getElementById('cz-loader-bar');
    const pct = document.getElementById('cz-loader-pct');
    const status = document.getElementById('cz-loader-status');
    const sub = document.getElementById('cz-loader-sub');
    const task = document.getElementById('cz-loader-task');
    const dots = document.getElementById('cz-loader-dots');
    const phases = [
      { at: 0,   status: 'INITIALIZING SYSTEM',   sub: 'handshake_complete › decrypting_assets', task: 'mounting_components' },
      { at: 18,  status: 'LOADING ASSETS',         sub: 'fetching: fonts, portraits, projects', task: 'preload_images' },
      { at: 42,  status: 'COMPILING SHADERS',      sub: 'particles › gradient › blend_modes',   task: 'gpu_warmup' },
      { at: 64,  status: 'LINKING MODULES',        sub: 'router · timeline · carousel · modal',  task: 'wiring_handlers' },
      { at: 85,  status: 'CALIBRATING UI',         sub: 'reveal_observer › type_engine › nav',   task: 'final_paint' },
      { at: 100, status: 'SYSTEM READY',           sub: 'welcome, Conradzz', task: 'handoff' }
    ];
    let p = 0; const start = performance.now(); const dur = 2800;
    const step = (t) => {
      const el = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - el, 1.6);
      p = Math.round(eased * 100);
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = String(p).padStart(3, '0') + '%';
      const ph = phases.filter(x => p >= x.at).pop();
      if (ph) {
        if (status && status.dataset.s !== ph.status) { status.dataset.s = ph.status; if (status.firstChild) status.firstChild.textContent = ph.status; }
        if (sub) sub.textContent = ph.sub;
        if (task) task.textContent = ph.task;
      }
      if (el < 1) this._loaderRAF = requestAnimationFrame(step);
      else this.finishLoader();
    };
    this._loaderRAF = requestAnimationFrame(step);
  }

  finishLoader() {
    const lo = this.el.loader; if (!lo) return;
    const dots = document.getElementById('cz-loader-dots');
    if (dots) dots.style.opacity = '0';
    lo.style.transition = 'opacity .55s ease, transform .55s cubic-bezier(.7,0,.2,1)';
    lo.style.opacity = '0';
    lo.style.transform = 'translateY(-12px)';
    document.body.style.overflow = '';
    setTimeout(() => { lo.style.display = 'none'; }, 620);
  }

  componentDidUpdate() { if (this.el) this.applyAccent(); }

  applyAccent() {
    const r = this.el.root; if (!r) return;
    const a = this.props.accentColor || '#353535';
    const map = {
      '#353535': ['#575757', '#1e1e1e'],
      '#575757': ['#7f7f7f', '#252525'],
      '#1e1e1e': ['#393939', '#151515'],
      '#393939': ['#656565', '#222222']
    };
    const pair = map[a] || ['#575757', '#1e1e1e'];
    r.style.setProperty('--accent', a);
    r.style.setProperty('--accent2', pair[0]);
    r.style.setProperty('--accentDeep', pair[1]);
    if (this.el.spotlight) {
      this.el.spotlight.style.background = 'radial-gradient(circle, ' + this.hexA(a, .16) + ' 0%, ' + this.hexA(a, .06) + ' 35%, rgba(0,0,0,0) 70%)';
    }
  }

  hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  initTyping() {
    const el = this.el.typed; if (!el) return;
    const phrases = ['Aspiring Creative Technologist', 'Full-Stack Developer', 'Machine Learning Explorer', 'Visual Designer', 'Motion Graphics Editor'];
    let pi = 0, ci = phrases[0].length, deleting = true;
    const tick = () => {
      const word = phrases[pi];
      ci += deleting ? -1 : 1;
      el.textContent = word.slice(0, ci);
      let delay = deleting ? 38 : 70;
      if (!deleting && ci === word.length) { delay = 1500; deleting = true; }
      else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 360; }
      this._typeT = setTimeout(tick, delay);
    };
    this._typeT = setTimeout(tick, 1700);
  }

  initSpotlight() {
    const sp = this.el.spotlight; const scope = this.el.scope;
    const onSp = this.props.enableSpotlight !== false;
    if (sp) sp.style.opacity = onSp ? '1' : '0';
    this._spMove = (e) => {
      if (e.pointerType === 'touch') { if (scope) scope.style.display = 'none'; return; }
      if (scope) scope.style.display = '';
      if (onSp && sp) sp.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      if (scope) scope.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    };
    window.addEventListener('pointermove', this._spMove, { passive: true });
    // Sniper-lock state on interactive elements
    if (scope) {
      this._scopeOver = (e) => {
        const t = e.target.closest('a,button,[data-interactive],.cz-card,.cz-chip,.cz-stat,input,textarea,[data-filter]');
        if (t) { scope.style.width='72px'; scope.style.height='72px'; scope.style.margin='-36px 0 0 -36px'; scope.style.filter='drop-shadow(0 0 14px rgba(87,87,87,.9))'; }
        else { scope.style.width='54px'; scope.style.height='54px'; scope.style.margin='-27px 0 0 -27px'; scope.style.filter='drop-shadow(0 0 6px rgba(87,87,87,.55))'; }
      };
      window.addEventListener('pointerover', this._scopeOver, { passive: true });
      this._scopeDown = () => { scope.style.transform += ' scale(.85)'; };
      this._scopeUp = () => { /* reset on next move */ };
      window.addEventListener('pointerdown', this._scopeDown, { passive: true });
    }
  }

  initScroll() {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const y = window.scrollY || doc.scrollTop;
      if (this.el.progress) this.el.progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      const nav = this.el.nav;
      if (nav) {
        if (y > 40) { nav.style.background = 'rgba(4,4,4,.82)'; nav.style.backdropFilter = 'blur(14px)'; nav.style.webkitBackdropFilter = 'blur(14px)'; nav.style.padding = '14px clamp(20px,5vw,64px)'; nav.style.borderBottom = '1px solid rgba(87,87,87,.14)'; }
        else { nav.style.background = 'transparent'; nav.style.backdropFilter = 'none'; nav.style.webkitBackdropFilter = 'none'; nav.style.padding = '22px clamp(20px,5vw,64px)'; nav.style.borderBottom = '1px solid rgba(255,255,255,0)'; }
      }
      const tl = this.el.timeline, fill = this.el.tlfill;
      if (tl && fill) {
        const rect = tl.getBoundingClientRect();
        const prog = (window.innerHeight * 0.6 - rect.top) / rect.height;
        fill.style.height = Math.max(0, Math.min(1, prog)) * 100 + '%';
      }
      // portrait now lives at the hero bottom with its own centered animation;
      // no parallax transform (would overwrite the translateX(-50%) centering).
    };
    this._onScroll = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  initReveal() {
    this._reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reveal = (el, delay = 0) => {
      el.style.setProperty('--reveal-delay', delay + 'ms');
      el.classList.replace('cz-reveal-pending', 'cz-reveal-visible');
      el.querySelectorAll('[data-count]').forEach(c => this.countUp(c));
    };
    this._revealElement = reveal;
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(entries => {
        let stagger = 0;
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          reveal(entry.target, this._reduceMotion.matches ? 0 : Math.min(stagger++ * 90, 270));
          this._io.unobserve(entry.target);
        });
      }, { threshold: 0, rootMargin: '0px 0px -45px 0px' });
    }
    this.el.root.querySelectorAll('[data-reveal]').forEach(el => this.observeReveal(el));
    this._reduceMotion.addEventListener('change', e => {
      if (e.matches) {
        this.el.root.querySelectorAll('.cz-reveal-pending').forEach(el => reveal(el));
        if (this._io) this._io.disconnect();
      }
    });
  }

  observeReveal(el) {
    el.classList.add('cz-reveal-pending');
    if (this._io && !this._reduceMotion.matches) this._io.observe(el);
    else this._revealElement(el);
  }

  countUp(el) {
    if (el._done) return; el._done = true;
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    const dur = 1100, start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  initParticles() {
    const box = this.el.particles; if (!box) return;
    if (this.props.enableParticles === false) return;
    for (let i = 0; i < 16; i++) {
      const d = document.createElement('div');
      const s = 3 + Math.random() * 5;
      d.style.cssText = 'position:absolute; bottom:-10px; left:' + (Math.random() * 100) + '%; width:' + s + 'px; height:' + s + 'px; border-radius:50%; background:var(--accent2); box-shadow:0 0 10px var(--accent); opacity:0; animation:cz-particle ' + (6 + Math.random() * 7) + 's linear ' + (Math.random() * 8) + 's infinite;';
      box.appendChild(d);
    }
  }

  initTech() {
    this._techItems = [
      ['Laravel', 'web'], ['PHP', 'web'], ['JavaScript', 'web'], ['HTML', 'web'], ['CSS', 'web'],
      ['React', 'web'], ['Flutter', 'mobile'], ['Dart', 'mobile'], ['Python', 'aiml'], ['FastAPI', 'web'],
      ['Java', 'web'], ['PostgreSQL', 'tools'], ['MySQL', 'tools'], ['phpMyAdmin', 'tools'], ['WAMP', 'tools'],
      ['Laragon', 'tools'], ['GitHub', 'tools'], ['Vercel', 'tools'], ['Firebase', 'tools'], ['Supabase', 'tools'],
      ['QGIS', 'gis'], ['ArcGIS', 'gis'], ['Canva', 'design'], ['After Effects', 'design'], ['CapCut', 'design'], ['Figma', 'design']
    ];
    this._filter = 'all';
    this._offset = 0;
    this._dragging = false;
    this.renderTech();

    const fb = this.el.filters;
    if (fb) {
      fb.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          this._filter = btn.getAttribute('data-filter');
          fb.querySelectorAll('[data-filter]').forEach(b => {
            const active = b === btn;
            b.style.background = active ? 'linear-gradient(135deg,var(--accent),var(--accentDeep))' : 'rgba(255,255,255,.04)';
            b.style.color = active ? '#fff' : '#cbcbcb';
            b.style.borderColor = active ? 'transparent' : 'rgba(255,255,255,.12)';
          });
          this._offset = 0;
          this.renderTech();
        });
      });
    }

    const car = this.el.carousel;
    if (car) {
      let startX = 0, startOff = 0;
      car.addEventListener('pointerdown', (e) => { this._dragging = true; startX = e.clientX; startOff = this._offset; car.style.cursor = 'grabbing'; try { car.setPointerCapture(e.pointerId); } catch (x) {} });
      car.addEventListener('pointermove', (e) => { if (!this._dragging) return; this._offset = startOff + (e.clientX - startX); });
      const end = () => { this._dragging = false; car.style.cursor = 'grab'; };
      car.addEventListener('pointerup', end);
      car.addEventListener('pointercancel', end);
      car.addEventListener('pointerleave', end);
      car.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { this._offset -= e.deltaY * 0.7; e.preventDefault(); } else { this._offset -= e.deltaX * 0.7; } }, { passive: false });
    }

    const loop = () => {
      const t = this.el.track;
      if (t) {
        if (!this._dragging) this._offset -= 0.55;
        const half = t.scrollWidth / 2;
        if (half > 0) {
          while (this._offset <= -half) this._offset += half;
          while (this._offset > 0) this._offset -= half;
        }
        t.style.transform = 'translateX(' + this._offset + 'px)';
      }
      this._techRAF = requestAnimationFrame(loop);
    };
    this._techRAF = requestAnimationFrame(loop);
  }

  renderTech() {
    const track = this.el.track; if (!track) return;
    const list = this._techItems.filter(it => this._filter === 'all' || it[1] === this._filter);
    const doubled = list.concat(list);
    const colors = { web: '#575757', mobile: '#929292', aiml: '#797979', design: '#737373', tools: '#b9b9b9', gis: '#d2d2d2' };
    track.innerHTML = doubled.map(it => {
      const c = colors[it[1]] || '#575757';
      return '<div class="cz-chip" style="flex:0 0 auto; display:flex; align-items:center; gap:10px; padding:14px 22px; border-radius:15px; background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015)); border:1px solid rgba(255,255,255,.1); font-size:15px; font-weight:600; white-space:nowrap; transition:transform .25s, border-color .25s, box-shadow .25s;">' +
        '<span style="width:9px; height:9px; border-radius:50%; background:' + c + '; box-shadow:0 0 10px ' + c + ';"></span>' + it[0] + '</div>';
    }).join('');
    track.querySelectorAll('.cz-chip').forEach(ch => {
      ch.addEventListener('mouseenter', () => { ch.style.transform = 'translateY(-5px) rotateX(8deg) rotateY(-6deg)'; ch.style.borderColor = 'rgba(87,87,87,.5)'; ch.style.boxShadow = '0 14px 34px rgba(53,53,53,.32)'; });
      ch.addEventListener('mouseleave', () => { ch.style.transform = 'none'; ch.style.borderColor = 'rgba(255,255,255,.1)'; ch.style.boxShadow = 'none'; });
    });
  }

  projectData() {
    const ph = (l) => '__PH__' + l;
    return [
      { year: '1st Year', sub: 'Foundation Year', items: [
        { id: 'rlk', title: 'RLK Hotel Management System', tags: ['Java', 'NetBeans', 'Swing GUI', 'OOP'], thumb: 'assets/rlk-hotel-landing.png',
          desc: 'A Java desktop GUI system for a hotel/motel with a landing interface, room display, pricing, login screens, and full user interaction built in NetBeans.',
          images: ['assets/rlk-hotel-landing.png', 'assets/rlk-login.png', 'assets/premium-hotel-rooms.png'] },
        { id: 'gym', title: 'Gym Workout Program', tags: ['Java', 'Desktop GUI'], thumb: 'assets/gym-workout.png',
          desc: 'A workout interface showing exercise days, sets, and reps — helping users follow structured routines across the week.',
          images: ['assets/gym-workout.png'] },
        { id: 'pccafe', title: 'PC Internet Cafe System', tags: ['Java', 'NetBeans', 'Swing'], thumb: 'assets/pc-internet-cafe.png',
          desc: 'A simple internet-cafe login and management flow built as a Java GUI concept, with a branded login screen and session handling.',
          images: ['assets/pc-internet-cafe.png'] }
      ]},
      { year: '2nd Year', sub: 'Web Development & System Building', items: [
        { id: 'wastewise', title: 'WasteWise', tags: ['Laravel', 'PHP', 'MySQL', 'JavaScript'], thumb: 'assets/wastewise-landing.png',
          desc: 'A Laravel waste-management system with an admin dashboard, user management, and waste tracking — including statistics, fines, schedules, and activity logs.',
          images: ['assets/wastewise-landing.png', 'assets/wastewise-dashboard.png'] },
        { id: 'irs', title: 'IRS CenterPoint', tags: ['PHP', 'JavaScript', 'HTML', 'CSS', 'MySQL'], thumb: 'assets/irs-centerpoint.jpg',
          desc: 'An internet-cafe automated workflow system built without a major framework — pure PHP, JavaScript, HTML, CSS, and database integration.',
          images: ['assets/irs-centerpoint.jpg'] }
      ]},
      { year: '3rd Year', sub: 'AI, Capstone & Full-Stack Growth', items: [
        { id: 'fireops', subgroup: 'web', title: 'FireOps', tags: ['Capstone', 'ML', 'IoT'], thumb: 'assets/fireops.jpg',
          desc: 'A capstone / emergency-response project exploring intelligent dispatch and response workflows — presented on the live BFP fire-incident map dashboard.',
          repo: 'https://github.com/kobedumandan/bfp_capstone.git',
          images: ['assets/fireops.jpg'] },
        { id: 'droppointweb', subgroup: 'web', title: 'DropPoint Website', tags: ['Web', 'Full-Stack', 'Vercel'], thumb: 'assets/droppoint-web-landing.png', slideshow: true,
          desc: 'A water-refilling station platform — a hosted web app connecting customers with nearby refilling stations. Recognized at Level App 3.0 (2nd place, Promotional Video).',
          repo: 'https://github.com/Conradzy/DropPoint.git', demo: 'https://drop-point-flame.vercel.app/DropPoint.html',
          images: ['assets/droppoint-web-landing.png', 'assets/droppoint-web-cert.jpg'] },
        { id: 'philhealth', subgroup: 'web', title: 'PhilHealth — Figma Design', tags: ['Figma', 'UI/UX', 'Prototype'], thumb: 'assets/philhealth.png',
          desc: 'A high-fidelity Figma UI/UX prototype for a PhilHealth member portal — landing, registration and login flows for reliable, affordable medical services.',
          demo: 'https://www.figma.com/proto/UwZigiKP7caueebXmLj40z/Napinasphilhealthmidterm?node-id=168-1039&p=f&t=u5AWg8DyvfqTnFwY-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=168%3A1039',
          demoLabel: 'View Figma Prototype',
          images: ['assets/philhealth.png'] },
        { id: 'droppointmobile', subgroup: 'mobile', title: 'DropPoint Mobile App', tags: ['Flutter', 'Dart', 'Mobile'], thumb: 'assets/droppoint-signin.png', gallery: true,
          desc: 'A mobile app for user / rider flows — station browsing, delivery tracking, and water-refilling service access. Landing → home → live station map.',
          repo: 'https://github.com/Conradzy/droppoint-.git',
          images: ['assets/droppoint-signin.png', 'assets/droppoint-home.png', 'assets/droppoint-map.png'] },
        { id: 'sagingai', subgroup: 'mobile', title: 'SagingAI Mobile App', tags: ['Flutter', 'CNN', 'Image Classification', 'On-Device AI'], thumb: 'assets/sagingai-home.png', gallery: true,
          desc: 'A machine-learning image-classification app for banana disease and ripeness assistance. Splash → home → disease detection → ripeness scale with nutrition insights.',
          images: ['assets/sagingai-home.png', 'assets/sagingai-disease.png', 'assets/sagingai-ripeness.png'] }
      ]}
    ];
  }

  phMarkup(label, h) {
    return '<div style="position:relative; width:100%; height:' + (h || '100%') + '; min-height:180px; background:repeating-linear-gradient(135deg,#090909 0 14px,#050505 14px 28px); display:grid; place-items:center;">' +
      '<div style="text-align:center;"><div style="font-family:ui-monospace,monospace; font-size:12px; letter-spacing:.12em; color:#8a8a8a; opacity:.85;">[ ' + label.toUpperCase() + ' ]</div><div style="font-family:ui-monospace,monospace; font-size:10.5px; color:#717171; margin-top:6px;">screenshot placeholder</div></div></div>';
  }

  imgOrPh(src, h) {
    if (src.indexOf('__PH__') === 0) return this.phMarkup(src.slice(6), h);
    // Derive a readable label so a missing file can fall back to the striped placeholder.
    const label = (src.split('/').pop() || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
    return '<img src="' + src + '" alt="" data-h="' + (h || 'auto') + '" data-label="' + label + '" onerror="window.__czImgFallback && window.__czImgFallback(this)" style="display:block; width:100%; height:' + (h || 'auto') + '; object-fit:cover;">';
  }

  initProjects() {
    const grid = this.el.grid; if (!grid) return;
    const data = this.projectData();
    let html = '';
    const renderCard = (p) => {
      const body = '<div style="padding:16px;">' +
        '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">' + p.tags.slice(0, 4).map(t => '<span style="font-size:11.5px; padding:4px 10px; border-radius:999px; background:rgba(53,53,53,.13); border:1px solid rgba(87,87,87,.28); color:#dadada;">' + t + '</span>').join('') + '</div>' +
        '<p style="margin:0 0 14px; font-size:13px; line-height:1.55; color:#b5b5b5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">' + p.desc + '</p>' +
        '<div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">' +
        '<span style="font-size:13px; font-weight:600; color:var(--accent2);">View Details →</span>' +
        (p.repo ? '<a href="' + p.repo + '" target="_blank" data-stop style="font-size:12.5px; color:#c4c4c4; text-decoration:none; border-bottom:1px solid rgba(255,255,255,.22);">Repository</a>' : '') +
        (p.demo ? '<a href="' + p.demo + '" target="_blank" data-stop style="font-size:12.5px; color:#c4c4c4; text-decoration:none; border-bottom:1px solid rgba(255,255,255,.22);">' + (p.demoLabel || 'Live Demo') + '</a>' : '') +
        '</div></div>';
      if (p.gallery && p.images && p.images.length >= 3) {
        return '<div class="cz-card cz-card-gallery" data-id="' + p.id + '" data-reveal style="cursor:pointer; border-radius:22px; overflow:hidden; background:linear-gradient(170deg, rgba(87,87,87,.08), rgba(255,255,255,.02)); border:1px solid rgba(87,87,87,.22); transition:transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s, box-shadow .35s;">' +
          '<div style="position:relative; overflow:hidden; padding:18px 18px 8px; display:grid; grid-template-columns:repeat(3,1fr); gap:14px; background:radial-gradient(70% 60% at 50% 0%, rgba(53,53,53,.2), rgba(5,5,5,0) 60%);">' +
          p.images.slice(0, 3).map((src, i) =>
            '<div class="cz-gallery-item" data-i="' + i + '" style="position:relative; aspect-ratio:9/19; border-radius:18px; overflow:hidden; background:#040404; box-shadow:0 18px 38px rgba(0,0,0,.45), 0 0 0 1px rgba(87,87,87,.14); transition:transform .45s cubic-bezier(.2,.8,.2,1), box-shadow .45s;">' +
            '<img src="' + src + '" alt="" style="display:block; width:100%; height:100%; object-fit:cover; object-position:center top;">' +
            '<div style="position:absolute; left:0; right:0; bottom:0; padding:10px 12px; background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.65)); font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.14em; color:#dedede;">0' + (i + 1) + ' / 03</div>' +
            '</div>'
          ).join('') +
          '</div>' +
          '<div class="cz-cardtitle" style="padding:8px 18px 0; transition:transform .35s;"><h3 style="margin:0; font-size:18px; font-weight:700; letter-spacing:-.01em;">' + p.title + '</h3></div>' +
          body + '</div>';
      }
      const isSlideshow = p.slideshow && p.images && p.images.length > 1;
      const imgArea = isSlideshow
        ? p.images.map((src, i) =>
            '<img class="cz-slide" data-i="' + i + '" src="' + src + '" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:' + (i === 0 ? '1' : '0') + '; transition:opacity .9s ease;">'
          ).join('')
        : this.imgOrPh(p.thumb, '185px');
      const slideBadge = isSlideshow
        ? '<div class="cz-slide-badge" style="position:absolute; top:10px; left:10px; z-index:2; font-family:\'JetBrains Mono\',monospace; font-size:10px; letter-spacing:.12em; color:#dedede; background:rgba(0,0,0,.42); padding:3px 9px; border-radius:999px;">01 / 0' + p.images.length + '</div>'
        : '';
      return '<div class="cz-card" data-id="' + p.id + '" data-reveal style="cursor:pointer; border-radius:20px; overflow:hidden; background:linear-gradient(170deg, rgba(87,87,87,.04), rgba(255,255,255,.015)); border:1px solid rgba(255,255,255,.08); transition:transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s, box-shadow .35s;">' +
        '<div style="position:relative; height:185px; overflow:hidden;">' +
        '<div class="cz-cardimg" style="position:absolute; inset:0; transition:transform .5s cubic-bezier(.2,.8,.2,1);">' + imgArea + '</div>' +
        slideBadge +
        '<div style="position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,5,5,0) 40%,rgba(5,5,5,.55));"></div>' +
        '<div class="cz-cardtitle" style="position:absolute; left:0; right:0; bottom:0; padding:16px; transform:translateY(8px); transition:transform .35s;">' +
        '<h3 style="margin:0; font-size:16.5px; font-weight:700;">' + p.title + '</h3></div></div>' +
        body + '</div>';
    };
    const subLabels = { web: 'Web & Capstone', mobile: 'Mobile Apps' };
    data.forEach(group => {
      html += '<div style="margin-bottom:48px;">' +
        '<div data-reveal style="display:flex; align-items:baseline; gap:12px; margin-bottom:20px;">' +
        '<span style="font-size:15px; font-weight:800; color:var(--accent2); letter-spacing:.02em;">' + group.year + '</span>' +
        '<span style="font-size:13.5px; color:#8a8a8a;">' + group.sub + '</span></div>';
      // Split items by subgroup; preserve declaration order of subgroups encountered
      const buckets = []; const seen = {};
      group.items.forEach(p => {
        const key = p.subgroup || '_default';
        if (seen[key] == null) { seen[key] = buckets.length; buckets.push({ key, items: [] }); }
        buckets[seen[key]].items.push(p);
      });
      buckets.forEach((bk, bi) => {
        const isMobile = bk.key === 'mobile';
        if (subLabels[bk.key]) {
          html += '<div data-reveal style="display:flex; align-items:center; gap:12px; margin:' + (bi === 0 ? '0' : '34px') + ' 0 16px;">' +
            '<span style="font-family:\'JetBrains Mono\',monospace; font-size:11px; letter-spacing:.18em; color:#8a8a8a; text-transform:uppercase;">› ' + subLabels[bk.key] + '</span>' +
            '<span style="flex:1; height:1px; background:linear-gradient(90deg,rgba(87,87,87,.4),transparent);"></span>' +
            '</div>';
        }
        const gridCols = isMobile ? 'repeat(auto-fit, minmax(380px, 1fr))' : 'repeat(auto-fill, minmax(290px, 1fr))';
        html += '<div style="display:grid; grid-template-columns:' + gridCols + '; gap:18px;">';
        bk.items.forEach(p => { html += renderCard(p); });
        html += '</div>';
      });
      html += '</div>';
    });
    grid.innerHTML = html;

    const map = {};
    data.forEach(g => g.items.forEach(p => { map[p.id] = p; }));

    grid.querySelectorAll('[data-stop]').forEach(a => a.addEventListener('click', (e) => e.stopPropagation()));
    grid.querySelectorAll('.cz-card').forEach(card => {
      const img = card.querySelector('.cz-cardimg');
      const title = card.querySelector('.cz-cardtitle');
      const isGallery = card.classList.contains('cz-card-gallery');
      const baseBorder = isGallery ? 'rgba(87,87,87,.18)' : 'rgba(255,255,255,.08)';
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'rgba(87,87,87,.55)';
        card.style.boxShadow = '0 30px 60px rgba(0,0,0,.55), 0 0 50px rgba(53,53,53,.28)';
        if (img) img.style.transform = 'scale(1.07)';
        if (title && !isGallery) title.style.transform = 'translateY(0)';
      });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - .5) * -4;
        const ry = ((e.clientX - r.left) / r.width - .5) * 4;
        card.style.transform = 'translateY(-8px) perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'none';
        card.style.borderColor = baseBorder;
        card.style.boxShadow = 'none';
        if (img) img.style.transform = 'none';
        if (title && !isGallery) title.style.transform = 'translateY(8px)';
      });
      card.addEventListener('click', () => this.openModal(map[card.getAttribute('data-id')]));
      // Looping cross-fade slideshow (e.g. DropPoint Website: landing ↔ certificate)
      const slides = card.querySelectorAll('.cz-slide');
      if (slides.length > 1) {
        const badge = card.querySelector('.cz-slide-badge');
        let si = 0;
        const advance = () => {
          slides[si].style.opacity = '0';
          si = (si + 1) % slides.length;
          slides[si].style.opacity = '1';
          if (badge) badge.textContent = '0' + (si + 1) + ' / 0' + slides.length;
        };
        card._slideTimer = setInterval(advance, 2600);
      }
      // Per-phone interactivity for gallery cards
      card.querySelectorAll('.cz-gallery-item').forEach(g => {
        g.addEventListener('mouseenter', () => { g.style.transform = 'translateY(-10px) scale(1.04)'; g.style.boxShadow = '0 26px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(87,87,87,.5), 0 0 30px rgba(87,87,87,.3)'; });
        g.addEventListener('mouseleave', () => { g.style.transform = ''; g.style.boxShadow = '0 18px 38px rgba(0,0,0,.45), 0 0 0 1px rgba(87,87,87,.14)'; });
      });
    });

    // reveal the freshly-injected nodes
    grid.querySelectorAll('[data-reveal]').forEach(el => this.observeReveal(el));

    if (this.el.mbd) this.el.mbd.addEventListener('click', () => this.closeModal());
    this._escClose = (e) => { if (e.key === 'Escape') this.closeModal(); };
    window.addEventListener('keydown', this._escClose);
  }

  openModal(p) {
    if (!p) return;
    const card = this.el.mcard, modal = this.el.modal, bd = this.el.mbd;
    card.innerHTML =
      '<button id="cz-mclose" style="position:absolute; top:16px; right:16px; z-index:3; width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.45); color:#fff; font-size:18px; cursor:pointer; line-height:1;">×</button>' +
      '<div style="display:grid; gap:12px; padding:18px;">' +
      p.images.map(src => '<div style="border-radius:14px; overflow:hidden; border:1px solid rgba(255,255,255,.08);">' + this.imgOrPh(src, 'auto') + '</div>').join('') +
      '</div>' +
      '<div style="padding:6px 28px 30px;">' +
      '<h3 style="margin:0; font-size:clamp(22px,3vw,30px); font-weight:800; letter-spacing:-.02em;">' + p.title + '</h3>' +
      '<div style="display:flex; flex-wrap:wrap; gap:7px; margin:14px 0 16px;">' + p.tags.map(t => '<span style="font-size:12.5px; padding:5px 12px; border-radius:999px; background:rgba(53,53,53,.13); border:1px solid rgba(87,87,87,.25); color:#d4d4d4;">' + t + '</span>').join('') + '</div>' +
      '<p style="margin:0 0 20px; font-size:15px; line-height:1.7; color:#c0c0c0;">' + p.desc + '</p>' +
      '<div style="display:flex; flex-wrap:wrap; gap:12px;">' +
      (p.repo ? '<a href="' + p.repo + '" target="_blank" style="text-decoration:none; padding:12px 22px; border-radius:12px; font-size:14px; font-weight:600; color:#fff; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.16);">View Repository</a>' : '') +
      (p.demo ? '<a href="' + p.demo + '" target="_blank" style="text-decoration:none; padding:12px 22px; border-radius:12px; font-size:14px; font-weight:600; color:#fff; background:linear-gradient(135deg,var(--accent),var(--accentDeep)); box-shadow:0 10px 28px rgba(53,53,53,.32);">' + (p.demoLabel || 'Live Demo') + '</a>' : '') +
      '</div></div>';
    card.scrollTop = 0;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { bd.style.opacity = '1'; card.style.transform = 'translateY(0) scale(1)'; card.style.opacity = '1'; });
    const cb = card.querySelector('#cz-mclose');
    if (cb) cb.addEventListener('click', () => this.closeModal());
  }

  closeModal() {
    const card = this.el.mcard, modal = this.el.modal, bd = this.el.mbd;
    if (!modal || modal.style.display === 'none') return;
    bd.style.opacity = '0';
    card.style.transform = 'translateY(24px) scale(.98)';
    card.style.opacity = '0';
    document.body.style.overflow = '';
    setTimeout(() => { modal.style.display = 'none'; }, 320);
  }

  initForm() {
    const f = this.el.form, msg = this.el.formmsg; if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (msg) msg.style.display = 'block';
      f.querySelectorAll('input,textarea').forEach(i => { i.value = ''; });
    });
  }

  componentWillUnmount() {
    if (this._toolsCleanup) this._toolsCleanup();
    clearTimeout(this._typeT);
    cancelAnimationFrame(this._techRAF);
    if (this._spMove) window.removeEventListener('pointermove', this._spMove);
    if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    if (this._escClose) window.removeEventListener('keydown', this._escClose);
    document.body.style.overflow = '';
  }

  renderVals() { return {}; }
}

// Bootstrap once the DOM is parsed (script is loaded at end of <body>, but guard anyway).
(function () {
  const boot = () => {
    const app = new CZPortfolio();
    window.__czApp = app;
    app.componentDidMount();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
