/* 실제 마우스 드래그 선택 / 목록 표 복사 / 좁은 화면에서의 겹침 */
const { chromium } = require('/Users/jungsoo.kim/.claude/skills/gstack/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8806/snapshot/';
const overlapCheck = () => {
  const tip = document.getElementById('mtip'), t = tip.getBoundingClientRect();
  const anchor = window.__lastAnchor;
  const hits = e => { const r = e.getBoundingClientRect();
    return !(t.right < r.left || t.left > r.right || t.bottom < r.top || t.top > r.bottom); };
  const boxes = [...document.querySelectorAll('.m-warnbar,.m-mask')]
    .filter(e => e.offsetParent && e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().bottom > 0);
  const own = boxes.filter(e => e === anchor || (anchor && (e.contains(anchor) || anchor.contains(e))));
  return {
    // 반드시 0 — 읽고 복사하려는 그 박스를 가리면 안 된다
    coversOwnBox: own.filter(hits).length,
    coversOwnCard: anchor && anchor.closest('.card') ? hits(anchor.closest('.card')) : null,
    // 참고 — 다른 카드 설명과 겹치는 수(페이지가 빽빽하면 0으로 만들 수 없다)
    coversOtherBoxes: boxes.filter(e => !own.includes(e)).filter(hits).length,
    fits: t.top >= -1 && t.bottom <= innerHeight + 1 && t.left >= -1 && t.right <= innerWidth + 1,
  };
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + '#output', { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);

  // A) 목록형 툴팁(상위 10% 월드) — 배지 클릭 후 표 복사
  const chip = p.locator('[data-mlist]:visible').first();
  await chip.scrollIntoViewIfNeeded(); await chip.click();
  await p.evaluate(() => { window.__lastAnchor = document.querySelector('[data-mlist]'); });
  await p.waitForTimeout(300);
  console.log('A) 목록 툴팁 겹침:', JSON.stringify(await p.evaluate(overlapCheck)));
  await p.locator('#mtip .m-copy').click(); await p.waitForTimeout(200);
  const tsv = await p.evaluate(() => navigator.clipboard.readText());
  console.log('   표 복사 %d자, %d줄 · 3줄 미리보기:', tsv.length, tsv.split('\n').length);
  console.log(tsv.split('\n').slice(0, 5).map(l => '     ' + l).join('\n'));

  // B) 실제 마우스로 드래그 선택 → 툴팁이 닫히거나 선택이 풀리지 않아야 한다
  const box = await p.locator('#mtip .lst td.nm').first().boundingBox()
           || await p.locator('#mtip').boundingBox();
  await p.mouse.move(box.x + 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 8 });
  await p.mouse.move(box.x + box.width - 2, box.y + box.height * 3, { steps: 8 }); // 아래로 더 끌기
  await p.mouse.up();
  await p.waitForTimeout(300);
  console.log('B) 드래그 선택:', JSON.stringify(await p.evaluate(() => ({
    open: document.getElementById('mtip').classList.contains('on'),
    selected: String(getSelection()).replace(/\s+/g, ' ').trim().slice(0, 60),
    len: String(getSelection()).length }))));

  // C) 좁고 낮은 화면 — 아래·위 모두 부족한 상황에서 옆으로 피하는지
  for (const vp of [{ width: 1440, height: 560 }, { width: 1100, height: 700 }, { width: 820, height: 640 }]) {
    await p.setViewportSize(vp);
    await p.waitForTimeout(400);
    const res = await p.evaluate(() => {
      const out = [];
      for (const a of [...document.querySelectorAll('.m-warnbar,.m-mask')].filter(e => e.offsetParent)) {
        a.scrollIntoView({ block: 'center' });
        a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const tip = document.getElementById('mtip'), t = tip.getBoundingClientRect();
        const r = a.getBoundingClientRect();
        const ov = !(t.right < r.left || t.left > r.right || t.bottom < r.top || t.top > r.bottom);
        out.push({ key: a.dataset.mk, anchorOverlap: ov,
                   fits: t.top >= -1 && t.bottom <= innerHeight + 1 && t.left >= -1 && t.right <= innerWidth + 1 });
      }
      return out;
    });
    const bad = res.filter(r => r.anchorOverlap || !r.fits);
    console.log(`C) ${vp.width}x${vp.height} — 설명 박스 ${res.length}개 중 문제 ${bad.length}개`,
                bad.length ? JSON.stringify(bad.slice(0, 4)) : '');
  }
  console.log('\n스크립트 오류:', errs.length ? errs : '없음');
  await b.close();
})();
