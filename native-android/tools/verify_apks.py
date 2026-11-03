"""Verify installable packages, signatures, native entry point and asset boundaries."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import os
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
sdk = Path(os.environ.get('ANDROID_HOME', os.environ.get('ANDROID_SDK_ROOT', '')))
build_tools = sorted((sdk / 'build-tools').iterdir(), key=lambda p: tuple(int(x) if x.isdigit() else 0 for x in p.name.split('.')))[-1]
for source in (root / 'app/src/main/java').rglob('*.kt'):
    code = source.read_text(encoding='utf-8-sig')
    assert not any(s in code for s in ['android.webkit', 'WebView', 'com.getcapacitor', 'loadUrl(', 'evaluateJavascript(']), source
for role in ['customer', 'business', 'tow', 'superadmin']:
    source = root / f'app/build/outputs/apk/{role}/debug/app-{role}-debug.apk'
    assert source.is_file() and source.stat().st_size > 1_000_000, source
    out = root / 'apk-output' / role
    out.mkdir(parents=True, exist_ok=True)
    apk = out / f'PARTFLOW-native-{role}.apk'
    shutil.copyfile(source, apk)
    signature = subprocess.check_output([str(build_tools / 'apksigner'), 'verify', '--verbose', str(apk)], text=True)
    info = subprocess.check_output([str(build_tools / 'aapt'), 'dump', 'badging', str(apk)], text=True)
    assert f"package: name='com.partflow.native.{role}'" in info, info
    assert "launchable-activity: name='com.partflow.nativeapp.MainActivity'" in info, info
    with ZipFile(apk) as archive:
        names = archive.namelist()
        assert 'classes.dex' in names and 'AndroidManifest.xml' in names
        assert 'assets/catalog.json' in names and 'assets/firebase.json' in names
        assert not any(n.startswith('assets/public/') or n.endswith(('.html', '.js', '.mjs')) for n in names), 'Web bundle present'
        firebase = json.loads(archive.read('assets/firebase.json'))
        assert firebase['projectId'] == 'menio-8de8f' and ':android:' in firebase['appId']
    digest = hashlib.sha256(apk.read_bytes()).hexdigest()
    (out / 'SHA256SUMS.txt').write_text(f'{digest}  {apk.name}\n')
    (out / 'verification.txt').write_text(signature + '\n' + info)
    print(role, apk.stat().st_size, digest)
