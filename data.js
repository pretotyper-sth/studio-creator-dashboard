/* 가상(mock) 데이터 — 실측 전환 시 이 파일만 쿼리 파이프라인 출력으로 교체 */

/* ★ 내부 정합성 재정합 (2026-08-04)
   실측 스냅샷 검증 과정에서 «지표끼리 서로 안 맞는» 문제가 여기에도 있는 것을 확인해
   세그먼트(Independent/Partner/내부)를 진실로 두고 all을 전부 재계산했습니다.

   1) 합계가 안 맞던 항목 — all이 세그먼트 합과 달랐습니다. 22개 계열 전부 재계산.
      pubCreatorsCum 210→215 · pubWorldsCum 430→435 · cumSignup 1150→1178 등
   2) 티어 계열이 분포와 모순 — tier2plus 마지막값이 26인데 tierDist에서 역산하면 15였습니다.
      tierDist(합=pubWorldsCum 검증 통과)를 기준으로 tier3plus/2plus/1plus를 리스케일하고
      T3+ ⊇ T2+ ⊇ T1+ 포함관계를 모든 지점에서 강제했습니다.
   3) 코어 크리에이터가 정의를 위반 — «10h+ AND Tier2+ 월드 보유»인데 값(25)이
      Tier2+ 월드 수(15)보다 많았습니다. 월드는 공동 소유가 아니므로 불가능한 값입니다.
      Tier2+ 월드 수를 상한으로 두고 재산출(9). coreTarget 10 대비 90%로 목표 카드도 정상화.
   4) 내부 세그먼트 퍼널 역전 — 가입 누적(20)이 첫 편집 누적(40)보다 적었습니다.
      렌더러가 단조 클램프를 걸어 화면에서는 안 보였지만 데이터는 틀린 상태였습니다. 가입 48로 교정.
   5) 파생 비율 재계산 — pubConv90은 pubCreators90÷active90, 비율 지표는 active90 가중평균,
      utmShare 합 = cumSignup 이 되도록 맞췄습니다(교차검증 통과).
   6) 사용되지 않는 죽은 필드 inout 제거 — 렌더러는 inflow/outflow에서 직접 계산합니다.
      값이 1.8인데 실제 계산은 2.1이었고, 아무 데서도 읽지 않아 조용히 틀려 있었습니다.

   재정합 검증: .audit-mock.cjs (합계·포함관계·단조성·파생비율 전수 점검) */

/* ============ 가상 데이터 (현실적 범위) ============ */
const months = ["2/28","3/31","4/30","5/31","6/30","7/8(오늘)"]; // 각 지점=해당 월 말일 기준 스냅샷, 마지막 라벨은 스크립트가 오늘 날짜로 덮어씀
const pubCohortMonths = ["4월","5월","6월"];
const sprints = ["S30","S31","S32","S33","S34","S35","S36","S37","S38"];
const weeks = ["W-7","W-6","W-5","W-4","W-3","W-2","W-1","이번주"];
// 채널(acquisition_channel) 버킷: utm_source 우선 → 없으면 referrer → 둘 다 없으면 Untagged
const utmNames = ["Paid(광고)","Discord","YouTube","Organic(검색)","Referral","Direct","Untagged"];
const firstEditNames = ["오브젝트 배치","기술/물리","스크립트","이동/변형"];

/* 제작 방식 = Agent 편집 턴 ÷ (Agent 턴 + 수동 편집 턴) 기준 5구간.
   각 행 = [월드 수, 퍼블리시 도달률%, Tier3+ 도달률%, 방문 중앙값, D1%, 30일 업데이트율%] */
const AGENT_MIX_LABELS = ["에디터 100% (Agent 0%)","에디터 위주 (Agent 1~25%)","혼합 (Agent 25~50%)","Agent 위주 (Agent 50~75%)","Agent 대부분 (Agent 75~100%)"];
const mixBuckets = rows => rows.map((r,i)=>[AGENT_MIX_LABELS[i],...r]);

const seg = {
  all:{active90:278, editConv:67, cumCreators:620, cumSignup:1178,
       pubCreators90:122, pubCreatorsCum:215, pubWorlds90:132, pubWorldsCum:435, statusCum:[304,99,32], tierDist:[43,349,28,10,4,1],
       retention:47, retention5h:38, continueRate:36, returnRate:12,
       activeTrend:[176,169,152,207,242,278], cumC:[294,361,434,513,564,620], cumS:[616,723,870,997,1090,1178], cumPub:[82,109,138,168,195,215],
       sprintNew:[39,54,37,72,59,94,77,110,124], inflow:[69,63,58,96,87,120], outflow:[40,46,52,47,51,61],
       pubWorlds:[34,23,56,37,63,79], segShare:[210,48,20],
       cohort3h:[["4월",55,45,38],["5월",57,46,34],["6월",60,null,null]],
       cohort5h:[["4월",42,34,28],["5월",44,35,25],["6월",47,null,null]],
       continueByCohort:[40,35,33], returnCreators:[7,9,8,12,10,16],
       weeklyNew:[17,21,18,27,30,34,40,36], mau:[208,202,188,242,270,302],
       actRateByCohort:[64,66,69,66,68,72], firstEditMix:[31,18,22,29],
       ttfpDays:[20,17,15,13,12,11], paidRetention:[55,58,52,60,57,62],
       coreTrend:[3,4,5,7,8,9], tier3plus:[19,23,29,35,39,43], tier2plus:[5,7,9,11,13,15], tier1plus:[1,2,3,4,5,5],
       earn10:18, earn100:4, earn1000:0, earnMedian:40, firstEarn60:[7,8,9,10,11,12],
       discordMembers:[480,512,540,580,620,680], communityEngaged:[5,8,12,16,22,28],
       ailabs:[4,7,12,18,26,35], referralCreators:[3,4,5,6,8,10], kFactor:[0.06,0.07,0.09,0.09,0.11,0.13],
       agentUseRate:[14,17,21,25,30,35], featureUse:[46,30,23],
       agentVs:{ttfp:[9,14], pubConv:[43,29], cont:[44,31]},
       agentWorldVs:{tier3Rate:[15,8], visitsMed:[230,146], d1:[12,8]},
       agentShareBuckets: mixBuckets([[158,43,17,278,13.5,38],[112,50,21,322,14.7,42],[78,56,15,222,11.8,32],[55,63,10,151,9.5,24],[32,71,5,88,7.2,15]]),
       agentShareWithin:{tier3:[19,11], visitMed:[248,164], updRate:[35,24]},
       utmShare:[80,175,90,145,70,275,343], pubConv90:44, okrTarget:350, mauTarget:500,
       editConvTarget:70, tier3Target:100, tier1Target:30, earnTarget:30, coreTarget:10,
       discordTarget:1000, communityTarget:300, ailabsTarget:100},
  organic:{active90:210, editConv:66, cumCreators:470, cumSignup:980,
       pubCreators90:88, pubCreatorsCum:155, pubWorlds90:96, pubWorldsCum:300, statusCum:[210,70,20], tierDist:[30,244,18,6,2,0],
       retention:46, retention5h:36, continueRate:32, returnRate:11,
       activeTrend:[150,140,118,158,182,210], cumC:[230,275,325,385,425,470], cumS:[540,625,745,845,915,980], cumPub:[60,78,98,120,140,155],
       sprintNew:[32,44,30,58,48,74,60,86,96], inflow:[55,50,46,74,68,92], outflow:[33,38,44,38,42,50],
       pubWorlds:[24,16,40,26,44,56], segShare:[210,0,0],
       cohort3h:[["4월",52,42,35],["5월",54,43,31],["6월",57,null,null]],
       cohort5h:[["4월",40,32,26],["5월",42,33,24],["6월",45,null,null]],
       continueByCohort:[36,31,29], returnCreators:[5,6,5,8,7,10],
       weeklyNew:[14,17,15,22,24,28,32,29], mau:[160,150,132,175,195,220],
       actRateByCohort:[60,63,66,62,64,68], firstEditMix:[34,16,20,30],
       ttfpDays:[22,19,17,15,14,13], paidRetention:[0,0,0,0,0,0],
       coreTrend:[1,2,2,3,4,5], tier3plus:[11,14,17,20,23,26], tier2plus:[2,3,4,5,7,8], tier1plus:[0,1,1,1,2,2],
       earn10:12, earn100:2, earn1000:0, earnMedian:35, firstEarn60:[7,8,9,9,10,11],
       discordMembers:[480,512,540,580,620,680], communityEngaged:[4,6,9,12,16,20],
       ailabs:[3,5,9,14,20,26], referralCreators:[2,3,4,5,6,8], kFactor:[0.07,0.08,0.1,0.11,0.13,0.15],
       agentUseRate:[10,13,16,20,25,30], featureUse:[42,25,20],
       agentVs:{ttfp:[10,16], pubConv:[39,25], cont:[40,27]},
       agentWorldVs:{tier3Rate:[13,7], visitsMed:[200,125], d1:[11,7]},
       agentShareBuckets: mixBuckets([[108,40,15,242,12.8,35],[78,47,19,284,14,39],[54,53,13,196,11.2,30],[38,61,9,134,9,22],[22,69,4,78,6.8,13]]),
       agentShareWithin:{tier3:[17,10], visitMed:[224,148], updRate:[33,22]},
       utmShare:[80,165,85,140,60,215,235], pubConv90:42, okrTarget:350, mauTarget:500,
       editConvTarget:70, tier3Target:100, tier1Target:30, earnTarget:30, coreTarget:10,
       discordTarget:1000, communityTarget:300, ailabsTarget:100},
  paid:{active90:48, editConv:62, cumCreators:110, cumSignup:150,
       pubCreators90:22, pubCreatorsCum:40, pubWorlds90:22, pubWorldsCum:90, statusCum:[60,22,8], tierDist:[9,71,6,2,1,1],
       retention:41, retention5h:33, continueRate:40, returnRate:15,
       activeTrend:[8,12,18,30,40,48], cumC:[30,50,72,90,100,110], cumS:[40,60,85,110,130,150], cumPub:[13,20,27,33,37,40],
       sprintNew:[4,6,4,10,8,16,14,20,24], inflow:[10,10,9,18,16,24], outflow:[4,5,5,6,6,8],
       pubWorlds:[4,3,9,6,11,14], segShare:[0,48,0],
       cohort3h:[["4월",48,38,32],["5월",50,39,29],["6월",52,null,null]],
       cohort5h:[["4월",36,28,22],["5월",38,29,20],["6월",40,null,null]],
       continueByCohort:[44,38,34], returnCreators:[1,2,2,3,2,4],
       weeklyNew:[2,3,2,4,5,5,7,6], mau:[30,35,40,48,55,62],
       actRateByCohort:[70,72,75,71,74,78], firstEditMix:[28,22,25,25],
       ttfpDays:[14,12,11,10,9,8], paidRetention:[55,58,52,60,57,62],
       coreTrend:[1,1,1,2,2,2], tier3plus:[4,5,7,8,9,10], tier2plus:[1,2,2,3,3,4], tier1plus:[1,1,1,2,2,2],
       earn10:5, earn100:2, earn1000:0, earnMedian:80, firstEarn60:[12,14,15,16,18,20],
       discordMembers:[480,512,540,580,620,680], communityEngaged:[1,2,3,4,5,6],
       ailabs:[1,2,3,4,5,7], referralCreators:[1,1,1,1,2,2], kFactor:[0.05,0.05,0.06,0.06,0.08,0.09],
       agentUseRate:[20,24,28,32,38,42], featureUse:[55,40,30],
       agentVs:{ttfp:[7,11], pubConv:[50,38], cont:[48,36]},
       agentWorldVs:{tier3Rate:[18,11], visitsMed:[300,190], d1:[14,10]},
       agentShareBuckets: mixBuckets([[32,45,19,330,14.2,39],[23,52,24,386,15.6,44],[16,58,17,262,12.4,34],[12,66,11,178,10.1,25],[7,74,6,104,7.6,16]]),
       agentShareWithin:{tier3:[22,13], visitMed:[302,198], updRate:[38,26]},
       utmShare:[0,10,5,5,10,60,60], pubConv90:46, okrTarget:350, mauTarget:500,
       editConvTarget:70, tier3Target:100, tier1Target:30, earnTarget:30, coreTarget:10,
       discordTarget:1000, communityTarget:300, ailabsTarget:100},
  internal:{active90:20, editConv:90, cumCreators:40, cumSignup:48,
       pubCreators90:12, pubCreatorsCum:20, pubWorlds90:14, pubWorldsCum:45, statusCum:[34,7,4], tierDist:[4,34,4,2,1,0],
       retention:75, retention5h:66, continueRate:70, returnRate:20,
       activeTrend:[18,17,16,19,20,20], cumC:[34,36,37,38,39,40], cumS:[36,38,40,42,45,48], cumPub:[9,11,13,15,18,20],
       sprintNew:[3,4,3,4,3,4,3,4,4], inflow:[4,3,3,4,3,4], outflow:[3,3,3,3,3,3],
       pubWorlds:[6,4,7,5,8,9], segShare:[0,0,20],
       cohort3h:[["4월",78,70,66],["5월",80,71,63],["6월",82,null,null]],
       cohort5h:[["4월",66,58,54],["5월",68,59,52],["6월",70,null,null]],
       continueByCohort:[75,72,70], returnCreators:[1,1,1,1,1,2],
       weeklyNew:[1,1,1,1,1,1,1,1], mau:[18,17,16,19,20,20],
       actRateByCohort:[88,90,92,90,91,93], firstEditMix:[20,25,30,25],
       ttfpDays:[7,6,6,5,5,4], paidRetention:[0,0,0,0,0,0],
       coreTrend:[1,1,2,2,2,2], tier3plus:[4,4,5,7,7,7], tier2plus:[2,2,3,3,3,3], tier1plus:[0,0,1,1,1,1],
       earn10:1, earn100:0, earn1000:0, earnMedian:0, firstEarn60:[0,0,0,0,0,0],
       discordMembers:[480,512,540,580,620,680], communityEngaged:[0,0,0,0,1,2],
       ailabs:[0,0,0,0,1,2], referralCreators:[0,0,0,0,0,0], kFactor:[0,0,0,0,0,0],
       agentUseRate:[40,45,50,55,60,65], featureUse:[70,55,40],
       agentVs:{ttfp:[4,6], pubConv:[65,55], cont:[74,66]},
       agentWorldVs:{tier3Rate:[25,18], visitsMed:[380,260], d1:[16,12]},
       agentShareBuckets: mixBuckets([[18,58,26,402,16.4,52],[11,64,31,458,17.8,57],[8,70,22,318,14.2,45],[5,76,15,216,11.5,34],[3,82,9,128,8.8,22]]),
       agentShareWithin:{tier3:[29,18], visitMed:[372,244], updRate:[50,35]},
       utmShare:[0,0,0,0,0,0,48], pubConv90:60, okrTarget:350, mauTarget:500,
       editConvTarget:70, tier3Target:100, tier1Target:30, earnTarget:30, coreTarget:10,
       discordTarget:1000, communityTarget:300, ailabsTarget:100},
};


const sprintEvents = {"S33":"온보딩 튜토리얼 개편","S36":"디스코드 크리에이터 이벤트","S38":"템플릿 5종 추가 배포"};

/* ===== Agent 안정성 (Q12) — 세그먼트 공통 ===== */
// 월별 Agent 세션 수와 실행 오류 세션 비율(%)
const agentSessions = [420,560,700,860,980,1120];
const agentErrRate = [11.0,9.5,8.2,7.0,6.1,5.4];
// 최근 90일 버그 제보 유형 — studio-ai 채널 제보 스레드 분류 기준
// (실행·런처: binary 누락/초기화 실패 · 편집 반영: ApplyJson 상속/CFrame 미이동/커스텀 응답 리셋
//  응답 잘림·오류: 프롬프트 잘림/Compaction/413 · 지연: HTTP timeout/모델 응답속도)
const agentBugNames = ["실행·런처 오류","편집 반영 안 됨","응답 잘림·오류","응답 지연·타임아웃","기타"];
const agentBugCounts = [18,12,9,7,5];

/* ===== 월드 소비 (Q15) — 실측값, 세그먼트 공통 =====
   출처: MART_PROD.APP.FCT_WORLD_ANALYTICS, 2026-02 ~ 2026-07 월별 집계 (7월은 7/1~7/31 확정)
   월드→creator_type 매핑이 없어 관계·채널 세그먼트 분해는 미지원 (상단 필터와 무관한 전체 기준)

   ★ 2026-08-04 실측 스냅샷과 기준 통일 — 두 가지를 바로잡았습니다.
   1) 분모는 «Live 월드»가 아니라 «등재 월드»입니다.
      namespace='live'는 배포 채널 이름일 뿐 퍼블리시 상태가 아니고, 이 테이블은 한 번 등재된
      월드에 방문이 0이어도 매일 행을 남깁니다. 지금 Live인 월드를 확정할 메타가 없어
      아래 visitedShare는 «등재 대비 비율»이며, 상태 메타가 붙기 전까지는 잠정값입니다.
      그래서 실측 스냅샷 페이지는 비율 대신 «한 번이라도 플레이된 월드»의 절대 수를 싣습니다.
   2) 2월 값만 «기간 내 누적», 나머지는 «월말 당일 등재»로 기준이 섞여 있었습니다.
      전부 «월말 당일 등재»로 통일했습니다(843→841, 1154→1167).
   중앙값 하락(809→228)은 월드가 나빠진 신호가 아니라 6월 브라질 캠페인 종료 후 정상화가
   대부분입니다 — 실측 스냅샷의 요인 분해 표 참고. */
const liveWorlds      = [841,862,917,964,1038,1167];              // 월말 당일 등재 월드 수 (Live 월드 아님)
const visitedWorlds   = [51,51,87,92,114,162];                    // 한 달에 한 번이라도 플레이된 월드
const visitedShare    = [6.1,5.9,9.5,9.5,11.0,13.9];              // 등재 대비 플레이된 월드 비율(%) · 잠정
const visitMedian     = [809,681,430,346,335,228];                // 플레이된 월드의 월간 방문 중앙값
const visitTop10Share = [80.0,72.8,72.8,74.8,87.7,84.9];          // 상위 10% 월드의 방문 점유율(%)
const worldVisitsTotal= [183764,124694,126761,141899,486051,302297]; // 총 방문 세션(보조 지표)

// 4번째 값 = 목적 그룹 (acq=유입·온보딩 / size=활동 규모 / ret=리텐션·이탈 / output=퍼블리시·품질 / agent=Agent / community=커뮤니티)
const defs = [
  ["온보딩 퍼널 단계 소스","회원가입 → 스튜디오 로그인 → 에디터 진입 → 첫 편집 → 퍼블리싱 → 지속 작업","회원가입=WEB_ACCOUNT_CREATE (Hub 웹로그 user_id는 studio login 유저의 45% 미포착 — 7/22 분석 결론) · 로그인=studio_login · 에디터 진입=로깅 확인 필요 · 첫 편집=world_modified","acq"],
  ["활성화 (Activation)","가입 후 7일 내 스튜디오에서 누적 3시간+ 활동한 비율. 온보딩 퍼널 단계가 아니라 별도 Activation Rate 지표","가입 코호트 · TS 합 ≥ 3h","acq"],
  ["편집 전환율","최근 90일에 스튜디오에 들어온 사람 중 실제 편집까지 간 비율","최근 90일 · 편집 크리에이터 ÷ 스튜디오 활성","acq"],
  ["크리에이터 관계 (creator_type)","이 크리에이터가 우리와 어떤 관계인가 — Partner(외주·파트너십 계약) / 내부(사내) / 일반(Independent)","Partner=파트너십 시트 화이트리스트 · 내부=사내 IP 대역 · 나머지=Independent","acq"],
  ["유입 채널 (acquisition_channel)","이 크리에이터를 어떤 채널로 데려왔는가 — 관계 축과 독립 (Partner ≠ Paid)","utm_source 우선 → 없으면 referrer(Organic/Referral/Direct) → 둘 다 없으면 Untagged","acq"],
  ["채널별 회원가입","유입 채널(acquisition_channel) 기준 회원가입 분포","PAGE_LOCATION utm_source + referrer","acq"],
  ["90일 슬라이딩 활성 창작 크리에이터","오늘 기준 최근 90일 안에 실제로 편집을 한 번이라도 한 순수 크리에이터 수 (매일 갱신)","최근 90일 · studio_log 편집 이벤트(world_modified) 유니크 계정","size"],
  ["월간 Studio 활성 사용자(MAU)","퍼블리시 여부와 무관하게 Studio를 실제로 사용한 월간 유니크","월 단위 · studio_login/편집 유니크","size"],
  ["주간 신규 크리에이터","최근 7일간 최초 편집 완료한 크리에이터 수","슬라이딩 7일 · world_modified 최초","size"],
  ["누적 크리에이터 단계","서비스 시작~현재 가입·첫 편집·첫 퍼블리시를 각각 달성한 누적 인원","서비스 시작~현재 누적 · 가입=WEB_ACCOUNT_CREATE / first_edit_date / first_publish_date","size"],
  ["정착 리텐션 (Retained)","첫 퍼블리시 후 30일 내 누적 N시간+(3h/5h) 재활동 비율","퍼블리시 코호트 · TS","ret"],
  ["지속 작업 (Continued)","첫 퍼블리시 후 1~30일 안에 동일 월드 v2+ 또는 다른 월드 신규 퍼블리시. 첫 퍼블리시와 같은 날의 재퍼블리시는 '지속'이 아니라 같은 작업의 연장이므로 1일 이상만 인정","퍼블리시 히스토리 · 경과일 1~30일 · 0일(같은 날) 제외를 모든 코호트에 동일 적용","ret"],
  ["Partner(외주) 계약자 정착률","계약이 끝난 파트너가 계약과 무관하게 30일 내 5시간+ 자발적으로 재활동한 비율 — 플랫폼의 가능성을 보고 남는지 측정","파트너십 시트의 계약 시작·종료일 기준 · 관찰 30일과 겹치는 후속 계약이 있으면 분모·분자 모두 제외","ret"],
  ["인/아웃 순증","90일 활성 로스터 진입−이탈","월 스냅샷","ret"],
  ["이탈 후 복귀","마지막 스튜디오 로그인 30일+ 후 재로그인","studio_login LAG","ret"],
  ["퍼블리시 크리에이터 (유니크)","실제로 월드를 퍼블리시한 '사람' 수. 누적/90일","퍼블리시 성공 로그 DISTINCT accountid","output"],
  ["퍼블리시 월드 상태 (Publishing/Version Status)","Published=배포 완료(접속 가능). Update Required=운영 일시중지(접속 불가). Banned=운영 금지. ※ Public/Private/Pause는 Access Setting(노출 설정)으로 별도 축 — Public≠Published","상태값 문서 · World Publishing Status + World Version Status","output"],
  ["Access Setting (노출 설정)","사용자가 설정하는 월드 노출: Public(앱 노출·접속) / Pause(노출·접속불가) / Private(비노출). Published 월드여도 Access가 Private이면 앱에 안 보임","상태값 문서 · Access Setting","output"],
  ["퍼블리시 전환율","최근 90일 활성 창작 중 최근 90일 퍼블리시 유니크 비율","90일 퍼블리시 유니크 ÷ 90일 활성 창작","output"],
  ["TTFP","스튜디오 첫 로그인 → 첫 퍼블리시까지 걸린 일수 중앙값. 게임 회원가입일이 아니라 스튜디오에 처음 들어온 날을 기산점으로 씁니다 — 가입 기준으로 재면 '스튜디오에 오기까지 걸린 기간'과 '와서 퍼블리시하기까지 걸린 기간'이 한 숫자에 섞여 온보딩 효율을 못 봅니다","코호트별 중앙값 · 기산점=first_studio_login_date · 가입 기준 값은 별도 참조 계열로만 병기","output"],
  ["코어 크리에이터","90일 내 10시간+ · Tier 2 이상 월드 보유 (장르 제한 없음). 당분간 운영 정의 — 이후 타겟 장르·Tier1+로 재강화 가능","슬라이딩 90일","output"],
  ["Tier3+ / Tier2+ / Tier1+ 월드","누적 Live 월드 중 해당 티어 이상 품질을 충족한 수. Tier3+ ⊇ Tier2+ ⊇ Tier1+","Tier3: 방문 700+·D1 12%+·4분+ / Tier2: 2,000+·15%+·6분+ / Tier1: 5,000+·20%+·8분+ / Tier0: 10,000+·24%+·10분+","output"],
  ["관측 대기 월드","퍼블리시 후 30일이 지나지 않아 아직 품질을 판단할 데이터가 쌓이지 않은 Live 월드. 품질 축 밖의 구간으로, 갓 나온 월드가 최하위로 집계돼 분포를 왜곡하는 것을 막음","퍼블리시 경과일 < 30일 · 로블록스가 벤치마킹 풀에서 30일 미만 게임을 제외하는 방식과 동일","output"],
  ["기준 미달 월드","퍼블리시 후 30일이 지났는데도 가장 낮은 티어(Tier3)의 문턱조차 넘지 못한 Live 월드. 신규 여부와 무관하게 현재 성과가 기준에 못 미친다는 뜻","퍼블리시 경과일 ≥ 30일인 Live 월드 − Tier3+ 월드","output"],
  ["소비되는 월드 비율","만든 월드가 실제로 플레이되는지 보는 핵심 지표. 한 달 동안 플레이어가 한 명이라도 들어온 Live 월드의 비율 — 총 방문량은 플랫폼 트래픽에 따라 움직이므로 크리에이터 쪽 성과는 비율로 봐야 함","월간 방문 1건+ 월드 ÷ 집계 대상 Live 월드 · ★분모 미확정: namespace='live'는 배포 채널명일 뿐 퍼블리시 상태가 아니고 방문 0인 월드도 행이 남아, 현재 분모는 'Live 월드'가 아니라 '등재 월드'입니다. 상태 메타(Published/Unpublished/Banned)가 붙기 전까지 이 비율은 잠정값이며 실측 페이지는 절대 수로 대체","output"],
  ["월드당 월간 방문 중앙값","전형적인 월드가 받는 방문량. 방문을 받은 월드만 대상으로 하며, 평균이 아닌 중앙값이라 히트작 한두 개에 흔들리지 않음. 평균과 벌어질수록 쏠림이 심하다는 뜻","방문 1건+ 월드의 월간 방문 수 중앙값","output"],
  ["상위 10% 월드 방문 점유율","소비가 소수 히트작에 얼마나 쏠려 있는지. 방문을 받은 월드 중 상위 10%가 전체 방문에서 차지하는 비중으로, 높을수록 생태계가 몇 개 월드에 의존","상위 10% 월드 방문 합 ÷ 전체 방문 합 · 방문 1건+ 월드 기준","output"],
  ["총 방문 세션 (보조)","Live 월드 입장 세션의 월간 합계. 플랫폼 수요·마케팅·추천 배분에 따라 움직여 크리에이터 성과를 분리하지 못하므로 보조 지표로만 사용","월드 입장 세션 합계 · 같은 유저가 다시 들어와도 각각 집계","output"],
  ["Studio Agent 사용률","AI로 CRUD 1회+ 한 크리에이터가 90일 활성 창작 크리에이터 중 몇 명인지","AI CRUD 1회+ 유니크 ÷ 최근 90일 활성 창작 크리에이터","agent"],
  ["Agent 성과 비교 (크리에이터)","Agent를 쓰는 크리에이터가 안 쓰는 크리에이터보다 더 빨리·더 많이 퍼블리시하는지","90일 활성 창작을 AI CRUD 1회+ 여부로 두 그룹으로 나눠 각각 집계 · 상관관계 참고용(인과 아님)","agent"],
  ["Agent 성과 비교 (월드)","Agent로 만든 월드가 품질(Tier3+)과 소비(방문·재방문)에서도 나은지","Live 월드를 제작 중 AI CRUD 1회+ 여부로 나눠 Tier3+ 도달률·월드당 월간 방문 중앙값·D1 재방문율 비교","agent"],
  ["제작 방식별 결과물 비교","에디터 위주로 만든 월드와 Agent 위주로 만든 월드의 완주·품질·소비·지속 차이","Agent 비중 = Agent 편집 턴 ÷ (Agent 턴 + 수동 편집 턴)으로 월드를 5구간으로 나눠 비교 · 교란 통제는 양쪽을 모두 만든 크리에이터로 한정 · 턴 단위라 절대값은 인용하지 않고 구간 간 상대 순위만 사용","agent"],
  ["Agent 세션 오류율","Agent 세션 중 실행 오류(런처·초기화 실패, 도구 실행 실패, 타임아웃)로 끝난 세션 비율","세션 로그 오류 이벤트 ÷ 전체 Agent 세션 · 월별","agent"],
  ["Agent 버그 제보","크리에이터·내부에서 제보된 Agent 버그 건수와 유형 분포","현재 studio-ai 채널 스레드 수동 분류 → 인앱 리포트 제보(로그 export 포함) 기능 출시 후 자동 집계 전환","agent"],
  ["커뮤니티 참여 크리에이터","30일 내 Discord/포럼 5회+ 활동","Discord/포럼 로그","community"],
  ["디스코드 멤버 / AI_Labs","서버 멤버 누적 · #AI_Labs 결과물 공유 건수","Discord/포럼","community"],
];
