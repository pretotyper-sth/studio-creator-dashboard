/* 실측 스냅샷 내부 정합성 감사 — 파생 비율·누적 단조성·합계·레지스트리 짝 */
const fs = require('fs');
const box = {};
new Function('g', fs.readFileSync('snapshot/data.js', 'utf8') + '\nObject.assign(g,{seg,AVAIL,DETAIL,defs,OPS,registryWorlds,visitedWorlds,visitMedian,visitTop10Share,worldVisitsTotal,dailyVisitedAvg,dailyVisitedMax,worldBaseCheck,top10Worlds,months,SNAPSHOT});')(box);
const { seg, AVAIL, DETAIL, defs, OPS, registryWorlds, visitedWorlds, dailyVisitedAvg, dailyVisitedMax, worldBaseCheck, months } = box;
const d = seg.all, out = [];
const P = (label, cond, msg) => { if (!cond) out.push(`${label}: ${msg}`); };

/* 2026-08-07 재판정 이후: na 지표는 수치를 싣지 않으므로 파생 검증을 건너뛴다.
   대신 «na인데 값이 남아 있지 않은지»를 반대로 검사한다. */
const isNA = k => AVAIL[k] && AVAIL[k].s === 'na';

/* 「작업 요청」 탭 — 측정 불가 지표가 전부 어느 작업엔가 걸려 있어야 합니다.
   지표를 늘리고 OPS를 안 늘리면 그 지표는 «언제 풀리는지 모르는» 상태로 남습니다. */
{
  const defKeys = new Set(defs.map(r => r[4]));
  const covered = new Set();
  OPS.forEach(g => g.items.forEach(i => i.m.forEach(k => {
    covered.add(k);
    P('OPS 키', defKeys.has(k), `OPS의 «${i.t}»가 defs에 없는 키 ${k}를 가리킵니다`);
    P('OPS 대상', isNA(k), `OPS의 «${i.t}»가 실측 지표 ${k}를 가리킵니다`);
  })));
  Object.keys(AVAIL).filter(isNA).forEach(k =>
    P('OPS 커버리지', covered.has(k), `${k}가 어느 작업에도 걸려 있지 않습니다`));
}
const NA_SERIES_KEYS = { cumC:'editConv', cumPub:'cumStage', cumUpdate:'updateStage',
  pubWorlds:'pubWorlds', cumPubWorlds:'cumPubWorlds', ttfpDays:'ttfp', ttfpN:'ttfp',
  pubCreators90Trend:'pubCreators' };
const NA_SCALAR_KEYS = { cumCreators:'editConv', editConv:'editConv', pubConv90:'pubCreators',
  pubCreatorsCum:'pubCreators', pubCreators90:'pubCreators', pubWorldsCum:'cumPubWorlds',
  pubWorlds90:'pubWorlds' };
for (const [f, k] of Object.entries(NA_SERIES_KEYS)) {
  if (!isNA(k)) continue;
  P(`${f} 자리표시자`, Array.isArray(d[f]) && d[f].every(v => v === 1),
    `${k}가 na인데 계열에 실수치가 남아 있습니다: [${d[f]}]`);
}
for (const [f, k] of Object.entries(NA_SCALAR_KEYS)) {
  if (!isNA(k)) continue;
  P(`${f} 자리표시자`, d[f] == null, `${k}가 na인데 값이 남아 있습니다: ${d[f]}`);
}
P('warn 티어 잔존', !Object.keys(AVAIL).some(k => AVAIL[k].s === 'warn'),
  'AVAIL은 ok/na 두 가지만 가져야 합니다');

P('activeTrend 마지막', d.activeTrend.at(-1) === d.active90, `${d.activeTrend.at(-1)} vs active90 ${d.active90}`);
// 누적 곡선은 전부 측정 불가로 내려갔습니다(시작점이 서비스 시작이 아님).
// 단조성·퍼널 정합성 대신, 실수로 수치가 되살아나지 않았는지만 봅니다.
for (const k of ['cumLogin', 'cumEditor']) {
  P(`${k} 자리표시자`, d[k].every(v => v === 1), `${k}에 수치가 남아 있습니다: [${d[k]}]`);
}
P('agentVsN 합', d.agentVsN.reduce((a,b)=>a+b,0) === d.active90, `${d.agentVsN.reduce((a,b)=>a+b,0)} vs active90 ${d.active90}`);
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
console.log(`\nAVAIL ${Object.keys(AVAIL).length} (ok ${Object.keys(AVAIL).length-blocked.length} / na ${blocked.length}) · DETAIL ${Object.keys(DETAIL).length} · defs ${defs.length}(키 ${keyed.length})`);
