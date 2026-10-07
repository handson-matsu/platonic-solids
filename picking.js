import * as THREE from './vendor/three.module.js';
const ray = new THREE.Raycaster();
const point = new THREE.Vector3();
// Screen-space hit areas remain finger-friendly at every camera distance.
export function pickTarget({x,y,width,height,camera,faces,vertices,edges,mode}) {
  camera.updateMatrixWorld();
  ray.setFromCamera(new THREE.Vector2(x/width*2-1,1-y/height*2),camera);
  const surface=ray.intersectObjects(faces,false)[0];
  if(mode==='face') return surface?.object.userData.index ?? -1;
  const project = v => { const p=point.copy(v).project(camera); return {x:(p.x+1)*width/2,y:(1-p.y)*height/2}; };
  const visible = v => faces.some(face => {
    const positions=face.geometry.attributes.position;
    const a=new THREE.Vector3().fromBufferAttribute(positions,0);
    const b=new THREE.Vector3().fromBufferAttribute(positions,1);
    const c=new THREE.Vector3().fromBufferAttribute(positions,2);
    const normal=b.sub(a).cross(c.sub(a)).normalize();
    return Math.abs(normal.dot(v.clone().sub(a)))<1e-5 && normal.dot(camera.position.clone().sub(a))>1e-7;
  });
  let best=-1, bestDistance=mode==='vertex'?23:17;
  if(mode==='vertex') vertices.forEach((v,i)=>{
    const p=project(v), d=Math.hypot(x-p.x,y-p.y);
    if(d<bestDistance && visible(v)){best=i;bestDistance=d;}
  });
  else edges.forEach(([a,b],i)=>{
    const p=project(vertices[a]),q=project(vertices[b]);
    const dx=q.x-p.x,dy=q.y-p.y;
    const t=Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy || 1)));
    const d=Math.hypot(x-p.x-t*dx,y-p.y-t*dy);
    // Perspective-correct interpolation of the closest screen-space point.
    const za=vertices[a].clone().applyMatrix4(camera.matrixWorldInverse).z;
    const zb=vertices[b].clone().applyMatrix4(camera.matrixWorldInverse).z;
    const u=(t/zb)/((1-t)/za+t/zb);
    const v=vertices[a].clone().lerp(vertices[b],u);
    if(d<bestDistance && visible(v)){best=i;bestDistance=d;}
  });
  return best;
}
export class TapGesture {
  constructor(){this.pointers=new Set();this.candidate=null;}
  down(id,x,y){this.pointers.add(id);this.candidate=this.pointers.size===1?{id,x,y,moved:false}:null;}
  move(id,x,y){const p=this.candidate;if(p?.id===id && Math.hypot(x-p.x,y-p.y)>7)p.moved=true;}
  up(id,x,y){this.move(id,x,y);const tap=this.candidate?.id===id&&!this.candidate.moved&&this.pointers.size===1;this.pointers.delete(id);this.candidate=null;return tap;}
  cancel(id){this.pointers.delete(id);this.candidate=null;}
}
