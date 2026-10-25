// Shared scrolling, focus, click-versus-drag, and modal behavior for both portfolios.
export function createProjectGallery({ galleryId, trigger, openButton, projects, label, heading, device, loadRenderer, credit = '' }) {
if (!trigger || !openButton) return;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.createElement('dialog');
dialog.id = galleryId;
dialog.className = 'cz-project-gallery cz-gallery-' + device;
dialog.setAttribute('aria-labelledby',galleryId+'-title');
dialog.setAttribute('aria-describedby',galleryId+'-help');
dialog.innerHTML = `
  <div class="cz-web-gallery-shell">
    <header class="cz-web-gallery-header">
      <div><p class="cz-web-gallery-eyebrow">Selected work / ${label}</p><h2 id="${galleryId}-title" class="cz-web-gallery-title">${heading}</h2></div>
      <button class="cz-web-gallery-close" type="button" aria-label="Close project gallery" autofocus>&times;</button>
    </header>
    <div id="${galleryId}-viewport" class="cz-web-gallery-viewport">
      <div id="${galleryId}-track" class="cz-web-gallery-track" role="region" aria-label="${label} projects, scroll horizontally" tabindex="0"></div>
      <div id="${galleryId}-canvas" class="cz-web-gallery-canvas" aria-hidden="true"></div>
    </div>
    <footer class="cz-web-gallery-footer">
      <p id="${galleryId}-help" class="cz-web-gallery-help">Scroll or swipe to explore.<br>Drag a ${device} to rotate.</p>
      <div class="cz-web-gallery-pagination"><span id="${galleryId}-count" class="cz-web-gallery-count">01 / ${String(projects.length).padStart(2,'0')}</span><nav class="cz-web-gallery-dots" aria-label="Choose a project"></nav></div>
    </footer>
    ${credit ? `<p class="cz-gallery-credit">${credit}</p>` : ''}
    <p class="cz-web-gallery-announcement" aria-live="polite" aria-atomic="true"></p>
  </div>`;
document.body.append(dialog);
const viewport = dialog.querySelector('#'+galleryId+'-viewport');
const track = dialog.querySelector('#'+galleryId+'-track');
const canvasHost = dialog.querySelector('#'+galleryId+'-canvas');
const closeButton = dialog.querySelector('.cz-web-gallery-close');
const count = dialog.querySelector('#'+galleryId+'-count');
const announcement = dialog.querySelector('.cz-web-gallery-announcement');
const dotsContainer = dialog.querySelector('.cz-web-gallery-dots');
const pad = value => String(value).padStart(2,'0');
const cards = projects.map((project,index) => {
  const card = document.createElement('article');
  card.className = 'cz-web-project'; card.dataset.project = project.id;
  const link = document.createElement('a');
  link.className = 'cz-web-project-link'; link.href = project.repository;
  link.target = '_blank'; link.rel = 'noopener noreferrer'; link.draggable = false;
  link.setAttribute('aria-label',`${project.title}: view repository on GitHub (opens in a new tab)`);
  link.innerHTML = `<div class="cz-web-project-scale">
    <div class="cz-project-laptop"><div class="cz-project-laptop-glow"></div><div class="cz-project-laptop-shadow"></div>
      <img class="cz-project-laptop-fallback" alt="" loading="lazy" draggable="false">
    </div>
    <div class="cz-project-copy"><div class="cz-project-meta"><span class="cz-project-category"></span></div>
      <h3></h3><p></p><span class="cz-project-repository">View on GitHub <span aria-hidden="true">↗</span></span>
    </div></div>`;
  link.querySelector('img').src = project.image;
  link.querySelector('.cz-project-category').textContent = `${pad(index+1)} / ${project.category}`;
  if (project.role) {
    const badge = document.createElement('span'); badge.className = 'cz-project-role'; badge.textContent = project.role;
    link.querySelector('.cz-project-meta').append(badge);
  }
  link.querySelector('h3').textContent = project.title;
  link.querySelector('.cz-project-copy p').textContent = project.description;
  card.append(link); track.append(card);
  const dot = document.createElement('button');
  dot.type = 'button'; dot.className = 'cz-web-gallery-dot';
  dot.setAttribute('aria-label',`Show ${project.title}`); dot.setAttribute('aria-current',String(index===0));
  dot.addEventListener('click',() => go(index)); dotsContainer.append(dot);
  return card;
});
const stages = cards.map(card => card.querySelector('.cz-project-laptop'));
const scales = cards.map(card => card.querySelector('.cz-web-project-scale'));
const dots = [...dotsContainer.children];
let active = 0, raf = 0, previous = 0, elapsed = 0, target = null, engine = null, enginePromise = null;
let opening = false, closeTimer = 0, returnFocus = null, savedScroll = null, announceTimer = 0;
let geometry = [], currentScales = cards.map((_,i) => i===0?1:.86);
let drag = null, touchScrolling = false;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const maxScroll = () => Math.max(0,track.scrollWidth-track.clientWidth);
const centerFor = index => clamp(geometry[index].center-track.clientWidth/2,0,maxScroll());

function measure() {
  geometry = cards.map(card => ({ center:card.offsetLeft+card.offsetWidth/2, width:card.offsetWidth }));
}
function markActive(index) {
  if (active===index && count.textContent===`${pad(index+1)} / ${pad(cards.length)}`) return;
  active = index;
  count.textContent = `${pad(index+1)} / ${pad(cards.length)}`;
  dots.forEach((dot,i) => dot.setAttribute('aria-current',String(i===index)));
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { announcement.textContent = `${projects[index].title}, project ${index+1} of ${cards.length}`; },180);
}
function frame(time) {
  raf = 0;
  if (!dialog.open || !opening || document.hidden) { previous = 0; return; }
  const delta = previous ? Math.min((time-previous)/1000,.05) : 1/60;
  previous = time; elapsed += delta;
  let changing = false;
  if (target !== null && !touchScrolling) {
    const diff = target-track.scrollLeft;
    if (motion.matches || Math.abs(diff)<.5) { track.scrollLeft=target; target=null; }
    else { track.scrollLeft += diff*(1-Math.exp(-delta*9)); changing=true; }
  }
  const middle = track.scrollLeft+track.clientWidth/2;
  let nearest = 0, nearestDistance = Infinity;
  geometry.forEach((box,index) => {
    const distance = Math.abs(box.center-middle);
    if (distance<nearestDistance) { nearestDistance=distance; nearest=index; }
    const proximity = Math.pow(Math.cos(clamp(distance/box.width,0,1)*Math.PI/2),2);
    const goal = .86+.14*proximity;
    currentScales[index] = motion.matches ? goal : currentScales[index]+(goal-currentScales[index])*(1-Math.exp(-delta*12));
    if (Math.abs(goal-currentScales[index])>.0002) changing=true;
    scales[index].style.setProperty('--project-scale',currentScales[index].toFixed(5));
    scales[index].style.setProperty('--project-opacity',String(.5+.5*proximity));
  });
  markActive(nearest);
  engine?.render(delta,elapsed,motion.matches);
  if (changing || (engine && !motion.matches)) raf=requestAnimationFrame(frame);
  else previous=0;
}
function wake() {
  if (!opening || !dialog.open || document.hidden) return;
  if (!raf) raf=requestAnimationFrame(frame);
}
function go(index) {
  if (!geometry.length) measure();
  target=centerFor(clamp(index,0,cards.length-1)); wake();
}
function startEngine() {
  if (!enginePromise) {
    enginePromise=loadRenderer({host:canvasHost,viewport,stages,projects,wake})
      .then(value => { engine=value; dialog.dataset.renderer='ready'; wake(); })
      .catch(error => { dialog.dataset.renderer='fallback'; console.warn('Project gallery using image previews:',error); });
  }
}
function openGallery() {
  clearTimeout(closeTimer);
  if (dialog.open) { opening=true; dialog.classList.add('is-open'); wake(); return; }
  returnFocus=document.activeElement;
  const gap=innerWidth-document.documentElement.clientWidth;
  savedScroll={bodyOverflow:document.body.style.overflow,rootOverflow:document.documentElement.style.overflow,padding:document.body.style.paddingRight};
  document.body.style.overflow='hidden'; document.documentElement.style.overflow='hidden';
  if (gap>0) document.body.style.paddingRight=`${gap}px`;
  dialog.showModal(); opening=true;
  trigger.setAttribute('aria-expanded','true');
  document.dispatchEvent(new CustomEvent('cz:project-gallery',{detail:{open:true}}));
  measure(); track.scrollLeft=centerFor(active); target=null;
  requestAnimationFrame(() => { dialog.classList.add('is-open'); wake(); });
  startEngine();
}
function closeGallery() {
  if (!dialog.open || !opening) return;
  opening=false; dialog.classList.remove('is-open');
  cancelAnimationFrame(raf); raf=0; previous=0; target=null;
  clearTimeout(announceTimer); drag=null; touchScrolling=false;
  stages.forEach(stage => stage.classList.remove('is-dragging'));
  closeTimer=setTimeout(() => {
    dialog.close();
    document.body.style.overflow=savedScroll.bodyOverflow;
    document.documentElement.style.overflow=savedScroll.rootOverflow;
    document.body.style.paddingRight=savedScroll.padding;
    trigger.setAttribute('aria-expanded','false');
    document.dispatchEvent(new CustomEvent('cz:project-gallery',{detail:{open:false}}));
    const focus=returnFocus?.isConnected && returnFocus!==document.body ? returnFocus : openButton;
    focus?.focus({preventScroll:true});
  },motion.matches?0:250);
}
closeButton.addEventListener('click',closeGallery);
dialog.addEventListener('cancel',event => { event.preventDefault(); closeGallery(); });
dialog.addEventListener('wheel',event => {
  if (event.ctrlKey || !opening || event.defaultPrevented) return;
  // Let a short screen scroll the dialog vertically outside the project track.
  if (!viewport.contains(event.target)) return;
  if (dialog.scrollHeight > dialog.clientHeight && event.target.closest('.cz-project-copy')) return;
  const raw=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
  const normalized=raw*(event.deltaMode===1?16:event.deltaMode===2?track.clientWidth:1);
  event.preventDefault(); event.stopPropagation();
  const amount=clamp(normalized*.65,-180,180);
  const momentumLimit=(geometry[active]?.width||600)*.85;
  target=clamp(clamp((target??track.scrollLeft)+amount,track.scrollLeft-momentumLimit,track.scrollLeft+momentumLimit),0,maxScroll());
  wake();
},{passive:false});
track.addEventListener('scroll',wake,{passive:true});
track.addEventListener('pointerdown',event => {
  if (event.pointerType==='touch') { touchScrolling=true; target=null; }
});
['pointerup','pointercancel'].forEach(type => track.addEventListener(type,() => { touchScrolling=false; wake(); }));
dialog.addEventListener('keydown',event => {
  if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); closeGallery(); return; }
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const index=cards.findIndex(card => card.contains(event.target));
  if (index>=0 && (event.key==='ArrowUp'||event.key==='ArrowDown'||event.key==='Home'||(event.shiftKey&&['ArrowLeft','ArrowRight'].includes(event.key)))) {
    event.preventDefault();
    if (event.key==='Home') engine?.reset(index);
    else engine?.rotate(index,event.key==='ArrowLeft'?-20:event.key==='ArrowRight'?20:0,event.key==='ArrowUp'?-16:event.key==='ArrowDown'?16:0);
    wake(); return;
  }
  if (event.key==='ArrowLeft'||event.key==='ArrowRight') {
    event.preventDefault(); go(clamp(active+(event.key==='ArrowLeft'?-1:1),0,cards.length-1));
  }
});
cards.forEach((card,index) => {
  const stage=stages[index], link=card.querySelector('a');
  let suppressClick=false;
  link.addEventListener('focus',() => { if (opening) go(index); });
  stage.addEventListener('pointerdown',event => {
    suppressClick=false;
    if (event.pointerType==='touch'||event.button!==0||!engine) return;
    target=null; event.preventDefault();
    drag={id:event.pointerId,index,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event => {
    if (!drag||drag.id!==event.pointerId||drag.index!==index) return;
    if (Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>7) {
      suppressClick=true; stage.classList.add('is-dragging');
    }
    if (suppressClick) engine.rotate(index,event.clientX-drag.x,event.clientY-drag.y);
    drag.x=event.clientX; drag.y=event.clientY; wake();
  });
  const end=event => {
    if (!drag||drag.id!==event.pointerId||drag.index!==index) return;
    drag=null; stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  };
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => stage.addEventListener(type,end));
  link.addEventListener('click',event => { if (suppressClick) { event.preventDefault(); suppressClick=false; } });
  link.addEventListener('dragstart',event => event.preventDefault());
});
new ResizeObserver(() => {
  if (!dialog.open) return;
  measure(); target=null; track.scrollLeft=centerFor(active); wake();
}).observe(viewport);
motion.addEventListener('change',wake);
document.addEventListener('visibilitychange',() => {
  cancelAnimationFrame(raf); raf=0; previous=0; wake();
});

// A true click opens the gallery. Rotation drags must never open it accidentally.
let triggerPointer=null, triggerDragged=false;
trigger.addEventListener('pointerdown',event => {
  triggerPointer={id:event.pointerId,x:event.clientX,y:event.clientY}; triggerDragged=false;
},{capture:true});
trigger.addEventListener('pointermove',event => {
  if (triggerPointer?.id===event.pointerId && Math.hypot(event.clientX-triggerPointer.x,event.clientY-triggerPointer.y)>7) triggerDragged=true;
},{capture:true});
trigger.addEventListener('pointercancel',() => { triggerDragged=true; },{capture:true});
trigger.addEventListener('click',event => {
  if (triggerDragged && !openButton.contains(event.target)) { event.preventDefault(); triggerDragged=false; return; }
  openGallery();
});
trigger.addEventListener('keydown',event => {
  if ((event.key==='Enter'||event.key===' ') && event.target.tagName==='CANVAS') { event.preventDefault(); openGallery(); }
});

}
