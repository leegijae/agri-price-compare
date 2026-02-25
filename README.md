# 전국 농수축산물 도매시장 가격 비교 앱
   본 앱은 공공데이터포털의 농수축산물 도매시장 경락가격 표준데이터 API를 활용하여,전국 도매시장 가격을 조회·비교할 수 있는 React Native 앱을 개발하고,Jest 기반 테스트 자동화 및 GitHub Actions CI를 적용한 QA 중심 프로젝트입니다.

## 사용한 API
   https://www.data.go.kr/data/15141808/openapi.do (한국농수산식품유통공사_전국 공영도매시장 실시간 경매정보)

## 실행 방법

### 앱 및 테스트 실행
```bash
npm install
npx expo start

npm test 

npm run lint 

```
``` powersell
cd proxy-server
node server.js
```
## 기획문서
https://www.notion.so/31198c30a2b38024b56efc776b8da17a?source=copy_link

## QA CLI Workflow (Warp + GitHub CLI)

### Local quality gate (Warp)
npm ci
npm run qa:check

### Check GitHub Actions from CLI
gh run list --limit 10
gh run view --log
gh run watch