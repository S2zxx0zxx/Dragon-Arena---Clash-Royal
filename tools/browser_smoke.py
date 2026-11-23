"""WebGL2 runtime startup smoke: loading, 3D hero and playable arena (NOT physical Android QA)."""
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=root/'app'))
Thread(target=server.serve_forever,daemon=True).start()
issues=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1280,'height':720})
  page.on('pageerror',lambda error:issues.append(str(error)))
  page.on('console',lambda message:issues.append(message.text) if message.type=='error' else None)
  page.on('response',lambda response:issues.append('HTTP '+str(response.status)+' '+response.url) if response.status>=400 else None)
  page.goto('http://127.0.0.1:'+str(server.server_address[1])+'/',wait_until='domcontentloaded',timeout=25000)
  try:
   page.wait_for_function("document.querySelector('#loadpct').textContent.trim()==='100%'",timeout=22000)
  except Exception as error:
   print('BOOT_DIAGNOSTIC',page.evaluate("""() => ({ready:document.readyState,loading:document.querySelector('#loadpct')?.textContent,status:document.querySelector('#render-status')?.textContent,toast:document.querySelector('#toast')?.textContent,webgl:(()=>{try{return !!document.querySelector('#scene3d').getContext('webgl2')}catch(e){return String(e)}})(),ua:navigator.userAgent})"""),flush=True)
   print('ERROR_LOGS',issues,flush=True)
   page.screenshot(path=str(root/'qa'/'browser_boot_failure.png'))
   raise
  assert page.locator('#start-button').is_enabled()
  page.locator('#start-button').click()
  if page.locator('#notice-check').is_visible():
   page.locator('#notice-check').check()
   page.locator('[data-action="agree"]').click()
  page.wait_for_selector('#home.active',timeout=10000)
  page.locator('#home [data-action="play"]').first.click()
  page.wait_for_selector('#arena.active',timeout=45000)
  page.wait_for_timeout(2500)
  result=page.evaluate("() => ({status:document.querySelector('#render-status').textContent,webgl:!!document.querySelector('#scene3d').getContext('webgl2'),food:window.__crystalDebug.arena?.food.length,alive:window.__crystalDebug.arena?.players.filter(x=>x.alive).length})")
  print('WEBGL_SMOKE',result,flush=True)
  assert result['webgl'] and result['food']>0 and result['alive']>0,result
  assert 'ERROR' not in result['status'].upper(),result
  assert not issues,issues
  page.screenshot(path=str(root/'qa'/'browser_arena_smoke.png'))
  browser.close()
finally:server.shutdown()
