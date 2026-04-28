import os, ctypes
from pathlib import Path
print("Step 1: starting")
_C = r'C:\Users\user\AppData\Local\Programs\Ollama\lib\ollama\cuda_v12'
os.add_dll_directory(_C)
for d in ['cudart64_12.dll', 'cublas64_12.dll', 'cublasLt64_12.dll']:
    try: ctypes.CDLL(os.path.join(_C, d))
    except OSError: pass

audio = Path(r'c:\Users\user\Desktop\nonchurch-nuxt\stores\audio\9aWpePHshxE.mp3')
print(f"Audio exists: {audio.exists()}, size: {audio.stat().st_size if audio.exists() else 'N/A'}")

from faster_whisper import WhisperModel
print("Step 2: loading model")
model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
print("Step 3: starting transcription")
segments, info = model.transcribe(str(audio), language='zh',
    condition_on_previous_text=True, vad_filter=True, clip_timestamps=[28])
print(f"Step 4: generator created, info={info.language}")
print("Step 5: consuming first 3 segments...")
count = 0
for seg in segments:
    print(f"  seg {count}: {seg.text[:50]}")
    count += 1
    if count >= 3:
        break
print(f"Step 6: got {count} segments, breaking")
