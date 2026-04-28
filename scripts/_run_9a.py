import os, ctypes, sys
from pathlib import Path

_C = r'C:\Users\user\AppData\Local\Programs\Ollama\lib\ollama\cuda_v12'
os.add_dll_directory(_C)
for d in ['cudart64_12.dll', 'cublas64_12.dll', 'cublasLt64_12.dll']:
    try: ctypes.CDLL(os.path.join(_C, d))
    except OSError: pass

from faster_whisper import WhisperModel

print('[1/4] Loading large-v3-turbo on CUDA...', flush=True)
model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
print('[2/4] Model ready. Transcribing 9aWpePHshxE (from sec 28)...', flush=True)

audio = Path(r'c:\Users\user\Desktop\nonchurch-nuxt\stores\audio\9aWpePHshxE.mp3')
segments, _ = model.transcribe(str(audio), language='zh',
    condition_on_previous_text=True, vad_filter=True, clip_timestamps=[28])

parts = []
for i, seg in enumerate(segments):
    t = seg.text.strip()
    if t:
        parts.append(t)
        if i % 20 == 0:
            print(f'  seg {i}: {t[:40]}', flush=True)

text = '\n'.join(parts)
print(f'[3/4] Done: {len(text)} chars, {len(parts)} segments', flush=True)

out = Path(r'c:\Users\user\Desktop\nonchurch-nuxt\stores\transcripts\9aWpePHshxE.txt')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(text, encoding='utf-8')
print(f'[4/4] Saved: {out}', flush=True)

del model
print('GPU released. Done.', flush=True)
