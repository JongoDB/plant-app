# @plant-app/ai-worker

Placeholder. This package is **empty by design** in Slice 0.

## What this will become

When we port the backend to the MacBook Pro target, this workspace will hold
**native macOS processes** that perform AI inference using Apple Silicon's
GPU/Neural Engine via Metal, MLX, and CoreML. Native — not Docker — because
those frameworks aren't reachable from inside Docker on macOS.

Anticipated workers:

- `whisper-server` — `whisper.cpp` HTTP server with CoreML acceleration for
  high-quality offline-style STT (when the phone offloads instead of using its
  native STT).
- `piper-server` — Piper TTS via `onnxruntime` for natural-sounding voice
  output. Optional upgrade over phone-native `expo-speech`.
- `vision-server` — small vision models (MLX or ONNX) for heavy frame analysis
  beyond what the phone runs locally.
- (Stretch) `local-llm` — a local Llama / Qwen / Gemma 70B-class model running
  via MLX as a privacy-mode fallback for the LLM provider.

## How they integrate

Each worker is a small HTTP server. The API server (`apps/api`) talks to them
at `AI_WORKER_URL` (env var). Implementations of `SpeechToTextEngine`,
`TextToSpeechEngine`, `OnDeviceVisionEngine`, and (optionally) `LlmProvider`
in `apps/api/src/services/` will gain a `local-server` variant that calls
these workers.

## Deployment

Workers are managed by `launchd` on the MacBook (auto-start, auto-restart).
A `LaunchAgents/` directory will hold the plists. They never go through
Docker.
