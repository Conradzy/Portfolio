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
  const watchdog = setTimeout(finish,6500);

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
      depth:.35+Math.random()*.65, turn:.65+Math.random()*1.2,
      size:.5+Math.random(), delay:Math.random()*.3,
      pullDuration:1.1+Math.random()*.35, formDuration:.7+Math.random()*.25,
      driftSpeed:.18+Math.random()*.45, driftDirection:Math.random()<.5?-1:1,
      phaseX:Math.random()*Math.PI*2, phaseY:Math.random()*Math.PI*2,
      wander:12+Math.random()*32, frequency:.5+Math.random()*.8,
      tilt:(Math.random()-.5)*.8, stretch:.55+Math.random()*.4,
      bend:(Math.random()-.5)*100,
      lastX:null,lastY:null
    }));
    mask.width=mask.height=1;
  }
  function draw(time) {
    if (leaving || removed) return;
    if (!started) started=time;
    const seconds=(time-started)/1000;
    const pull=ease((seconds-.8)/1.65);
    const form=ease((seconds-2.3)/1.25);
    const solid=ease((seconds-3.55)/.4);
    overlay.dataset.phase=seconds<.8?'scatter':seconds<2.3?'vortex':seconds<3.65?'forming':'logo';
    overlay.style.setProperty('--loader-logo-opacity',solid.toFixed(3));
    overlay.style.setProperty('--loader-name-opacity',ease((seconds-3.7)/.35).toFixed(3));
    context.clearRect(0,0,width,height);
    const cx=width/2, cy=height/2, extent=Math.max(width,height);
    // A soft central halo grows with the inward motion, then recedes behind the logo.
    const glowAlpha=.13*Math.sin(pull*Math.PI*.8)*(1-form*.85);
    const glow=context.createRadialGradient(cx,cy,0,cx,cy,Math.min(width*.45,240));
    glow.addColorStop(0,`rgba(235,242,255,${glowAlpha})`); glow.addColorStop(1,'rgba(255,255,255,0)');
    context.fillStyle=glow; context.fillRect(0,0,width,height);
    particles.forEach(p => {
      // Each particle has its own clock and orbit. Smooth waves provide coherent
      // wandering rather than new random jitter on every animation frame.
      const progress=clamp((seconds-.8-p.delay)/p.pullDuration);
      const localPull=ease(progress*progress);
      const localForm=ease((seconds-2.3-p.delay)/p.formDuration);
      const wander=(1-localPull)*p.wander;
      const driftX=(Math.sin(seconds*p.frequency+p.phaseX)+.35*Math.sin(seconds*.43+p.phaseY))*wander;
      const driftY=(Math.cos(seconds*p.frequency*.73+p.phaseY)+.3*Math.sin(seconds*.61+p.phaseX))*wander;
      const radius=mix(p.radius*extent,6+p.depth*12,localPull);
      // Cubic angular travel starts gently and accelerates as the radius collapses.
      const angle=p.angle+seconds*p.driftSpeed*p.driftDirection*(1-localPull)
        +Math.pow(progress,3)*Math.PI*2*p.turn;
      const orbitX=Math.cos(angle)*radius;
      const orbitY=Math.sin(angle)*radius*p.stretch*p.depth;
      const vx=orbitX*Math.cos(p.tilt)-orbitY*Math.sin(p.tilt)+driftX;
      const vy=orbitX*Math.sin(p.tilt)+orbitY*Math.cos(p.tilt)+driftY;
      // Different curved approach paths decelerate to an exact, still silhouette.
      const bend=Math.sin(localForm*Math.PI)*p.bend;
      const x=cx+mix(vx,p.x*logoWidth,localForm)+bend*Math.cos(p.phaseX);
      const y=cy+mix(vy,p.y*logoHeight,localForm)+bend*Math.sin(p.phaseX);
      const twinkle=.88+.12*Math.sin(seconds*p.frequency+p.phaseY);
      const opacity=(.25+p.depth*.65)*twinkle*ease(seconds/.3)*(1-solid);
      if (p.lastX!==null && localPull>.02 && localForm<.95 && Math.hypot(x-p.lastX,y-p.lastY)<90) {
        context.strokeStyle=`rgba(235,242,255,${opacity*.28})`;
        context.lineWidth=p.size*.7; context.beginPath(); context.moveTo(p.lastX,p.lastY); context.lineTo(x,y); context.stroke();
      }
      context.fillStyle=`rgba(245,248,255,${opacity})`;
      context.beginPath(); context.arc(x,y,p.size*(1+form*.25),0,Math.PI*2); context.fill();
      p.lastX=x; p.lastY=y;
    });
    if(seconds>=4.4) finish(); else raf=requestAnimationFrame(draw);
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
