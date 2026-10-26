const nav = document.getElementById('cz-nav');
const links = document.getElementById('cz-navlinks');
const menuButton = nav.querySelector('.cz-nav-toggle');
const projects = nav.querySelector('.cz-nav-projects');
const projectsButton = document.getElementById('cz-projects-toggle');
const dropdown = document.getElementById('cz-projects-dropdown');
const compact = matchMedia('(max-width:1100px)');
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
let closeTimer, cueFrame, cueTimer;
function setProjects(open) {
  clearTimeout(closeTimer);
  projects.classList.toggle('is-open',open);
  projectsButton.setAttribute('aria-expanded',String(open));
  dropdown.inert = !open;
}
function setMenu(open) {
  nav.classList.toggle('is-menu-open',open);
  menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open ? 'Close navigation' : 'Open navigation');
  links.inert = compact.matches && !open;
  if (!open) setProjects(false);
}
menuButton.addEventListener('click',() => setMenu(!nav.classList.contains('is-menu-open')));
projectsButton.addEventListener('click',() => setProjects(projectsButton.getAttribute('aria-expanded')!=='true'));
projects.addEventListener('pointerenter',event => { if (event.pointerType==='mouse' && !compact.matches) setProjects(true); });
projects.addEventListener('pointerleave',event => {
  if (event.pointerType==='mouse' && !compact.matches && !projects.contains(document.activeElement)) closeTimer=setTimeout(() => setProjects(false),160);
});
projects.addEventListener('focusout',() => { closeTimer=setTimeout(() => { if (!projects.contains(document.activeElement)) setProjects(false); },0); });
projectsButton.addEventListener('keydown',event => {
  if (event.key==='ArrowDown') {
    event.preventDefault(); setProjects(true);
    const focusFirst = () => {
      if (dropdown.inert) return;
      if (getComputedStyle(dropdown).visibility==='visible') dropdown.querySelector('a').focus();
      else requestAnimationFrame(focusFirst);
    };
    requestAnimationFrame(focusFirst);
  }
});
nav.addEventListener('keydown',event => {
  if (event.key==='Escape') {
    event.preventDefault();
    if (projects.classList.contains('is-open')) { setProjects(false); projectsButton.focus(); }
    else { setMenu(false); menuButton.focus(); }
  }
});
document.addEventListener('pointerdown',event => { if (!nav.contains(event.target)) setMenu(false); });
nav.addEventListener('focusout',() => setTimeout(() => { if (!nav.contains(document.activeElement)) setMenu(false); },0));
compact.addEventListener('change',() => setMenu(false));
setMenu(false);

nav.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click',event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0) return;
  const section = document.querySelector(link.getAttribute('href'));
  if (!section) return;
  event.preventDefault(); setMenu(false);
  const top = section.id==='home' ? 0 : Math.max(0,scrollY+section.getBoundingClientRect().top-nav.getBoundingClientRect().height-24);
  history.pushState(null,'',link.getAttribute('href'));
  window.scrollTo({top,behavior:reduced.matches?'instant':'smooth'});
  cancelAnimationFrame(cueFrame); clearTimeout(cueTimer);
  const seeAll = document.getElementById('cz-video-gallery-open');
  seeAll.classList.remove('is-noticed');
  if (!link.hasAttribute('data-video-nav')) return;
  // Wait for the destination before giving the button a short, repeatable cue.
  const started = performance.now();
  const notice = () => {
    const box = seeAll.getBoundingClientRect();
    if (Math.abs(scrollY-top)<4 && box.top>=nav.getBoundingClientRect().bottom && box.bottom<innerHeight) {
      seeAll.classList.add('is-noticed');
      cueTimer=setTimeout(() => seeAll.classList.remove('is-noticed'),2200);
    } else if (performance.now()-started<5000) cueFrame=requestAnimationFrame(notice);
  };
  cueFrame=requestAnimationFrame(notice);
}));
