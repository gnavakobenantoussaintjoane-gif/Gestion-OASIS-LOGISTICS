"""Bake a self-contained semi-trailer GLB from the CC0 Kenney tractor/wheels.
Asset-generation only: Python 3 + Pillow; no runtime dependency or network.
"""
import io, json, math, struct
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = (root / 'scripts/model-source/kenney-truck.glb').read_bytes()
jlen = struct.unpack_from('<I', source, 12)[0]
doc = json.loads(source[20:20+jlen])
bin_start = 20+jlen
blob = bytearray(source[bin_start+8:])

def append(data):
    while len(blob)%4: blob.append(0)
    offset=len(blob); blob.extend(data)
    doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(data)})
    return len(doc['bufferViews'])-1

def accessor(values, width, kind='VEC3', integer=False):
    flat=[v for row in values for v in row]
    view=append(struct.pack('<'+('H' if integer else 'f')*len(flat),*flat))
    item={'bufferView':view,'componentType':5123 if integer else 5126,'count':len(values),'type':kind}
    if kind=='VEC3':
        item['min']=[min(row[i] for row in values) for i in range(width)]
        item['max']=[max(row[i] for row in values) for i in range(width)]
    doc['accessors'].append(item); return len(doc['accessors'])-1

def material(name,color,metal=0):
    doc['materials'].append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':metal,'roughnessFactor':.48}})
    return len(doc['materials'])-1
blue=material('OTL-navy',[.063,.184,.439,1],.25)
orange=material('OTL-orange',[.957,.467,0,1],.15)
steel=material('Chassis-steel',[.12,.17,.22,1],.7)
white=material('White-trim',[.85,.91,.97,1],.3)

# Repaint only green body palette pixels, preserving glass, tyres and detail.
image=doc['images'][0]; view=doc['bufferViews'][image['bufferView']]
start=view.get('byteOffset',0)
png=Image.open(io.BytesIO(blob[start:start+view['byteLength']])).convert('RGBA')
pixels=png.load()
for y in range(png.height):
    for x in range(png.width):
        r,g,b,a=pixels[x,y]
        if g>r*1.15 and g>b*1.04:
            value=min(250,round(205+g*.16)); pixels[x,y]=(value,min(255,value+3),min(255,value+7),a)
out=io.BytesIO(); png.save(out,format='PNG'); image['bufferView']=append(out.getvalue())

# All new geometry is baked to the asset, not constructed in React at runtime.
faces=[((1,0,0),[(.5,-.5,-.5),(.5,.5,-.5),(.5,.5,.5),(.5,-.5,.5)]),((-1,0,0),[(-.5,-.5,.5),(-.5,.5,.5),(-.5,.5,-.5),(-.5,-.5,-.5)]),((0,1,0),[(-.5,.5,-.5),(-.5,.5,.5),(.5,.5,.5),(.5,.5,-.5)]),((0,-1,0),[(-.5,-.5,.5),(-.5,-.5,-.5),(.5,-.5,-.5),(.5,-.5,.5)]),((0,0,1),[(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5),(-.5,-.5,.5)]),((0,0,-1),[(-.5,-.5,-.5),(-.5,.5,-.5),(.5,.5,-.5),(.5,-.5,-.5)])]
vertices=[];normals=[];uv=[];indices=[]
for normal,quad in faces:
    n=len(vertices);vertices.extend(quad);normals.extend([normal]*4);uv.extend([(0,1),(0,0),(1,0),(1,1)]);indices.extend([(n,n+1,n+2),(n,n+2,n+3)])
attrs={'POSITION':accessor(vertices,3),'NORMAL':accessor(normals,3),'TEXCOORD_0':accessor(uv,2,'VEC2')}
idx=accessor([(i,) for triangle in indices for i in triangle],1,'SCALAR',True)
mesh_cache={}
logo_mat=-1
def box(name,pos,size,mat):
    if mat not in mesh_cache:
        doc['meshes'].append({'name':name,'primitives':[{'attributes':({**attrs,'TEXCOORD_0':accessor([(1-u,v) for u,v in uv],2,'VEC2')} if mat==logo_mat else attrs),'indices':idx,'material':mat}]});mesh_cache[mat]=len(doc['meshes'])-1
    doc['nodes'].append({'name':name,'mesh':mesh_cache[mat],'translation':pos,'scale':size})
    doc['scenes'][0]['nodes'].append(len(doc['nodes'])-1)
# High sleeper / aerodynamic roof and blue side accents on the source tractor.
box('tractor-sleeper',[0,1.05,-.35],[1.08,1.1,.55],white)
box('tractor-roof-fairing',[0,1.44,.07],[1.05,.25,.85],white)
for side in [-1,1]:
    box('tractor-blue-stripe',[side*.545,.92,-.35],[.018,.15,.55],blue)
    box('tractor-fuel-tank',[side*.55,.38,-.6],[.28,.22,.55],steel)
box('trailer-body',[0,1.48,-3.65],[1.48,1.75,5.8],blue)
box('trailer-chassis',[0,.50,-3.65],[1.3,.16,5.95],steel)
for y in [.62,2.35]: box('trailer-rail',[0,y,-3.65],[1.53,.045,5.85],white)
for z in [-6.58,-.72]: box('trailer-corner',[0,1.48,z],[1.53,1.8,.045],white)
for side in [-1,1]:
    for i in range(35): box('trailer-rib',[side*.75,1.48,-6.46+i*.164],[.025,1.65,.022],blue)
    box('side-guard',[side*.66,.35,-3.3],[.08,.12,2.4],steel)
    box('landing-leg',[side*.5,.28,-2.15],[.08,.38,.08],steel)
# Reuse detailed licensed wheel meshes, with origins at axle centres (X axis).
for z in [-4.95,-5.5,-6.05]:
    for side,mesh in [(-1,3),(1,4)]:
        doc['nodes'].append({'name':f'wheel-trailer-{z}-{side}','mesh':mesh,'translation':[side*.48,.3,z]})
        doc['scenes'][0]['nodes'].append(len(doc['nodes'])-1)
# Logo original fourni, embarqué intact (JPEG) : pas de redessin ni de texte de remplacement.
logo_path=root.parent/'shared/branding/otl-logo.jpg'
doc['images'].append({'name':'OTL-official-logo','mimeType':'image/jpeg','bufferView':append(logo_path.read_bytes())})
doc['textures'].append({'source':len(doc['images'])-1})
doc['materials'].append({'name':'OASIS LOGISTICS-brand','doubleSided':False,'alphaMode':'MASK','alphaCutoff':.25,'pbrMetallicRoughness':{'baseColorTexture':{'index':len(doc['textures'])-1},'metallicFactor':0,'roughnessFactor':.8}})
logo_mat=len(doc['materials'])-1
for side in [-1,1]:
    box('OTL-logo',[side*.79,1.5,-3.65],[.005,1.5,3],logo_mat)
    box('OTL-orange-stripe',[side*.785,.7,-3.65],[.012,.12,5.8],orange)
doc['asset']['generator']='OASIS LOGISTICS asset adaptation / Kenney Car Kit 3.1 CC0'
doc['asset']['copyright']='Kenney (CC0); semi-trailer geometry adaptation (CC0); OTL logo supplied by user, trademark rights reserved'
doc['scenes'][0]['name']='OASIS LOGISTICS-semi-trailer'
while len(blob)%4:blob.append(0)
doc['buffers']=[{'byteLength':len(blob)}]
encoded=json.dumps(doc,separators=(',',':')).encode()
while len(encoded)%4:encoded+=b' '
result=struct.pack('<III',0x46546c67,2,12+8+len(encoded)+8+len(blob))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(blob),0x004e4942)+blob
path=root/'public/models/truck.glb';path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(result)
print(f'{path.name}: {len(result):,} bytes; {len(doc["nodes"])} nodes; embedded textures')
