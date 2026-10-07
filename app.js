import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {SOLIDS} from './solids.js';
import {createSolid} from './scene.js';
import {pickTarget,TapGesture} from './picking.js';
import {MODES,itemCount,judge,loadProgress,saveProgress} from './logic.js';
const $=id=>document.getElementById(id);
const colors=['#e37766','#e6b34c','#5285c7','#68a781','#9272b9','#c87cab'];
const colorNames=['コーラル','イエロー','ブルー','グリーン','パープル','ピンク'];
let solid=SOLIDS[0],mode='vertex',activeColor=0,playing=false,values=[],history=[],model;
const validKeys=SOLIDS.flatMap(s=>MODES.map(m=>`${s.id}:${m.id}`));
let storage;try{storage=window.localStorage;}catch{}
const progress=loadProgress(storage,validKeys);
$('storage-warning').hidden=progress.available;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x749080,2.6));
const keyLight=new THREE.DirectionalLight(0xffffff,3.1);keyLight.position.set(3,5,7);scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0xc5d9f4,1.1);fillLight.position.set(-4,0,-3);scene.add(fillLight);
const camera=new THREE.PerspectiveCamera(39,1,.1,100);
let renderer,controls;
try{
 renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 controls=new OrbitControls(camera,$('canvas'));controls.enablePan=false;controls.enableDamping=false;controls.minDistance=4.8;controls.maxDistance=12;controls.rotateSpeed=.75;controls.zoomSpeed=.8;
 controls.addEventListener('change',render);
}catch(e){$('webgl-error').hidden=false;$('start').disabled=true;console.error(e);}
function render(){renderer?.render(scene,camera);}
function resize(){const r=$('stage').getBoundingClientRect();if(!r.width||!r.height)return;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer?.setSize(r.width,r.height,false);render();}
new ResizeObserver(resize).observe($('stage'));
function resetView(){camera.position.set(4.2,3,6.1).normalize().multiplyScalar(7.6);camera.lookAt(0,0,0);controls?.target.set(0,0,0);controls?.update();render();}
function icon(s){const c=new THREE.PerspectiveCamera(38,1,.1,100);c.position.set(4,3,6).normalize().multiplyScalar(7);c.lookAt(0,0,0);c.updateMatrixWorld();const ps=s.vertices.map(v=>new THREE.Vector3(...v).project(c));return `<svg viewBox="0 0 60 60" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round">${s.edges.map(([a,b])=>`<path d="M${30+ps[a].x*27} ${30-ps[a].y*27}L${30+ps[b].x*27} ${30-ps[b].y*27}"/>`).join('')}</svg>`;}
for(const s of SOLIDS){const b=document.createElement('button');b.className='solid-card';b.dataset.id=s.id;b.innerHTML=icon(s)+`<span>${s.name}</span>`;b.onclick=()=>{solid=s;updateChoices();newChallenge();};$('solid-options').append(b);$('solid-select').add(new Option(s.name,s.id));}
for(const m of MODES){const b=document.createElement('button');b.className='mode-card';b.dataset.id=m.id;b.innerHTML=`<span class="mode-icon" aria-hidden="true">${m.icon}</span>${m.name}`;b.onclick=()=>{mode=m.id;updateChoices();newChallenge();};$('mode-options').append(b);$('mode-select').add(new Option(m.name,m.id));}
function updateChoices(){document.querySelectorAll('.solid-card').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===solid.id));document.querySelectorAll('.mode-card').forEach(b=>b.setAttribute('aria-pressed',b.dataset.id===mode));$('home-description').textContent=MODES.find(m=>m.id===mode).description;$('solid-select').value=solid.id;$('mode-select').value=mode;}
function newChallenge(){
 values=Array(itemCount(solid,mode)).fill(mode==='hamilton'?false:null);history=[];
 if(model){scene.remove(model.group);model.dispose();}model=createSolid(solid);scene.add(model.group);
 const m=MODES.find(m=>m.id===mode);
 $('challenge-title').textContent=`${solid.name}の${m.name}`;$('instruction').textContent=m.description;
 $('challenge-label').textContent=`CHALLENGE ${String(SOLIDS.indexOf(solid)*4+MODES.indexOf(m)+1).padStart(2,'0')} / 20`;
 $('solid-caption').textContent=solid.name;$('topology-counts').textContent=`${solid.vertices.length} 頂点 · ${solid.edges.length} 辺 · ${solid.faces.length} 面`;
 $('palette').hidden=mode==='hamilton';$('palette-label').textContent=mode==='hamilton'?'CONNECT THE EDGES':'COLOR PALETTE';
 $('target-select').replaceChildren(...values.map((_,i)=>new Option(`${m.target} ${i+1}`,i)));
 updateTargetDescription();hideFeedback();resetView();paint();updateProgress();
}
function paint(){
 const mat=(mesh,color)=>mesh.material.color.set(color);
 model.faces.forEach((mesh,i)=>mat(mesh,playing&&mode==='face'&&values[i]!==null?colors[values[i]]:0xdbe5e7));
 model.edgeMeshes.forEach((mesh,i)=>{const h=playing&&mode==='hamilton'&&values[i];const e=playing&&mode==='edge';mat(mesh,h?0x277658:e&&values[i]!==null?colors[values[i]]:0x67818a);const w=h?.043:e?.029:.016;mesh.scale.set(w,1,w);});
 model.vertexMeshes.forEach((mesh,i)=>{mesh.visible=mode!=='face';mat(mesh,playing&&mode==='vertex'&&values[i]!==null?colors[values[i]]:0xf9fbf7);mesh.scale.setScalar(mode==='vertex'?1:.60);});
 const count=values.filter(v=>mode==='hamilton'?v:v!==null).length;
 $('selection-status').textContent=mode==='hamilton'?`${count} / ${solid.edges.length} 辺を選択 · タップで選択／解除`:`${count} / ${values.length} 個を彩色 · ${new Set(values.filter(v=>v!==null)).size} 色使用`;
 $('undo').disabled=!history.length;$('reset').disabled=!count;updateTargetDescription();render();
}
function hideFeedback(){$('feedback').hidden=true;$('feedback').textContent='';}
function apply(index){if(!playing||index<0)return;const value=mode==='hamilton'?!values[index]:activeColor;if(values[index]===value)return;history.push(values.slice());values[index]=value;$('target-select').value=index;hideFeedback();paint();}
function setPlaying(on){playing=on;document.body.classList.toggle('playing',on);$('home').hidden=on;$('play').hidden=!on;$('workbench').hidden=!on;newChallenge();resize();if(on)$('canvas').focus({preventScroll:true});window.scrollTo({top:0});}
$('start').onclick=()=>setPlaying(true);$('back').onclick=()=>setPlaying(false);
$('solid-select').onchange=e=>{solid=SOLIDS.find(s=>s.id===e.target.value);updateChoices();newChallenge();};
$('mode-select').onchange=e=>{mode=e.target.value;updateChoices();newChallenge();};
for(let i=0;i<=colors.length;i++){const b=document.createElement('button');b.className='swatch'+(i===colors.length?' erase':'');b.style.setProperty('--swatch',colors[i]||'#fff');b.setAttribute('aria-label',i===colors.length?'消しゴム':`${i+1}: ${colorNames[i]}`);b.title=i===colors.length?'消しゴム':colorNames[i];b.setAttribute('aria-pressed',i===0);b.textContent=i===colors.length?'⌫':'';b.onclick=()=>{activeColor=i===colors.length?null:i;[...$('palette').children].forEach(x=>x.setAttribute('aria-pressed',x===b));};$('palette').append(b);}
$('undo').onclick=()=>{if(history.length){values=history.pop();hideFeedback();paint();}};
$('reset').onclick=()=>{history.push(values.slice());values.fill(mode==='hamilton'?false:null);hideFeedback();paint();};
$('check').onclick=()=>{const result=judge(solid,mode,values);$('feedback').hidden=false;$('feedback').textContent=result.message;$('feedback').classList.toggle('success',result.clear);if(result.clear){progress.keys.add(`${solid.id}:${mode}`);const ok=saveProgress(storage,progress.keys);$('storage-warning').hidden=ok;updateProgress();}};
$('view-reset').onclick=resetView;
function zoom(factor){camera.position.multiplyScalar(factor);camera.position.setLength(Math.max(4.8,Math.min(12,camera.position.length())));controls?.update();render();}
$('zoom-in').onclick=()=>zoom(.85);$('zoom-out').onclick=()=>zoom(1.15);
const gesture=new TapGesture(),canvas=$('canvas');
canvas.addEventListener('pointerdown',e=>{if(e.button!==0 && e.pointerType==='mouse')return;gesture.down(e.pointerId,e.clientX,e.clientY);});
canvas.addEventListener('pointermove',e=>gesture.move(e.pointerId,e.clientX,e.clientY));
canvas.addEventListener('pointerup',e=>{if(!gesture.up(e.pointerId,e.clientX,e.clientY)||!playing||!renderer)return;const r=canvas.getBoundingClientRect();apply(pickTarget({x:e.clientX-r.left,y:e.clientY-r.top,width:r.width,height:r.height,camera,faces:model.faces,vertices:model.vertices,edges:solid.edges,mode}));});
canvas.addEventListener('pointercancel',e=>gesture.cancel(e.pointerId));canvas.addEventListener('lostpointercapture',e=>gesture.cancel(e.pointerId));
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const s=new THREE.Spherical().setFromVector3(camera.position);s.theta+=(e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0);s.phi+=(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0);s.makeSafe();camera.position.setFromSpherical(s);controls?.update();render();}if(e.key==='+'||e.key==='=')zoom(.85);if(e.key==='-')zoom(1.15);});
function updateTargetDescription(){const i=Number($('target-select').value);if(!Number.isInteger(i)||i<0||i>=values.length)return;const ns=mode==='hamilton'?solid.edges[i].map(j=>j+1):solid.adjacency[mode][i].map(j=>j+1);const state=mode==='hamilton'?(values[i]?'選択中':'未選択'):(values[i]===null?'未彩色':colorNames[values[i]]);$('target-description').textContent=`${state}。${mode==='hamilton'?'両端の頂点':'隣接する対象'}: ${ns.join('、')}`;}
$('target-select').onchange=updateTargetDescription;$('apply-target').onclick=()=>apply(Number($('target-select').value));
function updateProgress(){const n=progress.keys.size;$('progress-count').textContent=`${n} / 20`;$('progress-summary').textContent=n===20?'20 / 20  全チャレンジ、クリア！':`${n} / 20 チャレンジをクリア`;$('progress-fill').style.width=`${n*5}%`;$('progress-table').replaceChildren();for(const s of SOLIDS){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=s.name;tr.append(th);for(const m of MODES){const td=document.createElement('td'),b=document.createElement('button'),done=progress.keys.has(`${s.id}:${m.id}`);b.className=done?'done':'';b.textContent=done?'✓':'○';b.setAttribute('aria-label',`${s.name} ${m.name} ${done?'クリア済み':'未クリア'}に挑戦`);b.onclick=()=>{solid=s;mode=m.id;updateChoices();$('progress-dialog').close();setPlaying(true);};td.append(b);tr.append(td);}$('progress-table').append(tr);}}
$('progress-button').onclick=()=>{$('progress-dialog').showModal();};$('close-progress').onclick=()=>$('progress-dialog').close();
window.addEventListener('storage',e=>{if(e.key==='platonic-solids:clears:v1'||e.key===null){const latest=loadProgress(storage,validKeys);progress.keys=latest.keys;updateProgress();}});
updateChoices();newChallenge();resize();

// Record one visit per page load without waiting for the response or retrying.
try {
  fetch('https://script.google.com/macros/s/AKfycbxssCIHsD-N97SHxNC_GN0ihYeC0qy-lb-EY0KmSs6Gnztaph1sITMerLVEnNWOGkYc/exec?app=platonic-solids', {
    method: 'GET',
    mode: 'no-cors',
    cache: 'no-store',
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
} catch {
  // Access logging must never interrupt the app.
}
