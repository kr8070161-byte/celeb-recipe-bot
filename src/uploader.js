/**
 * uploader.js
 * 로컬에서 생성된 이미지를 외부 무료 이미지 호스팅 서비스에 업로드하여
 * Meta Threads API가 접근할 수 있는 공개 URL을 반환하는 모듈
 */

const fs = require('fs');

/**
 * Catbox.moe에 이미지 업로드
 * @param {string} filePath 
 * @returns {Promise<string>} 공개 이미지 URL
 */
async function uploadToCatbox(filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const blob = new Blob([fileData], { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, 'recipe-card.jpg');

    console.log(`[Uploader] Catbox 업로드 시도 중: ${filePath}`);
    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Catbox HTTP 오류: ${response.status}`);
    }

    const url = await response.text();
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('https://')) {
      console.log(`[Uploader] Catbox 업로드 성공: ${cleanUrl}`);
      return cleanUrl;
    } else {
      throw new Error(`Catbox 응답 오류: ${cleanUrl}`);
    }
  } catch (err) {
    console.warn(`[Uploader] Catbox 업로드 실패: ${err.message}`);
    throw err;
  }
}

/**
 * Tmpfiles.org에 이미지 업로드 (만료 기간이 있으나 Threads 컨테이너 생성용으로 충분)
 * @param {string} filePath 
 * @returns {Promise<string>} 공개 이미지 URL
 */
async function uploadToTmpfiles(filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const blob = new Blob([fileData], { type: 'image/jpeg' });
    
    const formData = new FormData();
    formData.append('file', blob, 'recipe-card.jpg');

    console.log(`[Uploader] Tmpfiles 업로드 시도 중: ${filePath}`);
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Tmpfiles HTTP 오류: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === 'success' && result.data && result.data.url) {
      const viewUrl = result.data.url;
      // 다운로드 다이렉트 링크로 변경
      const downloadUrl = viewUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      console.log(`[Uploader] Tmpfiles 업로드 성공: ${downloadUrl}`);
      return downloadUrl;
    } else {
      throw new Error(`Tmpfiles 응답 형식 오류: ${JSON.stringify(result)}`);
    }
  } catch (err) {
    console.warn(`[Uploader] Tmpfiles 업로드 실패: ${err.message}`);
    throw err;
  }
}

/**
 * 다중 백업 업로드 함수
 * @param {string} filePath 
 * @returns {Promise<string>} 공개 이미지 URL
 */
async function uploadImage(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`업로드할 파일이 존재하지 않습니다: ${filePath}`);
  }

  // 1. Catbox 우선 시도
  try {
    return await uploadToCatbox(filePath);
  } catch (e) {
    console.log('[Uploader] Catbox 업로드 실패, Tmpfiles 백업 업로드 시도...');
    // 2. Tmpfiles 백업 시도
    try {
      return await uploadToTmpfiles(filePath);
    } catch (err2) {
      console.error('[Uploader] 모든 업로드 서비스가 실패했습니다.');
      throw err2;
    }
  }
}

module.exports = {
  uploadImage,
  uploadToCatbox,
  uploadToTmpfiles,
};
