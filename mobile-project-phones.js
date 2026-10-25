import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// One model download, studio environment, and renderer for the entire gallery.
// Original iPhone model by DatSketch (CC BY 4.0); each app gets its own glass screen.
export async function createProjectPhones({ host, viewport, stages, projects, wake }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    renderer.domElement.setAttribute('aria-hidden','true');
    host.append(renderer.domElement);

    const studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.BoxGeometry(30,30,30),new THREE.MeshBasicMaterial({color:0x777777,side:THREE.BackSide})));
    for (const [w,h,x,y,z,intensity] of [[3,8,-6,3,5,4],[2,7,6,1,3,3],[7,2,0,7,-3,4]]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity),side:THREE.DoubleSide}));
      panel.position.set(x,y,z); panel.lookAt(0,0,0); studio.add(panel);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio,.04);
    pmrem.dispose();
    studio.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    const template = (await new GLTFLoader().loadAsync('assets/iphone-12-pro.glb')).scene;
    const states = projects.map((project,index) => ({project,stage:stages[index],loading:false,failed:false,ready:false,targetYaw:-.18,targetPitch:.03,yaw:-.18,pitch:.03}));
    let width=0,height=0,lost=false;

    async function loadView(state) {
      if (state.loading || state.failed || state.ready) return;
      state.loading=true;
      try {
        const texture = await new THREE.TextureLoader().loadAsync(state.project.image);
        const model = template.clone(true);
        const screen = model.getObjectByName('Screen_Wallpaper_0');
        if (!screen) throw new Error('iPhone display mesh missing');
        // Replace the rounded, notched display itself and preserve glass reflections.
        screen.geometry=screen.geometry.clone();
        screen.geometry.computeBoundingBox();
        const bounds=screen.geometry.boundingBox;
        const size=bounds.getSize(new THREE.Vector3());
        const positions=screen.geometry.attributes.position;
        const uv=new Float32Array(positions.count*2);
        for (let i=0;i<positions.count;i++) {
          uv[i*2]=(positions.getX(i)-bounds.min.x)/size.x;
          uv[i*2+1]=(positions.getY(i)-bounds.min.y)/size.y;
        }
        screen.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        const imageAspect=texture.image.width/texture.image.height,screenAspect=size.x/size.y;
        if (imageAspect>screenAspect) texture.repeat.x=screenAspect/imageAspect;
        else texture.repeat.y=imageAspect/screenAspect;
        texture.offset.set((1-texture.repeat.x)/2,(1-texture.repeat.y)/2);
        screen.material=new THREE.MeshPhysicalMaterial({
          map:texture,color:0xaaaaaa,emissive:0xffffff,emissiveMap:texture,
          emissiveIntensity:.65,metalness:0,roughness:.2,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.6
        });
        screen.material.name=state.project.title+' reflective display';
        model.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(model);
        const scale=3.6/box.getSize(new THREE.Vector3()).y;
        const centered=new THREE.Group();
        centered.add(model); centered.scale.setScalar(scale);
        centered.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
        state.scene=new THREE.Scene(); state.scene.environment=environment.texture;
        state.camera=new THREE.PerspectiveCamera(32,1,.1,100);
        state.floating=new THREE.Group(); state.turntable=new THREE.Group();
        state.turntable.add(centered); state.floating.add(state.turntable); state.scene.add(state.floating);
        state.scene.add(new THREE.HemisphereLight(0xffffff,0x777777,.8));
        const key=new THREE.DirectionalLight(0xffffff,1.4); key.position.set(-3,5,6); state.scene.add(key);
        state.ready=true; state.stage.classList.add('is-ready'); wake();
      } catch (error) {
        state.failed=true;
        console.warn('Mobile project preview unavailable:',state.project.title,error);
      } finally { state.loading=false; }
    }
    renderer.domElement.addEventListener('webglcontextlost',event => {
      event.preventDefault(); lost=true; stages.forEach(stage => stage.classList.remove('is-ready'));
    });
    renderer.domElement.addEventListener('webglcontextrestored',() => {
      lost=false; states.forEach(state => { if (state.ready) state.stage.classList.add('is-ready'); }); wake();
    });
    return {
      rotate(index,dx,dy) {
        const state=states[index]; state.targetYaw+=dx*.007;
        state.targetPitch=THREE.MathUtils.clamp(state.targetPitch+dy*.005,-.65,.65);
      },
      reset(index) { states[index].targetYaw=-.18; states[index].targetPitch=.03; },
      render(delta,elapsed,reduced) {
        if (lost) return;
        const bounds=viewport.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        if (width!==viewport.clientWidth || height!==viewport.clientHeight) {
          width=viewport.clientWidth; height=viewport.clientHeight; renderer.setSize(width,height,false);
        }
        renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
        states.forEach((state,index) => {
          const rect=state.stage.getBoundingClientRect();
          if (rect.right<bounds.left-160 || rect.left>bounds.right+160) return;
          if (!state.ready) { loadView(state); return; }
          if (rect.right<=bounds.left || rect.left>=bounds.right || rect.bottom<=bounds.top || rect.top>=bounds.bottom) return;
          const x=rect.left-bounds.left,y=height-(rect.bottom-bounds.top);
          renderer.setViewport(x,y,rect.width,rect.height);
          const left=Math.max(0,x),bottom=Math.max(0,y);
          renderer.setScissor(left,bottom,Math.min(width,x+rect.width)-left,Math.min(height,y+rect.height)-bottom);
          state.camera.aspect=rect.width/rect.height;
          state.camera.position.set(0,.12,Math.max(7.9,3.4/state.camera.aspect)); state.camera.lookAt(0,0,0);
          state.camera.updateProjectionMatrix();
          const wave=reduced?0:Math.sin(elapsed*.55+index*.7);
          state.floating.position.y=.08+wave*.04;
          state.floating.rotation.y=reduced?0:Math.sin(elapsed*Math.PI/9+index*.4)*Math.PI/12;
          state.floating.rotation.z=reduced?0:Math.sin(elapsed*.3+index)*.008;
          const ease=reduced?1:1-Math.exp(-delta*10);
          state.yaw+=(state.targetYaw-state.yaw)*ease; state.pitch+=(state.targetPitch-state.pitch)*ease;
          state.turntable.rotation.set(state.pitch,state.yaw,-.04);
          state.stage.style.setProperty('--project-shadow',String(1-wave*.06));
          renderer.render(state.scene,state.camera);
        });
      }
    };
  } catch (error) { renderer?.dispose(); host.replaceChildren(); throw error; }
}
