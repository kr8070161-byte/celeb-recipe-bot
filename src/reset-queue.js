/**
 * reset-queue.js
 * 기존 대기 큐를 날리고 새로운 템플릿과 일정(오늘 16시부터 순차 발행)으로 재설정하는 일회성 스크립트
 */

require('dotenv').config();
const scheduler = require('./scheduler');
const threadsApi = require('./threads-api');

async function run() {
  console.log('[초기화 스크립트] 큐 재배치를 시작합니다...');
  
  let userId = process.env.THREADS_USER_ID;
  if (!userId) {
    console.log('[초기화 스크립트] User ID를 조회하는 중...');
    const me = await threadsApi.getMe();
    userId = me.id;
    console.log(`[초기화 스크립트] 계정: @${me.username} (ID: ${userId})`);
  }
  
  // forceReset = true 로 실행하여 기존 pending 큐 삭제 후 새 템플릿 적용 및 재배정
  scheduler.initializeMonthlyQueue(userId, true);
  
  console.log('[초기화 스크립트] 큐 재배치가 완료되었습니다!');
  process.exit(0);
}

run().catch(err => {
  console.error('[초기화 스크립트] 에러 발생:', err.message);
  process.exit(1);
});
