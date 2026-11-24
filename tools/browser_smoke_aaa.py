from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root/'app')))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
try:
    with sync_playwright() as p:
        for fallback in (False,True):
            browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            page=browser.new_page(viewport={'width':1100,'height':650},service_workers='block')
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            if fallback:
                page.add_init_script("""const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:get.call(this,kind,...args)};""")
            page.goto(url)
            page.wait_for_function("!document.querySelector('#splash-enter-btn').disabled",timeout=45000)
            assert page.evaluate('window.__dragonArena.engine.isFallback') == fallback
            if fallback: assert page.evaluate('!!window.__dragonArena.engine.ctx')
            page.locator('#splash-enter-btn').click()
            assert page.locator('#screen-home').evaluate("e=>e.classList.contains('active')")
            page.locator('[data-action="open-lab"]').first.click()
            assert page.locator('#screen-lab').evaluate("e=>e.classList.contains('active')")
            page.locator('#screen-lab [data-action="go-home"]').click()
            page.locator('[data-action="play-selected"]').click()
            page.wait_for_function('window.__dragonArena.arena?.players.length >= 2')
            page.wait_for_timeout(1000)
            assert page.locator('#screen-arena').evaluate("e=>e.classList.contains('active')")
            assert not errors, errors
            print('PASS', 'Canvas2D fallback' if fallback else 'WebGL2', 'boot/home/lab/local arena')
            browser.close()
finally:
    server.shutdown()
