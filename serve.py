"""One-command local play preview. Unpacks original 3D assets only if needed."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
import argparse
root=Path(__file__).resolve().parent
if not (root/'app/assets/scene/lobby_stage.glb').exists():
    from tools.unpack_assets import main
    main()
parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
print(f'Dragon Arena local 3D preview: http://localhost:{args.port} — landscape orientation recommended')
ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(root/'app'))).serve_forever()
