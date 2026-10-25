import { awards } from './awards.js';

const section = document.getElementById('achievements');
const trigger = section.querySelector('.cz-award-preview');
const autoplayButton = section.querySelector('.cz-award-autoplay');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const pad = n => String(n).padStart(2, '0');
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const slides = awards.flatMap((award, awardIndex) => award.photos.map(photo => ({ ...photo, awardIndex })));
const previewImages = [...trigger.querySelectorAll('img')];
let slide = 0, front = 0, visible = false, hovered = false, focused = false;
let paused = motion.matches, slideshowTimer = 0, previewToken = 0;

const dialog = document.createElement('dialog');
dialog.id = 'cz-awards-gallery';
dialog.setAttribute('aria-labelledby', 'cz-awards-title');
dialog.innerHTML = `<div class="cz-awards-shell">
  <header class="cz-web-gallery-header"><div><p class="cz-web-gallery-eyebrow">Achievements & recognition</p><h2 id="cz-awards-title" class="cz-web-gallery-title">The moments behind the milestones.</h2></div><button type="button" class="cz-web-gallery-close" aria-label="Close achievements gallery" autofocus>&times;</button></header>
  <div class="cz-awards-track" role="region" aria-label="Achievements, scroll horizontally" tabindex="0"></div>
  <footer class="cz-awards-footer"><p class="cz-web-gallery-help">Scroll or swipe between achievements.<br>Select a thumbnail to see each photo.</p><div class="cz-web-gallery-pagination"><span class="cz-web-gallery-count"></span><nav class="cz-web-gallery-dots" aria-label="Choose an achievement"></nav></div></footer>
  <p class="cz-web-gallery-announcement" aria-live="polite" aria-atomic="true"></p>
</div>`;
document.body.append(dialog);
const track = dialog.querySelector('.cz-awards-track');
const pagination = dialog.querySelector('.cz-web-gallery-dots');
const count = dialog.querySelector('.cz-web-gallery-count');
const announcement = dialog.querySelector('.cz-web-gallery-announcement');
const closeButton = dialog.querySelector('.cz-web-gallery-close');
const cards = awards.map((award, index) => {
  const card = document.createElement('article');
  card.className = 'cz-award-card'; card.dataset.award = award.id;
  card.innerHTML = `<div class="cz-award-content"><div class="cz-award-album"></div><div class="cz-award-copy"><p class="cz-award-subtitle"></p><h3></h3><p class="cz-award-result"></p><p class="cz-award-description"></p><p class="cz-award-institution"></p></div></div>`;
  card.querySelector('.cz-award-subtitle').textContent = `${pad(index + 1)} / ${award.subtitle}`;
  card.querySelector('h3').textContent = award.title;
  card.querySelector('.cz-award-result').textContent = award.result;
  card.querySelector('.cz-award-description').textContent = award.description;
  card.querySelector('.cz-award-institution').textContent = award.institution;
  const album = card.querySelector('.cz-award-album');
  if (award.photos.length) {
    album.innerHTML = '<div class="cz-award-photo"><img loading="lazy" draggable="false"></div><div class="cz-award-thumbnails" role="group"></div><p class="cz-award-photo-count" aria-live="polite"></p>';
    const image = album.querySelector('.cz-award-photo img');
    const thumbs = album.querySelector('.cz-award-thumbnails');
    thumbs.setAttribute('aria-label', `${award.title} photos`);
    image.src = award.photos[0].src; image.alt = award.photos[0].alt;
    album.querySelector('.cz-award-photo-count').textContent = `Photo 1 / ${award.photos.length}`;
    let photoToken = 0;
    award.photos.forEach((photo, photoIndex) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cz-award-thumbnail';
      button.setAttribute('aria-label', `Photo ${photoIndex + 1}: ${photo.alt}`);
      button.setAttribute('aria-pressed', String(photoIndex === 0));
      const thumbnail = document.createElement('img');
      thumbnail.src = photo.src; thumbnail.alt = ''; thumbnail.loading = 'lazy'; thumbnail.draggable = false;
      button.append(thumbnail); thumbs.append(button);
      button.addEventListener('click', async () => {
        const token = ++photoToken;
        const preload = new Image(); preload.src = photo.src;
        try { await preload.decode(); } catch { return; }
        if (token !== photoToken) return;
        image.classList.remove('is-changing');
        image.src = photo.src; image.alt = photo.alt;
        void image.offsetWidth;
        image.classList.add('is-changing');
        [...thumbs.children].forEach((thumb, i) => thumb.setAttribute('aria-pressed', String(i === photoIndex)));
        album.querySelector('.cz-award-photo-count').textContent = `Photo ${photoIndex + 1} / ${award.photos.length}`;
      });
    });
  } else {
    // A typographic summary, not a fabricated certificate or unrelated photograph.
    album.innerHTML = '<div class="cz-award-academic"><strong>1st</strong><span>Honors</span><p>Dean’s List</p><small>First year through third year<br>Second semester</small></div>';
  }
  track.append(card);
  const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'cz-web-gallery-dot';
  dot.setAttribute('aria-label', `Show ${award.title}`);
  dot.addEventListener('click', () => go(index)); pagination.append(dot);
  return card;
});
const dots = [...pagination.children];
let active = 0, geometry = [], target = null, raf = 0, previous = 0, opening = false;
let savedScroll = null, returnFocus = null, closeTimer = 0, drag = null;
const scales = awards.map(() => .92);
const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
function measure() { geometry = cards.map(card => ({ center:card.offsetLeft + card.offsetWidth / 2, width:card.offsetWidth })); }
const centerFor = i => clamp(geometry[i].center - track.clientWidth / 2, 0, maxScroll());
function markActive(index) {
  if (index !== active || !count.textContent) announcement.textContent = `${awards[index].title}, achievement ${index + 1} of ${awards.length}`;
  active = index; count.textContent = `${pad(index + 1)} / ${pad(awards.length)}`;
  dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
}
function frame(time) {
  raf = 0;
  if (!opening || document.hidden) { previous = 0; return; }
  const dt = previous ? Math.min((time - previous) / 1000, .05) : 1 / 60; previous = time;
  let moving = false;
  if (target !== null) {
    const diff = target - track.scrollLeft;
    if (motion.matches || Math.abs(diff) < .75) { track.scrollLeft = target; target = null; }
    else { track.scrollLeft += diff * (1 - Math.exp(-dt * 8)); moving = true; }
  }
  let nearest = 0, distance = Infinity;
  geometry.forEach((box, i) => {
    const d = Math.abs(box.center - track.scrollLeft - track.clientWidth / 2);
    if (d < distance) { distance = d; nearest = i; }
    const proximity = Math.max(0, 1 - d / box.width);
    const goal = .92 + .08 * proximity;
    scales[i] = motion.matches ? goal : scales[i] + (goal - scales[i]) * (1 - Math.exp(-dt * 12));
    if (Math.abs(goal - scales[i]) > .0003) moving = true;
    cards[i].style.setProperty('--award-scale', scales[i]);
    cards[i].style.setProperty('--award-opacity', .45 + .55 * proximity);
  });
  markActive(nearest);
  if (moving) raf = requestAnimationFrame(frame); else previous = 0;
}
function wake() { if (opening && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
function go(index) { measure(); target = centerFor(clamp(index, 0, cards.length - 1)); wake(); }
function openGallery() {
  if (dialog.open) return;
  previewToken++; clearTimeout(slideshowTimer); clearTimeout(closeTimer);
  returnFocus = document.activeElement;
  const gap = innerWidth - document.documentElement.clientWidth;
  savedScroll = { body:document.body.style.overflow, root:document.documentElement.style.overflow, padding:document.body.style.paddingRight };
  document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  dialog.showModal(); opening = true;
  trigger.setAttribute('aria-expanded', 'true');
  document.dispatchEvent(new CustomEvent('cz:project-gallery', { detail:{open:true} }));
  markActive(slides[slide].awardIndex); measure(); track.scrollLeft = centerFor(active); target = null;
  requestAnimationFrame(() => { dialog.classList.add('is-open'); wake(); });
}
function closeGallery() {
  if (!opening) return;
  opening = false; dialog.classList.remove('is-open');
  cancelAnimationFrame(raf); raf = 0; previous = 0; target = null; drag = null;
  closeTimer = setTimeout(() => {
    dialog.close();
    document.body.style.overflow = savedScroll.body; document.documentElement.style.overflow = savedScroll.root;
    document.body.style.paddingRight = savedScroll.padding;
    trigger.setAttribute('aria-expanded', 'false');
    document.dispatchEvent(new CustomEvent('cz:project-gallery', { detail:{open:false} }));
    (returnFocus?.isConnected ? returnFocus : trigger).focus({ preventScroll:true });
    scheduleSlideshow();
  }, motion.matches ? 0 : 250);
}
trigger.addEventListener('click', openGallery);
closeButton.addEventListener('click', closeGallery);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeGallery(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeGallery(); }
  else if (!event.ctrlKey && !event.altKey && !event.metaKey && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault();
    go(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : active + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
track.addEventListener('wheel', event => {
  if (event.ctrlKey || !opening) return;
  if (dialog.scrollHeight > dialog.clientHeight && event.target.closest('.cz-award-copy')) return;
  event.preventDefault(); event.stopPropagation();
  const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1);
  target = clamp((target ?? track.scrollLeft) + clamp(delta * .65, -180, 180), 0, maxScroll()); wake();
}, { passive:false });
track.addEventListener('scroll', wake, { passive:true });
track.addEventListener('pointerdown', event => {
  target = null;
  if (event.pointerType === 'touch' || event.button !== 0 || event.target.closest('button')) return;
  drag = { id:event.pointerId, x:event.clientX, start:track.scrollLeft };
  track.setPointerCapture(event.pointerId); event.preventDefault();
});
track.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) track.scrollLeft = drag.start + drag.x - event.clientX; });
['pointerup','pointercancel','lostpointercapture'].forEach(type => track.addEventListener(type, () => { drag = null; }));
track.addEventListener('focusin', event => {
  const index = cards.findIndex(card => card.contains(event.target));
  if (index >= 0 && index !== active) go(index);
});
new ResizeObserver(() => { if (opening) { measure(); target = null; track.scrollLeft = centerFor(active); wake(); } }).observe(track);

async function advancePreview() {
  const token = ++previewToken, nextSlide = (slide + 1) % slides.length, next = slides[nextSlide];
  const image = previewImages[1 - front];
  image.src = next.src;
  try { await image.decode(); } catch { scheduleSlideshow(); return; }
  if (token !== previewToken || !canPlay()) return;
  image.alt = next.alt; image.removeAttribute('aria-hidden'); image.style.opacity = '1';
  previewImages[front].style.opacity = '0'; previewImages[front].setAttribute('aria-hidden', 'true');
  front = 1 - front; slide = nextSlide;
  trigger.querySelector('.cz-award-preview-label').textContent = `${awards[next.awardIndex].title} · ${awards[next.awardIndex].subtitle}`;
  scheduleSlideshow();
}
const canPlay = () => visible && !paused && !hovered && !focused && !document.hidden && !dialog.open;
function scheduleSlideshow() { clearTimeout(slideshowTimer); if (canPlay()) slideshowTimer = setTimeout(advancePreview, 2000); }
function updateAutoplay() { autoplayButton.textContent = paused ? 'Play slideshow' : 'Pause slideshow'; autoplayButton.setAttribute('aria-label', paused ? 'Play photo slideshow' : 'Pause photo slideshow'); scheduleSlideshow(); }
autoplayButton.addEventListener('click', () => { paused = !paused; previewToken++; updateAutoplay(); });
trigger.addEventListener('mouseenter', () => { hovered = true; previewToken++; scheduleSlideshow(); });
trigger.addEventListener('mouseleave', () => { hovered = false; scheduleSlideshow(); });
trigger.addEventListener('focus', () => { focused = true; previewToken++; scheduleSlideshow(); });
trigger.addEventListener('blur', () => { focused = false; scheduleSlideshow(); });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) previewToken++; scheduleSlideshow(); }, { threshold:.15 }).observe(trigger);
document.addEventListener('visibilitychange', () => { previewToken++; scheduleSlideshow(); wake(); });
motion.addEventListener('change', () => { if (motion.matches) paused = true; updateAutoplay(); wake(); });
updateAutoplay();

// Type the section statement once as it enters the viewport, with stable layout.
const typed = section.querySelector('.cz-achievements-typed');
const statement = typed.textContent;
const titleObserver = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  titleObserver.disconnect();
  if (motion.matches) return;
  typed.textContent = '';
  let start;
  const type = time => {
    start ??= time;
    const length = motion.matches ? statement.length : Math.min(statement.length, Math.floor((time - start) / 28));
    typed.textContent = statement.slice(0, length);
    if (length < statement.length) requestAnimationFrame(type);
  };
  requestAnimationFrame(type);
}, { threshold:.3 });
titleObserver.observe(typed);
