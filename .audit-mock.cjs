/* 가상 데이터 내부 정합성 감사 — 세그먼트 합계 · 티어 분포 · 퍼널 단조성 */
const fs = require('fs');
const src = fs.readFileSync('data.js', 'utf8');
const sandbox = {};
new Function('g', src + '\nObject.assign(g,{seg,liveWorlds,visitedWorlds,visitedShare,visitMedian,visitTop10Share,worldVisitsTotal});')(sandbox);
const { seg } = sandbox;

const SEGS = ['organic', 'paid', 'internal'];
const ADD_SCALAR = ['active90','cumCreators','cumSignup','pubCreators90','pubCreatorsCum','pubWorlds90','pubWorldsCum','earn10','earn100','earn1000'];
const ADD_SERIES = ['statusCum','tierDist','activeTrend','cumC','cumS','cumPub','sprintNew','inflow','outflow','pubWorlds','returnCreators','weeklyNew','mau','coreTrend','tier3plus','tier2plus','tier1plus','communityEngaged','ailabs','referralCreators','utmShare'];

const bad = [];
for (const k of ADD_SCALAR) {
  const sum = SEGS.reduce((a, s) => a + seg[s][k], 0);
  if (sum !== seg.all[k]) bad.push(`scalar  ${k.padEnd(16)} all=${seg.all[k]}  세그먼트합=${sum}  (차 ${seg.all[k] - sum})`);
}
for (const k of ADD_SERIES) {
  const sum = seg.all[k].map((_, i) => SEGS.reduce((a, s) => a + seg[s][k][i], 0));
  if (sum.join() !== seg.all[k].join()) bad.push(`series  ${k.padEnd(16)} all=[${seg.all[k]}]\n        ${' '.repeat(16)} 합=[${sum}]`);
}
// agentShareBuckets 월드 수(각 행 2번째 요소)
{
  const sum = seg.all.agentShareBuckets.map((_, i) => SEGS.reduce((a, s) => a + seg[s].agentShareBuckets[i][1], 0));
  const cur = seg.all.agentShareBuckets.map(r => r[1]);
  if (sum.join() !== cur.join()) bad.push(`buckets 월드 수          all=[${cur}]  합=[${sum}]`);
}
console.log('── 1. 세그먼트 합계가 전체와 안 맞는 항목 ──');
console.log(bad.length ? bad.join('\n') : '없음');

console.log('\n── 2. tierDist와 tierNplus 불일치 (tierDist=[관측대기,기준미달,T3,T2,T1,T0]) ──');
for (const s of ['all', ...SEGS]) {
  const d = seg[s].tierDist;
  const exp = { tier3plus: d[2]+d[3]+d[4]+d[5], tier2plus: d[3]+d[4]+d[5], tier1plus: d[4]+d[5] };
  for (const [k, v] of Object.entries(exp)) {
    const got = seg[s][k].at(-1);
    if (got !== v) console.log(`${s.padEnd(9)} ${k.padEnd(10)} 마지막값=${got}  tierDist에서=${v}`);
  }
  const tot = d.reduce((a, b) => a + b, 0);
  if (tot !== seg[s].pubWorldsCum) console.log(`${s.padEnd(9)} tierDist 합=${tot}  pubWorldsCum=${seg[s].pubWorldsCum}`);
  const st = seg[s].statusCum.reduce((a, b) => a + b, 0);
  if (st !== seg[s].pubWorldsCum) console.log(`${s.padEnd(9)} statusCum 합=${st}  pubWorldsCum=${seg[s].pubWorldsCum}`);
}

console.log('\n── 3. 퍼널 단조성 (가입 cumS ≥ 첫 편집 cumC ≥ 첫 퍼블리시 cumPub) ──');
for (const s of ['all', ...SEGS]) {
  const { cumS, cumC, cumPub, cumSignup, cumCreators, pubCreatorsCum } = seg[s];
  cumS.forEach((v, i) => {
    if (v < cumC[i] || cumC[i] < cumPub[i]) console.log(`${s.padEnd(9)} [${i}] 가입=${v} 첫편집=${cumC[i]} 퍼블=${cumPub[i]}  ← 역전`);
  });
  if (cumS.at(-1) !== cumSignup) console.log(`${s.padEnd(9)} cumS 마지막=${cumS.at(-1)} ≠ cumSignup=${cumSignup}`);
  if (cumC.at(-1) !== cumCreators) console.log(`${s.padEnd(9)} cumC 마지막=${cumC.at(-1)} ≠ cumCreators=${cumCreators}`);
  if (cumPub.at(-1) !== pubCreatorsCum) console.log(`${s.padEnd(9)} cumPub 마지막=${cumPub.at(-1)} ≠ pubCreatorsCum=${pubCreatorsCum}`);
}

console.log('\n── 4. 파생 비율이 구성 요소와 맞는지 ──');
for (const s of ['all', ...SEGS]) {
  const g = seg[s];
  const pc = Math.round(g.pubCreators90 / g.active90 * 100);
  if (pc !== g.pubConv90) console.log(`${s.padEnd(9)} pubConv90=${g.pubConv90}  실제 ${g.pubCreators90}/${g.active90}=${pc}`);
  if (g.activeTrend.at(-1) !== g.active90) console.log(`${s.padEnd(9)} activeTrend 마지막=${g.activeTrend.at(-1)} ≠ active90=${g.active90}`);
  const io = null;
  if (io !== null && io !== g.inout) console.log(`${s.padEnd(9)} inout=${g.inout}  실제 ${g.inflow.at(-1)}/${g.outflow.at(-1)}=${io}`);
}
{
  const ss = seg.all.segShare, exp = SEGS.map(s => seg[s].active90);
  if (ss.join() !== exp.join()) console.log(`all       segShare=[${ss}]  세그먼트 active90=[${exp}]`);
}

console.log('\n── 5. 월드 소비 블록 (mock에 실측값으로 박혀 있음) ──');
const { liveWorlds, visitedWorlds, visitedShare, visitMedian, visitTop10Share, worldVisitsTotal } = sandbox;
visitedWorlds.forEach((v, i) => {
  const exp = +(v / liveWorlds[i] * 100).toFixed(1);
  if (Math.abs(exp - visitedShare[i]) > 0.05) console.log(`[${i}] visitedShare=${visitedShare[i]}  실제 ${v}/${liveWorlds[i]}=${exp}`);
});
console.log(`마지막 달 값: liveWorlds=${liveWorlds.at(-1)} visited=${visitedWorlds.at(-1)} median=${visitMedian.at(-1)} top10=${visitTop10Share.at(-1)} total=${worldVisitsTotal.at(-1)}`);
console.log(`실측 스냅샷(7월 확정):  등재=1167  플레이=162  중앙값=228  top10=84.9  총방문=302297`);
