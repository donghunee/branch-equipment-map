# 지점 장비 현황 지도

엑셀 파일을 선택하면 지점별 장비 현황을 지도에 표시합니다.
**비정상 장비가 1개 이상인 지점은 빨간색**, 나머지는 파란색으로 표시됩니다.

## 엑셀 형식

첫 행이 열 이름이어야 하며, 아래 이름이 들어있으면 **열 순서는 달라도 됩니다.**

| 지점명 | 주소 | 장비명 | 보유수량 | 정상수량 | 비정상수량 |
| --- | --- | --- | --- | --- | --- |
| 서초금융센터 | 서울 서초구 사임당로23길 27 | VPN | 10 | 8 | 2 |

- 한 지점에 장비가 여러 종류면 여러 행으로 넣으면 되고, 지도에서는 하나로 합산됩니다.
- `보유수량` 열이 없으면 `정상수량 + 비정상수량`으로 계산합니다.
- 빈칸이나 숫자가 아닌 값은 0으로 처리합니다.

## 개인정보 / 보안

엑셀 파일은 **서버로 전송되지 않습니다.** 브라우저 안에서만 읽고 처리합니다.
주소를 지도 위치로 바꿀 때만 OpenStreetMap 에 주소 문자열을 조회합니다.

## 개발

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npx vitest run   # 엑셀 파싱 테스트
npm run build    # 배포용 빌드 → dist/
npm run deploy   # 빌드 후 GitHub Pages 에 배포
```

## 참고 — 주소 정확도

무료·무가입 조건에 맞춰 OpenStreetMap(Nominatim)을 사용합니다. 도로명 단위로 매칭되어
지점 위치가 최대 1~2km 어긋날 수 있습니다. 더 정확한 위치가 필요하면 카카오 로컬 API
키를 발급받아 [`src/lib/geocode.ts`](src/lib/geocode.ts) 의 `geocodeOne` 만 교체하면 됩니다.

## 문서

- 설계: [docs/superpowers/specs/2026-08-04-branch-equipment-map-design.md](docs/superpowers/specs/2026-08-04-branch-equipment-map-design.md)
