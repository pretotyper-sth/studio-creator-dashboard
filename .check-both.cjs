const { chromium } = require('/Users/jungsoo.kim/.claude/skills/gstack/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch();
  for (const [name, url] of [['mock', 'http://127.0.0.1:8796/'], ['snapshot', 'http://127.0.0.1:8796/snapshot/']]) {
    const p = await b.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    await p.goto(url, { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => {
      const bad = [];
      // 차트/카드가 비어 있는지
      document.querySelectorAll('.webchart').forEach(c => { if (!c.children.length) bad.push('빈 차트 #' + c.id); });
      document.querySelectorAll('[id$="Stat"],[id$="Kpis"],[id$="Compare"],[id$="Box"]').forEach(c => {
        if (!c.innerHTML.trim()) bad.push('빈 컨테이너 #' + c.id);
      });
      // NaN/undefined 누출
      const t = document.body.innerText;
      ['NaN', 'undefined', 'Infinity', '[object'].forEach(k => { if (t.includes(k)) bad.push('본문에 ' + k); });
      // 배지↔레지스트리 짝
      let orphan = [];
      if (typeof AVAIL !== 'undefined') {
        document.querySelectorAll('[data-m]').forEach(el => {
          const k = el.getAttribute('data-m');
          if (!AVAIL[k]) orphan.push('AVAIL 없음: ' + k);
          // 실측(ok)은 배지를 안 그리므로 DETAIL이 필요 없다
          else if (AVAIL[k].s !== 'ok' && typeof DETAIL !== 'undefined' && !DETAIL[k]) orphan.push('DETAIL 없음: ' + k);
        });
        Object.keys(DETAIL || {}).forEach(k => { if (!AVAIL[k]) orphan.push('고아 DETAIL: ' + k); });
      }
      return { bad, orphan: [...new Set(orphan)], tabs: document.querySelectorAll('.tab,[data-tab]').length,
               cards: document.querySelectorAll('.card').length, len: t.length };
    });
    console.log(`\n[${name}] 카드 ${r.cards}개 · 본문 ${r.len}자`);
    console.log('  콘솔 오류:', errs.filter(e => !/favicon/.test(e)).length ? errs : '없음');
    console.log('  렌더 이상:', r.bad.length ? r.bad : '없음');
    console.log('  레지스트리:', r.orphan.length ? r.orphan : '없음');
    await p.close();
  }
  await b.close();
})();
