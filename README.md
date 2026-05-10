# plant-app

A plant care mobile app for houseplant and fruiting plant owners. Helps users
keep plants healthy through identification, photo-based diagnosis, smart
watering, and care guidance — with **Rooti**, a multimodal AI assistant, as
the signature feature.

App name is TBD. The code-level slug stays `plant-app` everywhere; the
on-screen name lives in one constant (`packages/shared/src/branding.ts`) so
renaming is a single edit. Rooti is the AI assistant's name.

> **Status:** Slice 0 — scaffolding only. No features wired up yet.

---

## Architecture at a glance

```
        ┌─────────────────────────────┐
        │  Mobile (React Native + Expo)│
        │  apps/mobile                │
        │                             │
        │  Phone-native AI:           │
        │  • STT (Slice 8)            │
        │  • TTS (Slice 7)            │
        │  • Vision (Slice 11)        │
        └──────┬──────────────────────┘
               │  HTTPS (LAN dev / Tailscale prod)
               ▼
   ┌────────────────────────────────────┐
   │  API (Fastify + Postgres)          │
   │  apps/api                          │
   │                                    │
   │  • Auth (Better Auth)              │
   │  • Plants / Care / Reminders       │
   │  • Rooti SSE proxy → Claude        │
   │  • Photo / video storage           │
   └────────┬──────────┬────────────────┘
            │          │
            │          └──────► Pl@ntNet, Open-Meteo, Resend, APNs/FCM
            │
            ▼ (future, on MacBook only)
   ┌────────────────────────────────────┐
   │  AI worker (native macOS)          │
   │  apps/ai-worker                    │
   │                                    │
   │  Heavy local AI: whisper.cpp,      │
   │  Piper TTS, MLX vision, etc.       │
   │  Outside Docker so Metal/MLX work. │
   └────────────────────────────────────┘
```

### Local-first AI

The architectural philosophy is that **expensive, audio-, or video-heavy AI
runs locally**. Only the LLM reasoning step calls a backend — and from the
backend, that backend talks to Claude via the Anthropic API. This buys us:

- Lower per-user cost (audio and video minutes don't hit a paid API).
- Better privacy (raw audio and video never leave the phone, and never go to
  third-party cloud services).
- Offline capability for non-LLM features.
- Lower latency for voice turns.

Three implementation tiers exist for STT, TTS, and vision (defined by the
`SpeechToTextEngine`, `TextToSpeechEngine`, `OnDeviceVisionEngine` interfaces
in `@plant-app/shared`):

1. **`phone-native`** — runs in-app on the phone using OS APIs or bundled
   models. Default. Privacy-first.
2. **`local-server`** — routes to a native worker on the MacBook host (see
   `apps/ai-worker/`). Used for higher-quality TTS, larger Whisper models, or
   anything the phone can't do well.
3. **`cloud`** — only used where required: Claude (LLM), Pl@ntNet (plant ID).

---

## Tech stack

| Layer | Pick | Notes |
|---|---|---|
| Mobile | React Native + Expo (prebuild + dev client) | Not managed workflow — managed can't run native modules we need (`whisper.rn`, `vision-camera` frame processors). |
| Mobile lang | TypeScript | strict, NodeNext-friendly |
| Routing | `expo-router` (file-based) | Files in `apps/mobile/app/` are routes. |
| API | Fastify + TypeScript | Streaming SSE for Rooti, low ceremony, fast. |
| ORM | Drizzle | Schema-as-TypeScript, no codegen runtime. |
| DB | PostgreSQL 16 (Docker) | Multi-arch (`linux/arm64` + `linux/amd64`). |
| Auth | Better Auth | Self-hostable. Google + Apple + Microsoft + Facebook + magic link + email/password. Sessions in Postgres. |
| Email (magic link) | Resend (free tier) | 3k/mo. |
| Push | Direct APNs (HTTP/2 + JWT) and FCM (HTTP v1) | No Expo Push — keeps us self-hosted. |
| LLM | Claude (Anthropic SDK) via the API server | Streaming, prompt caching, tool use. |
| Plant ID | Pl@ntNet (free tier) | Pluggable; Plant.id is the upgrade path. |
| Weather | Open-Meteo | Free, no key. |
| Storage | Local filesystem (behind a `StorageProvider` interface) | One-class swap to MinIO / S3 later. |

---

## Repo layout

```
plant-app/
├─ apps/
│  ├─ api/              Fastify server + Drizzle + Better Auth
│  ├─ mobile/           React Native + Expo (prebuild)
│  └─ ai-worker/        Reserved for native macOS AI workers (empty)
├─ packages/
│  └─ shared/           Cross-app TypeScript: data models, engine interfaces,
│                       Rooti tool schemas, branding
├─ docker-compose.yml   Postgres (and a commented Caddy slot for prod)
├─ pnpm-workspace.yaml
├─ tsconfig.base.json   Strict TS settings inherited by all workspaces
└─ README.md            (this file)
```

### apps/api — feature locations

```
apps/api/src/
├─ index.ts              Boot
├─ server.ts             Fastify app builder
├─ config/env.ts         Zod-validated env
├─ db/
│  ├─ schema.ts          Drizzle schema
│  ├─ client.ts          Connection pool
│  └─ migrate.ts         Migration runner
├─ routes/
│  ├─ health.ts          GET /health
│  └─ (auth, plants, rooti, …) added per slice
├─ services/
│  ├─ index.ts           ◀── COMPOSITION ROOT — swap engines here
│  ├─ ai/
│  │   ├─ llm/           LlmProvider impls (Anthropic, stub)
│  │   ├─ stt/           SpeechToTextEngine impls
│  │   ├─ tts/           TextToSpeechEngine impls
│  │   └─ vision/        OnDeviceVisionEngine impls
│  └─ providers/
│      ├─ plantId/       PlantIdProvider impls
│      ├─ weather/       WeatherProvider impls
│      ├─ storage/       StorageProvider impls
│      ├─ email/         EmailProvider impls
│      └─ push/          PushProvider impls
└─ rooti/
   └─ handlers.ts        Typed Rooti tool handlers (testable without LLM)
```

### apps/mobile — feature locations

```
apps/mobile/
├─ app/                  expo-router routes (file-based)
│  ├─ _layout.tsx
│  └─ index.tsx          placeholder home
└─ src/
   ├─ api/client.ts      tiny fetch wrapper
   ├─ config/env.ts      EXPO_PUBLIC_* env access
   └─ theme/             palette + spacing using @plant-app/shared/branding
```

### packages/shared

```
packages/shared/src/
├─ branding.ts           Single source of truth for app name, palette, persona
├─ models/               Plant, CareEvent, PhotoEntry, …, RootiMessage
├─ interfaces/           Engine + provider contracts
└─ rooti/
   ├─ tools.ts           Typed Rooti tool registry + JSON schemas
   └─ systemPrompt.ts    Stable Rooti system prompt (cache-friendly)
```

---

## Running locally

### Prerequisites

- Node 22 (an `.nvmrc` is at the repo root — `nvm use` picks it up)
- `pnpm` 9+ (corepack-managed; `corepack enable` if not active)
- Docker (for Postgres)
- For mobile: Xcode (iOS) and/or Android Studio (Android), or just run on web
  with `pnpm --filter @plant-app/mobile web`

### First-time setup

```bash
# Use the right Node
nvm use

# Install deps for every workspace
pnpm install

# Copy env files (they're gitignored; defaults are dev-friendly)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# Bring up Postgres
pnpm db:up

# Run migrations (no migrations exist yet — Slice 1 generates the first batch)
# pnpm --filter @plant-app/api db:generate
# pnpm --filter @plant-app/api db:migrate

# Start the API (port 3000)
pnpm dev:api

# In another terminal, start Expo (Metro bundler)
pnpm dev:mobile
```

You should see the API log `plant-app api listening` and the mobile placeholder
home screen show **API status: ok**.

---

## How to swap any engine or provider

Every engine and external service lives behind an interface in
`@plant-app/shared/interfaces`. The API's **composition root** at
`apps/api/src/services/index.ts` binds each interface to a concrete class.

**Example — swap the LLM from the stub to real Claude (Slice 3):**

```ts
// apps/api/src/services/index.ts
- import { StubLlmProvider } from './ai/llm/stubLlm.js';
+ import { AnthropicLlmProvider } from './ai/llm/anthropicLlm.js';

  export function buildServices(env: AppEnv): Services {
    return {
-     llm: new StubLlmProvider(),
+     llm: new AnthropicLlmProvider({ apiKey: env.ANTHROPIC_API_KEY!, model: env.ANTHROPIC_MODEL }),
      ...
    };
  }
```

Same pattern for swapping in:
- **Pl@ntNet** plant ID → Plant.id (paid).
- **Local FS storage** → MinIO / S3.
- **Phone-native STT** → Whisper on the MacBook AI worker.

---

## MacBook deployment (future)

The production target is a MacBook Pro (Apple Silicon, 128 GB unified memory)
running on the user's network. Slice 0 is already future-proofed for this:

1. **Postgres + API** run via `docker compose up`. Images are multi-arch
   (`linux/arm64`).
2. **Native AI workers** (whisper.cpp, Piper, MLX) live in `apps/ai-worker/`
   and are started by `launchd` outside Docker so Metal/MLX/CoreML work. The
   API talks to them at `AI_WORKER_URL`.
3. **HTTPS** is provided by the commented Caddy service in `docker-compose.yml`
   — uncomment when ready and drop a `Caddyfile` next to it.
4. **Phone → MacBook** connectivity uses **Tailscale** (free for personal,
   encrypted, works on cellular). The mobile `EXPO_PUBLIC_API_URL` switches
   from a LAN address to the Tailscale hostname when porting.
5. **Storage** lives at `${DATA_DIR}/storage` so it travels with the data dir
   on `rsync` or volume export.

---

## Slice roadmap

Slice 0 (this PR) is scaffolding only. Subsequent slices each ship one
working vertical capability and update the README + composition root.

| # | Slice | What ships |
|--:|---|---|
| 0 | Scaffolding | This PR. Workspaces, interfaces, stubs, health check. |
| 1 | Auth | Better Auth wired (email, Google, Apple, Microsoft, Facebook, magic link via Resend). Login/signup screens. |
| 2 | Plants CRUD | Add plant, list, detail. No AI. |
| 3 | **Rooti text MVP** | Anthropic SDK, SSE streaming proxy, tool use, plant context. Send a text message about a plant and get a streamed reply. |
| 4 | Photo attach | Camera/picker on mobile, on-device thumbnail, upload, Claude vision. |
| 5 | Plant ID | Pl@ntNet provider, identify-from-photo flow. |
| 6 | Care reminders | Schedule, log waterings/etc., direct APNs + FCM. |
| 7 | Weather + watering recs | Open-Meteo provider, recommendations on plant detail. |
| 8 | On-device TTS | `expo-speech` for Rooti voice output. |
| 9 | On-device STT | Push-to-talk via native `SFSpeechRecognizer` / `SpeechRecognizer`. |
| 10 | Voice mode | Sentence-streamed TTS over SSE. |
| 11 | Vision frames | `vision-camera` + `react-native-fast-tflite` plant pre-filter for video. |
| 12 | Light meter | Stretch — phone camera as light meter for location recs. |

---

## Conventions

- **Junior-friendly code over clever code.** Clear names, minimal abstraction,
  no magic. If you'd have to read three files to understand one, simplify.
- **No comments that restate code.** Comments should explain *why*, not what.
- **One slice per PR.** Each ships an end-to-end working feature, not a layer.
- **Interfaces first.** New engines / providers go behind a contract in
  `@plant-app/shared/interfaces` before getting an impl.
- **Secrets stay on the backend.** The Anthropic API key never touches the
  mobile bundle. `EXPO_PUBLIC_*` is the only path into the JS bundle and is
  considered public by definition.

---

## Out of scope for MVP

Architected so they can be added later, but **not built now**: community
features, human expert chat, propagation tracker, shopping, pollination tools.

---

## License

`UNLICENSED` while the app is in build-out. Set a real license when we ship.
