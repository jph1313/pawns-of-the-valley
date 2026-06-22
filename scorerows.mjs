import { makeGame } from './gamecore.mjs';
const base = { ROWS: 7, COLS: 4, PAWN_ROWS: 2 };
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}

function greedy(G){ return (s)=>{
  const p=s.current,dir=G.dirOf(p); let best=null,bs=-Infinity;
  for(const m of shuffle(G.allMoves(s,p))){
    const a=G.apply(s,m); let sc=0;
    if(a.winner===p)sc+=10000;
    sc+=(G.deliveredPawns(a,p)-G.deliveredPawns(s,p))*400;
    if(m.type==='capture')sc+=120;
    sc+=dir*(m.to[0]-m.from[0])*15;
    if(m.type==='climb')sc+=8;
    const rp=a.over?[]:G.allMoves(a,G.other(p));
    if(rp.some(x=>x.type==='capture'&&x.to[0]===m.to[0]&&x.to[1]===m.to[1]))sc-=90;
    if(sc>bs){bs=sc;best=m;}
  } return best;
};}
function evalState(G){ return (s)=>{ let sc=0;
  for(let r=0;r<G.ROWS;r++)for(let c=0;c<G.COLS;c++)for(const p of s.board[r][c]){ sc+=(p===G.WHITE?1:-1)*(p===G.WHITE?r:G.ROWS-1-r); }
  sc+=(G.deliveredPawns(s,G.WHITE)-G.deliveredPawns(s,G.BLACK))*100; sc+=(s.capW-s.capB)*2; return sc; };}
function minimax(G,depth){ const ev=evalState(G);
  function mm(s,d,al,be){ if(s.over||d===0)return ev(s); const ms=shuffle(G.allMoves(s,s.current));
    if(s.current===G.WHITE){let v=-Infinity;for(const m of ms){v=Math.max(v,mm(G.apply(s,m),d-1,al,be));al=Math.max(al,v);if(be<=al)break;}return v;}
    else{let v=Infinity;for(const m of ms){v=Math.min(v,mm(G.apply(s,m),d-1,al,be));be=Math.min(be,v);if(be<=al)break;}return v;} }
  return (s)=>{ const p=s.current; let best=null,bs=p===G.WHITE?-Infinity:Infinity;
    for(const m of shuffle(G.allMoves(s,p))){ const v=mm(G.apply(s,m),depth-1,-Infinity,Infinity); if(p===G.WHITE?v>bs:v<bs){bs=v;best=m;} } return best; };}
const randomPick=(G)=>(s)=>{const ms=G.allMoves(s,s.current);return ms[(Math.random()*ms.length)|0];};

function run(label, flags, mk, n){
  const G=makeGame(Object.assign({},base,flags)); const pick=mk(G);
  let W=0,B=0,D=0,sw=0,sb=0,len=0;
  for(let i=0;i<n;i++){ let s=G.initial(),pl=0; while(!s.over&&pl<500){s=G.apply(s,pick(s));pl++;}
    if(s.winner===G.WHITE)W++;else if(s.winner===G.BLACK)B++;else D++;
    sw+=G.deliveredPawns(s,G.WHITE);sb+=G.deliveredPawns(s,G.BLACK);len+=pl; }
  const pct=x=>(100*x/n).toFixed(1)+'%';
  console.log(`${label.padEnd(34)} ties ${pct(D).padStart(6)} | W ${pct(W)} B ${pct(B)} | avg scored W ${(sw/n).toFixed(2)} B ${(sb/n).toFixed(2)} | len ${(len/n).toFixed(0)}`);
}

console.log('ONE-ROW vs TWO-ROW SCORING (real 4x7)\n');
console.log('-- random play --');
run('one-row  (current)', {}, randomPick, 3000);
run('two-row  (proposed)', {twoRowScore:true}, randomPick, 3000);
console.log('-- greedy play --');
run('one-row  (current)', {}, greedy, 2000);
run('two-row  (proposed)', {twoRowScore:true}, greedy, 2000);
console.log('-- depth-3 play --');
run('one-row  (current)', {}, (G)=>minimax(G,3), 500);
run('two-row  (proposed)', {twoRowScore:true}, (G)=>minimax(G,3), 500);
