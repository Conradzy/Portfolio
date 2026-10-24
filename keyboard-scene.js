// Procedural keyboard: each cap, logo, and label moves as a single 3D key.
// Icon provenance and licenses are retained in assets/keyboard/SOURCES.md.
const stage = document.getElementById('cz-keyboard-stage');
const host = document.getElementById('cz-keyboard-canvas');
const status = document.getElementById('cz-keyboard-active');
const label = document.getElementById('cz-keyboard-label');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const tools = [
  ['PHP', 'php', '#858bdc', '#111'],
  ['JavaScript', 'javascript', '#f5d62c', '#111'],
  ['TypeScript', 'typescript', '#137bd1', '#fff'],
  ['Python', 'python', '#f5f4ef', '#111'],
  ['HTML', 'html5', '#e84e24', '#fff'],
  ['CSS', 'css3', '#147de3', '#fff'],
  ['Dart', 'dart', '#075c9c', '#fff'],
  ['C++', 'cplusplus', '#123675', '#fff'],
  ['NumPy', 'numpy', '#f2f4f8', '#111'],
  ['Pandas', 'pandas', '#f5f3fa', '#111'],
  ['Scikit-learn', 'scikitlearn', '#f6f4f0', '#111'],
  ['PyTorch', 'pytorch', '#212124', '#fff'],
  ['Matplotlib', 'matplotlib', '#f5f4f7', '#111'],
  ['Laravel', 'laravel', '#faf1eb', '#111'],
  ['Next.js', 'nextjs', '#161719', '#fff'],
  ['Django', 'django', '#164b3d', '#fff', '#fff'],
  ['FastAPI', 'fastapi', '#009e92', '#fff'],
  ['Flutter', 'flutter', '#f0f6f7', '#111'],
  ['Google Cloud', 'googlecloud', '#f6f3ed', '#111'],
  ['PostgreSQL', 'postgresql', '#13569b', '#fff'],
  ['Supabase', 'supabase', '#202427', '#fff'],
  ['WAMP', 'wampserver', '#e5007a', '#fff', '#fff'],
  ['phpMyAdmin', 'phpmyadmin', '#faf2e8', '#111', '#e99c21'],
  ['Firebase', 'firebase', '#f8f3e8', '#111'],
  ['Figma', 'figma', '#222326', '#fff'],
  ['Arduino', 'arduino', '#009a9d', '#fff', '#fff'],
  ['Cisco', 'cisco', '#f4f6f9', '#111', '#007fc1'],
  ['Bootstrap', 'bootstrap', '#751ce2', '#fff'],
  ['Vercel', 'vercel', '#202124', '#fff', '#fff']
];
let started = false, visible = false, wake = () => {}, clearActive = () => {};

async function initKeyboard() {
  if (started) return;
  started = true;
  let renderer;
  try {
    const THREE = await import('three');
    const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
    await document.fonts.ready;
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'group');
    canvas.setAttribute('aria-label', 'Interactive tech stack keyboard. Hover or touch a key to press it. Use arrow keys to select a tool, Space or Enter to press, Escape to release.');
    canvas.setAttribute('aria-describedby', 'cz-keyboard-active');
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-8, 8, 4, -4, .1, 80);
    camera.position.set(0, 14, 12);
    camera.lookAt(0, 0, 0);
    const board = new THREE.Group();
    scene.add(board);
    const studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.BoxGeometry(30,30,30), new THREE.MeshBasicMaterial({ color:0x888888, side:THREE.BackSide })));
    for (const [x,y,z,w,h] of [[-7,9,5,6,8],[9,5,-4,4,7],[0,12,-8,10,3]]) {
      const lightPanel = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({ color:new THREE.Color(3,3,3), side:THREE.DoubleSide }));
      lightPanel.position.set(x,y,z); lightPanel.lookAt(0,0,0); studio.add(lightPanel);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, .025);
    scene.environment = environment.texture;
    pmrem.dispose();
    studio.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555566, 1.2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-5, 12, 6);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left:-10, right:10, top:10, bottom:-10, near:1, far:35 });
    light.shadow.bias = -.0005;
    light.shadow.normalBias = .035;
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xc8dbff, 1.5);
    rim.position.set(6, 4, -8); scene.add(rim);
    const base = new THREE.Mesh(new RoundedBoxGeometry(1, .34, 1, 3, .12),
      new THREE.MeshStandardMaterial({ color:0x171a20, metalness:.6, roughness:.3 }));
    base.receiveShadow = true;
    board.add(base);
    const deck = new THREE.Mesh(new RoundedBoxGeometry(1, .1, 1, 3, .04),
      new THREE.MeshStandardMaterial({ color:0x292d35, metalness:.45, roughness:.35 }));
    deck.position.y = .19; deck.receiveShadow = true; board.add(deck);
    const capGeometry = new RoundedBoxGeometry(1.28, .47, 1.4, 3, .14);
    const socketGeometry = new RoundedBoxGeometry(1.32, .05, 1.44, 2, .02);
    const faceGeometry = new THREE.PlaneGeometry(1.14, 1.25);
    const keys = [];
    const loadIcon = src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Missing keyboard icon: ' + src));
      img.src = src;
    });
    const icons = await Promise.all(tools.map(tool => loadIcon('assets/keyboard/' + tool[1] + '.svg')));
    tools.forEach((tool, index) => {
      const [name, id, color, textColor, tint] = tool;
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = textureCanvas.height = 512;
      const ctx = textureCanvas.getContext('2d');
      const icon = icons[index];
      const scale = Math.min(320 / icon.width, 310 / icon.height);
      const w = icon.width * scale, h = icon.height * scale;
      ctx.drawImage(icon, (512-w)/2, 30+(310-h)/2, w, h);
      if (tint) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = tint; ctx.fillRect(0, 0, 512, 355);
        ctx.globalCompositeOperation = 'source-over';
      }
      let fontSize = 62;
      do { ctx.font = '650 ' + fontSize-- + 'px "Inter Tight", sans-serif'; }
      while (ctx.measureText(name).width > 470 && fontSize > 26);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.fillText(name, 256, 427);
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const group = new THREE.Group();
      group.name = 'Key_' + id;
      group.position.y = .55;
      const cap = new THREE.Mesh(capGeometry, new THREE.MeshPhysicalMaterial({
        color, metalness:.08, roughness:.3, clearcoat:.65, clearcoatRoughness:.22
      }));
      cap.castShadow = true; cap.receiveShadow = true;
      cap.userData.keyIndex = index;
      group.add(cap);
      const face = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({ map:texture, transparent:true, depthWrite:false, toneMapped:false }));
      face.rotation.x = -Math.PI/2;
      face.position.y = .237;
      group.add(face);
      board.add(group);
      const glowColor = new THREE.Color().setHSL((index * .13) % 1, .9, .55);
      const socket = new THREE.Mesh(socketGeometry, new THREE.MeshStandardMaterial({
        color:glowColor, emissive:glowColor, emissiveIntensity:.3, metalness:.15, roughness:.35
      }));
      socket.position.y = .27; board.add(socket);
      keys.push({ group, cap, socket, offset:0, velocity:0 });
    });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    // Stable hit surfaces never move with the key, avoiding hover flicker as it depresses.
    const hits = keys.map((key,index) => {
      const hit = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 1.5), new THREE.MeshBasicMaterial({ visible:false, side:THREE.DoubleSide }));
      hit.rotation.x = -Math.PI/2; hit.position.y = .81; hit.userData.keyIndex = index;
      board.add(hit); return hit;
    });
    let active = -1, selected = 0, columns = 10, raf = 0, previous = 0, touchTimer;
    let elapsed = 0, hoverPoint = null, contextLost = false;
    const fitLabel = () => {
      // Keep the 300px desktop treatment, shrinking only when a tool name needs it.
      status.style.removeProperty('--keyboard-label-size');
      if (!label.textContent) return;
      const textWidth = label.getBoundingClientRect().width;
      const availableWidth = status.clientWidth - 8;
      if (availableWidth > 0 && textWidth > availableWidth) {
        const fontSize = parseFloat(getComputedStyle(status).fontSize);
        status.style.setProperty('--keyboard-label-size', Math.floor(fontSize * availableWidth / textWidth) + 'px');
      }
    };
    // Refit after the real font arrives, not just against its fallback metrics.
    document.fonts.load('700 300px Poppins').then(fitLabel).catch(() => {});
    const setActive = (index, schedule = true) => {
      if (active === index) return;
      active = index;
      canvas.style.cursor = index >= 0 ? 'pointer' : 'default';
      label.textContent = index >= 0 ? tools[index][0] : '';
      fitLabel();
      stage.dataset.activeKey = index >= 0 ? tools[index][1] : '';
      if (schedule) wake();
    };
    clearActive = () => { clearTimeout(touchTimer); hoverPoint = null; setActive(-1); };
    const pick = event => {
      const b = canvas.getBoundingClientRect();
      pointer.set((event.clientX-b.left)/b.width*2-1, -(event.clientY-b.top)/b.height*2+1);
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(hits, false)[0]?.object.userData.keyIndex ?? -1;
    };
    const render = time => {
      raf = 0;
      if (!visible || document.hidden || contextLost) { previous = 0; return; }
      const delta = previous ? Math.min((time-previous)/1000, 1/30) : 1/60;
      previous = time;
      // Independent, slow sine waves blend the lift and tilt without abrupt reversals.
      // Animate the parent, leaving the mechanical travel of each key independent.
      if (!motion.matches) elapsed += delta;
      const wave = seconds => motion.matches ? 0 : Math.sin(elapsed * Math.PI * 2 / seconds);
      const lift = wave(18);
      board.position.set(.018 * wave(24), .045 * lift, 0);
      board.rotation.set(.008 * wave(22), .016 * wave(26), .005 * wave(20));
      stage.style.setProperty('--keyboard-shadow-scale', (1 - .015 * lift).toFixed(4));
      stage.style.setProperty('--keyboard-shadow-opacity', (.8 - .035 * lift).toFixed(4));
      // Recheck a stationary mouse as the board gently moves underneath it.
      if (hoverPoint) setActive(pick(hoverPoint), false);
      let moving = false;
      keys.forEach((key,index) => {
        const target = index === active ? -.19 : 0;
        if (motion.matches) { key.offset = target; key.velocity = 0; }
        else {
          // A damped mechanical spring, integrated in small stable steps.
          for (let step=0; step<3; step++) {
            key.velocity += ((target-key.offset)*260-key.velocity*25) * delta/3;
            key.offset += key.velocity * delta/3;
          }
          if (Math.abs(target-key.offset)<.0001 && Math.abs(key.velocity)<.001) {
            key.offset = target; key.velocity = 0;
          } else moving = true;
        }
        key.group.position.y = .55 + key.offset;
        key.socket.material.emissiveIntensity = .3 + Math.abs(key.offset)*3;
      });
      renderer.render(scene, camera);
      if (moving || !motion.matches) raf = requestAnimationFrame(render);
      else previous = 0;
    };
    wake = () => {
      if (!visible || document.hidden || contextLost) { cancelAnimationFrame(raf); raf = 0; previous = 0; return; }
      if (!raf) raf = requestAnimationFrame(render);
    };
    canvas.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      hoverPoint = { clientX:event.clientX, clientY:event.clientY };
      setActive(pick(hoverPoint));
    });
    canvas.addEventListener('pointerleave', clearActive);
    canvas.addEventListener('pointercancel', clearActive);
    canvas.addEventListener('pointerdown', event => {
      clearTimeout(touchTimer);
      hoverPoint = event.pointerType === 'mouse' ? { clientX:event.clientX, clientY:event.clientY } : null;
      const index = pick(event);
      if (index >= 0) { selected = index; setActive(index); }
    });
    canvas.addEventListener('pointerup', event => {
      if (event.pointerType !== 'mouse') touchTimer = setTimeout(clearActive, 180);
    });
    canvas.addEventListener('blur', clearActive);
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',' ','Enter','Escape'].includes(event.key)) return;
      event.preventDefault();
      hoverPoint = null;
      if (event.key === 'Escape') { clearActive(); return; }
      if (event.key === 'Home') selected = 0;
      if (event.key === 'End') selected = keys.length-1;
      if (event.key === 'ArrowLeft') selected--;
      if (event.key === 'ArrowRight') selected++;
      if (event.key === 'ArrowUp') selected -= columns;
      if (event.key === 'ArrowDown') selected += columns;
      selected = THREE.MathUtils.clamp(selected, 0, keys.length-1);
      setActive(selected);
    });
    canvas.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Enter') clearActive(); });
    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      clearActive();
      const mobile = window.innerWidth <= 650;
      columns = mobile ? 5 : 10;
      const rows = Math.ceil(keys.length/columns);
      const boardWidth = columns * 1.46 + .28, boardDepth = rows * 1.62 + .32;
      base.scale.set(boardWidth, 1, boardDepth);
      deck.scale.set(boardWidth-.12, 1, boardDepth-.12);
      keys.forEach((key,index) => {
        const row = Math.floor(index/columns), col = index%columns;
        const count = Math.min(columns, keys.length-row*columns);
        const x = (col-(count-1)/2)*1.46, z = (row-(rows-1)/2)*1.62;
        key.group.position.x = key.socket.position.x = hits[index].position.x = x;
        key.group.position.z = key.socket.position.z = hits[index].position.z = z;
      });
      renderer.setSize(width, height, false);
      camera.position.set(mobile ? 0 : .65, 14, mobile ? 9 : 12);
      camera.lookAt(0, 0, 0);
      const aspect = width/height;
      const halfHeight = Math.max(boardWidth/aspect, boardDepth*.86+1.8)*.56;
      camera.left = -halfHeight*aspect; camera.right = halfHeight*aspect;
      camera.top = halfHeight; camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      wake();
    };
    new ResizeObserver(resize).observe(host);
    motion.addEventListener('change', wake);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearActive(); wake(); });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); contextLost = true; clearActive(); wake();
      stage.classList.remove('cz-keyboard-ready');
    });
    canvas.addEventListener('webglcontextrestored', () => { contextLost = false; stage.classList.add('cz-keyboard-ready'); resize(); });
    resize();
    stage.classList.add('cz-keyboard-ready');
  } catch (error) {
    console.warn('Keyboard showcase unavailable:', error);
    renderer?.dispose();
    host.replaceChildren();
    stage.classList.remove('cz-keyboard-ready');
  }
}

if (stage && host) {
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) initKeyboard(); else clearActive();
      wake();
    }, { rootMargin:'100px' }).observe(stage);
  } else { visible = true; initKeyboard(); }
}
