import sys,re,json,glob,os,collections,openpyxl
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from romanize_ko import romanize
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D=os.path.join(ROOT,'data','raw','ko-yonsei-reading-listening')
def rd(n):
    f=os.path.join(D,f'YONSEI {n}.xlsx'); ws=openpyxl.load_workbook(f,data_only=True).worksheets[0]
    out=[]
    for r in ws.iter_rows(values_only=True):
        r=list(r)+[None]*8
        if r[0] is None or str(r[0]).strip()=='LEVEL' or not r[1] or not r[2]: continue
        term=re.sub(r'\s+',' ',str(r[1])).strip(); vi=re.sub(r'\s+',' ',str(r[2])).strip()
        ex=str(r[6] or '').strip()
        if ' - ' in ex: k,v=ex.split(' - ',1)
        else: k,v=ex,''
        gram=bool(re.search(r'[+~]',term) or re.match(r'^[NVA](/[NVA])?\s*[+/]',term) or term.startswith('-'))
        out.append([term,romanize(term),'Ngữ pháp' if gram else '',vi,k.strip(),v.strip()])
    return out
VOLS=[['1','1-2'],['2'],['3'],['4'],['5'],['6']]
BOOK='Yonsei Reading / Listening'
VOC={};BL={}
MAXC=100
tot=0
for vi,files in enumerate(VOLS):
    items=[];seen=set()
    for n in files:
        for w in rd(n):
            k=(w[0].lower(),w[3].lower())
            if k in seen: continue
            seen.add(k); items.append(w)
    n=-(-len(items)//MAXC); size=-(-len(items)//n)
    ls=[];meta=[]
    for p in range(n):
        ch=items[p*size:(p+1)*size]
        if ch: ls.append([len(ls)+1,ch]); meta.append(["","",len(ls),len(ch),"Từ Vựng"])
    VOC[f'{BOOK}|{vi}']=ls; BL[vi]=meta; tot+=len(items)
    print(vi,files,len(items),'lessons',len(ls),'gram',sum(1 for w in items if w[2]),'noVi',sum(1 for w in items if not w[5]))
print('TOTAL',tot)
json.dump(VOC,open(os.path.join(ROOT,'data','book-lessons','ko-yonsei-vocab.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
json.dump(BL,open(os.path.join(ROOT,'data','book-lessons','ko-yonsei.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(json.dumps(VOC[f'{BOOK}|0'][0][1][:3],ensure_ascii=False))
print(json.dumps(VOC[f'{BOOK}|5'][0][1][:2],ensure_ascii=False))
print([w for w in VOC[f'{BOOK}|2'][0][1] if not w[5]][:2])
