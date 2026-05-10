/**
 * On-device vision engine for cheap pre-filtering of frames during
 * video walk-throughs. Only frames that pass these checks are candidates
 * for sending to the cloud LLM — raw video never leaves the phone.
 *
 * Production impl is `react-native-vision-camera` + `react-native-fast-tflite`
 * running MobileNetV3-small (or similar).
 */

export type VisionTask = 'plant_detection' | 'sharpness' | 'light_estimate';

export interface VisionAnalysisRequest {
  /** JPEG/PNG/raw image bytes. */
  image: Uint8Array;
  mimeType: string;
  /** Which checks to run; defaults to all. */
  tasks?: VisionTask[];
}

export interface VisionAnalysisResult {
  containsPlant?: boolean;
  plantConfidence?: number; // 0..1
  /** Higher = sharper. Undefined if not requested. */
  sharpness?: number;
  /** Coarse light category from image stats. */
  lightLevel?: 'low' | 'medium' | 'bright' | 'direct';
}

export interface OnDeviceVisionEngine {
  analyze(req: VisionAnalysisRequest): Promise<VisionAnalysisResult>;
}
