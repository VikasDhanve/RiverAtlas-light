"""打包可离线运行的工程，排除开发依赖和批量截图，校验ZIP完整性。"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib, json, sys
from datetime import datetime

root = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'dist'
if output == root: raise SystemExit('导出目录不能是工程根目录')
output.mkdir(parents=True, exist_ok=True)
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
source = json.loads((root / 'docs/source-manifest-1107.json').read_text(encoding='utf-8'))
archive = output / ('RiverAtlas-v' + version + '.zip')
allowed = {'.impeccable/design.json'}
files = []
for p in root.rglob('*'):
    if not p.is_file(): continue
    rel = p.relative_to(root)
    if any(part in {'node_modules', '__pycache__', '.git', 'dist'} for part in rel.parts): continue
    if rel.parts[0] == '.impeccable' and rel.as_posix() not in allowed: continue
    if p.suffix.lower() in {'.log', '.zip', '.7z', '.rar'} or output in p.parents: continue
    files.append((p, rel.as_posix()))
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=6) as z:
    for p, rel in sorted(files, key=lambda item: item[1]): z.write(p, rel)
with ZipFile(archive) as z:
    bad = z.testzip()
    if bad: raise SystemExit('ZIP校验失败：' + bad)
    required = ['index.html', 'src/source.js', 'src/content.js', 'src/supplement.js', 'src/biliuhe.js', 'assets/vendor/gsap.min.js', 'README.md']
    if not all(n in z.namelist() for n in required): raise SystemExit('缺少必要交付文件')
manifest = {
    'version': version, 'created': datetime.now().astimezone().isoformat(timespec='seconds'),
    'archive': archive.name, 'bytes': archive.stat().st_size, 'files': len(files),
    'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'entry': 'index.html', 'sourcePages': len(source['slides']), 'presentationPages': source['presentationPageCount'], 'businessImages': len(source['runtimeAssets']) - 1,
    'status': 'RiverAtlas单层工程；待用户体验反馈，不等同正式验收'
}
(output / '交付清单.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(manifest, ensure_ascii=False))
