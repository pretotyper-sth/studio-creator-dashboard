/* 2열 카드 쌍의 «차트 시작 높이»가 어긋나는지 탭별로 실제 렌더 상태에서 잰다 */
const { chromium } = require('/Users/jungsoo.kim/.claude/skills/gstack/node_modules/playwright-core');
const TABS = ['overview', 'acq', 'size', 'ret', 'output', 'agent', 'community'];
(async () => {
  const b = await chromium.launch();
  for (const [name, url] of [['mock', 'http://127.0.0.1:8809/'], ['snap', 'http://127.0.0.1:8809/snapshot/']]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
    await p.goto(url, { waitUntil: 'networkidle' });
    const bad = [];
    for (const t of TABS) {
      const has = await p.evaluate(t => { const btn = document.querySelector(`#tabs button[data-tab="${t}"]`); if (!btn) return false; btn.click(); return true; }, t);
      if (!has) continue;
      await p.waitForTimeout(350);
      const rows = await p.evaluate(() => [...document.querySelectorAll('.row2')]
        .filter(r => r.offsetParent && !r.closest('.tab-hidden'))
        .map(row => {
          const cards = [...row.children].filter(c => c.classList.contains('card'));
          if (cards.length < 2) return null;
          const info = cards.map(c => {
            const cap = c.querySelector(':scope > .cap');
            // na 카드는 본문이 .m-wrap > .m-dim 안으로 옮겨진다
            const host = c.querySelector(':scope > .m-wrap > .m-dim') || c;
            const body = [...host.children].find(el => !el.matches('h3,.cap,.chead,.m-src,.m-warnbar'));
            const chart = c.querySelector('.chartbox');
            const top = e => e ? Math.round(e.getBoundingClientRect().top) : null;
            return { title: (c.querySelector('h3') || {}).innerText?.replace(/\s+/g, ' ').slice(0, 30) || '?',
                     capH: cap ? Math.round(cap.getBoundingClientRect().height) : 0,
                     bodyTop: top(body), chartTop: top(chart) };
          });
          const d = k => { const v = info.map(x => x[k]).filter(x => x != null);
                           return v.length === info.length ? Math.max(...v) - Math.min(...v) : null; };
          return { bodyDrift: d('bodyTop'), chartDrift: d('chartTop'), info };
        }).filter(Boolean));
      rows.forEach(r => { if ((r.bodyDrift||0) > 2 || (r.chartDrift||0) > 2) bad.push({ tab: t, ...r }); });
    }
    console.log(`\n=== ${name}`);
    if (!bad.length) console.log('  모든 2열 쌍의 본문·차트 시작 높이 일치 ✓');
    bad.forEach(r => {
      console.log(`  [${r.tab}] 본문 어긋남 ${r.bodyDrift}px · 차트 어긋남 ${r.chartDrift}px`);
      r.info.forEach(x => console.log(`      ${x.title.padEnd(32)} cap ${String(x.capH).padStart(3)}px · 본문top ${x.bodyTop} · 차트top ${x.chartTop}`));
    });
    await p.close();
  }
  await b.close();
})();
