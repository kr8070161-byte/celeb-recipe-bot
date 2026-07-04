---
name: 쓰레드발행
description: Meta Threads API를 사용하여 게시물을 자동 발행하는 워크플로우. 토큰 설정, API 모듈 구성, 예약 스케줄러, Express 서버, 웹 대시보드를 포함한 풀스택 시스템 구축.
---

# 쓰레드발행 워크플로우

## 개요

Meta Threads API를 이용해 텍스트/이미지 게시물을 자동 발행하는 Node.js 기반 풀스택 시스템입니다.
웹 대시보드에서 즉시 발행 또는 예약 발행을 할 수 있습니다.

---

## 프로젝트 구조

```
AI쓰레드 직원/
├── .env                  ← 토큰 및 환경변수
├── package.json          ← 의존성 정의
├── src/
│   ├── threads-api.js    ← Meta Threads API 핵심 모듈
│   ├── scheduler.js      ← 예약 발행 스케줄러 (node-cron)
│   ├── server.js         ← Express REST API 서버
│   └── test-api.js       ← API 연결 테스트 스크립트
└── public/
    └── index.html        ← 웹 대시보드 UI
```

---

## 환경 설정

### `.env` 파일
```
THREADS_ACCESS_TOKEN=<발급받은_토큰>
THREADS_USER_ID=<자동_조회_또는_직접입력>
PORT=3000
```

### 의존성 설치
```bash
npm install
```

---

## 핵심 구성 요소

### 1. `src/threads-api.js` — API 모듈
- `getMe()` — 내 계정 정보 및 User ID 조회
- `createTextContainer(text)` — 텍스트 게시물 컨테이너 생성
- `createImageContainer(imageUrl, text)` — 이미지 게시물 컨테이너 생성
- `publishContainer(containerId)` — 컨테이너 발행
- `getPublishingLimit()` — 일일 발행 한도 확인
- `listPosts()` — 게시물 목록 조회

### 2. `src/scheduler.js` — 예약 스케줄러
- `addToQueue(postData)` — 예약 큐에 게시물 추가
- `getQueue()` — 현재 예약 목록 반환
- `removeFromQueue(id)` — 예약 취소
- 매 분마다 큐를 체크하여 예약 시간이 된 게시물 자동 발행

### 3. `src/server.js` — Express 서버
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/me` | 계정 정보 조회 |
| POST | `/api/post` | 즉시 발행 |
| POST | `/api/schedule` | 예약 등록 |
| GET | `/api/queue` | 예약 목록 |
| DELETE | `/api/queue/:id` | 예약 취소 |
| GET | `/api/history` | 발행 이력 |
| GET | `/api/limit` | 일일 한도 확인 |

### 4. `public/index.html` — 웹 대시보드
- 게시물 작성 폼 (텍스트 + 이미지 URL)
- 즉시 발행 / 예약 발행 토글
- 예약 큐 목록 및 취소
- 발행 이력 확인

---

## 실행 방법

```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev

# 일반 실행
npm start

# API 연결 테스트
npm run test-api
```

브라우저에서 `http://localhost:3000` 접속

---

## API 참고

- Threads API 공식 문서: https://developers.facebook.com/docs/threads
- 토큰 발급: Meta for Developers → Threads API
- 일일 발행 한도: 250회

---

## 이 워크플로우를 다시 실행할 때

1. `.env`에 `THREADS_ACCESS_TOKEN` 설정 확인
2. `npm install` 실행
3. `npm run test-api`로 토큰 유효성 확인
4. `npm run dev`로 서버 시작
5. `http://localhost:3000` 접속
