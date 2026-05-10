// Slice 11 replaces this with on-device vision (lives on the mobile side
// using react-native-vision-camera + react-native-fast-tflite).
import type {
  OnDeviceVisionEngine,
  VisionAnalysisRequest,
  VisionAnalysisResult,
} from '@plant-app/shared';

export class StubOnDeviceVisionEngine implements OnDeviceVisionEngine {
  async analyze(_req: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    throw new Error('OnDeviceVisionEngine not wired yet — see Slice 11.');
  }
}
