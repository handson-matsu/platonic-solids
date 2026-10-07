import * as THREE from './vendor/three.module.js';
export function createSolid(solid) {
  const group=new THREE.Group();
  const vertices=solid.vertices.map(v=>new THREE.Vector3(...v));
  const faces=solid.faces.map((indices,index)=>{
    const positions=[];
    for(let i=1;i<indices.length-1;i++) for(const j of [indices[0],indices[i],indices[i+1]]) positions.push(...solid.vertices[j]);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xe0e8ed,roughness:0.72,metalness:0.04,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));
    mesh.userData.index=index;group.add(mesh);return mesh;
  });
  const edgeMeshes=solid.edges.map(([a,b])=>{
    const vector=vertices[b].clone().sub(vertices[a]);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,vector.length(),12),new THREE.MeshStandardMaterial({color:0x65808b,roughness:0.5}));
    mesh.position.copy(vertices[a]).add(vertices[b]).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());
    mesh.scale.set(0.018,1,0.018);group.add(mesh);return mesh;
  });
  const vertexMeshes=vertices.map(v=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(0.073,20,14),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.45}));mesh.position.copy(v);group.add(mesh);return mesh;
  });
  group.updateMatrixWorld(true);
  return {group,vertices,faces,edgeMeshes,vertexMeshes,dispose(){group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
}
