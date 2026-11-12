import re, os, sys, collections, pathlib, json
ROOT = pathlib.Path(sys.argv[1])  # ruta al clon de gym-app
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(exist_ok=True, parents=True)  # carpeta de salida
SKIP_DIRS = {'node_modules','.git','generated','.next','out','.agents','.windsurf','.claude'}
EXTS = {'.ts','.tsx','.prisma','.sql','.mjs','.js','.json','.md','.yml','.cs','.xml','.kt','.java','.gradle'}
TERMS = {
 'abono': r'abono',
 'tasa_cambio_bcv': r'tasaCambio|TasaCambio|tasaBcv|\bBCV\b|Bcv|dolarapi|ConvertirMonto|formatearBs|tasa-cambio|SincronizarTasas',
 'bolivares': r'\bBs\b|montoBs|\bVES\b|bol[ií]var|"BS"|\'BS\'',
 'usd': r'USD|precioUSD|montoUSD|saldoAFavorUSD',
 'cedula': r'c[eé]dula',
 'caracas_venezuela': r'caracas|venezuela',
 'sucursal': r'sucursal',
 'padron_excel': r'padr[oó]n|MiembroReferencia|PadronHoja|porRegularizar|vieneDelExcel|xlsm|\bexcel\b',
 'tenant_marca': r'adrenalina|zip-?gym|zipnegocios|ZIP_GYM|ADRENALINER|Kiosco AX|Vitrina AX',
 'metodos_ve': r'PAGO_MOVIL|BIOPAGO|PUNTO_VENTA|CRIPTO|Pago M[oó]vil|Biopago|Zelle|Binance|Banesco',
 'tz_local_getters': r'\.setHours\(|\.getDate\(\)|\.getMonth\(\)|\.getFullYear\(\)|\.getDay\(\)|toLocale(Date|Time)?String',
}
RX = {k: re.compile(v, re.I if k not in ('bolivares','tz_local_getters','metodos_ve','tasa_cambio_bcv','usd') else 0) for k,v in TERMS.items()}
def area(p):
    parts = p.parts
    if parts[0] in ('apps','packages'): return '/'.join(parts[:2])
    return parts[0] if len(parts)>1 else '(raíz)'
def kind(p):
    s = str(p)
    if re.search(r'\.test\.tsx?$', s): return 'test'
    if s.startswith('docs/') or p.suffix=='.md': return 'doc'
    if 'migrations' in s: return 'migracion'
    if s.startswith('packages/db') : return 'db-script'
    return 'src'
hits = {k: collections.defaultdict(lambda: [0,0]) for k in TERMS}  # file -> [lines, kind]
filekind = {}
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in SKIP_DIRS]
    for f in fn:
        p = pathlib.Path(dp)/f
        if p.suffix not in EXTS: continue
        rel = p.relative_to(ROOT)
        if str(rel) in ('handoff.md','cookies.txt'): continue
        try: txt = p.read_text(errors='ignore')
        except Exception: continue
        lines = txt.splitlines()
        for k, rx in RX.items():
            n = sum(1 for l in lines if rx.search(l))
            if n: hits[k][str(rel)] = [n, kind(rel)]
# matriz término x área (archivos de código/tests) y por tipo
summary = {}
for k in TERMS:
    by_area = collections.Counter(); by_kind = collections.Counter(); lines_total = 0
    for f,(n,kd) in hits[k].items():
        by_kind[kd]+=1; lines_total+=n
        if kd in ('src','test','db-script'): by_area[area(pathlib.Path(f))]+=1
    summary[k] = dict(files=len(hits[k]), lines=lines_total, by_kind=dict(by_kind), by_area=dict(by_area))
    with open(OUT/f'{k}.txt','w') as fh:
        for f,(n,kd) in sorted(hits[k].items(), key=lambda x:-x[1][0]): fh.write(f'{n}\t{kd}\t{f}\n')
json.dump(summary, open(OUT/'resumen.json','w'), ensure_ascii=False, indent=1)
areas = sorted({a for s in summary.values() for a in s['by_area']})
print('TERMINO | archivos(total) | src | test | db-script | doc | migracion | líneas')
for k,s in summary.items():
    bk = s['by_kind']; print(f"{k} | {s['files']} | {bk.get('src',0)} | {bk.get('test',0)} | {bk.get('db-script',0)} | {bk.get('doc',0)} | {bk.get('migracion',0)} | {s['lines']}")
print()
print('ARCHIVOS src+test+db por área:'); 
print('area | ' + ' | '.join(TERMS))
for a in areas: print(a + ' | ' + ' | '.join(str(summary[k]['by_area'].get(a,0)) for k in TERMS))
