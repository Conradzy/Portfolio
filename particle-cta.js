// Adapted from the user's Plasmatic Entity formula from particles.casberry.in.
// GPU displacement keeps the neural filaments fluid without updating thousands
// of positions in JavaScript. RGB channels stay equal for a purely white palette.
const panel = document.getElementById('cz-cta-panel');
const host = document.getElementById('cz-cta-particles');
const motionButton = document.getElementById('cz-cta-motion');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let visible = false, started = false, galleryOpen = false, wake = () => {};

async function initParticles() {
  if (started) return;
  started = true;
  let renderer;
  try {
    const THREE = await import('three');
    renderer = new THREE.WebGLRenderer({ alpha:true, antialias:false, powerPreference:'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    host.appendChild(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-100, 100, 82, -82, .1, 600);
    camera.position.z = 250;
    // Magnify the form without pushing particles through the camera.
    camera.zoom = 1.5;
    const entity = new THREE.Group();
    // Enlarge the complete particle form, including its flowing filaments.
    entity.scale.setScalar(2.5);
    scene.add(entity);

    const count = innerWidth <= 650 ? 15000 : 30000;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aIndex', new THREE.BufferAttribute(Float32Array.from({ length:count }, (_, i) => i), 1));
    const uniforms = {
      uTime:{ value:0 }, uCount:{ value:count }, uScale:{ value:45 },
      uPulseSpeed:{ value:1.8 }, uNeuralTendrils:{ value:6 }, uPixelRatio:{ value:renderer.getPixelRatio() }
    };
    const vertexShader = `
      attribute float aIndex;
      uniform float uTime, uCount, uScale, uPulseSpeed, uNeuralTendrils, uPixelRatio, uHalo;
      varying float vLight;
      void main() {
        float i = aIndex;
        float time = uTime;
        float u = mod(i, 300.0) / 300.0;
        float v = (floor(i / 300.0) + 0.5) / (uCount / 300.0);
        float phi = acos(2.0 * v - 1.0);
        float theta = 6.28318530718 * u;
        float harmonicA = sin(theta * uNeuralTendrils + time * uPulseSpeed * 0.7);
        float harmonicB = cos(phi * (uNeuralTendrils * 0.7) - time * uPulseSpeed * 0.9);
        float harmonicC = sin((theta + phi) * 3.0 + time * uPulseSpeed * 1.3);
        float networkNoise = sin(i * 0.05 + time * 1.5) * 0.15;
        float etherDisplace = harmonicA * harmonicB * 0.35 + harmonicC * 0.2 + networkNoise;
        float r = uScale * (1.0 + etherDisplace);
        float px = r * sin(phi) * cos(theta);
        float py = r * sin(phi) * sin(theta);
        float pz = r * cos(phi);
        float streamDrift = sin(py * 0.08 + time * uPulseSpeed) * 3.0;
        vec3 target = vec3(px + streamDrift, py, pz + cos(px * 0.08 + time * uPulseSpeed) * 3.0);
        float neuralSignal = sin(i * 0.35 - time * uPulseSpeed * 4.0);
        float blip = max(0.0, sin(i * 1.77 + time * uPulseSpeed * 2.5));
        float depthMod = 0.5 + 0.5 * sin(phi * 2.0 + time * 0.5);
        vLight = 0.32 + 0.22 * (harmonicA * 0.5 + 0.5) + 0.12 * depthMod;
        if (blip > 0.88) {
          vLight = 0.8 + ((blip - 0.88) / 0.12) * 0.2;
        } else if (neuralSignal > 0.7) {
          vLight = 0.65 + ((neuralSignal - 0.7) / 0.3) * 0.3;
        }
        vec4 viewPosition = modelViewMatrix * vec4(target, 1.0);
        vLight *= mix(0.55, 1.0, smoothstep(-70.0, 65.0, pz));
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = (1.1 + vLight * 1.25) * uPixelRatio * (250.0 / -viewPosition.z) * mix(1.0, 3.8, uHalo);
      }
    `;
    const fragmentShader = `
      uniform float uHalo;
      varying float vLight;
      void main() {
        float distanceToCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
        if (distanceToCenter > 1.0) discard;
        float core = 1.0 - smoothstep(0.15, 1.0, distanceToCenter);
        float halo = pow(1.0 - distanceToCenter, 2.5);
        float alpha = mix(core * 0.8, halo * 0.095, uHalo) * vLight;
        gl_FragColor = vec4(vec3(vLight), alpha);
      }
    `;
    for (const halo of [1, 0]) {
      const material = new THREE.ShaderMaterial({
        uniforms:{ ...uniforms, uHalo:{ value:halo } }, vertexShader, fragmentShader,
        transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending
      });
      const points = new THREE.Points(geometry, material);
      // Positions are displaced in the shader, so the zero-filled CPU bounds do not apply.
      points.frustumCulled = false;
      entity.add(points);
    }

    const target = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    let raf = 0, previous = 0, elapsed = 0, lost = false;
    let paused = reducedMotion.matches;
    const canRender = () => visible && !document.hidden && !galleryOpen && !lost;
    const updateButton = () => {
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.setAttribute('aria-label', paused ? 'Play particle animation' : 'Pause particle animation');
    };
    const render = now => {
      raf = 0;
      if (!canRender()) { previous = 0; return; }
      const delta = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60;
      previous = now;
      if (!paused) {
        // Slow every pulse, deformation and idle rotation to 32% of its old speed.
        // Cursor easing uses real time so it remains responsive while trailing softly.
        elapsed += delta * .32;
        pointer.lerp(target, 1 - Math.exp(-2.4 * delta));
        entity.position.set(
          pointer.x * camera.right / camera.zoom * .75,
          (pointer.y * camera.top * .65 + Math.sin(elapsed * .35) * 2) / camera.zoom,
          0
        );
        entity.rotation.set(pointer.y * -.12, pointer.x * .2 + elapsed * .045, Math.sin(elapsed * .16) * .06);
        uniforms.uTime.value = elapsed;
      }
      renderer.render(scene, camera);
      if (!paused) raf = requestAnimationFrame(render);
    };
    wake = () => {
      if (!canRender()) {
        cancelAnimationFrame(raf);
        raf = 0;
        previous = 0;
      } else if (!raf) {
        previous = 0;
        raf = requestAnimationFrame(render);
      }
    };
    // Stop following at the current position without returning to the center.
    const holdPointer = () => { target.copy(pointer); };
    panel.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || paused) return;
      const rect = panel.getBoundingClientRect();
      target.set(
        THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
        THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height * 2, -1, 1)
      );
    }, { passive:true });
    panel.addEventListener('pointerleave', holdPointer);
    panel.addEventListener('pointercancel', holdPointer);
    window.addEventListener('blur', holdPointer);
    motionButton.addEventListener('click', () => {
      paused = !paused;
      holdPointer();
      updateButton();
      wake();
    });
    reducedMotion.addEventListener('change', () => {
      paused = reducedMotion.matches;
      holdPointer();
      updateButton();
      wake();
    });
    document.addEventListener('visibilitychange', () => { holdPointer(); wake(); });
    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const halfHeight = Math.max(82, 78 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      wake();
    };
    new ResizeObserver(resize).observe(host);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      lost = true;
      panel.classList.remove('is-ready');
      motionButton.hidden = true;
      wake();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      lost = false;
      panel.classList.add('is-ready');
      motionButton.hidden = false;
      resize();
    });
    updateButton();
    resize();
    panel.classList.add('is-ready');
    motionButton.hidden = false;
  } catch (error) {
    renderer?.dispose();
    host.replaceChildren();
    panel.classList.remove('is-ready');
    motionButton.hidden = true;
    console.warn('Particle CTA unavailable:', error);
  }
}

if (panel && host) {
  document.addEventListener('cz:web-gallery', event => { galleryOpen = event.detail.open; wake(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) initParticles();
      wake();
    }).observe(panel);
  } else { visible = true; initParticles(); }
}
