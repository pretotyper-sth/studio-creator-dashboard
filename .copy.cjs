/* 설명 복사 동작 점검: 겹침 / 드래그 선택 / 복사 내용 */
const { chromium } = require('/Users/jungsoo.kim/.claude/skills/gstack/node_modules/playwright-core');
const URL = process.env.U || 'http://127.0.0.1:8805/snapshot/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL + '#output', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);

  // 1) 배너를 클릭해 툴팁 고정 → 설명 박스와 겹치는지 확인
  await p.locator('.m-warnbar:visible').first().scrollIntoViewIfNeeded();
  const banner = p.locator('.m-warnbar:visible').first();
  await banner.click({ position: { x: 200, y: 10 } });
  await p.waitForTimeout(300);
  const overlap = await p.evaluate(() => {
    const tip = document.getElementById('mtip');
    const anchors = [...document.querySelectorAll('.m-warnbar,.m-mask')];
    const t = tip.getBoundingClientRect();
    const hit = anchors.map(a => a.getBoundingClientRect())
      .filter(r => r.width && r.bottom > 0 && r.top < innerHeight)
      .filter(r => !(t.right < r.left || t.left > r.right || t.bottom < r.top || t.top > r.bottom));
    return { pinned: tip.classList.contains('pinned'), visible: tip.classList.contains('on'),
             tip: { top: Math.round(t.top), left: Math.round(t.left), h: Math.round(t.height) },
             overlapCount: hit.length,
             inViewport: t.top >= 0 && t.bottom <= innerHeight + 1 && t.left >= 0 && t.right <= innerWidth + 1 };
  });
  console.log('1) 툴팁 고정·겹침:', JSON.stringify(overlap));

  // 2) 고정 상태에서 마우스를 멀리 옮겨도 유지되는가
  await p.mouse.move(20, 20);
  await p.waitForTimeout(400);
  console.log('2) 마우스 이동 후 유지:', await p.evaluate(() => document.getElementById('mtip').classList.contains('on')));

  // 3) 툴팁 안 텍스트를 드래그로 선택
  const sel = await p.evaluate(() => {
    const tip = document.getElementById('mtip');
    const tx = tip.querySelector('.tx'); if (!tx) return null;
    const r = document.createRange(); r.selectNodeContents(tx);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    return { len: String(s).length, sample: String(s).slice(0, 40),
             userSelect: getComputedStyle(tx).userSelect };
  });
  console.log('3) 툴팁 텍스트 선택:', JSON.stringify(sel));

  // 4) 복사 버튼 → 클립보드 내용
  await p.locator('#mtip .m-copy').click();
  await p.waitForTimeout(250);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  console.log('4) 복사 버튼 라벨:', await p.locator('#mtip .m-copy').textContent());
  console.log('   클립보드 %d자 · 앞부분:\n---\n%s\n---', clip.length, clip.slice(0, 420));

  // 5) 배너 자체 드래그 선택 가능한지 (user-select)
  console.log('5) 설명 박스 user-select:', await p.evaluate(() => {
    const w = document.querySelector('.m-warnbar .t'), m = document.querySelector('.m-mask .m-w');
    return { warnbar: w && getComputedStyle(w).userSelect, mask: m && getComputedStyle(m).userSelect };
  }));

  // 6) 닫기 버튼
  await p.locator('#mtip .m-tclose').click();
  await p.waitForTimeout(200);
  console.log('6) 닫기 후:', await p.evaluate(() => document.getElementById('mtip').classList.contains('on')));

  // 7) 측정 불가 카드의 마스크 복사 버튼
  await p.evaluate(() => { const t = document.querySelector('#tabs button[data-tab="agent"]'); t && t.click(); });
  await p.waitForTimeout(400);
  const maskBtn = p.locator('.m-mask:visible .m-copy').first();
  await maskBtn.scrollIntoViewIfNeeded();
  await maskBtn.click();
  await p.waitForTimeout(250);
  const clip2 = await p.evaluate(() => navigator.clipboard.readText());
  console.log('7) 마스크 복사 %d자 · 앞부분: %s', clip2.length, clip2.slice(0, 140).replace(/\n/g, ' ⏎ '));

  console.log('\n콘솔/스크립트 오류:', errs.length ? errs : '없음');
  await b.close();
})();
