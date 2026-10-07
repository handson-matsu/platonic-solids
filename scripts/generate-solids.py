"""Generate explicit indexed topology from canonical Platonic coordinates (offline only)."""
import itertools, math, json
phi=(1+math.sqrt(5))/2
signs=list(itertools.product((-1,1),repeat=3))
shapes=[('tetra','正四面体',[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]],[4,3,4]),('cube','立方体',list(signs),[2,3,3]),('octa','正八面体',[[s if i==j else 0 for i in range(3)] for j in range(3) for s in (-1,1)],[3,4,2]),('dodeca','正十二面体',list(signs)+[(0,a/phi,b*phi) for a,b in itertools.product((-1,1),repeat=2)]+[(b*phi,0,a/phi) for a,b in itertools.product((-1,1),repeat=2)]+[(a/phi,b*phi,0) for a,b in itertools.product((-1,1),repeat=2)],[3,3,4]),('icosa','正二十面体',[(0,a,b*phi) for a,b in itertools.product((-1,1),repeat=2)]+[(b*phi,0,a) for a,b in itertools.product((-1,1),repeat=2)]+[(a,b*phi,0) for a,b in itertools.product((-1,1),repeat=2)],[4,5,3])]
def sub(a,b): return [x-y for x,y in zip(a,b)]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def unit(a): return [x/math.sqrt(dot(a,a)) for x in a]
result=[]
for id,name,vs,mins in shapes:
    faces=set()
    for a,b,c in itertools.combinations(range(len(vs)),3):
        n=cross(sub(vs[b],vs[a]),sub(vs[c],vs[a]))
        if dot(n,n)<1e-12: continue
        ds=[dot(n,sub(v,vs[a])) for v in vs]
        if max(ds)<1e-8 or min(ds)>-1e-8: faces.add(tuple(i for i,d in enumerate(ds) if abs(d)<1e-8))
    ordered=[]
    for face in sorted(faces):
        center=[sum(vs[i][j] for i in face)/len(face) for j in range(3)]
        n=unit(center); u=unit(sub(vs[face[0]],center)); v=cross(n,u)
        ordered.append(sorted(face,key=lambda i:math.atan2(dot(sub(vs[i],center),v),dot(sub(vs[i],center),u))))
    edges=sorted(set(tuple(sorted((f[i],f[(i+1)%len(f)]))) for f in ordered for i in range(len(f))))
    va=[[] for _ in vs]; ea=[[] for _ in edges]; fa=[[] for _ in ordered]
    for a,b in edges: va[a].append(b); va[b].append(a)
    for i,e in enumerate(edges):
        ea[i]=[j for j,f in enumerate(edges) if i!=j and set(e)&set(f)]
    for i,f in enumerate(ordered): fa[i]=[j for j,g in enumerate(ordered) if i!=j and len(set(f)&set(g))==2]
    radius=math.sqrt(dot(vs[0],vs[0]))
    result.append(dict(id=id,name=name,vertices=[[x/radius*1.65 for x in v] for v in vs],edges=edges,faces=ordered,adjacency=dict(vertex=va,edge=ea,face=fa),minimum=dict(zip(('vertex','edge','face'),mins))))
with open('solids.js','w') as f: f.write('// Explicit topology, generated offline by scripts/generate-solids.py.\nexport const SOLIDS = '+json.dumps(result,ensure_ascii=False,indent=2)+';\n')
