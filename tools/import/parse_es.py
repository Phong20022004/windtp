import openpyxl,glob,re,datetime,os,json,collections
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE=os.path.join(ROOT,'data','raw','es')
IPA=re.compile(r'[ˈˌɾɣβðθʝɲŋʎɡʃʧɛɔ]')
def lvl(a):
    if isinstance(a,(datetime.datetime,datetime.date)):
        return a.day,a.month   # "26.3" bị Excel đổi thành ngày 26/03
    if a is None: return None
    s=str(a).strip()
    m=re.match(r'^(\d+)(?:\.(\d+))?$',s)
    if not m: return None
    return int(m.group(1)),int(m.group(2) or 0)
def split_ex(e):
    e=str(e or '').strip()
    if not e: return '',''
    # dạng 1: ES. (VI)     dạng 2: ES. (IPA) VI
    m=re.match(r'^(.*?)\s*\(([^()]*)\)\s*(.*)$',e,re.S)
    if m:
        es,par,rest=m.group(1).strip(),m.group(2).strip(),m.group(3).strip()
        if IPA.search(par) or (rest and not IPA.search(par) and len(rest)>3):
            return es,rest
        return es,par
    return e,''
def read_vocab(path):
    ws=openpyxl.load_workbook(path,data_only=True).worksheets[0]
    out=[]
    for r in ws.iter_rows(values_only=True):
        r=list(r)+[None]*10
        L=lvl(r[0])
        if not L or r[1] is None: continue
        term=str(r[1]).strip()
        if not term or not r[4]: continue
        es,vi=split_ex(r[8])
        out.append(dict(u=L[0],i=L[1],t=term,ipa=str(r[2] or '').strip(),pos=str(r[3] or '').strip(),vi=str(r[4]).strip(),ex=es,exvi=vi))
    return out
def find(sub,name):
    for f in glob.glob(BASE+'/**/*.xlsx',recursive=True):
        if sub in f and f.endswith(name): return f
if __name__=='__main__':
    f=[x for x in glob.glob(BASE+'/**/*.xlsx',recursive=True) if 'CH' in os.path.basename(x) and 'PH' not in os.path.basename(x)][0]
    d=read_vocab(f)
    g=collections.OrderedDict()
    for w in d: g.setdefault(w['u'],[]).append(w)
    print(len(d),len(g))
    for u,ws in g.items(): print(u,len(ws),' | '.join(x['t']+'='+x['vi'][:14] for x in ws[:5]))
    print('noVi ex:',sum(1 for w in d if not w['exvi']))
