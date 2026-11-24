"""Fail-closed local APK/AAB checks. No tool substitutes for physical QA."""
import argparse, hashlib, json, os, re, struct, subprocess, tempfile, zipfile
from pathlib import Path
from shutil import copyfileobj

def run(*args): return subprocess.run(list(map(str,args)),check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True).stdout

def sha(path):
 with open(path,'rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def check_elf(data):
 if len(data)<64 or data[:4]!=b'\x7fELF' or data[4]!=2 or data[5]!=1: raise ValueError('Expected ELF64 little-endian')
 phoff=struct.unpack_from('<Q',data,32)[0]; ents,num=struct.unpack_from('<HH',data,54)
 if ents<56 or num==0 or phoff+ents*num>len(data):raise ValueError('Malformed ELF program headers')
 loads=0
 for i in range(num):
  t,flags,offset,vaddr,_,filesz,memsz,align=struct.unpack_from('<IIQQQQQQ',data,phoff+i*ents)
  if t!=1:continue
  loads+=1
  if align<16384 or align&(align-1) or offset%16384!=vaddr%16384 or offset+filesz>len(data):raise ValueError('PT_LOAD not 16 KB aligned')
 if not loads:raise ValueError('No load segments')
 return loads

def inspect_zip(path,release=False):
 with zipfile.ZipFile(path) as z:
  if z.testzip() is not None:raise ValueError('Corrupt ZIP entry')
  names=z.namelist()
  if len(names)!=len(set(names)):raise ValueError('Duplicate ZIP member')
  libs=[n for n in names if re.fullmatch(r'(?:base/)?lib/[^/]+/[^/]+\.so',n)]
  abis=sorted({n.split('/')[-2] for n in libs})
  if 'arm64-v8a' not in abis or 'armeabi-v7a' not in abis:raise ValueError('Missing expected ABI')
  for abi in abis:
   for required in ('libunity.so','libil2cpp.so'):
    if not any(n.endswith('/'+abi+'/'+required) for n in libs):raise ValueError('Missing '+required+' '+abi)
  aligned={n:check_elf(z.read(n)) for n in libs if release and n.split('/')[-2] in ('arm64-v8a','x86_64')}
 return {'abis':abis,'libraries':len(libs),'aligned_64bit_load_segments':aligned}

def verify_apk(path,args,release=False):
 result=inspect_zip(path,release)
 badging=run(args.aapt,'dump','badging',path)
 pkg=re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'",badging)
 if not pkg or pkg.group(1)!=args.package or int(pkg.group(2))!=args.code or pkg.group(3)!=args.version:raise ValueError('Package/version mismatch')
 minv=re.search(r"sdkVersion:'(\d+)'",badging); target=re.search(r"targetSdkVersion:'(\d+)'",badging)
 if not minv or int(minv.group(1))!=26 or not target or int(target.group(1))!=(36 if release else 30):raise ValueError('SDK mismatch')
 if "launchable-activity: name='io.dragonarena.platform.MigrationActivity'" not in badging:raise ValueError('Migration launcher missing')
 if release and 'application-debuggable' in badging:raise ValueError('Debuggable release')
 if re.search(r"uses-permission(?:-sdk-\d+)?: name='android.permission.(?:READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE|REQUEST_INSTALL_PACKAGES)'",badging):raise ValueError('Unexpected broad permission')
 signer=run(args.apksigner,'verify','--verbose','--print-certs',path)
 certs=re.findall(r'certificate SHA-256 digest:\s*([0-9a-fA-F]{64})',signer)
 if not certs:raise ValueError('No verified signing digest')
 if args.cert and [x.lower() for x in certs]!=[args.cert.lower().replace(':','')]:raise ValueError('Certificate mismatch')
 if release:run(args.zipalign,'-c','-P','16','-v','4',path)
 result.update(package=pkg.group(1),code=int(pkg.group(2)),version=pkg.group(3),signers=certs,target=int(target.group(1)),sha256=sha(path),bytes=path.stat().st_size)
 return result

def retain_verified_apk(apk, destination):
    """Copy a verified APK without overwriting any existing artifact."""
    with apk.open('rb') as source, destination.open('xb') as target:
        try:
            copyfileobj(source, target)
            target.flush()
            os.fsync(target.fileno())
        except BaseException:
            target.close()
            destination.unlink()
            raise

def main():
 p=argparse.ArgumentParser();p.add_argument('artifact',type=Path);p.add_argument('--track',choices=['qa','release'],required=True);p.add_argument('--package',required=True);p.add_argument('--code',required=True,type=int);p.add_argument('--version',default='4.0.0');p.add_argument('--aapt',required=True);p.add_argument('--apksigner',required=True);p.add_argument('--zipalign',required=True);p.add_argument('--cert');p.add_argument('--bundletool',type=Path);p.add_argument('--report',type=Path,required=True)
 p.add_argument('--apk-output', type=Path, help='Keep the verified universal APK derived from the release AAB')
 a=p.parse_args()
 if a.report.exists():raise SystemExit('Use a fresh report path')
 if a.track=='qa':
  if a.apk_output is not None:raise SystemExit('--apk-output is for the release track')
  if a.package!='io.dragonarena.unityqa' or a.code!=15 or a.artifact.suffix!='.apk':raise SystemExit('Wrong QA identity')
  report=verify_apk(a.artifact,a)
 else:
  if a.package in ('io.dragonarena.unityqa','io.dragonarena.preview') or a.code<=15 or a.artifact.suffix!='.aab' or not a.cert or not a.bundletool:raise SystemExit('Production identity, cert, AAB and bundletool required')
  if a.apk_output is not None and (
      a.apk_output.suffix != '.apk'
      or a.apk_output.exists()
      or a.apk_output.resolve() == a.report.resolve()
  ):raise SystemExit('Use a fresh .apk output path distinct from the verification report')
  aab_digest=sha(a.artifact)
  report=inspect_zip(a.artifact,True)
  run('java','-jar',a.bundletool,'validate','--bundle='+str(a.artifact))
  config=run('java','-jar',a.bundletool,'dump','config','--bundle='+str(a.artifact))
  if 'PAGE_ALIGNMENT_16K' not in config:raise ValueError('Bundle page alignment not verified')
  verification=run('jarsigner','-verify',a.artifact)
  if 'jar verified.' not in verification or 'jar is unsigned' in verification:raise ValueError('AAB signature not verified')
  # Match AAB signing certificate against expected upload certificate.
  certinfo=run('keytool','-printcert','-jarfile',a.artifact)
  certs=re.findall(r'SHA256:\s*([0-9A-Fa-f:]+)',certinfo)
  if a.cert.lower().replace(':','') not in [x.lower().replace(':','') for x in certs]:raise ValueError('AAB cert mismatch')
  # Generate directly from the inspected AAB; do not accept an unrelated APK.
  with tempfile.TemporaryDirectory() as temp:
   temp=Path(temp); ks=temp/'ks-pass'; key=temp/'key-pass'
   for path,env in [(ks,'DRAGON_ARENA_KEYSTORE_PASS'),(key,'DRAGON_ARENA_KEY_PASS')]:
    path.touch(mode=0o600);path.write_text(os.environ[env],encoding='utf-8')
   apks=temp/'derived.apks'
   run('java','-jar',a.bundletool,'build-apks','--bundle='+str(a.artifact),'--output='+str(apks),'--mode=universal','--ks='+os.environ['DRAGON_ARENA_KEYSTORE'],'--ks-key-alias='+os.environ['DRAGON_ARENA_KEY_ALIAS'],'--ks-pass=file:'+str(ks),'--key-pass=file:'+str(key))
   apk=temp/'universal.apk'
   with zipfile.ZipFile(apks) as z, z.open('universal.apk') as source, apk.open('xb') as target:
    copyfileobj(source, target)
   apk_report=verify_apk(apk,a,True)
   if sha(a.artifact) != aab_digest:raise ValueError('AAB changed during verification')
   report.update(aab_sha256=aab_digest,apk=apk_report,apk_provenance='generated from inspected AAB')
   if a.apk_output is not None:
    retain_verified_apk(apk, a.apk_output)
    report['apk_output'] = a.apk_output.name
 report.update(status='ARTIFACT_CHECKS_PASS',device_qa='NOT_RUN')
 with a.report.open('x', encoding='utf-8') as output:
  json.dump(report, output, indent=2)
  output.write('\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__':main()
