/**
 * Composition root for service implementations.
 *
 * This is THE file to edit when swapping any engine or provider. Each entry
 * binds an interface (defined in @plant-app/shared) to a concrete class. To
 * upgrade — for example, point STT at the MacBook AI worker — change one
 * line here and that's the whole change.
 */

import type {
  LlmProvider,
  SpeechToTextEngine,
  TextToSpeechEngine,
  OnDeviceVisionEngine,
  PlantIdProvider,
  WeatherProvider,
  StorageProvider,
  EmailProvider,
  PushProvider,
} from '@plant-app/shared';

import type { AppEnv } from '../config/env.js';
import { AnthropicLlmProvider } from './ai/llm/anthropicLlm.js';
import { StubLlmProvider } from './ai/llm/stubLlm.js';
import { StubSpeechToTextEngine } from './ai/stt/stubStt.js';
import { StubTextToSpeechEngine } from './ai/tts/stubTts.js';
import { StubOnDeviceVisionEngine } from './ai/vision/stubVision.js';
import { StubPlantIdProvider } from './providers/plantId/stubPlantId.js';
import { StubWeatherProvider } from './providers/weather/stubWeather.js';
import { LocalFsStorageProvider } from './providers/storage/localFsStorage.js';
import { StubEmailProvider } from './providers/email/stubEmail.js';
import { StubPushProvider } from './providers/push/stubPush.js';

export interface Services {
  llm: LlmProvider;
  stt: SpeechToTextEngine;
  tts: TextToSpeechEngine;
  vision: OnDeviceVisionEngine;
  plantId: PlantIdProvider;
  weather: WeatherProvider;
  storage: StorageProvider;
  email: EmailProvider;
  push: PushProvider;
}

export function buildServices(env: AppEnv): Services {
  // The LLM goes live as soon as either an OAuth token or an API key is set.
  // Without one, fall back to a stub that throws clearly when invoked.
  const llm =
    env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY
      ? new AnthropicLlmProvider({
          authToken: env.ANTHROPIC_AUTH_TOKEN,
          apiKey: env.ANTHROPIC_API_KEY,
          defaultModel: env.ANTHROPIC_MODEL,
        })
      : new StubLlmProvider();

  return {
    llm,
    stt: new StubSpeechToTextEngine(),
    tts: new StubTextToSpeechEngine(),
    vision: new StubOnDeviceVisionEngine(),
    plantId: new StubPlantIdProvider(),
    weather: new StubWeatherProvider(),
    storage: new LocalFsStorageProvider({
      rootDir: env.STORAGE_DIR,
      publicBase: env.STORAGE_PUBLIC_BASE_URL,
    }),
    email: new StubEmailProvider(),
    push: new StubPushProvider(),
  };
}
