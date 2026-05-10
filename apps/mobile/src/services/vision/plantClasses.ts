/**
 * Subset of ImageNet 1k classes that we treat as a "plant detected" signal
 * for live frame analysis with EfficientNet-Lite0.
 *
 * This is intentionally narrow — ImageNet only covers a handful of plant
 * categories (most flowers + corn/cardoon/etc). It will reliably detect
 * flowering plants and miss most houseplants (Boston fern, fiddle leaf
 * fig, etc.) because ImageNet has no class for them.
 *
 * For a proper plant-aware classifier we'd swap to a PlantVillage- or
 * PlantNet-trained TFLite model behind the same interface. The label
 * mapping below is the seam.
 */
export const PLANT_CLASS_INDICES = new Set<number>([
  // Flowering plants
  985, // daisy
  986, // yellow lady's slipper / orchid
  // Plants & produce that strongly suggest "this is foliage / a plant"
  944, // vase (often plants)
  738, // pot
  941, // bell pepper
  942, // cucumber
  943, // artichoke
  945, // bell pepper / banana / etc (locale-dependent)
  946, // cardoon
  947, // mushroom
  948, // Granny Smith (apple — fruit)
  949, // strawberry
  950, // orange (fruit)
  951, // lemon
  952, // fig
  953, // pineapple
  954, // banana
  955, // jackfruit
  956, // custard apple
  957, // pomegranate
  958, // hay (dried grass)
  987, // corn
  988, // acorn
  989, // hip / rose hip
  990, // buckeye / horse chestnut seed
]);

export interface ClassificationResult {
  topIndex: number;
  topConfidence: number;
  isPlantLike: boolean;
}

/**
 * Decode the top-1 result from a TFLite output tensor (1000 logits).
 * `quantized` is true for int8 models — values are 0–255.
 */
export function decodeTopClass(output: Uint8Array | Float32Array): ClassificationResult {
  let topIndex = 0;
  let topValue = -Infinity;
  for (let i = 0; i < output.length; i++) {
    const v = output[i];
    if (v !== undefined && v > topValue) {
      topValue = v;
      topIndex = i;
    }
  }
  // For int8 quantized output, normalize to a 0..1 confidence proxy.
  // For float32 output (already in 0..1 range), pass through.
  const topConfidence =
    output instanceof Uint8Array ? topValue / 255 : Math.min(1, Math.max(0, topValue));
  return {
    topIndex,
    topConfidence,
    isPlantLike: PLANT_CLASS_INDICES.has(topIndex),
  };
}
