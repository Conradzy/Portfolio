import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// One renderer and one GLB download for the entire horizontal gallery.
// Each visible card gets its own scene and screen texture, rendered into a viewport.
export async function createProjectLaptops({ host, viewport, stages, projects, wake }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(renderer.domElement);
    const template = (await new GLTFLoader().loadAsync('assets/laptop.glb')).scene;
    const states = projects.map((project,index) => ({
      project, stage:stages[index], loading:false, failed:false, ready:false,
      targetYaw:-.1, targetPitch:0, yaw:-.1, pitch:0
    }));
    let width = 0, height = 0, lost = false;

    async function loadView(state) {
      if (state.loading || state.failed || state.ready) return;
      state.loading = true;
      try {
        const source = await new THREE.TextureLoader().loadAsync(state.project.image);
        const image = source.image;
        const crop = state.project.crop || [0,0,1,1];
        const sx = crop[0] * image.width, sy = crop[1] * image.height;
        const sw = crop[2] * image.width, sh = crop[3] * image.height;
        const surface = document.createElement('canvas');
        surface.width = 1600; surface.height = Math.round(1600 * .17 / .294);
        const context = surface.getContext('2d');
        const cover = Math.max(surface.width / sw, surface.height / sh);
        const dw = sw * cover, dh = sh * cover;
        context.drawImage(image,sx,sy,sw,sh,(surface.width-dw)/2,(surface.height-dh)/2,dw,dh);
        source.dispose();
        const texture = new THREE.CanvasTexture(surface);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        const model = template.clone(true);
        const screen = model.getObjectByName('Screen_ComputerScreen_0');
        if (!screen) throw new Error('Laptop screen mesh missing');
        const display = new THREE.Mesh(new THREE.PlaneGeometry(.294,.17),
          new THREE.MeshBasicMaterial({ map:texture, toneMapped:false }));
        display.position.set(0,.10036,.00420); display.rotation.y = Math.PI;
        screen.add(display);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const scale = 3.5 / box.getSize(new THREE.Vector3()).x;
        model.scale.multiplyScalar(scale);
        model.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(scale));
        state.scene = new THREE.Scene();
        state.camera = new THREE.PerspectiveCamera(35,1,.1,100);
        state.floating = new THREE.Group(); state.turntable = new THREE.Group();
        state.turntable.add(model); state.floating.add(state.turntable); state.scene.add(state.floating);
        state.scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2));
        const key = new THREE.DirectionalLight(0xffffff,3); key.position.set(-3,5,6); state.scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff,2); rim.position.set(4,3,-4); state.scene.add(rim);
        state.ready = true;
        state.stage.classList.add('is-ready');
        wake();
      } catch (error) {
        state.failed = true;
        console.warn('Project preview unavailable:', state.project.title, error);
      } finally { state.loading = false; }
    }

    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); lost = true;
      stages.forEach(stage => stage.classList.remove('is-ready'));
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      lost = false;
      states.forEach(state => { if (state.ready) state.stage.classList.add('is-ready'); });
      wake();
    });

    return {
      rotate(index,dx,dy) {
        const state = states[index];
        state.targetYaw += dx * .007;
        state.targetPitch = THREE.MathUtils.clamp(state.targetPitch + dy * .005,-.45,.45);
      },
      reset(index) { states[index].targetYaw = -.1; states[index].targetPitch = 0; },
      render(delta,elapsed,reduced) {
        if (lost) return;
        const bounds = viewport.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        if (width !== viewport.clientWidth || height !== viewport.clientHeight) {
          width = viewport.clientWidth; height = viewport.clientHeight;
          renderer.setSize(width,height,false);
        }
        renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
        states.forEach((state,index) => {
          const rect = state.stage.getBoundingClientRect();
          if (rect.right < bounds.left-160 || rect.left > bounds.right+160) return;
          if (!state.ready) { loadView(state); return; }
          if (rect.right <= bounds.left || rect.left >= bounds.right || rect.bottom <= bounds.top || rect.top >= bounds.bottom) return;
          const x = rect.left - bounds.left, y = height - (rect.bottom - bounds.top);
          renderer.setViewport(x,y,rect.width,rect.height);
          const left = Math.max(0,x), bottom = Math.max(0,y);
          renderer.setScissor(left,bottom,Math.min(width,x+rect.width)-left,Math.min(height,y+rect.height)-bottom);
          state.camera.aspect = rect.width / rect.height;
          const distance = Math.max(5.6,4.1/(2*Math.tan(THREE.MathUtils.degToRad(35)/2)*state.camera.aspect));
          state.camera.position.set(.35,distance*.29,distance); state.camera.lookAt(0,0,0);
          state.camera.updateProjectionMatrix();
          const wave = reduced ? 0 : Math.sin(elapsed*.55+index*.7);
          state.floating.position.y = .05 + wave * .035;
          state.floating.rotation.y = reduced ? 0 : Math.sin(elapsed*.25+index*.4)*.07;
          state.floating.rotation.z = reduced ? 0 : Math.sin(elapsed*.3+index)*.006;
          const ease = reduced ? 1 : 1-Math.exp(-delta*10);
          state.yaw += (state.targetYaw-state.yaw)*ease;
          state.pitch += (state.targetPitch-state.pitch)*ease;
          state.turntable.rotation.set(state.pitch,state.yaw,0);
          state.stage.style.setProperty('--project-shadow',String(1-wave*.04));
          renderer.render(state.scene,state.camera);
        });
      }
    };
  } catch (error) {
    renderer?.dispose(); host.replaceChildren();
    throw error;
  }
}
