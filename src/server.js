/**
 * server.js
 * Express REST API 서버 + 스케줄러 시작
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const threadsApi = require('./threads-api');
const scheduler = require('./scheduler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
let THREADS_USER_ID = process.env.THREADS_USER_ID || '';

/* ──────────────────────────────────────────
   서버 시작 시 User ID 자동 조회
────────────────────────────────────────── */
async function init() {
  try {
    if (!THREADS_USER_ID) {
      console.log('[초기화] User ID를 조회하는 중...');
      const me = await threadsApi.getMe();
      THREADS_USER_ID = me.id;
      console.log(`[초기화] ✅ 계정: @${me.username} (ID: ${me.id})`);
    } else {
      console.log(`[초기화] User ID 사용: ${THREADS_USER_ID}`);
    }
    
    // 매일 오전 9시 순차 예약 30일치 데이터 자동 이식
    scheduler.initializeMonthlyQueue(THREADS_USER_ID);
    
    scheduler.startScheduler(THREADS_USER_ID);
  } catch (err) {
    console.error('[초기화] ❌ Threads API 연결 실패:', err.message);
    console.error('→ .env의 THREADS_ACCESS_TOKEN을 확인해 주세요.');
  }
}

/* ──────────────────────────────────────────
   API 라우트
────────────────────────────────────────── */

// GET /api/me — 계정 정보
app.get('/api/me', async (req, res) => {
  try {
    const me = await threadsApi.getMe();
    res.json({ success: true, data: me });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/limit — 일일 발행 한도
app.get('/api/limit', async (req, res) => {
  try {
    const limit = await threadsApi.getPublishingLimit(THREADS_USER_ID);
    res.json({ success: true, data: limit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/posts — 게시물 목록
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await threadsApi.listPosts(THREADS_USER_ID);
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/post — 즉시 발행
// Body: { text: string, imageUrl?: string, commentText?: string }
app.post('/api/post', async (req, res) => {
  const { text, imageUrl, commentText } = req.body;
  if (!text && !imageUrl) {
    return res.status(400).json({ success: false, error: '텍스트 또는 이미지 URL이 필요합니다.' });
  }
  try {
    const result = await threadsApi.publish(THREADS_USER_ID, { text, imageUrl, commentText });

    // 이력 저장
    scheduler.addToHistory({
      id: result.postId,
      text,
      imageUrl,
      commentText,
      type: 'instant',
      status: 'published',
      publishedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/schedule — 예약 발행
// Body: { text: string, imageUrl?: string, commentText?: string, scheduledAt: ISO 문자열 }
app.post('/api/schedule', (req, res) => {
  const { text, imageUrl, commentText, scheduledAt } = req.body;
  if (!text && !imageUrl) {
    return res.status(400).json({ success: false, error: '텍스트 또는 이미지 URL이 필요합니다.' });
  }
  if (!scheduledAt) {
    return res.status(400).json({ success: false, error: '예약 시간(scheduledAt)이 필요합니다.' });
  }
  if (new Date(scheduledAt) <= new Date()) {
    return res.status(400).json({ success: false, error: '예약 시간은 현재보다 미래여야 합니다.' });
  }
  const item = scheduler.addToQueue({ text, imageUrl, commentText, scheduledAt, userId: THREADS_USER_ID });
  res.json({ success: true, data: item });
});

// GET /api/queue — 예약 목록
app.get('/api/queue', (req, res) => {
  res.json({ success: true, data: scheduler.getQueue() });
});

// DELETE /api/queue/:id — 예약 취소
app.delete('/api/queue/:id', (req, res) => {
  try {
    const item = scheduler.removeFromQueue(req.params.id);
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// GET /api/history — 발행 이력
app.get('/api/history', (req, res) => {
  res.json({ success: true, data: scheduler.getHistory() });
});

/* ──────────────────────────────────────────
   서버 시작
────────────────────────────────────────── */
app.listen(PORT, async () => {
  console.log(`\n🚀 Threads 발행 서버 시작!`);
  console.log(`   대시보드: http://localhost:${PORT}\n`);
  await init();
});
