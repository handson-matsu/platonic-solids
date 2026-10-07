import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SOLIDS} from '../solids.js';
import {judge,loadProgress,saveProgress,STORAGE_KEY} from '../logic.js';
// Exact DSATUR backtracking. Color-name symmetry is broken, not search outcomes.
function coloring(adj,k){const colors=Array(adj.length).fill(-1);function visit(done,max){if(done===adj.length)return colors.slice();let best=-1,saturation=-1,degree=-1;for(let i=0;i<adj.length;i++)if(colors[i]<0){const sat=new Set(adj[i].filter(j=>colors[j]>=0).map(j=>colors[j])).size;if(sat>saturation||sat===saturation&&adj[i].length>degree){best=i;saturation=sat;degree=adj[i].length;}}const used=new Set(adj[best].map(j=>colors[j]));for(let c=0;c<Math.min(k,max+2);c++)if(!used.has(c)){colors[best]=c;const r=visit(done+1,Math.max(max,c));if(r)return r;}colors[best]=-1;return null;}return visit(0,-1);}
function hamilton(s){const path=[0],seen=new Set(path);function visit(){if(path.length===s.vertices.length)return s.adjacency.vertex[path.at(-1)].includes(0)?path.slice():null;for(const v of s.adjacency.vertex[path.at(-1)])if(!seen.has(v)){seen.add(v);path.push(v);const p=visit();if(p)return p;path.pop();seen.delete(v);}return null;}const p=visit();assert.ok(p);return s.edges.map(([a,b])=>p.some((v,i)=>v===a&&p[(i+1)%p.length]===b||v===b&&p[(i+1)%p.length]===a));}
for(const s of SOLIDS){
 for(const mode of ['vertex','edge','face'])test(`${s.name}/${mode}: exact minimum and every judgment branch`,()=>{
  const adj=s.adjacency[mode],minimum=s.minimum[mode];
  const optimal=coloring(adj,minimum);assert.ok(optimal);assert.equal(coloring(adj,minimum-1),null,'smaller coloring must not exist');
  assert.equal(judge(s,mode,optimal).clear,true);
  assert.equal(judge(s,mode,Array(adj.length).fill(null)).clear,false);
  assert.equal(judge(s,mode,Array(adj.length).fill(0)).clear,false);
  if(minimum<adj.length){const more=optimal.slice();const counts=optimal.map(c=>optimal.filter(v=>v===c).length);more[counts.findIndex(c=>c>1)]=minimum;assert.equal(judge(s,mode,more).clear,false);assert.match(judge(s,mode,more).message,/もっと少ない/);}
 });
 test(`${s.name}: valid Hamilton cycle, missing vertex, wrong degree`,()=>{const edges=hamilton(s);assert.equal(judge(s,'hamilton',edges).clear,true);assert.equal(judge(s,'hamilton',edges.map(()=>false)).clear,false);edges[edges.indexOf(true)]=false;assert.equal(judge(s,'hamilton',edges).clear,false);assert.equal(judge(s,'hamilton',s.edges.map(()=>true)).clear,false);});
}
test('disjoint cycles covering every cube vertex are rejected',()=>{const s=SOLIDS[1];const selected=s.edges.map(([a,b])=>s.vertices[a][0]===s.vertices[b][0]);assert.match(judge(s,'hamilton',selected).message,/輪が分かれ/);});
test('persistence: round trip, malformed JSON, unknown entries and denied storage',()=>{let value=null;const store={getItem:()=>value,setItem:(key,v)=>{assert.equal(key,STORAGE_KEY);value=v;}};const keys=SOLIDS.flatMap(s=>['vertex','edge','face','hamilton'].map(m=>`${s.id}:${m}`));assert.equal(saveProgress(store,new Set(keys)),true);assert.equal(loadProgress(store,keys).keys.size,20);value='["unknown","cube:vertex","cube:vertex"]';assert.deepEqual([...loadProgress(store,keys).keys],['cube:vertex']);value='{invalid';assert.equal(loadProgress(store,keys).keys.size,0);assert.equal(loadProgress(undefined,keys).available,false);assert.equal(saveProgress(undefined,new Set()),false);});
