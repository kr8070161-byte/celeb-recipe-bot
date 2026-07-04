/**
 * coupang-api.js
 * 쿠팡 파트너스 API 연동 및 단축 링크 생성 모듈
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY || '';
const SECRET_KEY = process.env.COUPANG_SECRET_KEY || '';
const SUB_ID = process.env.COUPANG_SUB_ID || '';

/**
 * 쿠팡 파트너스 API 인증을 위한 Authorization 헤더 생성 (HMAC-SHA256)
 */
function generateSignature(method, path, query = '') {
  const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '') + 'Z';
  const message = datetime + method + path + query;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(message)
    .digest('hex');

  return `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;
}

/**
 * 본문 텍스트 내에서 쿠팡에서 검색할 핵심 식재료 키워드 추출
 * @param {string} text - 본문 내용
 * @returns {string} - 검색 키워드
 */
function extractKeyword(text) {
  if (text.includes("아보카도")) return "유기농 아보카도";
  if (text.includes("그릭요거트")) return "꾸덕한 그릭요거트";
  if (text.includes("치아씨드")) return "유기농 치아씨드";
  if (text.includes("곤약떡")) return "현미 곤약떡";
  if (text.includes("오레오")) return "오레오 쿠키";
  if (text.includes("복숭아")) return "신선 복숭아 1kg";
  if (text.includes("수박")) return "당도선별 수박";
  if (text.includes("메밀면") || text.includes("메밀국수")) return "메밀국수 건면";
  if (text.includes("식빵")) return "통밀 식빵";
  if (text.includes("파스타") || text.includes("스파게티")) return "스파게티 롱파스타";
  if (text.includes("초콜릿")) return "피스타치오 두바이 초콜릿";
  if (text.includes("들기름")) return "국산 저온압착 들기름";
  
  return ""; // 매칭되는 재료가 없는 경우
}

/**
 * 쿠팡 파트너스 API를 호출하여 키워드 상품의 검색 단축 링크 생성
 * @param {string} keyword - 검색할 상품 키워드
 * @returns {Promise<string>} - 파트너스 링크 (실패 혹은 미설정 시 빈 값 반환)
 */
async function generatePartnersLink(keyword) {
  // 환경변수가 미등록된 경우 연동을 건너뜀
  if (!ACCESS_KEY || !SECRET_KEY) {
    return '';
  }

  try {
    const REQUEST_METHOD = 'POST';
    const DOMAIN = 'https://api-gateway.coupang.com';
    const URL_PATH = '/v2/providers/affiliate_open_api/apis/api/v1/links/search';
    
    const requestData = {
      keyword: keyword,
      subId: SUB_ID || 'threads-bot'
    };

    const authorization = generateSignature(REQUEST_METHOD, URL_PATH);

    const response = await axios.post(DOMAIN + URL_PATH, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization
      }
    });

    if (response.data && response.data.data && response.data.data[0]) {
      const linkInfo = response.data.data[0];
      // 생성된 파트너스 단축 URL 반환
      return linkInfo.shortenUrl || linkInfo.link;
    }
  } catch (err) {
    console.error(`[쿠팡 파트너스 API 에러] 키워드: ${keyword}`, err.message);
  }

  return '';
}

/**
 * 댓글의 마지막 단락에 쿠팡 파트너스 추천 링크를 동적으로 덧붙여주는 헬퍼
 * @param {string} text - 본문 텍스트
 * @param {string} commentText - 댓글 텍스트
 * @returns {Promise<string>} - 파트너스 링크가 추가된 새로운 댓글 텍스트
 */
async function appendPartnersLink(text, commentText) {
  const keyword = extractKeyword(text);
  
  // 감지된 식재료 키워드가 없는 경우 기존 댓글 그대로 반환
  if (!keyword) {
    return commentText;
  }

  console.log(`[쿠팡 파트너스] 본문 키워드 감지: "${keyword}"`);
  
  const shortenUrl = await generatePartnersLink(keyword);
  
  if (shortenUrl) {
    console.log(`[쿠팡 파트너스] 링크 생성 성공: ${shortenUrl}`);
    const suffix = `\n\n🛒 레시피 속 ${keyword} 보러가기:\n👉 ${shortenUrl}\n\n*이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`;
    return commentText + suffix;
  }

  // API 키가 없거나 실패한 경우, 수동 구매가 가능하도록 쿠팡 홈 일반 링크 제공 (선택 사항)
  console.log(`[쿠팡 파트너스] API 키가 입력되지 않아 일반 검색 링크를 적용합니다.`);
  const manualUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
  const manualSuffix = `\n\n🛒 레시피 속 ${keyword} 보러가기:\n👉 ${manualUrl}`;
  
  return commentText + manualSuffix;
}

module.exports = {
  generatePartnersLink,
  appendPartnersLink,
  extractKeyword
};
