"""将已核实的GeoJSON与标注封装为file协议可直接载入的脚本，无网络请求。"""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
folder=root/'assets/maps'
data={key:json.loads((folder/(key+'.geojson')).read_text(encoding='utf-8')) for key in ['rivers','land','regions','water']}
data['labels']=json.loads((folder/'labels.json').read_text(encoding='utf-8'))
assert len(data['rivers']['features'])==5
assert {f['properties']['id'] for f in data['rivers']['features']}==set(range(5))
(root/'src/geography.js').write_text('/* WGS84 geographic snapshots; OSM ODbL and Natural Earth public domain. See assets/maps/SOURCES.md. */\nconst RiverAtlasGeography = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Offline geography bundle rebuilt.')
