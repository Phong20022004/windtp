import sys,re,json,glob,os,collections,datetime
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from parse_es import *
files=glob.glob(BASE+'/**/*.xlsx',recursive=True)
def F(folder_sub,name):
    for f in files:
        rel=os.path.relpath(f,BASE)
        if rel.split(os.sep)[0].startswith(folder_sub) and os.path.basename(f)==name: return f
    raise SystemExit('missing '+folder_sub+name)
VN=set('ạảãàáâậầẩẫấăặằẳẵắẹẻẽèéêệềểễếịỉĩìíọỏõòóôộồổỗốơợờởỡớụủũùúưựừửữứỵỷỹỳýđĐ')
def vnr(s):
    L=[c for c in s if c.isalpha()]
    return sum(c in VN for c in L)/max(1,len(L))
def pairs(txt):
    txt=re.sub(r'\s+',' ',str(txt or '')).strip()
    if not txt: return []
    parts=txt.split(' — ')
    if len(parts)==1: return [(txt,'')]
    if len(parts)==2: return [(parts[0].strip(),parts[1].strip())]
    out=[];cur=parts[0].strip()
    for k in range(1,len(parts)-1):
        mid=parts[k]
        bs=[m.end() for m in re.finditer(r'(?<=[.!?…])\s+(?=[¿¡A-ZÁÉÍÓÚÑ"“])',mid)]
        if not bs:
            out.append((cur,mid.strip())); cur=''; continue
        best=max(bs,key=lambda p:vnr(mid[:p])-vnr(mid[p:]))
        out.append((cur,mid[:best].strip())); cur=mid[best:].strip()
    out.append((cur,parts[-1].strip()))
    return out
def vocab_words(ws):
    seen=set();res=[]
    for w in ws:
        k=w['t'].lower()
        if k in seen: continue
        seen.add(k)
        res.append([w['t'],w['ipa'],w['pos'],w['vi'],w['ex'],w['exvi']])
    return res
def group(ws):
    g=collections.OrderedDict()
    for w in ws: g.setdefault(w['u'],[]).append(w)
    return g
MAXC=100
def volume(units, namer=None):
    """units: list of (unit_no, [words]) -> lessons chunked <=MAXC words, sequential numbering"""
    lessons=[];meta=[]
    for u,ws in units:
        words=vocab_words(ws)
        if not words: continue
        n=-(-len(words)//MAXC); size=-(-len(words)//n)
        for p in range(n):
            chunk=words[p*size:(p+1)*size]
            if not chunk: continue
            no=len(lessons)+1
            if namer: nm=namer(u,p,n)
            else: nm=f'Unidad {u}'+(f' · phần {p+1}/{n}' if n>1 else '')
            pv=' · '.join(c[0] for c in chunk[:3])
            lessons.append([no,chunk]); meta.append([nm,pv,no,len(chunk),'Từ Vựng'])
    return lessons,meta
def load_units(*paths):
    merged=collections.OrderedDict()
    for p in paths:
        for u,ws in group(read_vocab(p)).items():
            merged.setdefault(u,[]).extend(ws)
    return sorted(merged.items(),key=lambda x:x[0])
VOC={};BL={}
def add(book,vi,units,namer=None):
    l,m=volume(units,namer); VOC[f'{book}|{vi}']=l; BL.setdefault(f'es|{book}',{})[vi]=m
AU='Aula Internacional';PR='Nuevo Prisma';NE='Nuevo Español sin Fronteras'
add(AU,0,load_units(F('AULA','AULA A1.xlsx'),F('AULA','AULA A1-2.xlsx')))
add(AU,1,load_units(F('AULA','AULA A2.xlsx'),F('AULA','AULA A2-2.xlsx')))
add(AU,2,load_units(F('AULA','AULA B1.xlsx')))
add(AU,3,load_units(F('AULA','AULA B2.xlsx')))
add(AU,4,load_units(F('AULA','AULA C1.xlsx')))
pr=lambda n:F('NEU PRISMA',f'NEU PRISMA {n}.xlsx')
for i,n in enumerate(['A1','A2','B1','B2']): add(PR,i,load_units(pr(n)))
c1=load_units(pr('C1'))
idi=read_vocab(pr('C1+2'))
add(PR,4,c1)   # C1; idioms C1+2 appended below
add(PR,5,load_units(pr('C2')))
# thành ngữ C1+C2: thêm cuối quyển C1
idw=vocab_words(idi)
n=-(-len(idw)//MAXC);size=-(-len(idw)//n)
for p in range(n):
    ch=idw[p*size:(p+1)*size];no=len(VOC[f'{PR}|4'])+1
    VOC[f'{PR}|4'].append([no,ch]);BL[f'es|{PR}'][4].append([f'Thành ngữ C1–C2'+(f' · phần {p+1}/{n}' if n>1 else ''),' · '.join(c[0] for c in ch[:3]),no,len(ch),'Từ Vựng'])
ne=lambda n:F('NEU ESPANOL',f'ESPANOL {n}.xlsx')
add(NE,0,load_units(ne('A1')))
add(NE,1,load_units(ne('A1A2')))
add(NE,2,load_units(ne('A2')))
add(NE,3,load_units(ne('B1')))
add(NE,4,load_units(ne('B2')))
TOP=['Con người','Gia đình','Nhà cửa','Ăn uống','Trường học','Gia đình & họ hàng (mở rộng)','Thời gian & lịch','Thành phố & khu phố','Mua bán & chi tiêu','Du lịch & kỳ nghỉ','Mua sắm','Tiền & ngân hàng','Giờ giấc','Thời tiết & khí hậu','Thiên nhiên & môi trường','Sức khỏe & y tế','Cơ thể','Thể thao','Giải trí & sở thích','Điện ảnh','Công nghệ & Internet','Điện thoại','Truyền thông & tin tức','Cảm xúc','Giao tiếp','Khoa học','Luật pháp','Chính phủ & chính trị','Đất nước & châu lục','Học tập & giáo dục','Kinh doanh & công việc','Nghiên cứu khoa học','Công nghiệp','Nông nghiệp','Sinh hoạt hằng ngày','Khách sạn & lưu trú','Xã hội']
TB='Từ vựng theo chủ đề'
tf=[f for f in files if os.path.basename(f).startswith('CH')][0]
add(TB,0,load_units(tf),lambda u,p,n:f'Chủ đề {u}: {TOP[u-1] if 0<u<=len(TOP) else ""}'+(f' ({p+1}/{n})' if n>1 else ''))
# ngữ pháp
GB='Cấu trúc ngữ pháp'
gf=[f for f in files if 'PH' in os.path.basename(f) and os.path.basename(f).startswith('C') and 'NEU' not in f and 'AULA' not in f and 'CH' != os.path.basename(f)[:2]]
gf=[f for f in files if os.path.dirname(f).split(os.sep)[-1].startswith('C') and not os.path.basename(f).startswith('CH')][0]
ws=openpyxl.load_workbook(gf,data_only=True).worksheets[0]
G=collections.OrderedDict();gram_all=[]
for r in ws.iter_rows(values_only=True):
    r=list(r)+[None]*6; L=lvl(r[0])
    if not L or not r[1]: continue
    pr_=pairs(r[4]); e1=pr_[0] if pr_ else ('',''); e2=pr_[1] if len(pr_)>1 else ('','')
    eq=str(r[3] or '').strip(); eq='' if eq in ('—','-') else eq
    item=[str(r[1]).strip(),eq,'Cấu trúc',str(r[2] or '').strip(),e1[0],e1[1],e2[0],e2[1]]
    G.setdefault(L[0],[]).append(item)
gl=[];gm=[]
for u,items in sorted(G.items()):
    n=-(-len(items)//10)
    for p in range(n):
        ch=items[p*10:(p+1)*10]; no=len(gl)+1
        gl.append([no,ch]); gm.append([f'Nhóm {u}'+(f' · phần {p+1}/{n}' if n>1 else ''),' · '.join(c[0].split(' (')[0] for c in ch[:2]),no,len(ch),'Cấu Trúc'])
VOC[f'{GB}|0']=gl; BL[f'es|{GB}']={0:gm}
json.dump(VOC,open(os.path.join(ROOT,'data','vocab','es.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
json.dump(BL,open(os.path.join(ROOT,'data','book-lessons','es.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
tw=0
for k,v in VOC.items():
    n=sum(len(x[1]) for x in v); tw+=n; print(k.ljust(42),'lessons',len(v),'words',n)
print('TOTAL',tw, os.path.getsize(''+os.path.join(ROOT,'data','vocab','es.json')+'')//1024,'KB')
# kiểm tra chất lượng
noex=sum(1 for k,v in VOC.items() for l in v for w in l[1] if not w[4]);novi=sum(1 for k,v in VOC.items() for l in v for w in l[1] if not w[5] and not k.startswith(GB))
print('no example',noex,'no exVi (vocab)',novi)
print(json.dumps(gl[0][1][:2],ensure_ascii=False))
