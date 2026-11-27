"""Reduce the HYG star database to the stars used by /universe: everything
down to magnitude 6.7, brightest first. The first stars in the file (to
magnitude 6.5) are the naked-eye sky; the rest appear as the view zooms in.

Usage: python3 reduce-stars.py <hyg csv or csv.gz> ../public/data/stars.json <version, e.g. 4.4>
Source: https://codeberg.org/astronexus/hyg (CC BY-SA 4.0)
"""
import csv, gzip, json, sys, re
src, out, version = sys.argv[1], sys.argv[2], sys.argv[3]
LIMIT = 6.7
LY = 3.26156
rows = []
for r in csv.DictReader(gzip.open(src, 'rt', newline='') if src.endswith('.gz') else open(src, newline='')):
    if r['id'] == '0': continue
    try: mag = float(r['mag'])
    except: continue
    if mag > LIMIT: continue
    rows.append(r)
rows.sort(key=lambda r: float(r['mag']))
data, labels = [], []
nodist = noci = 0
for i, r in enumerate(rows):
    dist = float(r['dist'])
    known = dist < 99999
    if not known: nodist += 1
    x, y, z = (float(r[k]) * LY for k in 'xyz')
    v = [float(r[k]) * LY * 1e6 if known else 0.0 for k in ('vx', 'vy', 'vz')]  # ly per million years
    ci = r['ci']
    if ci == '': noci += 1; ci = None
    else: ci = round(float(ci), 2)
    def q(a): return float('%.5g' % a)
    data += [q(x), q(y), q(z), round(v[0], 1), round(v[1], 1), round(v[2], 1), round(float(r['mag']), 2), ci, 1 if known else 0]
    lum = float(r['lum'] or 0)
    sp = r['spect']
    mag = float(r['mag'])
    # Label the giants of the sky: named supergiants and anything over 3,000 Suns.
    if r['proper'] and mag <= 3.0 and (lum > 3000 or re.search(r'(?<!I)I[ab]', sp)):
        labels.append([i, r['proper'], sp, round(lum), mag])
json.dump({'credit': 'Star data: HYG Database v%s (codeberg.org/astronexus/hyg), CC BY-SA 4.0. Stars to magnitude %s, brightest first.' % (version, LIMIT),
           'fields': ['x_ly', 'y_ly', 'z_ly', 'vx_ly_per_Myr', 'vy_ly_per_Myr', 'vz_ly_per_Myr', 'mag', 'bv', 'distance_known'],
           'stars': data, 'labels': [[l[0], l[1]] for l in labels]}, open(out, 'w'), separators=(',', ':'))
print(len(rows), 'stars; no distance:', nodist, '; no colour:', noci)
for l in labels: print(l)
