export const MODES=[{id:'vertex',name:'頂点彩色',short:'頂点',icon:'●',description:'となり合う頂点を、違う色に。できるだけ少ない色で全頂点を塗ろう。',target:'頂点'},{id:'edge',name:'辺彩色',short:'辺',icon:'╱',description:'同じ頂点に集まる辺を、違う色に。できるだけ少ない色で全辺を塗ろう。',target:'辺'},{id:'face',name:'面彩色',short:'面',icon:'⬡',description:'辺を共有する面を、違う色に。できるだけ少ない色で全ての面を塗ろう。',target:'面'},{id:'hamilton',name:'ハミルトン閉路',short:'閉路',icon:'↻',description:'全ての頂点を1回ずつ通って、出発点へ。辺をつないで1つの輪を作ろう。',target:'辺'}];
export function itemCount(s,mode){return mode==='vertex'?s.vertices.length:mode==='face'?s.faces.length:s.edges.length;}
export function judge(s,mode,values){
 if(values.length!==itemCount(s,mode))throw new Error('Invalid state');
 if(mode==='hamilton'){
   const adjacency=s.vertices.map(()=>[]);
   s.edges.forEach(([a,b],i)=>{if(values[i]){adjacency[a].push(b);adjacency[b].push(a);}});
   if(adjacency.some(ns=>!ns.length))return {clear:false,message:'まだ通っていない頂点があります。全ての頂点をつないでみよう。'};
   if(adjacency.some(ns=>ns.length!==2))return {clear:false,message:'各頂点につながる選択辺を、ちょうど2本にしよう。'};
   const seen=new Set(),stack=[0];while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);stack.push(...adjacency[i]);}
   if(seen.size!==s.vertices.length)return {clear:false,message:'輪が分かれています。全ての頂点を1つの輪につなごう。'};
   return {clear:true,message:'クリア！ 全ての頂点を通る、1つの閉路ができました。'};
 }
 const blank=values.filter(v=>v===null).length;
 if(blank)return {clear:false,message:`まだ塗っていない${MODES.find(m=>m.id===mode).target}が${blank}個あります。回して裏側も確かめよう。`};
 const conflicts=s.adjacency[mode].some((ns,i)=>ns.some(j=>values[i]===values[j]));
 if(conflicts)return {clear:false,message:mode==='edge'?'同じ頂点に集まる辺に、同じ色があります。色を変えてみよう。':mode==='face'?'辺を共有する面に、同じ色があります。色を変えてみよう。':'となり合う頂点に、同じ色があります。色を変えてみよう。'};
 const used=new Set(values).size;
 if(used>s.minimum[mode])return {clear:false,message:'正しく彩色できていますが、もっと少ない色でできます。'};
 return {clear:true,message:`クリア！ ${used}色で、最小の彩色ができました。`};
}
export const STORAGE_KEY='platonic-solids:clears:v1';
export function loadProgress(storage,validKeys){try{const data=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');return {keys:new Set(Array.isArray(data)?data.filter(k=>validKeys.includes(k)):[]),available:true};}catch{return {keys:new Set(),available:false};}}
export function saveProgress(storage,keys){try{storage.setItem(STORAGE_KEY,JSON.stringify([...keys]));return true;}catch{return false;}}
