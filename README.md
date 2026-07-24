# Studio Creator Dashboard (Prototype)

지표 정의 얼라인용 정적 FE 시안. 맥북 서버 없이 GitHub Pages로 상시 조회 가능.

- 데이터: 가상(mock) — `data.js`로 분리. 실측 전환 시 이 파일만 쿼리 파이프라인 출력으로 교체
- 차트: 의존성 없는 네이티브 SVG (`index.html` 인라인 스크립트)
- 퍼널 회원가입 소스: `WEB_ACCOUNT_CREATE` 기준 (Hub 웹로그 user_id는 커버리지 부족 — 7/22 분석 결론)
- 월 추이 차트의 마지막 포인트(오늘 기준 부분 집계)는 점선/반투명으로 표시

## 로컬 실행

```bash
python3 -m http.server 8787
# http://localhost:8787
```

## 배포

`main` 푸시 시 GitHub Pages 자동 배포 (`.github/workflows/pages.yml`)
