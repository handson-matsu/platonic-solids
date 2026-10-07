import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {SOLIDS} from '../solids.js';
import {createSolid} from '../scene.js';
import {pickTarget,TapGesture} from '../picking.js';
const expected=[[4,6,4,3],[8,12,6,4],[6,12,8,3],[20,30,12,5],[12,30,20,3]];
for(const [n,s] of SOLIDS.entries()) {
 test(`${s.name}: exact closed regular topology`,()=>{
   const [v,e,f,size]=expected[n];assert.equal(s.vertices.length,v);assert.equal(s.edges.length,e);assert.equal(s.faces.length,f);assert.equal(v-e+f,2);
   const lengths=s.edges.map(([a,b])=>new THREE.Vector3(...s.vertices[a]).distanceTo(new THREE.Vector3(...s.vertices[b])));
   assert.ok(lengths.every(l=>Math.abs(l-lengths[0])<1e-8));
   for(const face of s.faces){assert.equal(face.length,size);for(let i=0;i<size;i++)assert.ok(s.edges.some(e=>e.includes(face[i])&&e.includes(face[(i+1)%size])));}
   for(const [a,b] of s.edges)assert.equal(s.faces.filter(f=>f.includes(a)&&f.includes(b)).length,2);
   s.adjacency.vertex.forEach((ns,i)=>assert.deepEqual([...ns].sort((a,b)=>a-b),s.edges.filter(e=>e.includes(i)).map(e=>e.find(j=>j!==i)).sort((a,b)=>a-b)));
   s.adjacency.edge.forEach((ns,i)=>assert.deepEqual(ns,s.edges.flatMap((e,j)=>j!==i&&e.some(v=>s.edges[i].includes(v))?[j]:[])));
   s.adjacency.face.forEach((ns,i)=>assert.deepEqual(ns,s.faces.flatMap((f,j)=>j!==i&&s.edges.some(([a,b])=>s.faces[i].includes(a)&&s.faces[i].includes(b)&&f.includes(a)&&f.includes(b))?[j]:[])));
   for(const adj of Object.values(s.adjacency))adj.forEach((ns,i)=>ns.forEach(j=>assert.ok(adj[j].includes(i))));
 });
 test(`${s.name}: every vertex, edge and polygon can be picked at mobile and desktop sizes`,()=>{
   const model=createSolid(s);
   for(const [width,height] of [[375,480],[1100,720]])for(const mode of ['vertex','edge','face']) {
     const targets=mode==='vertex'?s.vertices.map((_,i)=>[i]):mode==='edge'?s.edges:s.faces;
     targets.forEach((indices,index)=>{
       const center=new THREE.Vector3();indices.forEach(i=>center.add(model.vertices[i]));center.divideScalar(indices.length);
       const camera=new THREE.PerspectiveCamera(40,width/height,0.1,100);camera.position.copy(center).normalize().multiplyScalar(7.8);if(Math.abs(camera.position.clone().normalize().y)>.99)camera.up.set(0,0,1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
       assert.equal(pickTarget({x:width/2,y:height/2,width,height,camera,faces:model.faces,vertices:model.vertices,edges:s.edges,mode}),index,`${mode} ${index}`);
     });
   }
   model.dispose();
 });
 test(`${s.name}: rear vertices and edges are occluded`,()=>{
   const model=createSolid(s),camera=new THREE.PerspectiveCamera(40,1,0.1,100);camera.position.set(0.3,0.5,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   for(const mode of ['vertex','edge']){
     const targets=mode==='vertex'?s.vertices.map((_,i)=>[i]):s.edges;
     for(const [i,ids] of targets.entries()){
       const p=new THREE.Vector3();ids.forEach(j=>p.add(model.vertices[j]));p.divideScalar(ids.length);
       const r=new THREE.Raycaster(camera.position,p.clone().sub(camera.position).normalize());const hit=r.intersectObjects(model.faces)[0];
       if(hit&&hit.distance<p.distanceTo(camera.position)-.1){const q=p.clone().project(camera);assert.notEqual(pickTarget({x:(q.x+1)*300,y:(1-q.y)*300,width:600,height:600,camera,faces:model.faces,vertices:model.vertices,edges:s.edges,mode}),i);}
     }
   }model.dispose();
 });
}
test('drag, return-to-origin, multitouch and cancellation never paint',()=>{
 const g=new TapGesture();g.down(1,10,10);assert.ok(g.up(1,12,12));
 g.down(1,10,10);g.move(1,30,10);assert.equal(g.up(1,10,10),false);
 g.down(1,10,10);g.down(2,30,10);assert.equal(g.up(2,30,10),false);assert.equal(g.up(1,10,10),false);
 g.down(1,10,10);g.cancel(1);assert.equal(g.up(1,10,10),false);
});
