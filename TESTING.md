# Testing the plant-app

Pick this up on any machine. The repo is at https://github.com/JongoDB/plant-app
— `git clone` it and follow the relevant section below.

There are two paths:

- **Web** — fastest, runs in a browser, **most of the UI works**. Voice
  recording, the smart-camera live frame analysis, and push notifications
  don't (those are device-only). Good for a 5-minute UX poke.
- **iOS / Android** — full feature set including voice mode, smart camera,
  light meter, photo capture from camera. Needs Xcode (macOS) or Android
  Studio installed.

---

## 1. One-time setup (any path)

Prereqs: Node 22, Docker (for Postgres), pnpm 9 via corepack.

```bash
git clone https://github.com/JongoDB/plant-app.git
cd plant-app

# Use the right Node
nvm use            # or: corepack enable && nvm install 22

# Install deps for every workspace
pnpm install

# Copy env files (gitignored; defaults are dev-friendly)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Now drop your keys into `apps/api/.env`:

```
ANTHROPIC_AUTH_TOKEN=<your `claude setup-token` value, OR set ANTHROPIC_API_KEY instead>
PLANTNET_API_KEY=<get one free at https://my.plantnet.org/account/getApiKey>
AUTH_SECRET=<openssl rand -hex 32>   # any 32-char hex string is fine for dev
```

Optional and not needed to test:
- Resend, Google/Apple/Microsoft/Facebook OAuth — those buttons stay as
  "Coming soon" placeholders without keys.
- APNs / FCM — push notifications. The reminder scheduler logs due
  reminders to the API console without these.

Bring up Postgres + apply migrations:

```bash
pnpm db:up
pnpm --filter @plant-app/api db:migrate
```

Start the API (port 3000):

```bash
pnpm dev:api
```

You should see:

```
[…] INFO: Server listening at http://0.0.0.0:3000
[…] INFO: plant-app api listening
```

Hit `http://localhost:3000/health` and you should get
`{"status":"ok",…}`. **Leave this terminal running** for the rest of the
test.

---

## 2A. Test on web (fastest)

In a second terminal:

```bash
pnpm --filter @plant-app/mobile dev   # or: cd apps/mobile && npx expo start --web
```

Expo Metro will pick a port (usually `8081`; if taken, pass
`--port 19006`). Press **`w`** in the terminal to open the web build, or
just navigate to the URL it prints (e.g. `http://localhost:8081`).

### What you can do on web

- ✅ Sign up / sign in (email + password). OAuth buttons render but are
  inactive placeholders.
- ✅ Add / view / delete plants.
- ✅ Identify a plant (Pl@ntNet) — the file picker stands in for the
  camera. Drop in a flower photo and you should get back top-5 species.
- ✅ Chat with Rooti. The mic button shows but reports "voice input
  isn't available on web" — type instead.
- ✅ Attach a photo to a Rooti message via the file picker.
- ✅ Reminders: schedule, view, mark complete.
- ✅ Weather: grant location permission in the browser; the home weather
  card lights up.
- ✅ Light meter — the JS implementation works on web. Use the file
  picker to pick a photo of a wall/window/surface; you'll get a category.
- ⏸ Smart camera — shows the "open on a device" message; this one's
  native-only.
- ⏸ Voice mode — the toggle appears in the Rooti header, but TTS support
  varies by browser and STT is unavailable. Mostly a no-op on web.

### Known web quirks

- `expo-secure-store` falls back to `localStorage`. Sessions persist
  across reloads but not across browsers.
- Browser cookie behavior: we attach the auth cookie manually on every
  fetch (`credentials: 'omit'`), so it Just Works regardless of CORS
  modes — but it means the browser doesn't show the session cookie in
  devtools' Cookies tab; check `localStorage` → `plantapp.…` instead.

---

## 2B. Test on iOS / Android (full feature set)

Mobile uses several native modules (`whisper.rn`, `vision-camera`,
`fast-tflite`, `expo-secure-store`, `expo-location`, …) that don't run in
Expo Go. You need a **dev client** build.

### iOS (macOS only)

```bash
cd apps/mobile
npx expo prebuild --no-install   # generates ios/ directory
cd ios && pod install && cd ..
npx expo run:ios                 # builds + installs on the simulator or a tethered device
```

If you get a "no provisioning profile" error on a real device, open
`apps/mobile/ios/PlantApp.xcworkspace` in Xcode, select a development
team under signing, and run from there.

### Android

```bash
cd apps/mobile
npx expo prebuild --no-install   # generates android/ directory
npx expo run:android             # builds + installs on connected emulator/device
```

Make sure the emulator is up before running, or a USB-debug-enabled
device is plugged in.

### Pointing the device at your dev API

If you're running the API on your laptop and the app on a phone over
the same Wi-Fi: edit `apps/mobile/.env` and set

```
EXPO_PUBLIC_API_URL=http://<your-machine's-LAN-ip>:3000
```

Then rebuild the app (env values bake into the JS bundle).

### What to try first on a real device

1. **Sign up.** Email + password.
2. **Add a plant** — give it a nickname, location.
3. **Take a photo** in the Rooti chat (`+` icon on the input bar).
   You should see it upload + appear in your message bubble.
4. **Smart camera** (📷 button on the home action row) — point the camera
   at a plant; you should see a `🌿 plant detected` overlay when it
   recognises foliage. Tap the shutter to upload + drop into Rooti.
5. **Identify a plant** — Identify button on home, take or pick a clear
   photo of leaves/flowers. Top-5 candidates with confidence bars.
   Tap one to pre-fill a new plant form.
6. **Voice mode** — open a Rooti chat, tap **🔇 Voice off** in the header
   to flip to **🔊 Voice on**. Hold the 🎤 button, ask "how often should I
   water this?" — release. The transcript should populate the input,
   auto-send, and Rooti should start speaking the reply within a beat.
7. **Light meter** — open a plant's detail, tap "Check the light here",
   take a photo of where the plant lives. You'll get a low / medium /
   bright-indirect / direct category and a "save as plant's light" button.
8. **Schedule a reminder** — from a plant's detail. Pick "water" /
   "today" / "every 7 days." Mark it complete the next day; it should
   roll forward 7 days and log a care event.
9. **Reminders list** — Settings → All reminders.
10. **Privacy / About** — Settings → About & Privacy. The local-first
    explanation lives there.

---

## 3. Things that need creds you don't have set

| Feature | Without creds | What unlocks it |
|---|---|---|
| Magic-link sign-in | Button is a "Coming soon" placeholder | `RESEND_API_KEY` + `EMAIL_FROM` in `apps/api/.env` |
| Google / Apple / Microsoft / Facebook sign-in | Same | Provider client ID + secret pairs |
| Push notifications when reminders fire | Scheduler logs the due reminder; nothing pings the device | Apple `.p8` auth key + key/team/bundle IDs, plus FCM service-account JSON |

---

## 4. Quick smoke-tests you can run from a terminal

These hit the API directly. Useful for confirming the backend is healthy
without touching the UI.

```bash
# Sign up
curl -sS -c /tmp/c.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"smokepass123","name":"Smoke"}' | head -c 200

# Create a plant
curl -sS -b /tmp/c.txt -X POST http://localhost:3000/plants \
  -H 'Content-Type: application/json' \
  -d '{"nickname":"Fernie","commonName":"Boston Fern"}'

# List
curl -sS -b /tmp/c.txt http://localhost:3000/plants

# Weather (Berlin)
curl -sS -b /tmp/c.txt 'http://localhost:3000/weather?lat=52.52&lng=13.405&days=3'

# Rooti (will stream SSE; ctrl-C to stop)
curl -sS -N -b /tmp/c.txt -X POST http://localhost:3000/rooti/messages \
  -H 'Content-Type: application/json' \
  -d '{"text":"Quick: in one sentence, when should I water Fernie?"}'
```

---

## 5. Troubleshooting

**API errors with `Invalid environment`** — you forgot to copy
`apps/api/.env.example` to `apps/api/.env`, or `AUTH_SECRET` is too
short. Set it to any 32-char hex string for dev.

**Mobile complains about `Cannot find module @plant-app/shared`** — run
`pnpm install` from the workspace root, not the app subfolder.

**Web build fails with `Cannot find module react-native-web/dist/index`**
— make sure `apps/mobile/node_modules/react-native-web` exists. If not,
`pnpm install` again. The repo's `.npmrc` sets `node-linker=hoisted`
which is required for Metro to find transitive deps.

**Anthropic 429 on every Rooti turn** — the OAuth setup-token can throttle
non-Claude-Code traffic. If it persists, drop a billed `ANTHROPIC_API_KEY`
into `apps/api/.env` and remove the `ANTHROPIC_AUTH_TOKEN` line. Or try
`ANTHROPIC_MODEL=claude-haiku-4-5` (different rate-limit pool).

**Smart camera shows the model loading forever** — the TFLite model file
is at `apps/mobile/assets/models/efficientnet_lite0_int8.tflite` (~5 MB).
If the file's missing, `git lfs` may have skipped it; check the file
size after clone.

**Light meter says "couldn't read image"** — make sure the picker returned
a JPEG. PNGs won't decode (we ship only `jpeg-js`); pick a different
photo.

**Anything else** — check the API server log for the request, or
`docker compose logs postgres` for DB issues.

---

## 6. What I'd love your read on

A short list of subjective calls I made that are easy to flip:

- **Rooti's voice and persona** — system prompt at
  `packages/shared/src/rooti/systemPrompt.ts:1`. Easy to retune.
- **Voice-mode pacing** — sentence buffer flushes on `[.!?]` + whitespace.
  If first speech feels slow, we can flush on the first comma after N
  words. `apps/mobile/src/services/tts/sentenceBuffer.ts:21`.
- **Reminder presets** — the "today / tomorrow / 3 days / a week" and
  "don't repeat / every 3 / every week / every 2 weeks / every month"
  defaults are in `apps/mobile/app/reminders/new.tsx:18`. Adjust to taste.
- **Plant-detection threshold** — the smart camera's "🌿 plant detected"
  signal triggers when the top-1 ImageNet class is in our PLANT_CLASS_
  INDICES set (`apps/mobile/src/services/vision/plantClasses.ts`).
  ImageNet covers flowers and a few fruits well, houseplants poorly —
  swap in a PlantVillage-trained classifier when you want better
  recall on common houseplants.
- **Light-meter buckets** — luminance thresholds (50 / 110 / 180 out of
  255) at `apps/mobile/src/utils/lightMeter.ts:21`. Try the meter under a
  few known conditions and recalibrate if the categories feel off.
