"""Independently inspect downloaded Actions ZIPs and their real DEX entry point."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import re
import struct
import sys

base=Path(sys.argv[1]).resolve()
manifest=json.loads((base/'artifact-manifest.json').read_text(encoding='utf-8-sig'))
reports=[]
def superclass(dex, target):
    strings_count,strings_off,types_count,types_off=struct.unpack_from('<IIII',dex,56)
    strings=[]
    for index in range(strings_count):
        offset=struct.unpack_from('<I',dex,strings_off+index*4)[0]
        while dex[offset]&128: offset+=1
        offset+=1
        strings.append(dex[offset:dex.index(b'\0',offset)].decode('utf-8',errors='replace'))
    types=[strings[struct.unpack_from('<I',dex,types_off+i*4)[0]] for i in range(types_count)]
    count,offset=struct.unpack_from('<II',dex,96)
    for i in range(count):
        cls,flags,parent=struct.unpack_from('<III',dex,offset+i*32)
        if types[cls]==target:return types[parent]
    return None
for item in manifest:
    role=item['name'].removeprefix('PARTFLOW-native-').removesuffix('-APK')
    if role not in ['customer','business','tow','superadmin']:continue
    archive=base/(item['name']+'.zip')
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==item['digest'].removeprefix('sha256:')
    with ZipFile(archive) as source:
        apk_name=f'PARTFLOW-native-{role}.apk'
        apk_bytes=source.read(apk_name)
        checksum=source.read('SHA256SUMS.txt').decode().split()[0]
        assert hashlib.sha256(apk_bytes).hexdigest()==checksum
        verification=source.read('verification.txt').decode()
        assert f"package: name='com.partflow.native.{role}'" in verification
        for name in [apk_name,'SHA256SUMS.txt','verification.txt']:
            folder=base/role;folder.mkdir(exist_ok=True)
            (folder/name).write_bytes(source.read(name))
    with ZipFile(base/role/apk_name) as apk:
        assert not any(n.endswith(('.html','.js','.mjs')) or n.startswith('assets/public/') for n in apk.namelist())
        config=json.loads(apk.read('assets/firebase.json'))
        catalog=json.loads(apk.read('assets/catalog.json'))
        assert config['projectId']=='menio-8de8f' and ':android:' in config['appId']
        assert 'Toyota' in catalog['vehicles'] and catalog['categories']
        parents=[superclass(apk.read(n),'Lcom/partflow/nativeapp/MainActivity;') for n in apk.namelist() if re.fullmatch(r'classes\d*\.dex',n)]
        assert 'Landroidx/activity/ComponentActivity;' in parents,parents
    certificates=dict(re.findall(r'(?:Signer #1|V2 Signer:) certificate (SHA-256|SHA-1) digest: ([a-fA-F0-9]+)',verification))
    assert len(certificates)==2, 'Certificate fingerprints missing'
    reports.append({'role':role,'package':f'com.partflow.native.{role}','bytes':len(apk_bytes),'sha256':checksum,'certificate':certificates,'nativeActivitySuperclass':'androidx.activity.ComponentActivity','firebaseAppId':config['appId']})
assert len(reports)==4
(base/'VERIFIED.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(reports,ensure_ascii=False,indent=2))
