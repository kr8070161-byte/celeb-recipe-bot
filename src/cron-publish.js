/**
 * cron-publish.js
 * GitHub Actions 또는 서버 크론탭에서 매일 정기적으로 실행하여
 * 예약 시간이 지난 게시물을 즉시 발행해 주는 일회성 실행 스크립트
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { publish } = require('./threads-api');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function readQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}
function writeQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}
function readHistory() {
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
}
function writeHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}
function addToHistory(item) {
  const history = readHistory();
  history.unshift(item);
  writeHistory(history);
}

async function run() {
  console.log('[크론 발행] 큐 확인 중...');
  const queue = readQueue();
  const now = new Date();
  
  const dueItems = queue.filter(
    (item) => item.status === 'pending' && new Date(item.scheduledAt) <= now
  );
  
  if (dueItems.length === 0) {
    console.log('[크론 발행] 지금 발행해야 할 예약 글이 없습니다.');
    return;
  }
  
  const userId = process.env.THREADS_USER_ID;
  if (!userId) {
    throw new Error('THREADS_USER_ID가 설정되지 않았습니다.');
  }

  for (const item of dueItems) {
    console.log(`[크론 발행] 발행 시작: ${item.id}`);
    try {
      const result = await publish(userId, {
        text: item.text,
        imageUrl: item.imageUrl,
        commentText: item.commentText,
        useCoupang: item.useCoupang,
      });

      // 상태 업데이트
      const allQueue = readQueue();
      const idx = allQueue.findIndex((q) => q.id === item.id);
      allQueue[idx].status = 'published';
      allQueue[idx].publishedAt = new Date().toISOString();
      allQueue[idx].postId = result.postId;
      writeQueue(allQueue);

      // 이력 기록
      addToHistory({
        ...allQueue[idx],
        type: 'scheduled',
      });

      console.log(`[크론 발행] ✅ 발행 성공: postId=${result.postId}`);
    } catch (err) {
      console.error(`[크론 발행] ❌ 발행 실패: ${item.id}`, err.message);
      const allQueue = readQueue();
      const idx = allQueue.findIndex((q) => q.id === item.id);
      allQueue[idx].status = 'failed';
      allQueue[idx].error = err.message;
      writeQueue(allQueue);
    }
  }
}

run().catch(err => {
  console.error('[크론 발행] 치명적 오류 발생:', err.message);
  process.exit(1);
});
