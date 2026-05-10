import type { SpeciesInfo } from '@plant-app/shared';

/**
 * Curated species reference. ~25 of the most common houseplants and a
 * handful of fruiting plants people grow indoors. Hand-written rather than
 * pulled from an external dataset because:
 *   - Open datasets (Trefle, OpenFarm) are uneven; quality varies wildly.
 *   - Toxicity data in particular needs to be right; I've cross-checked
 *     against the ASPCA toxic/non-toxic plant list.
 *   - Curated set is fast to ship and easy to extend (drop a new entry
 *     here, no migration). When we want broader coverage we can layer an
 *     API call on top behind the same SpeciesInfo[] shape.
 *
 * Cite ASPCA where applicable (their toxic/non-toxic plant lookup is the
 * canonical source for pet safety). Other notes derive from common
 * horticultural references.
 */
export const SPECIES_LIBRARY: SpeciesInfo[] = [
  {
    scientificName: 'Monstera deliciosa',
    commonNames: ['Monstera', 'Swiss cheese plant', 'Split-leaf philodendron'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 18, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes:
      'Balanced 20-20-20 monthly during spring and summer; pause in winter.',
    soilNotes:
      'Chunky aroid mix: orchid bark, perlite, peat. Drains well, stays airy.',
    commonIssues: [
      'Yellow leaves: usually overwatering — let the top inch dry between waterings.',
      'Brown leaf edges: low humidity or salt buildup; flush soil quarterly.',
      'No fenestrations: the plant is too young or under-lit.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Ficus lyrata',
    commonNames: ['Fiddle leaf fig', 'Banjo fig'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 16, max: 24 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes:
      'High-nitrogen fertilizer (3-1-2 ratio) every 4 weeks during growing season.',
    soilNotes:
      'Standard houseplant mix with perlite. Likes consistent moisture but not wet.',
    commonIssues: [
      'Brown spots: classic over- or underwatering. Check soil moisture before reacting.',
      'Dropped leaves: hates sudden moves, drafts, or dramatic light changes.',
      'Sticky leaves: scale insects; wipe with diluted neem oil.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Epipremnum aureum',
    commonNames: ['Pothos', 'Devil’s ivy', 'Golden pothos'],
    light: 'medium',
    waterFrequencyDays: { min: 7, max: 14 },
    humidityRange: { minPct: 30, maxPct: 60 },
    temperatureRangeC: { min: 15, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Light feed monthly in spring/summer; tolerates neglect.',
    soilNotes: 'Any well-draining houseplant mix. Tolerant of imperfect care.',
    commonIssues: [
      'Pale or bleached leaves: too much direct sun.',
      'Long bare stems: the plant is reaching for light — move it brighter.',
      'Yellow leaves: usually overwatering.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Dracaena trifasciata',
    commonNames: ['Snake plant', 'Mother-in-law’s tongue', 'Sansevieria'],
    light: 'low',
    waterFrequencyDays: { min: 14, max: 30 },
    humidityRange: { minPct: 30, maxPct: 50 },
    temperatureRangeC: { min: 15, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes:
      'Cactus/succulent fertilizer at half strength once a month in growing season.',
    soilNotes:
      'Cactus or succulent mix. Hates wet feet — drainage is non-negotiable.',
    commonIssues: [
      'Mushy or yellow base: root rot from overwatering. Repot in dry mix.',
      'Drooping leaves: usually too much water, occasionally too little light.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Zamioculcas zamiifolia',
    commonNames: ['ZZ plant', 'Zanzibar gem'],
    light: 'low',
    waterFrequencyDays: { min: 14, max: 21 },
    humidityRange: { minPct: 30, maxPct: 50 },
    temperatureRangeC: { min: 15, max: 26 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Balanced fertilizer at half strength every 2–3 months.',
    soilNotes: 'Well-draining mix. The rhizomes store water — err on the dry side.',
    commonIssues: [
      'Yellow or mushy stems: overwatering. Let it dry out completely.',
      'Slow growth: it’s naturally slow; not a sign of trouble.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Philodendron hederaceum',
    commonNames: ['Heartleaf philodendron', 'Sweetheart plant'],
    light: 'medium',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 16, max: 26 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Balanced liquid fertilizer monthly during spring and summer.',
    soilNotes:
      'Standard houseplant mix with extra perlite. Likes evenly moist soil.',
    commonIssues: [
      'Leggy growth: needs more light.',
      'Yellow leaves: overwatering or natural shedding of the oldest leaf.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Spathiphyllum wallisii',
    commonNames: ['Peace lily'],
    light: 'medium',
    waterFrequencyDays: { min: 5, max: 7 },
    humidityRange: { minPct: 50, maxPct: 70 },
    temperatureRangeC: { min: 18, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Light feed every 6–8 weeks; sensitive to over-fertilizing.',
    soilNotes: 'Consistently moist, well-draining mix. They tell you when they’re thirsty by drooping dramatically.',
    commonIssues: [
      'Brown leaf tips: tap water sensitivity (chlorine/fluoride). Use filtered or rainwater.',
      'No flowers: not enough light.',
      'Drooping: it needs water now; recovers within hours.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Chlorophytum comosum',
    commonNames: ['Spider plant', 'Airplane plant'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 13, max: 27 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes: 'Balanced fertilizer monthly in growing season; not greedy.',
    soilNotes: 'Standard houseplant mix; tolerates a wide range.',
    commonIssues: [
      'Brown tips: tap water — see peace lily note above.',
      'Pale leaves: too much direct sun.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Ficus elastica',
    commonNames: ['Rubber plant', 'Rubber tree'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 7, max: 14 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 16, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes:
      'Balanced fertilizer monthly during the growing season; pause in winter.',
    soilNotes:
      'Well-draining mix with a bit of bark or perlite. Likes to dry slightly between waterings.',
    commonIssues: [
      'Drooping leaves: thirsty — water deeply.',
      'Sticky sap from cuts: latex; can irritate skin and stains fabric. Wear gloves when pruning.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Dracaena marginata',
    commonNames: ['Dragon tree', 'Madagascar dragon tree'],
    light: 'medium',
    waterFrequencyDays: { min: 10, max: 14 },
    humidityRange: { minPct: 30, maxPct: 50 },
    temperatureRangeC: { min: 16, max: 24 },
    toxicToPets: true,
    toxicToHumans: false,
    fertilizerNotes: 'Light fertilizer every 2 months during growing season.',
    soilNotes: 'Well-draining mix. Sensitive to fluoride and salt buildup; flush soil quarterly.',
    commonIssues: [
      'Brown leaf tips: tap water; switch to filtered.',
      'Yellow leaves: usually overwatering.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Dieffenbachia seguine',
    commonNames: ['Dieffenbachia', 'Dumb cane'],
    light: 'medium',
    waterFrequencyDays: { min: 5, max: 7 },
    humidityRange: { minPct: 50, maxPct: 70 },
    temperatureRangeC: { min: 18, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Balanced fertilizer monthly in spring/summer.',
    soilNotes: 'Well-draining mix; keep evenly moist.',
    commonIssues: [
      'Leaf burn: too much direct sun.',
      'Sap is intensely irritating — name "dumb cane" comes from temporary numbness if chewed. Keep away from children and pets.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Aglaonema commutatum',
    commonNames: ['Chinese evergreen', 'Aglaonema'],
    light: 'low',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 18, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Balanced fertilizer monthly during growing season.',
    soilNotes: 'Standard well-draining mix.',
    commonIssues: [
      'Yellow leaves: overwatering, cold drafts, or natural aging of bottom leaves.',
      'Curling leaves: too dry or too cold.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Calathea orbifolia',
    commonNames: ['Calathea', 'Round-leaf calathea'],
    light: 'medium',
    waterFrequencyDays: { min: 5, max: 7 },
    humidityRange: { minPct: 60, maxPct: 80 },
    temperatureRangeC: { min: 18, max: 24 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes: 'Light feed monthly in growing season; over-fertilizing burns leaves.',
    soilNotes: 'Peat-based mix that retains moisture. Use filtered water.',
    commonIssues: [
      'Crispy edges: low humidity or tap water sensitivity. They are dramatic.',
      'Leaves not opening at night: this is normal — calatheas raise their leaves in the dark (the "prayer plant" behavior).',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Alocasia amazonica',
    commonNames: ['African mask plant', 'Polly', 'Alocasia Polly'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 5, max: 7 },
    humidityRange: { minPct: 60, maxPct: 80 },
    temperatureRangeC: { min: 18, max: 27 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Balanced fertilizer monthly in growing season; goes dormant in winter.',
    soilNotes: 'Chunky aroid mix; never soggy.',
    commonIssues: [
      'Drooping leaves: usually a watering or humidity issue.',
      'Going dormant in winter: drops most leaves; this is normal — water sparingly, wait for spring growth.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Crassula ovata',
    commonNames: ['Jade plant', 'Money plant'],
    light: 'direct',
    waterFrequencyDays: { min: 14, max: 21 },
    humidityRange: { minPct: 20, maxPct: 40 },
    temperatureRangeC: { min: 13, max: 24 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Cactus/succulent fertilizer every 2–3 months.',
    soilNotes: 'Cactus or succulent mix. Pot must drain.',
    commonIssues: [
      'Wrinkled leaves: thirsty — water deeply.',
      'Mushy stems: overwatering; let it dry completely and consider repotting in fresh dry mix.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Aloe vera',
    commonNames: ['Aloe vera', 'Burn plant'],
    light: 'direct',
    waterFrequencyDays: { min: 14, max: 21 },
    humidityRange: { minPct: 20, maxPct: 40 },
    temperatureRangeC: { min: 13, max: 27 },
    toxicToPets: true,
    toxicToHumans: false,
    fertilizerNotes: 'Light cactus fertilizer at half strength every 2–3 months.',
    soilNotes: 'Cactus mix with sharp drainage. Hates standing in water.',
    commonIssues: [
      'Brown leaf tips: usually too much sun or underwatering.',
      'Mushy or pale leaves: overwatering.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Echeveria elegans',
    commonNames: ['Mexican snowball', 'Hen-and-chicks (Echeveria)'],
    light: 'direct',
    waterFrequencyDays: { min: 10, max: 21 },
    humidityRange: { minPct: 20, maxPct: 40 },
    temperatureRangeC: { min: 13, max: 27 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes: 'Light cactus fertilizer once or twice in growing season.',
    soilNotes: 'Cactus or gritty mix. Drainage is everything.',
    commonIssues: [
      'Stretched/etiolated rosette: needs more light.',
      'Lower leaves dying back: usually normal as the plant grows new ones above.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Nephrolepis exaltata',
    commonNames: ['Boston fern'],
    light: 'medium',
    waterFrequencyDays: { min: 3, max: 5 },
    humidityRange: { minPct: 60, maxPct: 80 },
    temperatureRangeC: { min: 16, max: 24 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes: 'Liquid fertilizer at half strength monthly in growing season.',
    soilNotes: 'Peat-based mix that holds moisture. Likes consistently moist (not soggy) soil.',
    commonIssues: [
      'Crispy fronds: low humidity. Mist daily or use a humidifier.',
      'Yellow leaves: usually too dry; soak the pot.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Hedera helix',
    commonNames: ['English ivy'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 13, max: 21 },
    toxicToPets: true,
    toxicToHumans: true,
    fertilizerNotes: 'Balanced fertilizer monthly during growing season.',
    soilNotes: 'Standard well-draining mix.',
    commonIssues: [
      'Spider mites: ivy is a magnet. Watch for fine webbing; rinse leaves and treat with insecticidal soap.',
      'Brown leaves: usually too dry or too hot.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Pilea peperomioides',
    commonNames: ['Chinese money plant', 'Pancake plant', 'UFO plant'],
    light: 'bright_indirect',
    waterFrequencyDays: { min: 7, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 16, max: 24 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes: 'Balanced fertilizer monthly in growing season.',
    soilNotes: 'Well-draining houseplant mix.',
    commonIssues: [
      'Curled or cupped leaves: usually too much light.',
      'Drooping: thirsty — water deeply.',
      'Lots of pups: easy to propagate; pinch them off and pot up.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Solanum lycopersicum',
    commonNames: ['Tomato'],
    light: 'direct',
    waterFrequencyDays: { min: 1, max: 2 },
    humidityRange: { minPct: 50, maxPct: 70 },
    temperatureRangeC: { min: 18, max: 29 },
    toxicToPets: true,
    toxicToHumans: false,
    fertilizerNotes:
      'High-potassium fertilizer once flowering starts; weekly during fruit set.',
    soilNotes:
      'Rich, well-draining vegetable mix with compost. Outdoor in full sun ideal; indoor needs grow lights.',
    commonIssues: [
      'Blossom end rot: calcium uptake issue, almost always inconsistent watering.',
      'Yellowing lower leaves: nutrient deficiency or natural aging.',
      'Leaves are toxic to pets even though the fruit is fine for humans — keep cats and dogs away.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Citrus limon',
    commonNames: ['Lemon tree', 'Meyer lemon'],
    light: 'direct',
    waterFrequencyDays: { min: 5, max: 10 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 13, max: 27 },
    toxicToPets: true,
    toxicToHumans: false,
    fertilizerNotes: 'Citrus-specific fertilizer monthly during growing season.',
    soilNotes:
      'Slightly acidic, well-draining mix with citrus blend. Likes to dry slightly between waterings.',
    commonIssues: [
      'Yellow leaves with green veins: iron or magnesium deficiency.',
      'Dropped fruit: usually inconsistent watering or temperature swings.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Mentha spicata',
    commonNames: ['Spearmint', 'Mint'],
    light: 'medium',
    waterFrequencyDays: { min: 2, max: 4 },
    humidityRange: { minPct: 40, maxPct: 70 },
    temperatureRangeC: { min: 13, max: 24 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes:
      'Light feed monthly; mint prefers lean conditions for stronger flavor.',
    soilNotes:
      'Moisture-retentive mix. Container the plant — it spreads aggressively if left in open ground.',
    commonIssues: [
      'Leggy growth: pinch tips often to encourage bushiness.',
      'Powdery mildew: improve airflow and avoid wetting leaves.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Ocimum basilicum',
    commonNames: ['Basil', 'Sweet basil'],
    light: 'direct',
    waterFrequencyDays: { min: 1, max: 3 },
    humidityRange: { minPct: 40, maxPct: 60 },
    temperatureRangeC: { min: 18, max: 29 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes:
      'Light feed every 2–4 weeks; less is more for flavor.',
    soilNotes: 'Rich, well-draining mix. Don’t let it dry out completely.',
    commonIssues: [
      'Wilting fast: thirsty — basil is a heavy drinker.',
      'Bolting (flowering): pinch flower buds to keep leaves coming; once it bolts the leaves taste bitter.',
    ],
    source: 'curated',
  },
  {
    scientificName: 'Rosmarinus officinalis',
    commonNames: ['Rosemary'],
    light: 'direct',
    waterFrequencyDays: { min: 7, max: 14 },
    humidityRange: { minPct: 30, maxPct: 50 },
    temperatureRangeC: { min: 10, max: 27 },
    toxicToPets: false,
    toxicToHumans: false,
    fertilizerNotes:
      'Light feed every 2–3 months; rosemary is at home in lean Mediterranean soil.',
    soilNotes: 'Sandy, gritty, sharply draining mix. Hates wet feet.',
    commonIssues: [
      'Brown / dropping needles: usually overwatering or low light.',
      'Powdery white mildew on stems: too humid + poor airflow.',
    ],
    source: 'curated',
  },
];

/** Lower-case hyphenated slug from the scientific name. */
export function speciesSlug(scientificName: string): string {
  return scientificName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findSpecies(slugOrName: string): SpeciesInfo | undefined {
  // Accept either a slug ("monstera-deliciosa") or a raw scientific name
  // ("Monstera deliciosa"). Slugifying both sides handles both cases.
  const target = speciesSlug(slugOrName);
  return SPECIES_LIBRARY.find((s) => speciesSlug(s.scientificName) === target);
}

export function searchSpecies(query: string): SpeciesInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return SPECIES_LIBRARY;
  return SPECIES_LIBRARY.filter((s) => {
    if (s.scientificName.toLowerCase().includes(q)) return true;
    return s.commonNames.some((n) => n.toLowerCase().includes(q));
  });
}
