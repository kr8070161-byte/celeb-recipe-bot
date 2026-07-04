/**
 * threads-api.js
 * Meta Threads API 핵심 모듈
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://graph.threads.net/v1.0';

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    access_token: process.env.THREADS_ACCESS_TOKEN,
  },
});

/**
 * 내 계정 정보 조회 (User ID 포함)
 */
async function getMe() {
  const res = await api.get('/me', {
    params: {
      fields: 'id,username,name,threads_profile_picture_url,threads_biography',
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data;
}

/**
 * 텍스트 게시물 컨테이너 생성
 * @param {string} userId
 * @param {string} text
 */
async function createTextContainer(userId, text) {
  const res = await api.post(`/${userId}/threads`, null, {
    params: {
      media_type: 'TEXT',
      text,
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data; // { id: "컨테이너_ID" }
}

/**
 * 이미지 게시물 컨테이너 생성
 * @param {string} userId
 * @param {string} imageUrl  — 공개 이미지 URL
 * @param {string} text      — 캡션 (선택)
 */
async function createImageContainer(userId, imageUrl, text = '') {
  const res = await api.post(`/${userId}/threads`, null, {
    params: {
      media_type: 'IMAGE',
      image_url: imageUrl,
      text,
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data;
}

/**
 * 컨테이너 발행 (생성 후 30초~5분 대기 권장)
 * @param {string} userId
 * @param {string} containerId
 */
async function publishContainer(userId, containerId) {
  const res = await api.post(`/${userId}/threads_publish`, null, {
    params: {
      creation_id: containerId,
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data; // { id: "게시물_ID" }
}

/**
 * 일일 발행 한도 확인
 * @param {string} userId
 */
async function getPublishingLimit(userId) {
  const res = await api.get(`/${userId}/threads_publishing_limit`, {
    params: {
      fields: 'config,quota_usage',
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data;
}

/**
 * 내 게시물 목록 조회
 * @param {string} userId
 */
async function listPosts(userId) {
  const res = await api.get(`/${userId}/threads`, {
    params: {
      fields: 'id,media_type,media_url,permalink,text,timestamp',
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data;
}

/**
 * 특정 게시글의 답글(댓글) 컨테이너 생성
 * @param {string} userId
 * @param {string} parentPostId - 댓글을 달 본문 게시글 ID
 * @param {string} text - 댓글 내용
 */
async function createReplyContainer(userId, parentPostId, text) {
  const res = await api.post(`/${userId}/threads`, null, {
    params: {
      media_type: 'TEXT',
      text,
      reply_to_id: parentPostId,
      access_token: process.env.THREADS_ACCESS_TOKEN,
    },
  });
  return res.data;
}

const { generateAndSaveImage } = require('./image-generator');
const { appendPartnersLink } = require('./coupang-api');

/**
 * 텍스트 또는 이미지 게시물을 즉시 발행하고, 댓글이 있으면 대기 후 댓글까지 자동으로 연쇄 발행
 * @param {string} userId
 * @param {object} postData  — { text, imageUrl?, commentText? }
 */
async function publish(userId, postData) {
  let { text, imageUrl, commentText, useCoupang } = postData;

  // 만약 이미지 URL이 비어 있다면 AI 이미지 생성 모듈에서 적합한 이미지를 자동 매칭
  if (!imageUrl || imageUrl.trim() === '') {
    try {
      imageUrl = await generateAndSaveImage(text);
    } catch (e) {
      console.log('⚠️ 이미지 생성 실패, 텍스트 전용으로 계속 진행합니다.', e.message);
    }
  }

  // 1. 본문 컨테이너 생성
  let container;
  if (imageUrl) {
    console.log(`[API] 이미지 포함 발행 시도: ${imageUrl}`);
    container = await createImageContainer(userId, imageUrl, text);
  } else {
    console.log(`[API] 텍스트 전용 발행 시도`);
    container = await createTextContainer(userId, text);
  }

  // 2. 잠시 대기 (API 권장: 컨테이너 준비 시간)
  await delay(3000);

  // 3. 본문 발행
  const result = await publishContainer(userId, container.id);
  const postId = result.id;

  // 4. 댓글(답글)이 있는 경우 추가 발행 처리
  if (commentText && commentText.trim()) {
    console.log(`[API] 본문 발행 성공(ID: ${postId}) -> 5초 후 댓글 발행을 시작합니다.`);
    await delay(5000);
    
    // 쿠팡 파트너스 링크가 필요한 식재료인 경우 동적 결합 처리
    let processedComment = commentText;
    if (useCoupang !== false) {
      try {
        processedComment = await appendPartnersLink(text, commentText);
      } catch (err) {
        console.error('[쿠팡 연동 오류]', err.message);
      }
    }
    
    // 댓글 컨테이너 생성 (부모 ID 지정)
    const replyContainer = await createReplyContainer(userId, postId, processedComment);
    await delay(3000);
    
    // 댓글 발행
    await publishContainer(userId, replyContainer.id);
    console.log(`[API] ✅ 댓글 자동 발행 성공 (콘텐츠: ${processedComment.slice(0, 30)}...)`);
  }

  return { containerId: container.id, postId };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getMe,
  createTextContainer,
  createImageContainer,
  createReplyContainer,
  publishContainer,
  getPublishingLimit,
  listPosts,
  publish,
};
