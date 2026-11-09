import re
L=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
V=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
# batchim index -> (jongseong char) 
T=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
LC=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
SPLIT={'ㄳ':('ㄱ','ㅅ'),'ㄵ':('ㄴ','ㅈ'),'ㄶ':('ㄴ','ㅎ'),'ㄺ':('ㄹ','ㄱ'),'ㄻ':('ㄹ','ㅁ'),'ㄼ':('ㄹ','ㅂ'),'ㄽ':('ㄹ','ㅅ'),'ㄾ':('ㄹ','ㅌ'),'ㄿ':('ㄹ','ㅍ'),'ㅀ':('ㄹ','ㅎ'),'ㅄ':('ㅂ','ㅅ')}
REP={'ㄲ':'ㄱ','ㅋ':'ㄱ','ㅅ':'ㄷ','ㅆ':'ㄷ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅌ':'ㄷ','ㅍ':'ㅂ'}
TENSE={'ㄱ':'ㄲ','ㄷ':'ㄸ','ㅂ':'ㅃ','ㅅ':'ㅆ','ㅈ':'ㅉ'}
ASP={'ㄱ':'ㅋ','ㄷ':'ㅌ','ㅂ':'ㅍ','ㅈ':'ㅊ'}
JC={'ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng'}
def dec(c):
    o=ord(c)-0xAC00; return [LC[o//588], o%588//28, T[o%28]]   # [초성 jamo, 중성 idx, 종성 jamo]
def syl_run(run):
    S=[dec(c) for c in run]
    # 종성 처리
    for i,s in enumerate(S):
        nxt=S[i+1] if i+1<len(S) else None
        j=s[2]
        if not j: continue
        if nxt is None:
            if j in SPLIT: j=SPLIT[j][0] if j not in('ㄺ','ㄻ','ㄼ') else ('ㄱ' if j=='ㄺ' else 'ㅁ' if j=='ㄻ' else 'ㄹ')
            j=REP.get(j,j); s[2]=j; continue
        n0=nxt[0]
        if n0=='ㅇ':   # 연음
            if j=='ㅇ': continue
            if j=='ㅎ': s[2]=''; continue
            if j in ('ㄶ','ㅀ'): s[2]=''; nxt[0]=SPLIT[j][0]; continue
            if j in SPLIT:
                a,b=SPLIT[j]; s[2]=a; nxt[0]='ㅆ' if b=='ㅅ' else b
            else:
                s[2]=''; nxt[0]=j
            # 구개음화 (같이, 굳이): ㄷ/ㅌ + 이 -> ㅈ/ㅊ
            if nxt[1]==20 and nxt[0] in('ㄷ','ㅌ'):
                nxt[0]={'ㄷ':'ㅈ','ㅌ':'ㅊ'}[nxt[0]]
            continue
        # ㅎ 축약 (많다 -> 만타, 깨끗하다 -> 깨끄타다)
        base=SPLIT[j][0] if j in ('ㄶ','ㅀ') else j
        if j in ('ㄶ','ㅀ') and n0 in ASP:
            s[2]=base; nxt[0]=ASP[n0]; continue
        if j=='ㅎ' and n0 in ASP:
            s[2]=''; nxt[0]=ASP[n0]; continue
        if j in SPLIT and SPLIT[j][1]=='ㅎ' and n0 in ASP:
            s[2]=SPLIT[j][0]; nxt[0]=ASP[n0]; continue
        if j=='ㅎ' and n0=='ㅅ':
            s[2]=''; nxt[0]='ㅆ'; continue
        if n0=='ㅎ':
            ASPB={'ㄱ':'ㅋ','ㄲ':'ㅋ','ㅋ':'ㅋ','ㄷ':'ㅌ','ㅅ':'ㅌ','ㅆ':'ㅌ','ㅌ':'ㅌ','ㅈ':'ㅊ','ㅊ':'ㅊ','ㅂ':'ㅍ','ㅍ':'ㅍ'}
            if j in ASPB:
                nxt[0]=ASPB[j]; s[2]=''; continue
            if j in SPLIT and SPLIT[j][1] in ASPB:
                s[2]=SPLIT[j][0]; nxt[0]=ASPB[SPLIT[j][1]]; continue
        # 대표음
        if j in SPLIT:
            j={'ㄳ':'ㄱ','ㄵ':'ㄴ','ㄶ':'ㄴ','ㄺ':'ㄱ','ㄻ':'ㅁ','ㄼ':'ㄹ','ㄽ':'ㄹ','ㄾ':'ㄹ','ㄿ':'ㅂ','ㅀ':'ㄹ','ㅄ':'ㅂ'}[j]
        j=REP.get(j,j)
        if j in('ㄱ','ㄷ','ㅂ'):
            if n0 in TENSE: nxt[0]=TENSE[n0]
            elif n0 in('ㄴ','ㅁ'): j={'ㄱ':'ㅇ','ㄷ':'ㄴ','ㅂ':'ㅁ'}[j]
            elif n0=='ㄹ': nxt[0]='ㄴ'; j={'ㄱ':'ㅇ','ㄷ':'ㄴ','ㅂ':'ㅁ'}[j]
        elif j=='ㅇ' or j=='ㅁ':
            if n0=='ㄹ': nxt[0]='ㄴ'
        elif j=='ㄴ':
            if n0=='ㄹ': j='ㄹ'; nxt[0]='ㄹ'
        elif j=='ㄹ':
            if n0=='ㄴ': nxt[0]='ㄹ'
        s[2]=j
    out=[]
    for c,v,j in S:
        i=LC.index(c) if c in LC else 11
        onset=L[i]
        if c=='ㄹ': onset='r'
        out.append([onset,V[v],j])
    # ㄹ 초성 'l' 처리: 앞 종성이 ㄹ이면 l
    for k in range(len(out)):
        if S[k][0]=='ㄹ' and k>0 and S[k-1][2]=='ㄹ': out[k][0]='l'
    res=[]
    for o,v,j in out:
        jj={'ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng','':''}.get(j,'')
        res.append(o+v+jj)
    return '-'.join(res)
def romanize(text):
    out=[];run=''
    for ch in str(text):
        if '\uac00'<=ch<='\ud7a3': run+=ch
        else:
            if run: out.append(syl_run(run)); run=''
            out.append(ch)
    if run: out.append(syl_run(run))
    return ''.join(out)
if __name__=='__main__':
    for w in ['가다','국적','간호사','그렇습니다','좋아요','있어요','학교','없어요','한국어','먹었어요','읽다','밝다','꽃이','십육','선릉','신라','독립','합니다','입학','맛있다','넓다']: print(w,romanize(w))
