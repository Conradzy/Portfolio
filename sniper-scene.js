// sniper-scene.js — ES module. Loads sniper.glb + sniper_bullet.glb, plays muzzle-flash.mp4 + gunfire-smoke.mp4
// API: window.initSniperScene(canvas) → { setProgress(0..1), dispose() }
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.THREE = THREE;

function initSniperScene(canvas) {
  console.log('[sniper] init');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  // Will be positioned to frame the sniper after its bbox is known
  camera.position.set(3.0, 1.2, 12);
  camera.lookAt(2.5, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
  renderer.setClearColor(0x000000, 0); // fully transparent — let the section's CSS gradient show through

  // ---- LIGHT-RED LIGHTING ----
  scene.add(new THREE.AmbientLight(0x8c3030, 1.8));
  const key = new THREE.DirectionalLight(0xfff0e6, 1.6);
  key.position.set(6, 8, 5);
  scene.add(key);
  const rimRed = new THREE.PointLight(0xff7878, 22, 40, 1.3);
  rimRed.position.set(-7, 3, -3);
  scene.add(rimRed);
  const fillRed = new THREE.PointLight(0xff9090, 14, 36, 1.4);
  fillRed.position.set(6, -1, 5);
  scene.add(fillRed);
  const topRed = new THREE.PointLight(0xff6868, 12, 30, 1.4);
  topRed.position.set(0, 7, 4);
  scene.add(topRed);
  const underGlow = new THREE.PointLight(0xff4848, 8, 24, 1.5);
  underGlow.position.set(-2, -3, 1.5);
  scene.add(underGlow);
  // Strong front light so the rifle actually reads
  const front = new THREE.PointLight(0xffaa88, 14, 28, 1.4);
  front.position.set(0, 1, 6);
  scene.add(front);

  // ---- GROUPS ----
  // Sniper sits in a group whose REST x is set after we know the model's length,
  // so the muzzle has clear travel space to the right of the canvas.
  const sniperGroup = new THREE.Group();
  scene.add(sniperGroup);

  const bulletGroup = new THREE.Group();
  bulletGroup.visible = false;
  scene.add(bulletGroup);

  // Bullet emissive glow halo (additive)
  const bulletGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
  );
  bulletGroup.add(bulletGlow);

  let sniperReady = false;
  let bulletReady = false;
  // Local (group-relative) muzzle tip — defaults if model not loaded yet.
  let muzzleTipX = 3.5, muzzleTipY = 0, muzzleTipZ = 0;
  let sniperRestX = -3.0, sniperRestY = 0, sniperRestRotZ = 0;

  const loader = new GLTFLoader();
  loader.load(
    'assets/sniper.glb',
    (gltf) => {
      console.log('[sniper] sniper.glb loaded');
      const m = gltf.scene;

      // Compute bbox in m's local space (m has identity transform when freshly loaded)
      const bbox = new THREE.Box3().setFromObject(m);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());

      // Nested-group approach so rotation pivots around bbox center, then scale uniformly:
      //   sniperGroup → scalePivot → rotPivot → m
      const rotPivot = new THREE.Group();
      const scalePivot = new THREE.Group();
      scalePivot.add(rotPivot);
      rotPivot.add(m);

      // Center m inside rotPivot (so rotPivot's origin = m's bbox center)
      m.position.sub(center);

      // Orient so the longest axis becomes +X (and barrel points toward +X)
      if (size.y >= size.x && size.y >= size.z) {
        rotPivot.rotation.z = Math.PI / 2;        // long axis Y → +X
      } else if (size.z >= size.x && size.z >= size.y) {
        rotPivot.rotation.y = Math.PI / 2;        // long axis Z → +X (barrel toward +X)
      }

      // Scale uniformly so the long axis fits target length
      const targetLen = 7;
      const longest = Math.max(size.x, size.y, size.z);
      const sf = targetLen / Math.max(0.0001, longest);
      scalePivot.scale.setScalar(sf);

      sniperGroup.add(scalePivot);
      sniperGroup.updateMatrixWorld(true);

      const groupBB = new THREE.Box3().setFromObject(sniperGroup);

      // Material tuning: brighten dark base colors + soft red emissive
      let meshCount = 0;
      m.traverse(n => {
        if (n.isMesh && n.material) {
          meshCount++;
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(mat => {
            if (mat.color) {
              const hsl = { h: 0, s: 0, l: 0 };
              mat.color.getHSL(hsl);
              if (hsl.l < 0.45) mat.color.setHSL(hsl.h, hsl.s, Math.min(0.7, hsl.l + 0.35));
            }
            if (mat.metalness !== undefined) mat.metalness = Math.min(0.9, Math.max(0.45, mat.metalness));
            if (mat.roughness !== undefined) mat.roughness = Math.min(0.45, Math.max(0.18, mat.roughness));
            mat.envMapIntensity = 1.2;
            if (mat.emissive) mat.emissive.setHex(0x2a0808);
            if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.6;
            mat.needsUpdate = true;
          });
        }
      });

      // Muzzle tip in sniperGroup local space = bbox.max.x (rifle is centered at 0, long axis +X)
      muzzleTipX = groupBB.max.x;
      muzzleTipY = (groupBB.max.y + groupBB.min.y) * 0.5;
      muzzleTipZ = (groupBB.max.z + groupBB.min.z) * 0.5;

      // Position sniperGroup so the muzzle sits ≈ left-of-center,
      // leaving the right ~60% of the canvas open for bullet/beam.
      sniperRestX = -(muzzleTipX + 1.0);   // muzzle world x = -1.0
      sniperRestY = 0;
      sniperGroup.position.set(sniperRestX, sniperRestY, 0);
      sniperGroup.rotation.y = -0.08;
      sniperGroup.rotation.x = 0.06;

      // Frame camera to fit the rifle
      const len = groupBB.max.x - groupBB.min.x;
      const camCenterX = sniperRestX + muzzleTipX * 0.5;  // mid-rifle
      camera.position.set(camCenterX + 0.5, 1.6, len * 1.35);
      camera.lookAt(camCenterX, -0.2, 0);
      camera.fov = 36;
      camera.updateProjectionMatrix();

      sniperReady = true;
    },
    undefined,
    (err) => console.error('[sniper] sniper.glb load failed', err)
  );

  loader.load(
    'assets/sniper_bullet.glb',
    (gltf) => {
      console.log('[sniper] bullet.glb loaded');
      const m = gltf.scene;
      const bb = new THREE.Box3().setFromObject(m);
      const sz = bb.getSize(new THREE.Vector3());
      const ce = bb.getCenter(new THREE.Vector3());
      m.position.sub(ce);
      const longest = Math.max(sz.x, sz.y, sz.z);
      m.scale.setScalar(0.45 / Math.max(0.0001, longest));
      m.traverse(n => {
        if (n.isMesh && n.material) {
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach(mat => {
            if (mat.metalness !== undefined) mat.metalness = Math.max(0.7, mat.metalness);
            if (mat.roughness !== undefined) mat.roughness = Math.min(0.4, mat.roughness);
            mat.needsUpdate = true;
          });
        }
      });
      bulletGroup.add(m);
      bulletReady = true;
    },
    undefined,
    (err) => console.error('[sniper] bullet.glb load failed', err)
  );

  // ---- MUZZLE FLASH + SMOKE VIDEO BILLBOARDS ----
  function makeVideo(src) {
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.loop = false;
    v.crossOrigin = 'anonymous';
    return v;
  }
  // Luma-keyed video material: alpha is derived from brightness so the baked-in
  // BLACK background of the clip becomes fully transparent — only the bright
  // flash/smoke pixels remain. uOpacity scales the whole thing for fade in/out.
  function lumaKeyMat(tex, blending, keyLow, keyHigh, boost) {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        uOpacity: { value: 0 },
        uKeyLow: { value: keyLow },
        uKeyHigh: { value: keyHigh },
        uBoost: { value: boost || 1 }
      },
      transparent: true,
      blending: blending,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform sampler2D map;\n' +
        'uniform float uOpacity;\n' +
        'uniform float uKeyLow;\n' +
        'uniform float uKeyHigh;\n' +
        'uniform float uBoost;\n' +
        'varying vec2 vUv;\n' +
        'void main(){\n' +
        '  vec4 c = texture2D(map, vUv);\n' +
        '  float luma = max(c.r, max(c.g, c.b));\n' +
        '  float a = smoothstep(uKeyLow, uKeyHigh, luma);\n' +
        '  if (a <= 0.001) discard;\n' +
        '  gl_FragColor = vec4(c.rgb * uBoost, a * uOpacity);\n' +
        '}'
    });
  }

  const flashVideo = makeVideo('assets/muzzle-flash.mp4');
  const flashTex = new THREE.VideoTexture(flashVideo);
  // Muzzle flash → additive so it glows like real fire; aggressive key kills the black.
  const flashMat = lumaKeyMat(flashTex, THREE.AdditiveBlending, 0.06, 0.30, 1.25);
  const flashPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), flashMat);
  flashPlane.visible = false;
  scene.add(flashPlane);

  const smokeVideo = makeVideo('assets/gunfire-smoke.mp4');
  const smokeTex = new THREE.VideoTexture(smokeVideo);
  // Smoke → normal blending so it reads as soft grey smoke (not a glowing cloud);
  // luma key removes the black matte, smoothstep gives soft wispy edges.
  const smokeMat = lumaKeyMat(smokeTex, THREE.NormalBlending, 0.05, 0.45, 1.0);
  const smokePlane = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), smokeMat);
  smokePlane.visible = false;
  scene.add(smokePlane);

  const flashLight = new THREE.PointLight(0xff7733, 0, 14, 2);
  scene.add(flashLight);

  // ---- LASER BEAM (muzzle → bullet) ----
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xff1818, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), beamMat);
  beam.rotation.z = Math.PI / 2;
  scene.add(beam);
  const beamGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff3a3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false
  });
  const beamGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 12), beamGlowMat);
  beamGlow.rotation.z = Math.PI / 2;
  scene.add(beamGlow);

  // ---- SCROLL-DRIVEN STATE ----
  let progress = 0;
  let targetProgress = 0;
  let armed = true;
  const FIRE_THRESHOLD = 0.04;
  const REARM_BELOW = 0.012;
  const TRAVEL = 20;

  function getMuzzleWorld() {
    return {
      x: sniperGroup.position.x + muzzleTipX,
      y: sniperGroup.position.y + muzzleTipY,
      z: sniperGroup.position.z + muzzleTipZ
    };
  }

  function playFlash() {
    const m = getMuzzleWorld();
    flashPlane.position.set(m.x + 0.9, m.y, 0.3);
    flashPlane.visible = true;
    flashMat.uniforms.uOpacity.value = 1.0;
    try { flashVideo.currentTime = 0; } catch (e) {}
    flashVideo.play().catch(() => {});
    smokePlane.position.set(m.x + 1.4, m.y + 0.25, 0.15);
    smokePlane.visible = true;
    smokeMat.uniforms.uOpacity.value = 0.9;
    try { smokeVideo.currentTime = 0; } catch (e) {}
    smokeVideo.play().catch(() => {});
    flashLight.position.set(m.x, m.y, 0);
    flashLight.intensity = 45;
  }

  function setProgress(p) {
    const np = Math.max(0, Math.min(1, p));
    if (armed && np >= FIRE_THRESHOLD && targetProgress < FIRE_THRESHOLD) { playFlash(); armed = false; }
    if (np < REARM_BELOW) armed = true;
    targetProgress = np;
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (w > 0 && h > 0) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  resize();
  window.addEventListener('resize', resize);
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas);

  const clock = new THREE.Clock();
  let elapsed = 0;
  let mounted = true;

  function recoilFromProgress(p) {
    if (p <= 0) return 0;
    if (p < 0.04) return p / 0.04;
    const r = (p - 0.04) / 0.16;
    return Math.max(0, 1 - r);
  }

  function loop() {
    if (!mounted) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    progress += (targetProgress - progress) * Math.min(1, dt * 9);

    if (sniperReady) {
      sniperGroup.rotation.y = -0.06 + Math.sin(elapsed * 0.5) * 0.02;
      sniperGroup.position.y = sniperRestY + Math.sin(elapsed * 0.8) * 0.015;
      const rec = recoilFromProgress(progress);
      sniperGroup.position.x = sniperRestX - 0.4 * rec;
      sniperGroup.rotation.z = sniperRestRotZ - 0.07 * rec;
    }

    const mw = getMuzzleWorld();
    const bx = mw.x + progress * TRAVEL;

    if (progress > 0.005) {
      bulletGroup.visible = true;
      bulletGroup.position.set(bx, mw.y, 0);
      bulletGlow.material.opacity = 0.7 + Math.sin(elapsed * 60) * 0.15;
      // Bullet spin
      if (bulletReady) bulletGroup.children[1] && (bulletGroup.children[1].rotation.x += dt * 50);
    } else {
      bulletGroup.visible = false;
      bulletGlow.material.opacity = 0;
    }

    const dx = bx - mw.x;
    if (dx > 0.12) {
      const cx = mw.x + dx / 2;
      beam.position.set(cx, mw.y, 0); beam.scale.set(1, dx, 1);
      beamGlow.position.set(cx, mw.y, 0); beamGlow.scale.set(1, dx, 1);
      const inten = Math.min(1, progress / 0.05);
      beamMat.opacity = 0.95 * inten;
      beamGlowMat.opacity = 0.55 * inten;
    } else {
      beamMat.opacity = 0;
      beamGlowMat.opacity = 0;
    }

    // Billboard the videos to the camera
    if (flashPlane.visible) {
      flashPlane.lookAt(camera.position);
      const dur = flashVideo.duration || 0.4;
      if (flashVideo.ended || flashVideo.currentTime >= dur - 0.05) {
        flashMat.uniforms.uOpacity.value = Math.max(0, flashMat.uniforms.uOpacity.value - dt * 6);
        if (flashMat.uniforms.uOpacity.value < 0.02) flashPlane.visible = false;
      }
    }
    if (smokePlane.visible) {
      smokePlane.lookAt(camera.position);
      // Smoke drifts up + grows as it dissipates
      smokePlane.position.y += dt * 0.5;
      smokePlane.scale.x = smokePlane.scale.y = Math.min(1.8, smokePlane.scale.x + dt * 0.35);
      const dur = smokeVideo.duration || 1.5;
      if (smokeVideo.ended || smokeVideo.currentTime >= dur - 0.05) {
        smokeMat.uniforms.uOpacity.value = Math.max(0, smokeMat.uniforms.uOpacity.value - dt * 1.6);
        if (smokeMat.uniforms.uOpacity.value < 0.02) { smokePlane.visible = false; smokePlane.scale.set(1, 1, 1); }
      }
    }
    if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 70);

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    setProgress,
    dispose: () => {
      mounted = false;
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
      try { renderer.dispose(); } catch (e) {}
    }
  };
}

window.initSniperScene = initSniperScene;
console.log('[sniper] module ready');
