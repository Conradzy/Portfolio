// Three.js r184 is vendored locally so this showcase does not depend on a CDN.
const stage = document.getElementById('cz-laptop-stage');
const host = document.getElementById('cz-laptop-canvas');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let started = false;
let renderScene = () => {};

async function initLaptop() {
  if (started) return;
  started = true;
  let renderer;
  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    const floating = new THREE.Group();
    scene.add(floating);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2);
    rim.position.set(4, 3, -4);
    scene.add(rim);

    const [gltf, screenshot] = await Promise.all([
      new GLTFLoader().loadAsync('assets/laptop.glb'),
      new THREE.TextureLoader().loadAsync('assets/anitime-screen.png')
    ]);
    const model = gltf.scene;
    const screen = model.getObjectByName('Screen_ComputerScreen_0');
    if (!screen) throw new Error('Laptop display mesh not found');

    // The supplied model's display is the quad at local X +/- .147,
    // Y .01536..18536, Z .00432. Keep its bezel and casing untouched.
    // Cover the entire display, cropping the edges instead of adding letterboxing.
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 2048;
    textureCanvas.height = Math.round(2048 * .17 / .294);
    const context = textureCanvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
    const img = screenshot.image;
    const fit = Math.max(textureCanvas.width / img.width, textureCanvas.height / img.height);
    const w = img.width * fit, h = img.height * fit;
    context.drawImage(img, (textureCanvas.width - w) / 2, (textureCanvas.height - h) / 2, w, h);
    screenshot.dispose();
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(.294, .17),
      new THREE.MeshBasicMaterial({ map:texture, toneMapped:false })
    );
    display.name = 'AniTimeDisplay';
    display.position.set(0, .10036, .00420);
    // Local -Z faces the viewer; this also corrects the model's reversed X axis.
    display.rotation.y = Math.PI;
    screen.add(display);

    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 3.5 / size.x;
    model.scale.multiplyScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    // Separate user rotation from the floating motion so neither overwrites the other.
    const turntable = new THREE.Group();
    turntable.add(model);
    floating.add(turntable);
    let targetYaw = -.14, targetPitch = 0;
    turntable.rotation.y = targetYaw;

    let raf = 0, previous = 0, elapsed = 0;
    const render = time => {
      raf = 0;
      if (!visible || document.hidden) { previous = 0; return; }
      if (previous) elapsed += Math.min(time - previous, 50) / 1000;
      previous = time;
      const wave = motion.matches ? 0 : Math.sin(elapsed * .7);
      floating.position.y = .10 + wave * .075;
      floating.rotation.z = motion.matches ? 0 : Math.sin(elapsed * .4) * .012;
      const ease = motion.matches ? 1 : .14;
      turntable.rotation.y += (targetYaw - turntable.rotation.y) * ease;
      turntable.rotation.x += (targetPitch - turntable.rotation.x) * ease;
      stage.style.setProperty('--laptop-shadow-scale', String(1 - wave * .07));
      renderer.render(scene, camera);
      if (!motion.matches) raf = requestAnimationFrame(render);
    };
    renderScene = () => {
      cancelAnimationFrame(raf);
      previous = 0;
      if (visible && !document.hidden) raf = requestAnimationFrame(render);
    };
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive AniTime laptop. Drag to rotate and tilt. Arrow keys rotate and tilt; Home resets the view.');
    canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home');
    let drag = null;
    const resetView = () => {
      targetYaw = -.14;
      targetPitch = 0;
      renderScene();
    };
    const endDrag = event => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      canvas.classList.remove('is-dragging');
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || drag) return;
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll:true });
      canvas.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      targetYaw += (event.clientX - drag.x) * .008;
      targetPitch = THREE.MathUtils.clamp(targetPitch + (event.clientY - drag.y) * .006, -.55, .55);
      drag.x = event.clientX;
      drag.y = event.clientY;
      renderScene();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, endDrag));
    canvas.addEventListener('dblclick', resetView);
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') { resetView(); return; }
      if (event.key === 'ArrowLeft') targetYaw -= .15;
      if (event.key === 'ArrowRight') targetYaw += .15;
      if (event.key === 'ArrowUp') targetPitch -= .1;
      if (event.key === 'ArrowDown') targetPitch += .1;
      targetPitch = THREE.MathUtils.clamp(targetPitch, -.55, .55);
      renderScene();
    });
    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Fit the complete model with breathing room above the ground shadow.
      const distance = Math.max(6.8, 6.8 / camera.aspect);
      camera.position.set(.55, distance * .31, distance);
      camera.lookAt(0, -.05, 0);
      camera.updateProjectionMatrix();
      renderScene();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    motion.addEventListener('change', renderScene);
    document.addEventListener('visibilitychange', renderScene);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      cancelAnimationFrame(raf);
      stage.classList.remove('cz-laptop-ready');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      stage.classList.add('cz-laptop-ready');
      resize();
    });
    resize();
    stage.classList.add('cz-laptop-ready');
  } catch (error) {
    // Keep the original screenshot visible if WebGL or a model asset is unavailable.
    console.warn('Laptop showcase unavailable:', error);
    renderer?.dispose();
    host.replaceChildren();
    stage.classList.remove('cz-laptop-ready');
  }
}

if (stage && host) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) initLaptop();
      renderScene();
    }, { rootMargin:'100px', threshold:0 });
    observer.observe(stage);
  } else {
    visible = true;
    initLaptop();
  }
}
