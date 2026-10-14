import type { ActivityCategory, CurrencyCode, GeoPoint, Interest } from "@/domain/schemas";

/**
 * Small, hand-written DEMONSTRATION catalogue. Coordinates are approximate landmark positions;
 * price ranges are illustrative only and never presented as verified.
 */
export interface CatalogPlace {
  key: string;
  name: string;
  category: ActivityCategory;
  interests: Interest[];
  description: string;
  durationMinutes: number;
  cost: [number, number];
  indoor: boolean;
  location?: GeoPoint;
  openingHoursNote?: string;
  /** Meal slots only */
  meal?: "lunch" | "dinner" | "any";
}

export interface CatalogDestination {
  key: string;
  name: string;
  aliases: string[];
  country: string;
  countryCode: string;
  location: GeoPoint;
  timeZone: string;
  currency: CurrencyCode;
  intro: string;
  tips: string[];
  places: CatalogPlace[];
}

const P = (lat: number, lng: number): GeoPoint => ({ lat, lng });
const HOURS = "Hours vary by season — check the official site before you go.";

export const CATALOG: CatalogDestination[] = [
  {
    key: "athens", name: "Athens", aliases: ["athina", "αθήνα", "athens, greece"], country: "Greece", countryCode: "GR",
    location: P(37.9838, 23.7275), timeZone: "Europe/Athens", currency: "EUR",
    intro: "A city where marble ruins share the skyline with rooftop bars, Athens rewards early starts, long lunches and evening strolls beneath a floodlit Acropolis.",
    tips: [
      "Visit the Acropolis right at opening or in the late afternoon to avoid the midday heat and crowds.",
      "A combined archaeological ticket can cover several sites — check current pricing on the official Hellenic Ministry of Culture site.",
      "Many sights are hilly and paved with slippery marble: wear shoes with grip.",
      "Lunch is often taken after 14:00 and dinner after 21:00.",
      "The metro links the airport, Piraeus port and the centre; validate tickets before boarding.",
    ],
    places: [
      { key: "acropolis", name: "The Acropolis & Parthenon", category: "sight", interests: ["history", "architecture"], description: "The 5th-century BC citadel crowned by the Parthenon, with sweeping views over the city.", durationMinutes: 150, cost: [20, 30], indoor: false, location: P(37.9715, 23.7257), openingHoursNote: HOURS },
      { key: "acropolis-museum", name: "Acropolis Museum", category: "museum", interests: ["history", "art", "architecture"], description: "Light-filled modern museum built over excavations, home to the Parthenon galleries.", durationMinutes: 120, cost: [15, 20], indoor: true, location: P(37.9685, 23.7286), openingHoursNote: HOURS },
      { key: "ancient-agora", name: "Ancient Agora & Temple of Hephaestus", category: "sight", interests: ["history", "architecture"], description: "The heart of ancient civic life and one of the best-preserved Doric temples anywhere.", durationMinutes: 90, cost: [10, 20], indoor: false, location: P(37.9747, 23.7224), openingHoursNote: HOURS },
      { key: "plaka", name: "Plaka & Anafiotika stroll", category: "walk", interests: ["architecture", "shopping"], description: "Neoclassical lanes and the whitewashed, island-style houses of Anafiotika tucked under the Acropolis rock.", durationMinutes: 90, cost: [0, 0], indoor: false, location: P(37.9727, 23.7300) },
      { key: "national-archaeological", name: "National Archaeological Museum", category: "museum", interests: ["history", "art"], description: "One of the world's great collections of ancient Greek art, from the Mask of Agamemnon to bronze gods.", durationMinutes: 150, cost: [10, 15], indoor: true, location: P(37.9890, 23.7323), openingHoursNote: HOURS },
      { key: "lycabettus", name: "Sunset on Lycabettus Hill", category: "viewpoint", interests: ["nature"], description: "The city's highest point — walk up or take the funicular for golden-hour views to the sea.", durationMinutes: 90, cost: [0, 10], indoor: false, location: P(37.9819, 23.7433) },
      { key: "philopappos", name: "Philopappos Hill walk", category: "nature", interests: ["nature", "history"], description: "Pine-scented paths with a classic, quieter view of the Parthenon.", durationMinutes: 75, cost: [0, 0], indoor: false, location: P(37.9667, 23.7194) },
      { key: "temple-zeus", name: "Temple of Olympian Zeus", category: "sight", interests: ["history", "architecture"], description: "Towering Corinthian columns from what was once the largest temple in Greece.", durationMinutes: 45, cost: [8, 12], indoor: false, location: P(37.9693, 23.7331), openingHoursNote: HOURS },
      { key: "panathenaic", name: "Panathenaic Stadium", category: "sight", interests: ["history", "architecture"], description: "The all-marble stadium that hosted the first modern Olympics in 1896.", durationMinutes: 60, cost: [8, 12], indoor: false, location: P(37.9683, 23.7411), openingHoursNote: HOURS },
      { key: "national-garden", name: "National Garden & Zappeion", category: "nature", interests: ["nature"], description: "Shady paths, ponds and ruins in a calm green pocket beside Syntagma.", durationMinutes: 60, cost: [0, 0], indoor: false, location: P(37.9727, 23.7370) },
      { key: "benaki", name: "Benaki Museum", category: "museum", interests: ["art", "history"], description: "Greek culture from antiquity to the 20th century in an elegant mansion, with a rooftop café.", durationMinutes: 105, cost: [10, 15], indoor: true, location: P(37.9757, 23.7404), openingHoursNote: HOURS },
      { key: "cycladic", name: "Museum of Cycladic Art", category: "museum", interests: ["art"], description: "Strikingly modern-looking marble figurines from the Bronze Age Aegean.", durationMinutes: 90, cost: [10, 15], indoor: true, location: P(37.9759, 23.7446), openingHoursNote: HOURS },
      { key: "monastiraki", name: "Monastiraki flea market", category: "shopping", interests: ["shopping"], description: "Antiques, sandals, vintage finds and bric-a-brac around Monastiraki Square.", durationMinutes: 75, cost: [0, 40], indoor: false, location: P(37.9761, 23.7253) },
      { key: "varvakios", name: "Varvakios Central Market", category: "food", interests: ["food"], description: "A loud, vivid meat-and-fish hall with spice shops and tavernas around it.", durationMinutes: 60, cost: [0, 15], indoor: true, location: P(37.9807, 23.7272), meal: "lunch" },
      { key: "psyrri", name: "Psyrri meze dinner", category: "food", interests: ["food", "nightlife"], description: "Small plates, grilled octopus and tsipouro in the lively streets of Psyrri.", durationMinutes: 120, cost: [20, 40], indoor: false, location: P(37.9781, 23.7232), meal: "dinner" },
      { key: "souvlaki", name: "Souvlaki on Mitropoleos", category: "food", interests: ["food"], description: "A quick, classic gyros or souvlaki lunch near Monastiraki.", durationMinutes: 45, cost: [5, 12], indoor: false, location: P(37.9760, 23.7262), meal: "lunch" },
      { key: "koukaki", name: "Taverna lunch in Koukaki", category: "food", interests: ["food"], description: "Neighbourhood tavernas serving home-style dishes just south of the Acropolis.", durationMinutes: 75, cost: [15, 30], indoor: false, location: P(37.9655, 23.7262), meal: "any" },
      { key: "rooftop", name: "Rooftop drinks with an Acropolis view", category: "nightlife", interests: ["nightlife"], description: "Cocktails as the Parthenon lights up — many hotel rooftops around Monastiraki.", durationMinutes: 90, cost: [12, 30], indoor: false, location: P(37.9765, 23.7255) },
      { key: "gazi", name: "Gazi & Technopolis evening", category: "nightlife", interests: ["nightlife", "architecture"], description: "A former gasworks turned cultural hub, surrounded by bars and late-night music.", durationMinutes: 120, cost: [10, 40], indoor: false, location: P(37.9783, 23.7136) },
      { key: "cape-sounion", name: "Cape Sounion half-day (Temple of Poseidon)", category: "beach", interests: ["history", "nature"], description: "A coastal drive to the clifftop temple — famous for sunsets and a swim stop on the way.", durationMinutes: 300, cost: [20, 60], indoor: false, location: P(37.6503, 24.0246) },
    ],
  },
  {
    key: "rome", name: "Rome", aliases: ["roma", "rome, italy"], country: "Italy", countryCode: "IT", location: P(41.9028, 12.4964), timeZone: "Europe/Rome", currency: "EUR",
    intro: "Layer upon layer of empire, church and dolce vita — Rome is best taken slowly, between piazzas and espresso.",
    tips: ["Book timed entry for the Colosseum and Vatican Museums in advance.", "Cover shoulders and knees for churches.", "Fill bottles at the free nasoni fountains."],
    places: [
      { key: "colosseum", name: "Colosseum & Roman Forum", category: "sight", interests: ["history", "architecture"], description: "The great amphitheatre and the ruined heart of ancient Rome.", durationMinutes: 180, cost: [18, 30], indoor: false, location: P(41.8902, 12.4922), openingHoursNote: HOURS },
      { key: "vatican", name: "Vatican Museums & Sistine Chapel", category: "museum", interests: ["art", "history"], description: "Miles of masterpieces ending beneath Michelangelo's ceiling.", durationMinutes: 210, cost: [20, 35], indoor: true, location: P(41.9065, 12.4536), openingHoursNote: HOURS },
      { key: "pantheon", name: "Pantheon", category: "sight", interests: ["architecture", "history"], description: "A 2,000-year-old dome with an open oculus.", durationMinutes: 45, cost: [5, 5], indoor: true, location: P(41.8986, 12.4769) },
      { key: "trastevere", name: "Trastevere dinner", category: "food", interests: ["food", "nightlife"], description: "Cacio e pepe and carbonara in ivy-draped lanes.", durationMinutes: 120, cost: [25, 45], indoor: false, location: P(41.8897, 12.4695), meal: "dinner" },
      { key: "campo", name: "Campo de' Fiori market", category: "food", interests: ["food", "shopping"], description: "Morning market and pizza bianca nearby.", durationMinutes: 60, cost: [5, 15], indoor: false, location: P(41.8956, 12.4722), meal: "lunch" },
      { key: "borghese", name: "Villa Borghese & Galleria", category: "nature", interests: ["nature", "art"], description: "Parkland and a jewel-box gallery of Bernini and Caravaggio.", durationMinutes: 150, cost: [15, 25], indoor: false, location: P(41.9142, 12.4922) },
      { key: "trevi", name: "Trevi Fountain & Spanish Steps walk", category: "walk", interests: ["architecture", "shopping"], description: "Baroque drama and boutique streets.", durationMinutes: 90, cost: [0, 0], indoor: false, location: P(41.9009, 12.4833) },
      { key: "aperitivo", name: "Aperitivo in Monti", category: "nightlife", interests: ["nightlife", "food"], description: "Spritz and snacks in a village-like rione.", durationMinutes: 90, cost: [10, 25], indoor: false, location: P(41.8955, 12.4930) },
    ],
  },
  {
    key: "paris", name: "Paris", aliases: ["paris, france"], country: "France", countryCode: "FR", location: P(48.8566, 2.3522), timeZone: "Europe/Paris", currency: "EUR",
    intro: "Boulevards, bistros and some of the world's great museums — Paris is a city to walk and linger in.",
    tips: ["Many national museums are free on the first Sunday of some months — check before visiting.", "Book Louvre time slots in advance.", "Say bonjour when entering shops."],
    places: [
      { key: "louvre", name: "Musée du Louvre", category: "museum", interests: ["art", "history"], description: "From the Mona Lisa to Mesopotamia.", durationMinutes: 180, cost: [17, 22], indoor: true, location: P(48.8606, 2.3376), openingHoursNote: HOURS },
      { key: "orsay", name: "Musée d'Orsay", category: "museum", interests: ["art"], description: "Impressionism inside a Beaux-Arts station.", durationMinutes: 150, cost: [14, 16], indoor: true, location: P(48.8600, 2.3266), openingHoursNote: HOURS },
      { key: "marais", name: "Le Marais wander", category: "walk", interests: ["architecture", "shopping", "food"], description: "Medieval lanes, falafel and independent shops.", durationMinutes: 120, cost: [0, 30], indoor: false, location: P(48.8590, 2.3622) },
      { key: "eiffel", name: "Eiffel Tower at dusk", category: "viewpoint", interests: ["architecture"], description: "Watch it sparkle on the hour.", durationMinutes: 120, cost: [0, 30], indoor: false, location: P(48.8584, 2.2945) },
      { key: "bistro", name: "Bistro dinner in Saint-Germain", category: "food", interests: ["food"], description: "Classic French cooking.", durationMinutes: 120, cost: [30, 60], indoor: true, location: P(48.8539, 2.3338), meal: "dinner" },
      { key: "marche", name: "Marché des Enfants Rouges", category: "food", interests: ["food"], description: "Covered market lunch stalls.", durationMinutes: 60, cost: [10, 20], indoor: true, location: P(48.8629, 2.3618), meal: "lunch" },
      { key: "montmartre", name: "Montmartre & Sacré-Cœur", category: "sight", interests: ["art", "architecture"], description: "Hilltop basilica and artists' square.", durationMinutes: 150, cost: [0, 0], indoor: false, location: P(48.8867, 2.3431) },
      { key: "luxembourg", name: "Jardin du Luxembourg", category: "nature", interests: ["nature"], description: "Formal gardens and green chairs.", durationMinutes: 60, cost: [0, 0], indoor: false, location: P(48.8462, 2.3372) },
    ],
  },
  {
    key: "istanbul", name: "Istanbul", aliases: ["i̇stanbul", "constantinople", "istanbul, turkey", "istanbul, türkiye"], country: "Türkiye", countryCode: "TR", location: P(41.0082, 28.9784), timeZone: "Europe/Istanbul", currency: "TRY",
    intro: "Two continents, one Bosphorus — Istanbul layers Byzantine domes, Ottoman tiles and a thrilling food scene.",
    tips: ["Get an Istanbulkart for trams, metro and ferries.", "Mosques close to visitors during prayer times; dress modestly.", "Take a public ferry for a cheap Bosphorus cruise."],
    places: [
      { key: "hagia-sophia", name: "Hagia Sophia", category: "sight", interests: ["history", "architecture"], description: "Sixth-century dome, church then mosque.", durationMinutes: 90, cost: [0, 1200], indoor: true, location: P(41.0086, 28.9802), openingHoursNote: HOURS },
      { key: "topkapi", name: "Topkapı Palace", category: "museum", interests: ["history", "art"], description: "Courtyards and treasures of the Ottoman sultans.", durationMinutes: 180, cost: [1500, 2500], indoor: false, location: P(41.0115, 28.9834), openingHoursNote: HOURS },
      { key: "blue-mosque", name: "Blue Mosque", category: "sight", interests: ["architecture"], description: "Six minarets and Iznik tiles.", durationMinutes: 45, cost: [0, 0], indoor: true, location: P(41.0054, 28.9768) },
      { key: "bazaar", name: "Grand Bazaar", category: "shopping", interests: ["shopping"], description: "Covered labyrinth of carpets, lamps and gold.", durationMinutes: 120, cost: [0, 2000], indoor: true, location: P(41.0107, 28.9681) },
      { key: "ferry", name: "Bosphorus ferry to Kadıköy", category: "transport", interests: ["nature"], description: "Cross to Asia with tea and seagulls.", durationMinutes: 60, cost: [40, 60], indoor: false, location: P(41.0166, 28.9744) },
      { key: "kadikoy", name: "Kadıköy market lunch", category: "food", interests: ["food"], description: "Meze, pickles and fish sandwiches.", durationMinutes: 75, cost: [300, 800], indoor: false, location: P(40.9905, 29.0270), meal: "lunch" },
      { key: "karakoy", name: "Karaköy meyhane dinner", category: "food", interests: ["food", "nightlife"], description: "Rakı, meze and grilled fish.", durationMinutes: 150, cost: [1000, 2000], indoor: true, location: P(41.0225, 28.9770), meal: "dinner" },
      { key: "galata", name: "Galata Tower & Beyoğlu", category: "viewpoint", interests: ["architecture", "nightlife"], description: "Panoramas, then İstiklal's buzz.", durationMinutes: 120, cost: [800, 1200], indoor: false, location: P(41.0256, 28.9741) },
    ],
  },
  {
    key: "tokyo", name: "Tokyo", aliases: ["tōkyō", "東京", "tokyo, japan"], country: "Japan", countryCode: "JP", location: P(35.6762, 139.6503), timeZone: "Asia/Tokyo", currency: "JPY",
    intro: "Neon and quiet shrines, convenience stores and kaiseki — Tokyo is endlessly layered.",
    tips: ["Get an IC card (Suica/Pasmo) for trains.", "Cash is still useful at small restaurants.", "Tipping is not customary."],
    places: [
      { key: "sensoji", name: "Sensō-ji, Asakusa", category: "sight", interests: ["history", "architecture"], description: "Tokyo's oldest temple and its market street.", durationMinutes: 90, cost: [0, 0], indoor: false, location: P(35.7148, 139.7967) },
      { key: "meiji", name: "Meiji Jingū", category: "nature", interests: ["nature", "history"], description: "Forest shrine beside Harajuku.", durationMinutes: 75, cost: [0, 0], indoor: false, location: P(35.6764, 139.6993) },
      { key: "teamlab", name: "teamLab digital art", category: "museum", interests: ["art"], description: "Immersive light installations.", durationMinutes: 150, cost: [3800, 4500], indoor: true, openingHoursNote: HOURS },
      { key: "tsukiji", name: "Tsukiji Outer Market", category: "food", interests: ["food"], description: "Sushi, tamagoyaki and street snacks.", durationMinutes: 90, cost: [2000, 5000], indoor: false, location: P(35.6655, 139.7707), meal: "lunch" },
      { key: "izakaya", name: "Izakaya dinner", category: "food", interests: ["food", "nightlife"], description: "Small plates and highballs.", durationMinutes: 120, cost: [3000, 7000], indoor: true, meal: "dinner" },
      { key: "shibuya", name: "Shibuya Crossing & Sky", category: "viewpoint", interests: ["architecture", "nightlife"], description: "The famous scramble from above.", durationMinutes: 90, cost: [2000, 2500], indoor: false, location: P(35.6595, 139.7005) },
      { key: "nakameguro", name: "Nakameguro stroll", category: "walk", interests: ["shopping"], description: "Canal-side boutiques and cafés.", durationMinutes: 90, cost: [0, 3000], indoor: false, location: P(35.6440, 139.6990) },
      { key: "golden-gai", name: "Golden Gai bars", category: "nightlife", interests: ["nightlife"], description: "Tiny bars in a maze of alleys.", durationMinutes: 120, cost: [2000, 5000], indoor: true, location: P(35.6938, 139.7036) },
    ],
  },
];

export function findCatalogDestination(input: string): CatalogDestination | undefined {
  const q = input.trim().toLowerCase().replace(/\s+/g, " ");
  return CATALOG.find((d) => d.key === q || d.name.toLowerCase() === q || d.aliases.includes(q));
}
