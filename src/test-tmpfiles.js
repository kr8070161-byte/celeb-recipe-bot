const { uploadToTmpfiles } = require('./uploader');
const path = require('path');

async function test() {
  const filePath = path.join(__dirname, '..', 'public', 'generated-images', 'recipe-auto-cta-1-1783148714334.jpg');
  try {
    const url = await uploadToTmpfiles(filePath);
    console.log('Uploaded successfully! URL:', url);
  } catch (err) {
    console.error('Failed:', err);
  }
}

test();
