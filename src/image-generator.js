/**
 * image-generator.js
 * AI를 활용한 푸드/브런치 이미지 자동 생성 및 로컬 호스팅 모듈
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'generated-images');

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// 주제 및 식재료 맞춤형 고품질 이미지 맵
const IMAGE_MAP = {
  "스무디": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80", // 스무디/아보카도
  "토스트": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80", // 에그 토스트
  "샐러드": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", // 샐러드
  "오레오": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80", // 오레오 아이스크림
  "복숭아": "https://images.unsplash.com/photo-1628824930689-53e7f603c4f2?auto=format&fit=crop&w=800&q=80", // 복숭아
  "플레이팅": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", // 플레이팅/집밥
  "파스타": "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80", // 크림파스타
  "다이어트": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80", // 다이어트 식단
  "떡볶이": "https://images.unsplash.com/photo-1664273872111-e6308cf2436d?auto=format&fit=crop&w=800&q=80", // 떡볶이
  "수플레": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80", // 수플레 팬케이크
  "육회": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", // 육회비빔밥
  "수박": "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?auto=format&fit=crop&w=800&q=80", // 수박
  "초콜릿": "https://images.unsplash.com/photo-1548907040-4d42b52125ea?auto=format&fit=crop&w=800&q=80", // 두바이 초콜릿
  "패티": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", // 수제버거 패티
  "오이": "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=800&q=80", // 오이 반찬
  "요거트": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80", // 요거트 파르페
  "접시": "https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=800&q=80", // 플레이팅 접시
  "팟타이": "https://images.unsplash.com/photo-1626808642875-0aa5454f2fa8?auto=format&fit=crop&w=800&q=80", // 팟타이
  "삼겹살": "https://images.unsplash.com/photo-1601356616077-695728de17cb?auto=format&fit=crop&w=800&q=80", // 저탄고지 삼겹살
  "된장찌개": "https://images.unsplash.com/photo-1608797178974-15b35a61d121?auto=format&fit=crop&w=800&q=80" // 된장찌개
};

/**
 * 게시글 텍스트에 어울리는 고품질 이미지를 매칭하여 반환
 * @param {string} text - 게시글 본문
 * @returns {Promise<string>} - 호스팅된 이미지 URL
 */
async function generateAndSaveImage(text) {
  try {
    console.log(`[이미지 선택] 텍스트 키워드 기반 이미지 매칭 시작...`);
    
    // 본문에서 키워드를 찾아 매칭되는 이미지 리턴
    for (const keyword of Object.keys(IMAGE_MAP)) {
      if (text.includes(keyword)) {
        console.log(`[이미지 매칭] 성공 (키워드: "${keyword}") -> ${IMAGE_MAP[keyword]}`);
        return IMAGE_MAP[keyword];
      }
    }

    // 기본 이미지
    console.log(`[이미지 매칭] 매칭 키워드 없음, 기본 음식 플레이팅 이미지 사용`);
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
  } catch (err) {
    console.error(`[이미지 생성 실패] 기본 이미지로 대체합니다.`, err.message);
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
  }
}

module.exports = {
  generateAndSaveImage,
};
