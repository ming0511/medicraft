import json, re, collections

d = json.load(open('/tmp/medroots.json'))
w = d['parse']['wikitext']

def strip_refs(s):
    s = re.sub(r'<ref[^>]*?/>', '', s)
    s = re.sub(r'<ref[^>]*?>.*?</ref>', '', s, flags=re.S)
    return s

def expand_templates(s):
    for _ in range(8):
        def repl(m):
            inner = m.group(1)
            parts = inner.split('|')
            name = parts[0].strip().lower()
            args = [p.strip() for p in parts[1:]]
            if name in ('nowrap','not a typo','nobr','no wrap'):
                return args[0] if args else ''
            if name in ('wikt-lang','lang','wikt','lang-la','lang-grc','lang-el'):
                if len(args) >= 3: return args[2]
                if len(args) >= 2: return args[1]
                return args[-1] if args else ''
            # transliterations / refs -> drop
            return ''
        new = re.sub(r'\{\{([^{}]*)\}\}', repl, s)
        if new == s: break
        s = new
    s = re.sub(r'\{\{.*?\}\}', '', s)
    return s

def clean_links(s):
    s = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', s)
    s = re.sub(r'\[\[([^\]]*)\]\]', r'\1', s)
    return s

def clean(s):
    s = strip_refs(s); s = expand_templates(s); s = clean_links(s)
    s = s.replace("'''",'').replace("''",'')
    s = re.sub(r'<[^>]+>','',s)
    s = re.sub(r'\(\s*\)','',s)          # empty parens from dropped templates
    s = re.sub(r'\s+',' ',s).strip().strip(';,').strip()
    s = re.sub(r'\s+,',',',s); s = re.sub(r',\s*,',',',s)
    return s

def extract_links(s):
    s = strip_refs(s)
    items = re.findall(r'\[\[[^\]|]*\|([^\]]*)\]\]|\[\[([^\]]*)\]\]', s)
    out = [( a or b ).strip() for a,b in items]
    return out

# section context
sec_marks = []
for m in re.finditer(r'^(==+) *(.+?) *==+\s*$', w, re.M):
    sec_marks.append((m.start(), len(m.group(1)), m.group(2)))
def context_at(pos):
    sec=sub=None
    for p,lvl,title in sec_marks:
        if p>pos: break
        if lvl==2: sec=title; sub=None
        elif lvl>=3: sub=title
    return sec,sub

ROOT_RE = re.compile(r'^-?[A-Za-zͰ-Ͽἀ-῿()/ ,\-]+-?$')
def looks_like_root(s):
    s=s.strip()
    if not s or s in ('–','—','-','?','...'): return False
    if len(s)>40: return False
    return '-' in s or s.endswith('-') or s.startswith('-')

raw_tables=[]
for tm in re.finditer(r'\{\|\s*class="wikitable[^\n]*\n(.*?)\n\|\}', w, re.S):
    raw_tables.append((tm.start(), tm.group(1)))

alpha=[]; thematic_rows=[]
for start, tbl in raw_tables:
    sec,sub = context_at(start)
    for rowtext in re.split(r'\n\|-[^\n]*\n', tbl):
        lines = rowtext.split('\n')
        scoperow=None; cells=[]
        for ln in lines:
            ln=ln.rstrip()
            if ln.startswith('!'):
                if 'scope="row"' in ln or "scope='row'" in ln:
                    scoperow = ln.split('|',1)[1] if '|' in ln else ''
            elif ln.startswith('|') and not ln.startswith(('|+','|}','|-')):
                cells.extend(p.strip() for p in ln[1:].split(chr(124)+chr(124)))
        if scoperow is None: continue
        key = clean(scoperow)
        if not key: continue
        if sec=='Prefixes and suffixes':
            affixes=[a.strip() for a in re.split(r',|/| or ', key) if a.strip()]
            meaning = clean(cells[0]) if len(cells)>=1 else ''
            origin = clean(cells[1]) if len(cells)>=2 else ''
            lang=''
            ml=re.match(r'(New Latin|Neo-Latin|Late Latin|Old English|Old French|Greek|Latin|English|French|German|Arabic|Sanskrit|Italian|Spanish|Hebrew|Persian)', origin)
            if ml: lang=ml.group(1)
            ex = extract_links(cells[2]) if len(cells)>=3 else []
            alpha.append({'affix':key,'affixes':affixes,'meaning':meaning,'lang':lang,'origin':origin,'examples':ex,'letter':sub})
        else:
            # thematic: key = english concept, cells = roots (greek/latin/other)
            roots=[]
            for c in cells:
                cc = clean(c)
                for piece in re.split(r',|/| or ', cc):
                    piece=piece.strip()
                    if looks_like_root(piece): roots.append(piece)
            thematic_rows.append({'concept':key,'roots':roots,'family':sub})

# build family / english-concept maps from thematic
fam_map=collections.defaultdict(set); concept_map=collections.defaultdict(set)
for r in thematic_rows:
    for root in r['roots']:
        fam_map[root.lower()].add(r['family'])
        concept_map[root.lower()].add(r['concept'])

for r in alpha:
    fams=set(); concepts=set()
    for a in r['affixes']:
        for cand in (a, a.strip('-'), a.strip('-')+'-', '-'+a.strip('-')):
            if cand.lower() in fam_map: fams|=fam_map[cand.lower()]
            if cand.lower() in concept_map: concepts|=concept_map[cand.lower()]
    r['family']=sorted(fams)
    r['concept']=sorted(concepts)

out={
 'source':'https://en.wikipedia.org/wiki/List_of_medical_roots_and_affixes',
 'license':'CC-BY-SA 4.0 (attribution required)',
 'fetched':'2026-05-12',
 'counts':{'affixes':len(alpha),'thematic_rows':len(thematic_rows),
           'with_family':sum(1 for r in alpha if r['family']),
           'langs':dict(collections.Counter(r['lang'] for r in alpha).most_common())},
 'affixes':sorted(alpha,key=lambda r:r['affix'].strip('-')),
 'thematic':thematic_rows,
}
json.dump(out, open('frontend-app/scripts/wiki-medical-affixes.json','w'), ensure_ascii=False, indent='\t')
print(json.dumps(out['counts'], ensure_ascii=False))
fams=collections.Counter(f for r in alpha for f in r['family'])
print('families:', fams.most_common())
print('--- samples ---')
import random
for r in [x for x in alpha if x['affix'] in ('cardi-','-itis','-emia','hyper-','leuk-','peri-','gastr-')]:
    print(json.dumps(r, ensure_ascii=False))
