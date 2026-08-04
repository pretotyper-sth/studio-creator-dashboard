/* 실측 스냅샷 내부 정합성 감사 — 파생 비율·누적 단조성·합계·레지스트리 짝 */
const fs = require('fs');
const box = {};
new Function('g', fs.readFileSync('snapshot/data.js', 'utf8') + '\nObject.assign(g,{seg,AVAIL,DETAIL,defs,registryWorlds,visitedWorlds,visitMedian,visitTop10Share,worldVisitsTotal,dailyVisitedAvg,dailyVisitedMax,worldBaseCheck,top10Worlds,medianDecomp,months,SNAPSHOT});')(box);
const { seg, AVAIL, DETAIL, defs, registryWorlds, visitedWorlds, dailyVisitedAvg, dailyVisitedMax, worldBaseCheck, months } = box;
const d = seg.all, out = [];
const P = (label, cond, msg) => { if (!cond) out.push(`${label}: ${msg}`); };

P('cumC 마지막', d.cumC.at(-1) === d.cumCreators, `${d.cumC.at(-1)} vs cumCreators ${d.cumCreators}`);
P('cumPub 마지막', d.cumPub.at(-1) === d.pubCreatorsCum, `${d.cumPub.at(-1)} vs pubCreatorsCum ${d.pubCreatorsCum}`);
P('activeTrend 마지막', d.activeTrend.at(-1) === d.active90, `${d.activeTrend.at(-1)} vs active90 ${d.active90}`);
for (const k of ['cumC', 'cumPub', 'cumLogin', 'cumS', 'pubWorldsCumSeries']) {
  if (!d[k]) continue;
  d[k].forEach((v, i) => { if (i && v < d[k][i - 1]) out.push(`${k} 비단조: [${i}] ${d[k][i-1]}→${v}`); });
}
P('퍼널 순서', d.cumLogin.every((v, i) => v >= d.cumC[i] && d.cumC[i] >= d.cumPub[i]), '로그인 ≥ 첫편집 ≥ 첫퍼블 위반');
P('pubConv90', Math.round(d.pubCreators90 / d.active90 * 100) === d.pubConv90, `${d.pubConv90} vs ${Math.round(d.pubCreators90/d.active90*100)}`);
P('editConv', Math.round(d.cumCreators / d.cumLogin.at(-1) * 100) === d.editConv, `${d.editConv} vs ${Math.round(d.cumCreators/d.cumLogin.at(-1)*100)}`);
P('tierDist 합', AVAIL.tier.s !== 'ok' || d.tierDist.reduce((a,b)=>a+b,0) === d.pubWorldsCum, `${d.tierDist.reduce((a,b)=>a+b,0)} vs pubWorldsCum ${d.pubWorldsCum}`);
P('agentVsN 합', d.agentVsN.reduce((a,b)=>a+b,0) === d.active90, `${d.agentVsN.reduce((a,b)=>a+b,0)} vs active90 ${d.active90}`);
if (d.agentVsPubN) {
  const exp = d.agentVsPubN.map((n, i) => +(n / d.agentVsN[i] * 100).toFixed(1));
  P('agentVs.pubConv', exp.every((v, i) => Math.abs(v - d.agentVs.pubConv[i]) <= 0.15), `${d.agentVs.pubConv} vs ${exp}`);
}
P('pubWorlds 합 ≤ 누적', d.pubWorlds.reduce((a,b)=>a+b,0) <= d.pubWorldsCum, `기간합 ${d.pubWorlds.reduce((a,b)=>a+b,0)} > 누적 ${d.pubWorldsCum}`);
visitedWorlds.forEach((v, i) => {
  P(`플레이월드[${i}]`, v <= registryWorlds[i], `${v} > 등재 ${registryWorlds[i]}`);
  if (dailyVisitedAvg) P(`일평균[${i}]`, dailyVisitedAvg[i] <= v && v <= registryWorlds[i], `일평균 ${dailyVisitedAvg[i]} / 월 ${v}`);
  if (dailyVisitedMax) P(`일최대[${i}]`, dailyVisitedMax[i] >= dailyVisitedAvg[i] && dailyVisitedMax[i] <= v, `최대 ${dailyVisitedMax[i]} vs 월 ${v}`);
});
if (worldBaseCheck) {
  const w = worldBaseCheck;
  P('worldBaseCheck 순서', w.registry >= w.everCooked && w.everCooked >= w.everPublished, JSON.stringify(w));
  P('worldBaseCheck.visited', w.visited === visitedWorlds.at(-1), `${w.visited} vs ${visitedWorlds.at(-1)}`);
  P('worldBaseCheck.registry', w.registry === registryWorlds.at(-1), `${w.registry} vs ${registryWorlds.at(-1)}`);
}
P('months 길이', months.length === d.activeTrend.length, `months ${months.length} vs 계열 ${d.activeTrend.length}`);

// defs ↔ AVAIL 짝 (defs 5번째 요소 = 지표 키)
const keyed = defs.filter(r => r[4]).map(r => r[4]);
const dup = keyed.filter((k, i) => keyed.indexOf(k) !== i);
P('defs 키 중복', !dup.length, dup.join(','));
const noAvail = keyed.filter(k => !AVAIL[k]);
P('defs 키에 AVAIL 없음', !noAvail.length, noAvail.join(','));
const blocked = Object.keys(AVAIL).filter(k => AVAIL[k].s !== 'ok');
const noDef = blocked.filter(k => !keyed.includes(k));
P('막힌 지표인데 defs 설명 없음', !noDef.length, noDef.join(','));
const noDetail = blocked.filter(k => !DETAIL[k]);
P('막힌 지표인데 DETAIL 없음', !noDetail.length, noDetail.join(','));

console.log(out.length ? '문제:\n  ' + out.join('\n  ') : '전 항목 통과 ✓');
console.log(`\nAVAIL ${Object.keys(AVAIL).length} (ok ${Object.keys(AVAIL).length-blocked.length}/warn ${blocked.filter(k=>AVAIL[k].s==='warn').length}/na ${blocked.filter(k=>AVAIL[k].s==='na').length}) · DETAIL ${Object.keys(DETAIL).length} · defs ${defs.length}(키 ${keyed.length})`);
