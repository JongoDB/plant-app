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
import { StubLlmProvider } from './ai/llm/stubLlm.js';
import { StubSpeechToTextEngine } from './ai/stt/stubStt.js';
import { StubTextToSpeechEngine } from './ai/tts/stubTts.js';
import { StubOnDeviceVisionEngine } from './ai/vision/stubVision.js';
import { StubPlantIdProvider } from './providers/plantId/stubPlantId.js';
import { StubWeatherProvider } from './providers/weather/stubWeather.js';
import { StubStorageProvider } from './providers/storage/stubStorage.js';
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

export function buildServices(_env: AppEnv): Services {
  // Slice 0: every implementation is a stub. Real impls land in their
  // respective slices — see each stub's banner comment for which.
  return {
    llm: new StubLlmProvider(),
    stt: new StubSpeechToTextEngine(),
    tts: new StubTextToSpeechEngine(),
    vision: new StubOnDeviceVisionEngine(),
    plantId: new StubPlantIdProvider(),
    weather: new StubWeatherProvider(),
    storage: new StubStorageProvider(),
    email: new StubEmailProvider(),
    push: new StubPushProvider(),
  };
}
