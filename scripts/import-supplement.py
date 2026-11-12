"""只读导入汇报PDF素材；完整原件与紧凑演示取景分别保留。"""
from pathlib import Path
import hashlib
import json
import shutil
import sys
import pymupdf as fitz

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]).resolve()
biliuhe = len(sys.argv) > 2 and sys.argv[2] == '--biliuhe'
target = root / 'assets' / ('biliuhe' if biliuhe else 'supplement')
target.mkdir(parents=True, exist_ok=True)
assets, inputs = [], []

def render(pdf, page, number, label):
    stem = f'asset-{number}'
    scale = min(3, 2600 / max(page.rect.width, page.rect.height))
    page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False).save(target / (stem + '.png'))
    # 只移除纸张外缘空白，保留整幅正文、图框、图例和标题；完整页另存。
    bounds = fitz.Rect()
    for block in page.get_text('dict')['blocks']:
        if block['type'] == 1:
            bounds |= fitz.Rect(block['bbox'])
        else:
            for line in block['lines']:
                for span in line['spans']:
                    if span['text'].strip(): bounds |= fitz.Rect(span['bbox'])
    for drawing in page.get_drawings():
        bounds |= drawing['rect']
    bounds = (bounds + (-12, -12, 12, 12)) & page.rect
    if bounds.is_empty: bounds = page.rect
    page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=bounds, alpha=False).save(target / (stem + '-view.png'))
    folder = target.relative_to(root).as_posix()
    assets.append({'id': number, 'path': f'{folder}/{stem}.png',
                   'displayPath': f'{folder}/{stem}-view.png', 'caption': label,
                   'source': pdf.name, 'page': page.number + 1, 'rotation': 0})

if biliuhe:
    order = ['登记单元遥感影像图','自然资源现状图','公共管制和特殊保护关联图','森林资源专题图','湿地资源专题图','草原资源专题图','荒地资源专题图','0000001+T26界址点点之记']
    assert len(list(source.glob('*.pdf'))) == 8, '应为8份PDF，请复核新增资料'
    for i, name in enumerate(order):
        matches = list(source.glob('*）' + name + '.pdf'))
        assert len(matches) == 1, name
        with fitz.open(matches[0]) as doc:
            assert len(doc) == 1, 'PDF页数变化，请复核展示顺序'
            render(matches[0], doc[0], 201 + i, '碧流河 · ' + name)
else:
    register = source / 'P020240115558465557641.pdf'
    labels = ['自然资源登记簿封面', '清流河登记信息', '权属状况信息', '自然状况信息', '自然状况续表', '清流河登记单元图']
    with fitz.open(register) as doc:
        assert len(doc) == 6, '登记簿页数变化，请复核顺序'
        for i, page in enumerate(doc): render(register, page, 101 + i, f'南京清流河 · {labels[i]}（外地样例）')
    for number, key, label in [(107,'影像','卫星 / 正射影像'),(108,'三调','范围与现势'),(109,'权属','权属与成果'),(110,'公共管制','管制与保护')]:
        pdf = next(source.glob('*底图' + key + '.pdf'))
        with fitz.open(pdf) as doc:
            assert len(doc) == 1
            render(pdf, doc[0], number, '大沙河 · ' + label)
    flow = source / '流程图.png'
    shutil.copyfile(flow, target / 'workflow.png')
    assets.append({'id':111,'path':'assets/supplement/workflow.png','caption':'项目实施流程原图','source':flow.name,'rotation':0})
for file in sorted(source.iterdir()):
    if file.suffix.lower() not in {'.pdf', '.png'}: continue
    data = file.read_bytes()
    inputs.append({'file':file.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
manifest = {'date':'2026-11-06','sourceDirectory':str(source),'inputs':inputs,'assets':assets}
stem, variable = ('biliuhe', 'RiverAtlasBiliuhe') if biliuhe else ('supplement', 'RiverAtlasSupplement')
(root/f'docs/{stem}-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(root/f'src/{stem}.js').write_text('/* 用户新增素材；展示取景与完整原件独立。 */\nconst '+variable+' = '+json.dumps(assets,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
print(f'Imported {len(inputs)} immutable sources, {len(assets)} display entries.')
