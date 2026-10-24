// Original iPhone model by DatSketch (CC BY 4.0); screen adapted for SagingAI.
const stage = document.getElementById('cz-phone-stage');
const host = document.getElementById('cz-phone-canvas');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
let visible = false, started = false;
let renderScene = () => {};

async function initPhone() {
  if (started) return;
  started = true;
  let renderer;
  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);

    // Studio softboxes produce actual view-dependent reflections on the metal
    // and glass, rather than a flat white overlay attached to the screenshot.
    const studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color:0x777777, side:THREE.BackSide })));
    const softbox = (width, height, x, y, z, intensity) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color:new THREE.Color().setScalar(intensity), side:THREE.DoubleSide }));
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    };
    softbox(3, 8, -6, 3, 5, 4);
    softbox(2, 7, 6, 1, 3, 3);
    softbox(7, 2, 0, 7, -3, 4);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, .04);
    scene.environment = environment.texture;
    pmrem.dispose();
    studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, .8));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-3, 5, 6);
    scene.add(key);

    const [gltf, texture] = await Promise.all([
      new GLTFLoader().loadAsync('assets/iphone-12-pro.glb'),
      new THREE.TextureLoader().loadAsync('assets/sagingai-screen.jpeg')
    ]);
    const model = gltf.scene;
    const screen = model.getObjectByName('Screen_Wallpaper_0');
    if (!screen) throw new Error('iPhone display mesh not found');
    // Map across the original rounded/notched screen geometry, not a rectangle
    // floating in front of the device. Center-crop to cover without stretching.
    screen.geometry = screen.geometry.clone();
    screen.geometry.computeBoundingBox();
    const bounds = screen.geometry.boundingBox;
    const size = bounds.getSize(new THREE.Vector3());
    const positions = screen.geometry.attributes.position;
    const uv = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) {
      uv[i * 2] = (positions.getX(i) - bounds.min.x) / size.x;
      uv[i * 2 + 1] = (positions.getY(i) - bounds.min.y) / size.y;
    }
    screen.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const imageAspect = texture.image.width / texture.image.height;
    const screenAspect = size.x / size.y;
    if (imageAspect > screenAspect) texture.repeat.x = screenAspect / imageAspect;
    else texture.repeat.y = imageAspect / screenAspect;
    texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
    screen.material = new THREE.MeshPhysicalMaterial({
      map:texture, color:0xaaaaaa, emissive:0xffffff, emissiveMap:texture,
      emissiveIntensity:.65, metalness:0, roughness:.2,
      clearcoat:1, clearcoatRoughness:.08, envMapIntensity:.6
    });
    screen.material.name = 'SagingAI reflective display';

    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const scale = 3.6 / box.getSize(new THREE.Vector3()).y;
    // Keep the model's root transform intact while centering its world bounds.
    const centered = new THREE.Group();
    centered.add(model);
    centered.position.copy(center).multiplyScalar(-scale);
    centered.scale.setScalar(scale);
    const turntable = new THREE.Group();
    turntable.add(centered);
    const floating = new THREE.Group();
    floating.add(turntable);
    scene.add(floating);
    let targetYaw = -.22, targetPitch = .04;
    turntable.rotation.set(targetPitch, targetYaw, -.06);
    let raf = 0, previous = 0, elapsed = 0;
    const render = time => {
      raf = 0;
      if (!visible || document.hidden) { previous = 0; return; }
      const delta = previous ? Math.min(time - previous, 50) / 1000 : 1 / 60;
      elapsed += delta;
      previous = time;
      const wave = motion.matches ? 0 : Math.sin(elapsed * .7);
      floating.position.y = .12 + wave * .075;
      floating.rotation.z = motion.matches ? 0 : Math.sin(elapsed * .4) * .012;
      // Match the laptop's slow, smoothly reversing +/-15 degree idle sway.
      floating.rotation.y = motion.matches ? 0 : Math.sin(elapsed * Math.PI / 9) * Math.PI / 12;
      const ease = motion.matches ? 1 : 1 - Math.exp(-delta * 9);
      turntable.rotation.y += (targetYaw - turntable.rotation.y) * ease;
      turntable.rotation.x += (targetPitch - turntable.rotation.x) * ease;
      stage.style.setProperty('--phone-shadow-scale', String(1 - wave * .08));
      renderer.render(scene, camera);
      if (!motion.matches) raf = requestAnimationFrame(render);
    };
    renderScene = () => {
      if (!visible || document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        previous = 0;
        return;
      }
      // Preserve the clock while dragging, resizing, or updating the view.
      if (!raf) raf = requestAnimationFrame(render);
    };
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive SagingAI iPhone. Drag to rotate and tilt. Arrow keys rotate and tilt; Home resets the view.');
    canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home');
    let drag = null;
    const resetView = () => { targetYaw = -.22; targetPitch = .04; renderScene(); };
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
      targetPitch = THREE.MathUtils.clamp(targetPitch + (event.clientY - drag.y) * .006, -.65, .65);
      drag.x = event.clientX;
      drag.y = event.clientY;
      renderScene();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, endDrag));
    canvas.addEventListener('dblclick', resetView);
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') { resetView(); return; }
      if (event.key === 'ArrowLeft') targetYaw -= .15;
      if (event.key === 'ArrowRight') targetYaw += .15;
      if (event.key === 'ArrowUp') targetPitch -= .1;
      if (event.key === 'ArrowDown') targetPitch += .1;
      targetPitch = THREE.MathUtils.clamp(targetPitch, -.65, .65);
      renderScene();
    });
    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.set(0, .15, Math.max(8.3, 5 / camera.aspect));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderScene();
    };
    new ResizeObserver(resize).observe(host);
    motion.addEventListener('change', renderScene);
    document.addEventListener('visibilitychange', renderScene);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); cancelAnimationFrame(raf); raf = 0; previous = 0; stage.classList.remove('cz-phone-ready');
    });
    canvas.addEventListener('webglcontextrestored', () => { stage.classList.add('cz-phone-ready'); resize(); });
    resize();
    stage.classList.add('cz-phone-ready');
  } catch (error) {
    console.warn('Phone showcase unavailable:', error);
    renderer?.dispose();
    host.replaceChildren();
    stage.classList.remove('cz-phone-ready');
  }
}

if (stage && host) {
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) initPhone();
      renderScene();
    }, { rootMargin:'100px', threshold:0 }).observe(stage);
  } else { visible = true; initPhone(); }
}
