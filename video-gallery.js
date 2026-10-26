// Add future edits here; each entry gets its own preview and on-demand player.
const videos = [
  { id:'8W23zkykGoY', title:'Basic Motion Graphics Practice', description:'A motion graphics practice piece exploring animated elements, timing, and visual rhythm.' },
  { id:'4rumCv7gjeE', title:'Featured Video Editing Sample', description:'The featured video editing sample from my portfolio.' }
];
const trigger = document.getElementById('cz-video-gallery-open');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.createElement('dialog');
dialog.id = 'cz-video-gallery';
dialog.setAttribute('aria-labelledby','cz-video-gallery-title');
dialog.innerHTML = `<div class="cz-video-gallery-shell">
  <header class="cz-web-gallery-header"><div><p class="cz-web-gallery-eyebrow">Selected edits / Motion & storytelling</p><h2 id="cz-video-gallery-title" class="cz-web-gallery-title">Video Editing Samples</h2></div><button type="button" class="cz-web-gallery-close" aria-label="Close video gallery" autofocus>&times;</button></header>
  <div class="cz-video-gallery-track" tabindex="0" role="region" aria-label="Video edits, scroll horizontally"></div>
  <footer class="cz-video-gallery-footer"><span class="cz-web-gallery-count" aria-live="polite" aria-atomic="true"></span><nav class="cz-web-gallery-dots" aria-label="Choose a video"></nav></footer>
</div>`;
document.body.append(dialog);
const track = dialog.querySelector('.cz-video-gallery-track');
const dotsHost = dialog.querySelector('nav');
const count = dialog.querySelector('.cz-web-gallery-count');
let active = 0, playing = -1, frame = 0, target = null, lastTime = 0, savedScroll;
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const cards = videos.map((video,index) => {
  const card = document.createElement('article');
  card.className = 'cz-video-card';
  card.innerHTML = '<div class="cz-video-card-inner"><div class="cz-video-preview"></div><h3></h3><p></p><a target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></div>';
  card.querySelector('h3').textContent = video.title;
  card.querySelector('p').textContent = video.description;
  card.querySelector('a').href = `https://www.youtube.com/watch?v=${video.id}`;
  track.append(card);
  const dot = document.createElement('button');
  dot.type = 'button'; dot.className = 'cz-web-gallery-dot';
  dot.setAttribute('aria-label',`Show ${video.title}`);
  dot.addEventListener('click',() => go(index)); dotsHost.append(dot);
  return card;
});
const dots = [...dotsHost.children];
function preview(index) {
  const video = videos[index], host = cards[index].querySelector('.cz-video-preview');
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'cz-video-play';
  button.setAttribute('aria-label',`Play ${video.title}`);
  const image = new Image();
  const fallback = () => { image.onerror=null; image.onload=null; image.src=`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`; };
  image.onerror=fallback; image.onload=() => { if (image.naturalWidth<=120) fallback(); };
  image.src = `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`; image.alt = ''; image.loading = 'lazy'; image.draggable = false;
  const icon = document.createElement('span'); icon.textContent = '▶'; icon.setAttribute('aria-hidden','true');
  button.append(image,icon); button.addEventListener('click',() => play(index)); host.replaceChildren(button);
}
function stop() { if (playing >= 0) preview(playing); playing = -1; }
function play(index) {
  stop(); go(index); playing = index;
  const iframe = document.createElement('iframe');
  iframe.title = `${videos[index].title} — YouTube player`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.src = `https://www.youtube-nocookie.com/embed/${videos[index].id}?autoplay=1&playsinline=1&rel=0`;
  cards[index].querySelector('.cz-video-preview').replaceChildren(iframe);
  iframe.focus({preventScroll:true});
}
cards.forEach((_,index) => preview(index));
const centerFor = index => clamp(cards[index].offsetLeft + cards[index].offsetWidth/2 - track.clientWidth/2,0,track.scrollWidth-track.clientWidth);
function update() {
  const middle = track.scrollLeft + track.clientWidth/2;
  let nearest = 0, distance = Infinity;
  cards.forEach((card,index) => {
    const d = Math.abs(card.offsetLeft + card.offsetWidth/2-middle);
    if (d < distance) { distance=d; nearest=index; }
    const proximity = Math.max(0,1-d/card.offsetWidth);
    card.style.setProperty('--video-card-scale',.94 + .06*proximity);
    card.style.setProperty('--video-card-opacity',.6 + .4*proximity);
  });
  if (playing >= 0 && nearest !== playing && target === null) stop();
  active = nearest;
  const label = `${String(active+1).padStart(2,'0')} / ${String(videos.length).padStart(2,'0')}`;
  if (count.textContent !== label) count.textContent = label;
  dots.forEach((dot,index) => dot.setAttribute('aria-current',String(index===active)));
}
function animate(time) {
  frame = 0;
  const dt = lastTime ? Math.min((time-lastTime)/1000,.05) : 1/60; lastTime = time;
  if (target !== null) {
    const diff = target-track.scrollLeft;
    if (motion.matches || Math.abs(diff)<2) { track.scrollLeft=target; target=null; }
    else track.scrollLeft += diff*(1-Math.exp(-dt*8));
  }
  update();
  if (target !== null) frame=requestAnimationFrame(animate); else lastTime=0;
}
function wake() { if (dialog.open && !frame) frame=requestAnimationFrame(animate); }
function go(index) {
  index=clamp(index,0,cards.length-1);
  if (playing>=0 && playing!==index) stop();
  target=centerFor(index); wake();
}
trigger.addEventListener('click',() => {
  savedScroll = [document.body.style.overflow,document.documentElement.style.overflow];
  document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
  dialog.showModal(); trigger.setAttribute('aria-expanded','true');
  document.dispatchEvent(new CustomEvent('cz:project-gallery',{detail:{open:true}}));
  track.scrollLeft=centerFor(active); update();
});
function close() { stop(); dialog.close(); }
dialog.querySelector('.cz-web-gallery-close').addEventListener('click',close);
dialog.addEventListener('cancel',event => { event.preventDefault(); close(); });
dialog.addEventListener('close',() => {
  stop(); cancelAnimationFrame(frame); frame=0; target=null; lastTime=0;
  [document.body.style.overflow,document.documentElement.style.overflow] = savedScroll;
  trigger.setAttribute('aria-expanded','false');
  document.dispatchEvent(new CustomEvent('cz:project-gallery',{detail:{open:false}}));
  trigger.focus({preventScroll:true});
});
track.addEventListener('scroll',wake,{passive:true});
track.addEventListener('pointerdown',() => { target=null; });
track.addEventListener('wheel',event => {
  if (event.ctrlKey) return;
  event.preventDefault(); event.stopPropagation();
  const raw = Math.abs(event.deltaX)>Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const units = event.deltaMode===1 ? 16 : event.deltaMode===2 ? track.clientWidth : 1;
  target=clamp((target??track.scrollLeft)+clamp(raw*units*.65,-180,180),0,track.scrollWidth-track.clientWidth); wake();
},{passive:false});
dialog.addEventListener('keydown',event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault();
    go(event.key==='Home' ? 0 : event.key==='End' ? cards.length-1 : active+(event.key==='ArrowRight'?1:-1));
  }
});
track.addEventListener('focusin',event => {
  const index = cards.findIndex(card => card.contains(event.target));
  if (index>=0) go(index);
});
new ResizeObserver(() => { if (dialog.open) { target=null; track.scrollLeft=centerFor(active); wake(); } }).observe(track);
document.addEventListener('visibilitychange',() => { if (document.hidden) stop(); });
