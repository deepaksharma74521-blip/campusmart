import os, glob
from PIL import Image
import winocr

folder = 'shops menu2.0/Mehender food junction'
files = sorted(glob.glob(os.path.join(folder, '*.jpeg')))
for f in files:
    print('=== FILE:', os.path.basename(f), '===')
    img = Image.open(f)
    if '8.02.12' in f or '8.02.13' in f or '8.02.14' in f or '8.02.15' in f:
        img = img.rotate(270, expand=True)
    res = winocr.recognize_pil_sync(img)
    lines = res.get('lines', [])
    for line in lines:
        txt = line.get('text', '')
        # line rect is a dict: {'x': .., 'y': .., 'width': .., 'height': ..}
        rect = line.get('rect', {})
        print(f"{rect.get('y',0):4.0f}, {rect.get('x',0):4.0f}: {txt}")
