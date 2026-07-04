const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'generated-images');

const IMAGE_MAP = {
  "스무디": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80",
  "토스트": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80",
  "샐러드": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  "오레오": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
  "복숭아": "https://images.unsplash.com/photo-1628824930689-53e7f603c4f2?auto=format&fit=crop&w=800&q=80",
  "플레이팅": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  "파스타": "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80",
  "다이어트": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  "떡볶이": "https://images.unsplash.com/photo-1664273872111-e6308cf2436d?auto=format&fit=crop&w=800&q=80",
  "수플레": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  "육회": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  "수박": "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?auto=format&fit=crop&w=800&q=80",
  "초콜릿": "https://images.unsplash.com/photo-1548907040-4d42b52125ea?auto=format&fit=crop&w=800&q=80",
  "패티": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  "오이": "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=800&q=80",
  "요거트": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
  "접시": "https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=800&q=80",
  "팟타이": "https://images.unsplash.com/photo-1626808642875-0aa5454f2fa8?auto=format&fit=crop&w=800&q=80",
  "삼겹살": "https://images.unsplash.com/photo-1601356616077-695728de17cb?auto=format&fit=crop&w=800&q=80",
  "된장찌개": "https://images.unsplash.com/photo-1608797178974-15b35a61d121?auto=format&fit=crop&w=800&q=80"
};

async function preGenerate() {
  console.log('[이미지 선행 생성] 시작...');
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  const now = new Date();
  
  const dueItems = queue.filter(
    (item) => item.status === 'pending' && new Date(item.scheduledAt) <= now
  );
  
  if (dueItems.length === 0) {
    console.log('[이미지 선행 생성] 선행 생성할 예약 글이 없습니다.');
    return;
  }
  
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
  
  for (const item of dueItems) {
    if (item.imageUrl && item.imageUrl.startsWith('http')) {
      console.log(`[이미지 선행 생성] 이미 이미지 URL이 존재함: ${item.id}`);
      continue;
    }
    
    let keyword = "요리";
    let bgUrl = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
    
    for (const kw of Object.keys(IMAGE_MAP)) {
      if (item.text.includes(kw)) {
        keyword = kw;
        bgUrl = IMAGE_MAP[kw];
        break;
      }
    }
    
    const title = `${keyword} 인기 레시피`;
    const lines = item.text.split('\n');
    const body = lines.slice(1).join('\n').trim();
    
    const filename = `recipe-${item.id}.jpg`;
    const outputPath = path.join(IMAGES_DIR, filename);
    const pythonScript = path.join(__dirname, 'generate_card.py');
    
    try {
      console.log(`[이미지 선행 생성] 카드 생성 실행: ${title}`);
      execSync(`python "${pythonScript}" "${title}" "${body}" "${bgUrl}" "${outputPath}"`);
      
      const githubRawUrl = `https://raw.githubusercontent.com/kr8070161-byte/celeb-recipe-bot/main/public/generated-images/${filename}`;
      item.imageUrl = githubRawUrl;
      console.log(`[이미지 선행 생성] 생성 성공 -> ${githubRawUrl}`);
    } catch (err) {
      console.error(`[이미지 선행 생성] ❌ 에러 발생:`, err.message);
    }
  }
  
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  console.log('[이미지 선행 생성] 큐 파일 갱신 완료.');
}

preGenerate().catch(err => {
  console.error('[이미지 선행 생성] 치명적 오류:', err.message);
  process.exit(1);
});
