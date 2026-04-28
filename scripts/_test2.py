import os, ctypes, sys
print("Step 1: starting")
_C = r'C:\Users\user\AppData\Local\Programs\Ollama\lib\ollama\cuda_v12'
os.add_dll_directory(_C)
for d in ['cudart64_12.dll', 'cublas64_12.dll', 'cublasLt64_12.dll']:
    try: ctypes.CDLL(os.path.join(_C, d)); print(f"{d} OK")
    except OSError as e: print(f"{d} FAIL: {e}")
print("Step 2: importing faster_whisper")
from faster_whisper import WhisperModel
print("Step 3: loading model")
model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
print("Step 4: model loaded OK")
del model
print("Step 5: done")
