/**
 * test-api.js
 * Threads API 연결 테스트 스크립트
 * 실행: npm run test-api
 */

require('dotenv').config();
const threadsApi = require('./threads-api');

async function test() {
  console.log('\n🔍 Threads API 연결 테스트 시작...\n');

  if (!process.env.THREADS_ACCESS_TOKEN) {
    console.error('❌ .env에 THREADS_ACCESS_TOKEN이 없습니다!');
    process.exit(1);
  }

  try {
    // 1. 계정 정보 조회
    console.log('1️⃣  계정 정보 조회 중...');
    const me = await threadsApi.getMe();
    console.log(`   ✅ 계정: @${me.username} (ID: ${me.id})`);
    console.log(`   이름: ${me.name || '(없음)'}`);

    const userId = me.id;

    // 2. 발행 한도 확인
    console.log('\n2️⃣  일일 발행 한도 확인 중...');
    try {
      const limit = await threadsApi.getPublishingLimit(userId);
      console.log('   ✅ 발행 한도:', JSON.stringify(limit, null, 2));
    } catch (e) {
      console.log('   ⚠️  한도 조회 실패 (권한 없을 수 있음):', e.message);
    }

    // 3. 게시물 목록 확인
    console.log('\n3️⃣  최근 게시물 확인 중...');
    try {
      const posts = await threadsApi.listPosts(userId);
      const count = posts.data?.length || 0;
      console.log(`   ✅ 게시물 ${count}개 조회 완료`);
      if (count > 0) {
        console.log(`   최신 게시물: "${posts.data[0].text?.slice(0, 50) || '(텍스트 없음)'}"`);
      }
    } catch (e) {
      console.log('   ⚠️  게시물 조회 실패:', e.message);
    }

    console.log('\n✅ API 연결 테스트 완료! 정상 작동 중입니다.');
    console.log('   → npm run dev 로 서버를 시작하세요.\n');
  } catch (err) {
    console.error('\n❌ API 연결 실패!');
    console.error('   오류:', err.response?.data || err.message);
    console.error('\n   확인 사항:');
    console.error('   1. .env의 THREADS_ACCESS_TOKEN이 올바른지 확인');
    console.error('   2. 토큰 만료 여부 확인 (Meta for Developers에서 재발급)');
    console.error('   3. Threads API 권한(threads_basic, threads_content_publish)이 있는지 확인\n');
    process.exit(1);
  }
}

test();
