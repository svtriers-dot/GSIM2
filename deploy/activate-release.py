#!/usr/bin/env python3
"""Publish one reviewed code artifact. Never apply SQL or rewrite private config."""
import argparse,hashlib,json,os,pwd,re,shutil,subprocess,tarfile,time,urllib.request
from pathlib import Path

PROFILES={
 'gsim':dict(root='/opt/gsim2',user='gsim',unit='gsim2',db='gsim',port=5000,health='/api/health',parts=['dist','node_modules','package.json','package-lock.json'],allowed={'dist','package.json','package-lock.json'},required=['dist/index.cjs','dist/public/index.html'],public='dist/public'),
 'registry':dict(root='/opt/ai-registry',user='airegistry',unit='ai-registry',db='ai_registry',port=5002,health='/healthz',parts=['release'],allowed={'src','public','vendor','db','scripts','deploy','package.json','package-lock.json'},required=['src/server.js','public/index.html'],public='public'),
}
HISTORY_ROOT=Path('/var/backups/tesstech/actions-releases')
STAGING_ROOT=Path('/var/lib/tesstech-actions-staging')
NPM_CACHE_ROOT=Path('/var/cache/tesstech-actions-npm')

def main(argv=None):
    p=argparse.ArgumentParser();p.add_argument('project',choices=PROFILES);p.add_argument('release_id');p.add_argument('archive');p.add_argument('sha256');args=p.parse_args(argv)
    assert os.geteuid()==0,'Run through the production deployment account sudo policy'
    assert re.fullmatch(r'[0-9a-f]{40}-[0-9]+-[0-9]+',args.release_id)
    assert re.fullmatch(r'[0-9a-f]{64}',args.sha256)
    cfg=PROFILES[args.project];root=Path(cfg['root']);archive=Path(args.archive)
    assert archive.is_file() and archive.stat().st_size<128*1024**2 and hashlib.sha256(archive.read_bytes()).hexdigest()==args.sha256,'Artifact digest mismatch'
    os.umask(0o077)
    history=HISTORY_ROOT/args.project;history.mkdir(mode=0o700,parents=True,exist_ok=True)
    record=history/args.release_id;assert not record.exists(),'A release id may only be activated once';record.mkdir(mode=0o700)
    stage=STAGING_ROOT/args.project/args.release_id;assert not stage.exists();stage.mkdir(mode=0o755,parents=True)
    STAGING_ROOT.chmod(0o700)
    NPM_CACHE_ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
    def run(command,label,timeout=60):
     r=subprocess.run(command,capture_output=True,text=True,timeout=timeout)
     (record/(label+'.log')).write_text(r.stdout+r.stderr)
     if r.returncode:raise RuntimeError(label+' failed; diagnostic retained on the Russian server')
     return r.stdout.strip()
    def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
    def schema_digest():
     text=run(['sudo','-u','postgres','/usr/lib/postgresql/18/bin/pg_dump','-p','5433','--schema-only','--no-comments',cfg['db']],'schema-probe')
     # pg_dump 18 uses a fresh psql restrict key on each invocation.
     text='\n'.join(l for l in text.splitlines() if not l.startswith(('\\restrict ','\\unrestrict ','--')))
     return hashlib.sha256(text.encode()).hexdigest()
    def health():
     try:
      with urllib.request.urlopen('http://127.0.0.1:'+str(cfg['port'])+cfg['health'],timeout=4) as r:return json.load(r) if r.status==200 else None
     except Exception:return None
    def wait_ready():
     for attempt in range(15):
      if health() is not None:return True
      time.sleep(2)
     return False
    
    try:
        count=0;size=0
        with tarfile.open(archive,'r:gz') as tar:
            for member in tar:
                count+=1;size+=member.size
                assert count<10000 and size<512*1024**2
                path=Path(member.name)
                assert not path.is_absolute() and '..' not in path.parts
                assert path.parts and path.parts[0] in cfg['allowed'] and (member.isfile() or member.isdir()),'Unexpected release member'
                assert not any(part.startswith('.env') or part=='.git' for part in path.parts)
                target=stage/path
                if member.isdir():target.mkdir(parents=True,exist_ok=True)
                else:
                    target.parent.mkdir(parents=True,exist_ok=True)
                    with tar.extractfile(member) as source,target.open('wb') as output:shutil.copyfileobj(source,output)
                    target.chmod(0o644)
    except Exception:
        shutil.rmtree(stage)
        raise
    assert all((stage/name).is_file() for name in cfg['required'])
    for folder,dirs,files in os.walk(stage):
     os.chmod(folder,0o755)
    node='/opt/tesstech-node/24/bin/node';npm='/opt/tesstech-node/24/lib/node_modules/npm/bin/npm-cli.js'
    assert run([node,'--version'],'node-version').startswith('v24.')
    user_config=record/'npm-user-config';user_config.write_text('')
    global_config=record/'npm-global-config';global_config.write_text('')
    try:
        run([node,'--max-old-space-size=192',npm,'ci','--prefix',str(stage),'--omit=dev','--ignore-scripts','--no-audit','--no-fund','--cache',str(NPM_CACHE_ROOT),'--userconfig='+str(user_config),'--globalconfig='+str(global_config),'--registry=https://registry.npmjs.org'],'production-dependencies',timeout=300)
    except Exception:
        shutil.rmtree(stage)
        raise
    assert (stage/'node_modules').is_dir()
    # Private umask protects logs/config; published code must be readable by the
    # existing non-root systemd service after the root-owned install.
    for folder,dirs,files in os.walk(stage):
        os.chmod(folder,0o755)
        for name in files:
            path=Path(folder)/name
            if not path.is_symlink():os.chmod(path,0o755 if path.stat().st_mode & 0o111 else 0o644)

    live_public=(root/'dist/public' if args.project=='gsim' else root/'release/public')
    new_public=stage/cfg['public']
    # Keep immutable Vite URLs usable for clients that cached an earlier index.
    old_assets=live_public/'assets';new_assets=new_public/'assets'
    assert live_public.resolve().is_relative_to(root.resolve()) and not live_public.is_symlink(),'Unexpected public path'
    if old_assets.is_dir() and not old_assets.is_symlink():
     for old in old_assets.rglob('*'):
      if old.is_file() and not old.is_symlink():
       new=new_assets/old.relative_to(old_assets)
       if not new.exists():new.parent.mkdir(parents=True,exist_ok=True);os.link(old,new)
    for folder,dirs,files in os.walk(new_public):
        os.chmod(folder,0o755)
    private=root/'.env';private_hash=sha(private);schema_before=schema_digest()
    marker=root/'.actions-release.json';previous_marker=marker.read_bytes() if marker.exists() else None
    if previous_marker is not None:(record/'previous-marker.json').write_bytes(previous_marker)
    state=health();assert state is not None,'Current service is not healthy'
    if args.project=='gsim':assert not any(state[k] for k in ['activeSessions','activeTeams','trainerSockets']),'An active game blocks publication; retry in an idle window'
    changed=[];stopped=False
    try:
     run(['systemctl','stop',cfg['unit']],'stop-for-activation');stopped=True
     for part in cfg['parts']:
      old=root/part;assert not old.is_symlink(),'Unexpected live layout'
      if old.exists():old.rename(record/part);changed.append(('old',part))
      else:assert part in ['package.json','package-lock.json'],'Missing live runtime'
      source=stage/part if args.project=='gsim' else stage
      source.rename(old);changed.append(('new',part))
     run(['systemctl','start',cfg['unit']],'start-release')
     assert wait_ready(),'Candidate failed health checks'
     assert sha(private)==private_hash and schema_digest()==schema_before,'Private config or database schema changed'
     marker.write_text(json.dumps({'project':args.project,'release_id':args.release_id,'artifact_sha256':args.sha256})+'\n')
     proof={'project':args.project,'release_id':args.release_id,'artifact_sha256':args.sha256,'schema_unchanged':True,'private_settings_unchanged':True,'rollback_retained':True,'prior_managed_release':previous_marker is not None,'activated_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
     (record/'activation.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof))
    except Exception:
     if stopped:subprocess.run(['systemctl','stop',cfg['unit']],capture_output=True)
     for kind,part in reversed(changed):
      if kind=='new':
       target=record/('failed-'+part);(root/part).rename(target)
      else:(record/part).rename(root/part)
     if previous_marker is not None:marker.write_bytes(previous_marker)
     elif marker.exists():marker.unlink()
     if stopped:
      run(['systemctl','start',cfg['unit']],'rollback-start');assert wait_ready(),'Rollback requires operator attention'
     raise
    finally:
     if stage.exists():shutil.rmtree(stage)
    
    # Retain two previous managed runtimes. The original pre-Actions runtime and all
    # independent database/config backups are retained outside this rotation rule.
    managed=[]
    for directory in history.iterdir():
     if directory.is_symlink() or not directory.is_dir() or not re.fullmatch(r'[0-9a-f]{40}-[0-9]+-[0-9]+',directory.name):continue
     info=directory/'activation.json'
     if info.is_file():
      value=json.loads(info.read_text())
      if value.get('project')==args.project and value.get('prior_managed_release'):managed.append((value['activated_utc'],directory))
    for _,directory in sorted(managed,reverse=True)[2:]:shutil.rmtree(directory)

if __name__=="__main__":main()
