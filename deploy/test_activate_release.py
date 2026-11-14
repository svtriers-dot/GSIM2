import copy,hashlib,importlib.util,io,json,os,pwd,subprocess,tarfile,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('activate',Path(__file__).with_name('activate-release.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ActivationTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.base=Path(self.temp.name)
  self.profiles=copy.deepcopy(module.PROFILES);self.active=True;self.reject_candidate=False;self.npm_fail=False;self.active_game=False;self.commands=[]
  old=os.umask(0o077);os.umask(old);self.addCleanup(lambda:os.umask(old))
 def fixture(self,project,malicious=False):
  self.project=project;self.root=self.base/project;self.root.mkdir()
  self.cfg=self.profiles[project];self.cfg['root']=str(self.root);self.cfg['user']=pwd.getpwuid(os.getuid()).pw_name
  (self.root/'.env').write_text('SYNTHETIC_TEST_CONFIG=preserve\n');(self.root/'.env').chmod(0o600)
  if project=='gsim':files={'dist/index.cjs':'old','dist/public/index.html':'old','node_modules/marker':'old'}
  else:files={'release/src/server.js':'old','release/public/index.html':'old','release/node_modules/marker':'old'}
  for name,value in files.items():
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(value)
  content={'dist/index.cjs':'candidate','dist/public/index.html':'candidate'} if project=='gsim' else {'src/server.js':'candidate','public/index.html':'candidate'}
  content.update({'package.json':'{}','package-lock.json':'{}'})
  if malicious:content['dist/../../escape']='forbidden'
  self.archive=self.base/'release.tgz'
  with tarfile.open(self.archive,'w:gz') as tar:
   for name,value in content.items():
    data=value.encode();entry=tarfile.TarInfo(name);entry.size=len(data);tar.addfile(entry,io.BytesIO(data))
  self.release='a'*40+'-1-1';self.digest=hashlib.sha256(self.archive.read_bytes()).hexdigest()
 def live(self):return self.root/('dist/index.cjs' if self.project=='gsim' else 'release/src/server.js')
 def command(self,args,**kwargs):
  self.commands.append(args)
  if 'ci' in args:
   if self.npm_fail:return subprocess.CompletedProcess(args,1,'','synthetic npm failure')
   stage=Path(args[args.index('--prefix')+1]);(stage/'node_modules').mkdir();(stage/'node_modules/marker').write_text('candidate')
  if args[:2]==['systemctl','stop']:self.active=False
  if args[:2]==['systemctl','start']:self.active=True
  output='v24.22.3' if '--version' in args else ''
  if any('pg_dump' in str(x) for x in args):output='\\restrict random-key\nCREATE TABLE synthetic(id int);\n\\unrestrict random-key\n'
  return subprocess.CompletedProcess(args,0,output,'')
 def response(self,*args,**kwargs):
  if not self.active or (self.reject_candidate and self.live().read_text()=='candidate'):raise OSError('synthetic unavailable candidate')
  data={'activeSessions':int(self.active_game),'activeTeams':0,'trainerSockets':0}
  response=io.BytesIO(json.dumps(data).encode());response.status=200;return response
 def activate(self):
  with patch.object(module,'PROFILES',self.profiles),patch.object(module,'HISTORY_ROOT',self.base/'history'),patch.object(module,'STAGING_ROOT',self.base/'stage'),patch.object(module,'NPM_CACHE_ROOT',self.base/'npm-cache'),patch.object(module.os,'geteuid',return_value=0),patch.object(module.subprocess,'run',side_effect=self.command),patch.object(module.urllib.request,'urlopen',side_effect=self.response),patch.object(module.time,'sleep'):
   module.main([self.project,self.release,str(self.archive),self.digest])
 def test_gsim_success_preserves_config_and_rollback(self):
  self.fixture('gsim');self.activate()
  self.assertEqual(self.live().read_text(),'candidate');self.assertEqual((self.root/'.env').read_text(),'SYNTHETIC_TEST_CONFIG=preserve\n')
  self.assertEqual((self.base/'history/gsim'/self.release/'dist/index.cjs').read_text(),'old')
  self.assertEqual((self.root/'node_modules').stat().st_mode & 0o777,0o755)
  self.assertEqual((self.root/'node_modules/marker').stat().st_mode & 0o777,0o644)
  self.assertEqual((self.root/'.env').stat().st_mode & 0o777,0o600)
 def test_registry_success_preserves_previous_release(self):
  self.fixture('registry');self.activate()
  self.assertEqual(self.live().read_text(),'candidate');self.assertEqual((self.base/'history/registry'/self.release/'release/src/server.js').read_text(),'old')
 def test_gsim_failed_health_restores_both_runtime_parts(self):
  self.fixture('gsim');self.reject_candidate=True
  with self.assertRaises(AssertionError):self.activate()
  self.assertTrue(self.active);self.assertEqual(self.live().read_text(),'old');self.assertEqual((self.root/'node_modules/marker').read_text(),'old')
 def test_registry_failed_health_restores_previous_release(self):
  self.fixture('registry');self.reject_candidate=True
  with self.assertRaises(AssertionError):self.activate()
  self.assertTrue(self.active);self.assertEqual(self.live().read_text(),'old')
 def test_archive_traversal_cannot_write_outside_stage(self):
  self.fixture('gsim',malicious=True)
  with self.assertRaises(AssertionError):self.activate()
  self.assertFalse((self.root/'escape').exists());self.assertEqual(self.live().read_text(),'old');self.assertTrue(self.active)
 def test_active_game_blocks_stop(self):
  self.fixture('gsim');self.active_game=True
  with self.assertRaises(AssertionError):self.activate()
  self.assertFalse(any(c[:2]==['systemctl','stop'] for c in self.commands));self.assertEqual(self.live().read_text(),'old')
 def test_dependency_failure_keeps_service_and_removes_stage(self):
  self.fixture('gsim');self.npm_fail=True
  with self.assertRaises(RuntimeError):self.activate()
  self.assertTrue(self.active);self.assertEqual(self.live().read_text(),'old');self.assertFalse((self.base/'stage'/self.project/self.release).exists())

if __name__=='__main__':unittest.main()
