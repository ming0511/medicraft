import re, html, json

h = open('/tmp/nbk.html', encoding='utf-8', errors='replace').read()

def sect(a, b):
    i = h.find(a); j = h.find(b, i + len(a)) if i >= 0 else -1
    if i < 0 or j < 0: return ''
    seg = re.sub(r'<[^>]+>', ' ', h[i:j]); seg = html.unescape(seg)
    return re.sub(r'\s+', ' ', seg).strip()

def parse_section(text, trailing_re, typ):
    # drop heading + intro sentence (everything up to & including "medical terminology"/"medical terms" + . or :)
    text = re.sub(r'^.{0,400}?medical term(?:inology|s)\s*[.:]?\s+', '', text, flags=re.I | re.S)
    chunks = [c.strip() for c in re.split(r'\s*:\s*', text) if c.strip()]
    if len(chunks) < 2: return []
    tr = re.compile(trailing_re + r'\s*$')
    entries = []
    cur_forms = chunks[0]
    for k in range(1, len(chunks)):
        ch = chunks[k]
        if k < len(chunks) - 1:
            m = tr.search(ch)
            meaning = (ch[:m.start()] if m else ch).strip().rstrip(',;').strip()
            next_forms = m.group(1).strip() if m else None
        else:
            meaning = re.split(r'\s+(?:See the following|Note that|Note there|There are several)\b', ch, flags=re.I)[0].strip().rstrip(',;').strip()
            next_forms = None
        forms = [re.sub(r'\s*/\s*', '/', f).strip() for f in cur_forms.split(',') if f.strip()]
        forms = [f for f in forms if re.search(r'[A-Za-z]', f)]
        if forms and meaning:
            e = {'forms': forms, 'primary': forms[0], 'meaning': meaning, 'type': typ}
            if typ == 'root':
                cv = {f.split('/',1)[1] for f in forms if '/' in f and f.split('/',1)[1]}
                e['combiningVowel'] = (sorted(cv)[0] if len(cv)==1 else sorted(cv)) if cv else None
            entries.append(e)
        if next_forms is None:
            if k < len(chunks) - 1: break
        else:
            cur_forms = next_forms
    return entries

PREFIX_TR = r'([A-Za-z]+-(?:\s*,\s*[A-Za-z]+-)*)'
ROOT_TR   = r'([A-Za-z]+\s*/\s*[a-z]?(?:\s*,\s*[A-Za-z]+\s*/?\s*[a-z]?)*)'
SUFFIX_TR = r'(-[A-Za-z]+(?:\s*,\s*-[A-Za-z]+)*)'

prefixes = parse_section(sect('>Common Prefixes<', 'Examples of Common Prefixes'), PREFIX_TR, 'prefix')
roots    = parse_section(sect('Common Word Roots and Their Combining Vowel', 'Examples of Common Word Roots'), ROOT_TR, 'root')
suffixes = parse_section(sect('>Common Suffixes<', 'Examples of Common Suffixes'), SUFFIX_TR, 'suffix')

out = {
  'source': 'https://www.ncbi.nlm.nih.gov/books/NBK607453/ — Medical Terminology 2nd ed. (Open RN / Chippewa Valley Technical College), Ch.1 §1.3-1.5',
  'license': 'CC-BY 4.0 (attribution required)', 'fetched': '2026-05-12',
  'counts': {'prefixes': len(prefixes), 'roots': len(roots), 'suffixes': len(suffixes), 'total': len(prefixes)+len(roots)+len(suffixes)},
  'prefixes': prefixes, 'roots': roots, 'suffixes': suffixes,
}
json.dump(out, open('frontend-app/scripts/nbk-ch1-wordparts.json','w'), ensure_ascii=False, indent='\t')
print(json.dumps(out['counts'], ensure_ascii=False))
print('\nPREFIXES:'); [print(f"  {','.join(p['forms']):20} {p['meaning']}") for p in prefixes]
print('\nROOTS:');    [print(f"  {','.join(p['forms']):24} {p['meaning']}") for p in roots]
print('\nSUFFIXES:'); [print(f"  {','.join(p['forms']):22} {p['meaning']}") for p in suffixes]
