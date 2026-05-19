#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《無境界者》人物專訪 — 本地 faster-whisper 轉錄器（fallback / 免費）

當 Gemini free-tier 配額用完或不方便使用付費 key 時的備援。
輸出純文字逐字稿（無說話者標籤，由 Claude 在整理時依語意分辨）。

用法：
  python scripts/transcribe_interview_whisper.py AUDIO --out FILE
  python scripts/transcribe_interview_whisper.py AUDIO --out FILE --model large-v3 --device cuda
"""

import argparse
import os
import sys
import time
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    # CTranslate2（C++ 模組）找 cuBLAS / cuDNN DLL — 從 pip 裝的 nvidia-*-cu12 拿
    # 必須改 PATH 環境變數（os.add_dll_directory 對 native C++ extension 無效）
    try:
        import nvidia.cublas  # type: ignore
        import nvidia.cudnn  # type: ignore
        try:
            import nvidia.cuda_nvrtc  # type: ignore
            _extra = [nvidia.cuda_nvrtc]
        except ImportError:
            _extra = []
        for mod in (nvidia.cublas, nvidia.cudnn, *_extra):
            for base in list(mod.__path__):
                bin_dir = os.path.join(base, "bin")
                if os.path.isdir(bin_dir):
                    os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")
                    os.add_dll_directory(bin_dir)
    except ImportError:
        pass  # 沒裝就 fallback 到 CPU 或讓 CTranslate2 報錯


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", help="音檔路徑 (m4a/mp3/wav/webm)")
    ap.add_argument("--out", required=True, help="輸出 txt 路徑")
    ap.add_argument(
        "--model",
        default="large-v3",
        help="Whisper 模型 (tiny/base/small/medium/large-v3，預設 large-v3)",
    )
    ap.add_argument(
        "--device", default="cuda", help="cuda / cpu（預設 cuda）"
    )
    ap.add_argument(
        "--compute-type",
        default="float16",
        help="float16 (GPU) / int8 (CPU 推薦) / int8_float16",
    )
    ap.add_argument("--language", default="zh", help="語言代碼，預設 zh")
    ap.add_argument(
        "--initial-prompt",
        default=(
            "以下是繁體中文台灣的口述訪談。"
            "受訪者是吳昶興教授，訪問者是張辰瑋。"
            "主題涉及衛理公會、龐君華會督、城中教會、循道精神、"
            "東吳大學、衛理神學研究院、長老教會、唐培禮、方大林、"
            "黨外運動。請使用繁體中文與全形標點。"
        ),
        help="prompt 給模型作為語境參考",
    )
    args = ap.parse_args()

    audio_path = Path(args.audio)
    if not audio_path.exists():
        sys.exit(f"音檔不存在：{audio_path}")

    from faster_whisper import WhisperModel

    print(
        f"loading model={args.model} device={args.device} compute={args.compute_type}",
        flush=True,
    )
    t0 = time.time()
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    print(f"model loaded in {time.time() - t0:.1f}s", flush=True)

    print(f"transcribing {audio_path.name} ...", flush=True)
    t0 = time.time()
    segments, info = model.transcribe(
        str(audio_path),
        language=args.language,
        initial_prompt=args.initial_prompt,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        beam_size=5,
    )

    print(
        f"detected language={info.language} (p={info.language_probability:.2f}) "
        f"duration={info.duration:.1f}s",
        flush=True,
    )

    lines: list[str] = []
    last_end = 0.0
    for seg in segments:
        # 中間有較長停頓就插入空行
        if seg.start - last_end > 2.0 and lines:
            lines.append("")
        lines.append(seg.text.strip())
        last_end = seg.end
        # 進度顯示
        if int(seg.end) % 60 == 0:
            print(
                f"  ... {seg.end:.0f}s / {info.duration:.0f}s",
                flush=True,
            )

    text = "\n".join(lines)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text + "\n", encoding="utf-8", newline="\n")
    print(
        f"\n✓ 寫出 {len(text)} 字 → {out_path}  (耗時 {time.time() - t0:.1f}s)"
    )


if __name__ == "__main__":
    main()
