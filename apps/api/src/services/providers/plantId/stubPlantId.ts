// Slice 5 replaces this with PlantNetPlantIdProvider (Pl@ntNet free tier).
import type { PlantIdProvider, PlantIdRequest, PlantIdResult } from '@plant-app/shared';

export class StubPlantIdProvider implements PlantIdProvider {
  async identifyByPhoto(_req: PlantIdRequest): Promise<PlantIdResult> {
    throw new Error('PlantIdProvider not wired yet — see Slice 5.');
  }
}
