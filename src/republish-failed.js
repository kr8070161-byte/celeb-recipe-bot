/**
 * republish-failed.js
 * failed 상태인 예약 건들을 다시 pending으로 복구하여 재발행 대기 상태로 만드는 스크립트
 */

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, '..', 'data', 'queue.json');

function run() {
  if (!fs.existsSync(QUEUE_FILE)) {
    console.error('큐 파일이 존재하지 않습니다.');
    return;
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  let resetCount = 0;

  queue.forEach((item) => {
    if (item.status === 'failed') {
      item.status = 'pending';
      item.imageUrl = '';
      delete item.error;
      resetCount++;
      console.log(`[복구] ${item.id} ("${item.text.slice(0, 20)}...") -> pending으로 복구됨`);
    }
  });

  if (resetCount > 0) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    console.log(`✅ 총 ${resetCount}개의 실패한 예약을 pending 상태로 성공적으로 복구했습니다.`);
  } else {
    console.log('복구할 failed 상태의 예약이 없습니다.');
  }
}

run();
