import { makeGame } from './gamecore.mjs';
const G = makeGame({ ROWS: 7, COLS: 4, PAWN_ROWS: 2 });
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}

function greedyPick(s){
  const player=s.current,dir=G.dirOf(player);let best=null,bs=-Infinity;
  for(const m of shuffle(G.allMoves(s,player))){
    const a=G.apply(s,m);let sc=0;
    if(a.winner===player)sc+=10000;
    sc+=(G.deliveredPawns(a,player)-G.deliveredPawns(s,player))*400;
    if(m.type==='capture')sc+=120;
    sc+=dir*(m.to[0]-m.from[0])*15;
    if(m.type==='climb')sc+=8;
    const rp=a.over?[]:G.allMoves(a,G.other(player));
    if(rp.some(x=>x.type==='capture'&&x.to[0]===m.to[0]&&x.to[1]===m.to[1]))sc-=90;
    if(sc>bs){bs=sc;best=m;}
  }
  return best;
}
const standard=(p)=>G.homeCells(p).slice();
const random=(p)=>{const c=G.homeCells(p),o=[];for(let i=0;i<8;i++)o.push(c[(Math.random()*c.length)|0]);return o;};
// "wall": 2 pawns on every back-row cell (only possible via setup)
const wall=(p)=>{const r=(p===G.WHITE)?0:G.ROWS-1,o=[];for(let c=0;c<G.COLS;c++){o.push([r,c]);o.push([r,c]);}return o;};

function play(s0,maxP=600){let s=s0,p=0;while(!s.over&&p<maxP){s=G.apply(s,greedyPick(s));p++;}return s;}
function run(label,wf,bf,n){
  let W=0,B=0,D=0,sw=0,sb=0;
  for(let i=0;i<n;i++){const s=play(G.stateFromPlacements(wf(G.WHITE),bf(G.BLACK)));
    if(s.winner===G.WHITE)W++;else if(s.winner===G.BLACK)B++;else D++;
    sw+=G.deliveredPawns(s,G.WHITE);sb+=G.deliveredPawns(s,G.BLACK);}
  const pct=x=>(100*x/n).toFixed(1)+'%';
  console.log(`${label.padEnd(34)} W ${pct(W)} | B ${pct(B)} | tie ${pct(D)}  (avg delivered W ${(sw/n).toFixed(2)} / B ${(sb/n).toFixed(2)})`);
}
console.log('IS THE BACK-ROW WALL DEGENERATE?  (greedy play, n=800)\n');
run('White WALL vs Black standard', wall, standard, 800);
run('White WALL vs Black random',   wall, random, 800);
run('White WALL vs Black WALL',     wall, wall, 800);
run('White standard vs Black standard (ref)', standard, standard, 800);
