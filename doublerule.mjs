import { makeGame } from './gamecore.mjs';
const base = { ROWS: 7, COLS: 4, PAWN_ROWS: 2, twoRowScore: true }; // match the live game
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
    if(m.type==='double')sc+=10;
    const rp=a.over?[]:G.allMoves(a,G.other(p));
    if(rp.some(x=>x.type==='capture'&&x.to[0]===m.to[0]&&x.to[1]===m.to[1]))sc-=90;
    if(sc>bs){bs=sc;best=m;}
  } return best;
};}
const randomPick=(G)=>(s)=>{const ms=G.allMoves(s,s.current);return ms[(Math.random()*ms.length)|0];};

function run(label, flags, mk, n){
  const G=makeGame(Object.assign({},base,flags)); const pick=mk(G);
  let W=0,B=0,D=0,len=0,sw=0,sb=0;
  for(let i=0;i<n;i++){ let s=G.initial(),pl=0; while(!s.over&&pl<600){s=G.apply(s,pick(s));pl++;}
    if(s.winner===G.WHITE)W++;else if(s.winner===G.BLACK)B++;else D++;
    len+=pl; sw+=G.deliveredPawns(s,G.WHITE); sb+=G.deliveredPawns(s,G.BLACK); }
  const pct=x=>(100*x/n).toFixed(1)+'%';
  console.log(`${label.padEnd(28)} ties ${pct(D).padStart(6)} | W ${pct(W)} B ${pct(B)} | avg length ${(len/n).toFixed(1)} plies | avg scored ${((sw+sb)/n).toFixed(2)}`);
}

console.log('STRICT vs LEAP double-step (two-row scoring)\n');
console.log('-- random play --');
run('strict (current)', {}, randomPick, 3000);
run('leap-over',        {doubleLeap:true}, randomPick, 3000);
console.log('-- greedy play --');
run('strict (current)', {}, greedy, 2000);
run('leap-over',        {doubleLeap:true}, greedy, 2000);
