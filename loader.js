/* A brief canvas intro: scattered light, inward spiral, then the actual CZ silhouette. */
window.startCZLoader = function startCZLoader(overlay) {
  const canvas = overlay.querySelector('canvas');
  const mark = overlay.querySelector('img');
  const skip = overlay.querySelector('button');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const originalOverflow = document.body.style.overflow;
  const siblings = [...overlay.parentElement.children].filter(el => el!==overlay);
  const inertStates = siblings.map(el => el.inert);
  siblings.forEach(el => { el.inert=true; });
  document.body.style.overflow='hidden';
  let context, particles=[], width=0, height=0, logoWidth=0, logoHeight=0;
  let raf=0, started=0, leaving=false, removed=false, fadeTimer, reducedTimer;
  const events = new AbortController();
  const clamp = value => Math.max(0,Math.min(1,value));
  const ease = value => { const t=clamp(value); return t*t*(3-2*t); };
  const mix = (a,b,t) => a+(b-a)*t;
  const watchdog = setTimeout(finish,5500);

  function release() {
    if (removed) return;
    removed=true; clearTimeout(watchdog); clearTimeout(fadeTimer); clearTimeout(reducedTimer);
    cancelAnimationFrame(raf); events.abort();
    const hadFocus = overlay.contains(document.activeElement);
    siblings.forEach((el,i) => { el.inert=inertStates[i]; });
    document.body.style.overflow=originalOverflow;
    overlay.remove();
    canvas.width=canvas.height=1; particles=[];
    if (hadFocus) document.querySelector('.cz-navbar-logo')?.focus({preventScroll:true});
  }
  function finish() {
    if (leaving || removed) return;
    leaving=true; cancelAnimationFrame(raf); clearTimeout(watchdog);
    overlay.classList.add('is-leaving');
    fadeTimer=setTimeout(release,motion.matches?160:520);
  }
  function resize() {
    width=innerWidth; height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    context?.setTransform(ratio,0,0,ratio,0,0);
    logoWidth=Math.min(340,width*.7);
    logoHeight=logoWidth/(mark.naturalWidth/mark.naturalHeight||1.5);
    overlay.style.setProperty('--loader-logo-width',`${logoWidth}px`);
    particles.forEach(p => { p.lastX=p.lastY=null; });
  }
  function quietIntro() {
    if (leaving || removed) return;
    cancelAnimationFrame(raf);
    context?.clearRect(0,0,width,height);
    overlay.style.setProperty('--loader-logo-opacity','1');
    overlay.style.setProperty('--loader-name-opacity','1');
    clearTimeout(reducedTimer); reducedTimer=setTimeout(finish,650);
  }
  function sampleLogo() {
    const mask=document.createElement('canvas');
    mask.width=220; mask.height=Math.round(220*mark.naturalHeight/mark.naturalWidth);
    const ctx=mask.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(mark,0,0,mask.width,mask.height);
    const pixels=ctx.getImageData(0,0,mask.width,mask.height).data;
    const points=[];
    for(let y=0;y<mask.height;y+=2) for(let x=0;x<mask.width;x+=2) {
      if(pixels[(y*mask.width+x)*4+3]>150) points.push({x:x/mask.width-.5,y:y/mask.height-.5});
    }
    if (!points.length) throw Error('No logo silhouette');
    // Shuffle destinations so the whole mark assembles evenly, rather than in scan lines.
    for(let i=points.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [points[i],points[j]]=[points[j],points[i]]; }
    particles=points.slice(0,width<600?1000:1700).map(point => ({
      ...point, angle:Math.random()*Math.PI*2, radius:.12+Math.random()*.55,
      depth:.45+Math.random()*.55, turn:1.1+Math.random()*.6,
      size:.55+Math.random()*.8, delay:Math.random()*.12,
      lastX:null,lastY:null
    }));
    mask.width=mask.height=1;
  }
  function draw(time) {
    if (leaving || removed) return;
    if (!started) started=time;
    const seconds=(time-started)/1000;
    const pull=ease((seconds-.65)/1.55);
    const form=ease((seconds-2.15)/1.15);
    const solid=ease((seconds-3.05)/.5);
    overlay.dataset.phase=seconds<.65?'scatter':seconds<2.15?'vortex':seconds<3.3?'forming':'logo';
    overlay.style.setProperty('--loader-logo-opacity',solid.toFixed(3));
    overlay.style.setProperty('--loader-name-opacity',ease((seconds-3.2)/.45).toFixed(3));
    context.clearRect(0,0,width,height);
    const cx=width/2, cy=height/2, extent=Math.max(width,height);
    // A soft central halo grows with the inward motion, then recedes behind the logo.
    const glowAlpha=.13*Math.sin(pull*Math.PI*.8)*(1-form*.85);
    const glow=context.createRadialGradient(cx,cy,0,cx,cy,Math.min(width*.45,240));
    glow.addColorStop(0,`rgba(235,242,255,${glowAlpha})`); glow.addColorStop(1,'rgba(255,255,255,0)');
    context.fillStyle=glow; context.fillRect(0,0,width,height);
    particles.forEach(p => {
      const localPull=ease((seconds-.65-p.delay)/1.43);
      const radius=mix(p.radius*extent,8+p.depth*15,localPull);
      const angle=p.angle+seconds*.24+localPull*Math.PI*2*p.turn;
      const drift=Math.sin(seconds*1.5+p.angle)*8*(1-localPull);
      const vx=Math.cos(angle)*radius, vy=Math.sin(angle)*radius*.7*p.depth;
      const localForm=ease((seconds-2.15-p.delay)/1.03);
      const x=cx+mix(vx+drift,p.x*logoWidth,localForm);
      const y=cy+mix(vy,p.y*logoHeight,localForm);
      const opacity=(.25+p.depth*.65)*ease(seconds/.3)*(1-solid);
      if (p.lastX!==null && localPull>.02 && localForm<.95 && Math.hypot(x-p.lastX,y-p.lastY)<90) {
        context.strokeStyle=`rgba(235,242,255,${opacity*.28})`;
        context.lineWidth=p.size*.7; context.beginPath(); context.moveTo(p.lastX,p.lastY); context.lineTo(x,y); context.stroke();
      }
      context.fillStyle=`rgba(245,248,255,${opacity})`;
      context.beginPath(); context.arc(x,y,p.size*(1+form*.25),0,Math.PI*2); context.fill();
      p.lastX=x; p.lastY=y;
    });
    if(seconds>=4) finish(); else raf=requestAnimationFrame(draw);
  }
  skip.addEventListener('click',finish,{signal:events.signal});
  window.addEventListener('keydown',event => { if(event.key==='Escape') finish(); },{signal:events.signal});
  window.addEventListener('resize',resize,{signal:events.signal});
  window.addEventListener('pagehide',release,{signal:events.signal});
  // Do not keep a finished intro waiting in a background tab.
  document.addEventListener('visibilitychange',() => { if(document.hidden) release(); },{signal:events.signal});
  motion.addEventListener('change',() => { if(motion.matches) quietIntro(); },{signal:events.signal});
  try {
    context=canvas.getContext('2d'); resize();
    if (!context || motion.matches) quietIntro();
    else mark.decode().then(() => {
      if(leaving || removed) return;
      resize(); sampleLogo();
      if(motion.matches) quietIntro(); else raf=requestAnimationFrame(draw);
    }).catch(quietIntro);
  } catch { quietIntro(); }
  return release;
};
