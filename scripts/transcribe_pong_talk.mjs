import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEYS = (process.env.GEMINI_API_KEYS || '').split(',').filter(Boolean);
const AUDIO_PATH = path.join(__dirname, '..', 'stores', 'pong_talk_audio.mp3');

// 若已有 file URI 可直接帶入，跳過重新上傳
const EXISTING_FILE_NAME = 'files/jmnuh6vseviw';

async function getFileUri(apiKey, fileName) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
  );
  if (!res.ok) throw new Error('Get file failed: ' + await res.text());
  const file = await res.json();
  return file.uri;
}

async function uploadFile(apiKey) {
  console.log('上傳音訊中...');
  const fileData = fs.readFileSync(AUDIO_PATH);
  const boundary = 'boundary_' + Date.now();
  const metadata = JSON.stringify({ file: { display_name: 'pong_talk_audio' } });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: audio/mpeg\r\n\r\n`),
    fileData,
    Buffer.from(`\r\n--${boundary}--`)
  ]);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
  );
  if (!res.ok) throw new Error('Upload failed: ' + await res.text());
  const result = await res.json();
  return result.file;
}

async function waitForProcessing(apiKey, fileName) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`);
    const file = await res.json();
    if (file.state === 'ACTIVE') return file.uri;
    if (file.state === 'FAILED') throw new Error('Gemini 處理失敗');
    console.log('處理中...', file.state);
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error('等待逾時');
}

async function transcribe(apiKey, fileUri, model = 'gemini-2.5-flash') {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { file_data: { mime_type: 'audio/mpeg', file_uri: fileUri } },
            { text: '請將這段音訊完整轉錄成繁體中文逐字稿。如有說話者切換請標記。保留段落結構，適當換行。只輸出逐字稿內容，不要任何其他說明或前言。' }
          ]
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 16384 }
      })
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ` + await res.text());
  const result = await res.json();
  if (result.error) throw new Error(result.error.message + ` (${result.error.status})`);
  return result.candidates[0].content.parts[0].text;
}

async function main() {
  // 取得已上傳檔案的 URI
  let fileUri;
  for (const key of API_KEYS) {
    try {
      fileUri = await getFileUri(key, EXISTING_FILE_NAME);
      console.log('使用已上傳的檔案:', fileUri);
      break;
    } catch {}
  }
  if (!fileUri) {
    // 重新上傳
    const file = await uploadFile(API_KEYS[0]);
    fileUri = await waitForProcessing(API_KEYS[0], file.name);
  }

  // 只用有權存取這個 file 的前兩組 key，輪流試不同模型
  const VALID_KEYS = API_KEYS.slice(0, 2);
  const MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastErr;

  for (let attempt = 0; attempt < 5; attempt++) {
    for (const key of VALID_KEYS) {
      for (const model of MODELS) {
        try {
          console.log(`第 ${attempt + 1} 次嘗試，model: ${model}，key: ...${key.slice(-6)}`);
          const transcript = await transcribe(key, fileUri, model);
          const outPath = path.join(__dirname, '..', 'stores', 'pong_talk_transcript.txt');
          fs.writeFileSync(outPath, transcript, 'utf8');
          console.log('\n=== 完成，已存到 stores/pong_talk_transcript.txt ===\n');
          console.log(transcript.slice(0, 600));
          return;
        } catch (e) {
          console.log(`失敗: ${e.message.slice(0, 80)}`);
          lastErr = e;
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
    if (attempt < 4) {
      console.log(`等待 30 秒後重試...`);
      await new Promise(r => setTimeout(r, 30000));
    }
  }
  throw new Error('所有嘗試皆失敗：' + lastErr?.message);
}

main().catch(e => { console.error(e); process.exit(1); });
