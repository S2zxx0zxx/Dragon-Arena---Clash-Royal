from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(root/'app')))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'

def assert_screen(page, name):
    visible = page.locator('.screen:visible').evaluate_all('(els) => els.map(e => e.id)')
    assert visible == ['screen-' + name], (name, visible)
    for overlay in ('#screen-result', '#screen-revive'):
        if overlay != '#screen-' + name:
            assert not page.locator(overlay).is_visible(), overlay

try:
    with sync_playwright() as p:
        for fallback in (False,True):
            browser=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            page=browser.new_page(viewport={'width':1100,'height':650},service_workers='block')
            # Software WebGL on shared CI runners can stall while creating the arena.
            page.set_default_timeout(90000)
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            if fallback:
                page.add_init_script("""const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:get.call(this,kind,...args)};""")
            page.goto(url)
            page.wait_for_function("() => !document.querySelector('#splash-enter-btn').disabled",timeout=45000)
            assert page.evaluate('window.__dragonArena.engine.isFallback') == fallback
            if fallback: assert page.evaluate('!!window.__dragonArena.engine.ctx')
            assert_screen(page, 'splash')
            page.locator('#splash-enter-btn').click()
            assert_screen(page, 'home')
            assert page.locator('#screen-home').evaluate("e=>e.classList.contains('active')")
            page.locator('[data-action="open-lab"]').first.click()
            assert page.locator('#screen-lab').evaluate("e=>e.classList.contains('active')")
            assert_screen(page, 'lab')
            page.locator('#screen-lab [data-action="go-home"]').click()
            assert_screen(page, 'home')
            page.locator('[data-action="play-selected"]').click()
            page.wait_for_function('() => window.__dragonArena.arena?.players.length >= 2')
            page.wait_for_timeout(1000)
            assert page.locator('#screen-arena').evaluate("e=>e.classList.contains('active')")
            assert_screen(page, 'arena')
            # Exercise actual button hit-testing, not only active classes.
            page.locator('#screen-arena [data-action="pause"]').click()
            assert page.locator('#pause-modal').is_visible()
            page.locator('#pause-modal [data-action="resume"]').click()
            assert not page.locator('#pause-modal').is_visible()
            # Force presentation state only to regression-test short landscape layout.
            page.set_viewport_size({'width': 740, 'height': 360})
            page.evaluate("window.__dragonArena.setScreen('result')")
            assert_screen(page, 'result')
            for action in ('go-home', 'rematch'):
                button = page.locator('#screen-result [data-action="' + action + '"]')
                box = button.bounding_box()
                assert box and box['y'] >= 0 and box['y'] + box['height'] <= 360, (action, box)
            page.locator('#screen-result [data-action="rematch"]').click()
            assert_screen(page, 'arena')
            page.evaluate("window.__dragonArena.setScreen('result')")
            page.locator('#screen-result [data-action="go-home"]').click()
            assert_screen(page, 'home')
            assert not errors, errors
            print('PASS', 'Canvas2D fallback' if fallback else 'WebGL2', 'boot/home/lab/local arena')
            browser.close()
finally:
    server.shutdown()
