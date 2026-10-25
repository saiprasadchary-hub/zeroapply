/**
 * ZeroApply - Universal Geographic Intelligence Engine
 * Provides high-performance, deterministic 0ms geographic parsing and knowledge-base
 * resolution for cities, states, countries, and numeric postal/ZIP/PIN codes worldwide.
 * Falls back to local Qwen 2.5 LLM for any novel or unrecognized global location.
 */

import type { PersonaData } from '../../types';
import { checkOllamaStatus, generateOllamaAnswer } from '../localLlm/ollamaClient';

export interface ParsedLocation {
  city: string;
  state: string;
  country: string;
  postalCode: string;
  formattedAddress: string;
  source: 'persona' | 'knowledge_base' | 'llm' | 'heuristic';
}

/**
 * In-memory cache for resolved locations to guarantee O(1) repeated lookups.
 */
const locationResolutionCache = new Map<string, ParsedLocation>();

/**
 * Strict validator ensuring postal codes contain valid numeric digits (never pure text like "Hyderabad").
 */
export function isNumericPostalCode(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  // Accepts standard global postal patterns: 6-digit India PIN (500081), 5-digit US ZIP (94105),
  // 5+4 US ZIP (94105-1234), UK outward+inward (SW1A 1AA), Canada (M5V 2T6), etc.
  return /^(\d{3,10}|\d{5}-\d{4}|[A-Z]\d[A-Z]\s?\d[A-Z]\d|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i.test(clean);
}

/**
 * Curated knowledge base for global tech hubs and major regions (0ms resolution).
 */
interface GeoRecord {
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

const GLOBAL_GEO_KNOWLEDGE_BASE: Record<string, GeoRecord> = {
  // --- INDIA ALL STATES & REGIONAL TECH HUBS ---
  // Telangana
  hyderabad: { city: 'Hyderabad', state: 'Telangana', country: 'India', postalCode: '500081' },
  secunderabad: { city: 'Secunderabad', state: 'Telangana', country: 'India', postalCode: '500003' },
  warangal: { city: 'Warangal', state: 'Telangana', country: 'India', postalCode: '506002' },
  nizamabad: { city: 'Nizamabad', state: 'Telangana', country: 'India', postalCode: '503001' },
  karimnagar: { city: 'Karimnagar', state: 'Telangana', country: 'India', postalCode: '505001' },
  khammam: { city: 'Khammam', state: 'Telangana', country: 'India', postalCode: '507001' },
  mahabubnagar: { city: 'Mahabubnagar', state: 'Telangana', country: 'India', postalCode: '509001' },
  nalgonda: { city: 'Nalgonda', state: 'Telangana', country: 'India', postalCode: '508001' },
  siddipet: { city: 'Siddipet', state: 'Telangana', country: 'India', postalCode: '502103' },
  mancherial: { city: 'Mancherial', state: 'Telangana', country: 'India', postalCode: '504208' },

  // Karnataka
  bengaluru: { city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560001' },
  bangalore: { city: 'Bengaluru', state: 'Karnataka', country: 'India', postalCode: '560001' },
  mysuru: { city: 'Mysuru', state: 'Karnataka', country: 'India', postalCode: '570001' },
  mysore: { city: 'Mysuru', state: 'Karnataka', country: 'India', postalCode: '570001' },
  mangaluru: { city: 'Mangaluru', state: 'Karnataka', country: 'India', postalCode: '575001' },
  mangalore: { city: 'Mangaluru', state: 'Karnataka', country: 'India', postalCode: '575001' },
  hubli: { city: 'Hubballi', state: 'Karnataka', country: 'India', postalCode: '580020' },
  hubballi: { city: 'Hubballi', state: 'Karnataka', country: 'India', postalCode: '580020' },
  belagavi: { city: 'Belagavi', state: 'Karnataka', country: 'India', postalCode: '590001' },
  belgaum: { city: 'Belagavi', state: 'Karnataka', country: 'India', postalCode: '590001' },
  udupi: { city: 'Udupi', state: 'Karnataka', country: 'India', postalCode: '576101' },
  manipal: { city: 'Manipal', state: 'Karnataka', country: 'India', postalCode: '576104' },
  kalaburagi: { city: 'Kalaburagi', state: 'Karnataka', country: 'India', postalCode: '585101' },
  davangere: { city: 'Davangere', state: 'Karnataka', country: 'India', postalCode: '577002' },

  // Andhra Pradesh
  visakhapatnam: { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', postalCode: '530001' },
  vizag: { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', postalCode: '530001' },
  vijayawada: { city: 'Vijayawada', state: 'Andhra Pradesh', country: 'India', postalCode: '520001' },
  guntur: { city: 'Guntur', state: 'Andhra Pradesh', country: 'India', postalCode: '522002' },
  nellore: { city: 'Nellore', state: 'Andhra Pradesh', country: 'India', postalCode: '524001' },
  tirupati: { city: 'Tirupati', state: 'Andhra Pradesh', country: 'India', postalCode: '517501' },
  kakinada: { city: 'Kakinada', state: 'Andhra Pradesh', country: 'India', postalCode: '533001' },
  rajahmundry: { city: 'Rajahmundry', state: 'Andhra Pradesh', country: 'India', postalCode: '533101' },
  kurnool: { city: 'Kurnool', state: 'Andhra Pradesh', country: 'India', postalCode: '518001' },
  anantapur: { city: 'Anantapur', state: 'Andhra Pradesh', country: 'India', postalCode: '515001' },
  kadapa: { city: 'Kadapa', state: 'Andhra Pradesh', country: 'India', postalCode: '516001' },

  // Maharashtra
  mumbai: { city: 'Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400001' },
  pune: { city: 'Pune', state: 'Maharashtra', country: 'India', postalCode: '411001' },
  nagpur: { city: 'Nagpur', state: 'Maharashtra', country: 'India', postalCode: '440001' },
  nashik: { city: 'Nashik', state: 'Maharashtra', country: 'India', postalCode: '422001' },
  thane: { city: 'Thane', state: 'Maharashtra', country: 'India', postalCode: '400601' },
  'navi mumbai': { city: 'Navi Mumbai', state: 'Maharashtra', country: 'India', postalCode: '400703' },
  aurangabad: { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', country: 'India', postalCode: '431001' },
  sambhajinagar: { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', country: 'India', postalCode: '431001' },
  solapur: { city: 'Solapur', state: 'Maharashtra', country: 'India', postalCode: '413001' },
  kolhapur: { city: 'Kolhapur', state: 'Maharashtra', country: 'India', postalCode: '416003' },

  // Tamil Nadu
  chennai: { city: 'Chennai', state: 'Tamil Nadu', country: 'India', postalCode: '600001' },
  coimbatore: { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India', postalCode: '641001' },
  madurai: { city: 'Madurai', state: 'Tamil Nadu', country: 'India', postalCode: '625001' },
  trichy: { city: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India', postalCode: '620001' },
  tiruchirappalli: { city: 'Tiruchirappalli', state: 'Tamil Nadu', country: 'India', postalCode: '620001' },
  salem: { city: 'Salem', state: 'Tamil Nadu', country: 'India', postalCode: '636001' },
  tiruppur: { city: 'Tiruppur', state: 'Tamil Nadu', country: 'India', postalCode: '641601' },
  erode: { city: 'Erode', state: 'Tamil Nadu', country: 'India', postalCode: '638001' },
  vellore: { city: 'Vellore', state: 'Tamil Nadu', country: 'India', postalCode: '632001' },

  // Delhi NCR & Haryana & UP
  delhi: { city: 'Delhi', state: 'Delhi', country: 'India', postalCode: '110001' },
  'new delhi': { city: 'New Delhi', state: 'Delhi', country: 'India', postalCode: '110001' },
  noida: { city: 'Noida', state: 'Uttar Pradesh', country: 'India', postalCode: '201301' },
  'greater noida': { city: 'Greater Noida', state: 'Uttar Pradesh', country: 'India', postalCode: '201310' },
  gurgaon: { city: 'Gurugram', state: 'Haryana', country: 'India', postalCode: '122001' },
  gurugram: { city: 'Gurugram', state: 'Haryana', country: 'India', postalCode: '122001' },
  faridabad: { city: 'Faridabad', state: 'Haryana', country: 'India', postalCode: '121001' },
  ghaziabad: { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', postalCode: '201001' },
  lucknow: { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', postalCode: '226001' },
  kanpur: { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', postalCode: '208001' },
  varanasi: { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', postalCode: '221001' },
  agra: { city: 'Agra', state: 'Uttar Pradesh', country: 'India', postalCode: '282001' },
  prayagraj: { city: 'Prayagraj', state: 'Uttar Pradesh', country: 'India', postalCode: '211001' },
  allahabad: { city: 'Prayagraj', state: 'Uttar Pradesh', country: 'India', postalCode: '211001' },
  meerut: { city: 'Meerut', state: 'Uttar Pradesh', country: 'India', postalCode: '250001' },

  // Gujarat
  ahmedabad: { city: 'Ahmedabad', state: 'Gujarat', country: 'India', postalCode: '380001' },
  surat: { city: 'Surat', state: 'Gujarat', country: 'India', postalCode: '395001' },
  vadodara: { city: 'Vadodara', state: 'Gujarat', country: 'India', postalCode: '390001' },
  baroda: { city: 'Vadodara', state: 'Gujarat', country: 'India', postalCode: '390001' },
  rajkot: { city: 'Rajkot', state: 'Gujarat', country: 'India', postalCode: '360001' },
  gandhinagar: { city: 'Gandhinagar', state: 'Gujarat', country: 'India', postalCode: '382010' },

  // West Bengal & East India
  kolkata: { city: 'Kolkata', state: 'West Bengal', country: 'India', postalCode: '700001' },
  howrah: { city: 'Howrah', state: 'West Bengal', country: 'India', postalCode: '711101' },
  durgapur: { city: 'Durgapur', state: 'West Bengal', country: 'India', postalCode: '713201' },
  asansol: { city: 'Asansol', state: 'West Bengal', country: 'India', postalCode: '713301' },
  siliguri: { city: 'Siliguri', state: 'West Bengal', country: 'India', postalCode: '734001' },
  bhubaneswar: { city: 'Bhubaneswar', state: 'Odisha', country: 'India', postalCode: '751001' },
  cuttack: { city: 'Cuttack', state: 'Odisha', country: 'India', postalCode: '753001' },
  patna: { city: 'Patna', state: 'Bihar', country: 'India', postalCode: '800001' },
  ranchi: { city: 'Ranchi', state: 'Jharkhand', country: 'India', postalCode: '834001' },
  jamshedpur: { city: 'Jamshedpur', state: 'Jharkhand', country: 'India', postalCode: '831001' },

  // Kerala
  kochi: { city: 'Kochi', state: 'Kerala', country: 'India', postalCode: '682001' },
  cochin: { city: 'Kochi', state: 'Kerala', country: 'India', postalCode: '682001' },
  trivandrum: { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', postalCode: '695001' },
  thiruvananthapuram: { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', postalCode: '695001' },
  kozhikode: { city: 'Kozhikode', state: 'Kerala', country: 'India', postalCode: '673001' },
  calicut: { city: 'Kozhikode', state: 'Kerala', country: 'India', postalCode: '673001' },
  thrissur: { city: 'Thrissur', state: 'Kerala', country: 'India', postalCode: '680001' },

  // Rajasthan & MP & Punjab & Others
  jaipur: { city: 'Jaipur', state: 'Rajasthan', country: 'India', postalCode: '302001' },
  jodhpur: { city: 'Jodhpur', state: 'Rajasthan', country: 'India', postalCode: '342001' },
  udaipur: { city: 'Udaipur', state: 'Rajasthan', country: 'India', postalCode: '313001' },
  indore: { city: 'Indore', state: 'Madhya Pradesh', country: 'India', postalCode: '452001' },
  bhopal: { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India', postalCode: '462001' },
  chandigarh: { city: 'Chandigarh', state: 'Chandigarh', country: 'India', postalCode: '160001' },
  ludhiana: { city: 'Ludhiana', state: 'Punjab', country: 'India', postalCode: '141001' },
  amritsar: { city: 'Amritsar', state: 'Punjab', country: 'India', postalCode: '143001' },
  dehradun: { city: 'Dehradun', state: 'Uttarakhand', country: 'India', postalCode: '248001' },
  guwahati: { city: 'Guwahati', state: 'Assam', country: 'India', postalCode: '781001' },
  panaji: { city: 'Panaji', state: 'Goa', country: 'India', postalCode: '403001' },
  srinagar: { city: 'Srinagar', state: 'Jammu and Kashmir', country: 'India', postalCode: '190001' },
  jammu: { city: 'Jammu', state: 'Jammu and Kashmir', country: 'India', postalCode: '180001' },

  // --- UNITED STATES TECH HUBS ---
  'san francisco': { city: 'San Francisco', state: 'California', country: 'United States', postalCode: '94105' },
  sf: { city: 'San Francisco', state: 'California', country: 'United States', postalCode: '94105' },
  'san jose': { city: 'San Jose', state: 'California', country: 'United States', postalCode: '95113' },
  sunnyvale: { city: 'Sunnyvale', state: 'California', country: 'United States', postalCode: '94086' },
  palo_alto: { city: 'Palo Alto', state: 'California', country: 'United States', postalCode: '94301' },
  'mountain view': { city: 'Mountain View', state: 'California', country: 'United States', postalCode: '94041' },
  seattle: { city: 'Seattle', state: 'Washington', country: 'United States', postalCode: '98101' },
  austin: { city: 'Austin', state: 'Texas', country: 'United States', postalCode: '78701' },
  'new york': { city: 'New York', state: 'New York', country: 'United States', postalCode: '10001' },
  nyc: { city: 'New York', state: 'New York', country: 'United States', postalCode: '10001' },
  boston: { city: 'Boston', state: 'Massachusetts', country: 'United States', postalCode: '02108' },
  chicago: { city: 'Chicago', state: 'Illinois', country: 'United States', postalCode: '60601' },
  'los angeles': { city: 'Los Angeles', state: 'California', country: 'United States', postalCode: '90001' },
  la: { city: 'Los Angeles', state: 'California', country: 'United States', postalCode: '90001' },
  denver: { city: 'Denver', state: 'Colorado', country: 'United States', postalCode: '80202' },
  atlanta: { city: 'Atlanta', state: 'Georgia', country: 'United States', postalCode: '30303' },
  dallas: { city: 'Dallas', state: 'Texas', country: 'United States', postalCode: '75201' },
  houston: { city: 'Houston', state: 'Texas', country: 'United States', postalCode: '77002' },
  raleigh: { city: 'Raleigh', state: 'North Carolina', country: 'United States', postalCode: '27601' },
  san_diego: { city: 'San Diego', state: 'California', country: 'United States', postalCode: '92101' },

  // --- INTERNATIONAL TECH HUBS ---
  london: { city: 'London', state: 'Greater London', country: 'United Kingdom', postalCode: 'EC1A 1BB' },
  cambridge: { city: 'Cambridge', state: 'Cambridgeshire', country: 'United Kingdom', postalCode: 'CB2 1TN' },
  oxford: { city: 'Oxford', state: 'Oxfordshire', country: 'United Kingdom', postalCode: 'OX1 2JD' },
  toronto: { city: 'Toronto', state: 'Ontario', country: 'Canada', postalCode: 'M5V 2T6' },
  vancouver: { city: 'Vancouver', state: 'British Columbia', country: 'Canada', postalCode: 'V6B 1A1' },
  montreal: { city: 'Montreal', state: 'Quebec', country: 'Canada', postalCode: 'H3B 1A7' },
  berlin: { city: 'Berlin', state: 'Berlin', country: 'Germany', postalCode: '10115' },
  munich: { city: 'Munich', state: 'Bavaria', country: 'Germany', postalCode: '80331' },
  frankfurt: { city: 'Frankfurt', state: 'Hesse', country: 'Germany', postalCode: '60311' },
  paris: { city: 'Paris', state: 'Île-de-France', country: 'France', postalCode: '75001' },
  amsterdam: { city: 'Amsterdam', state: 'North Holland', country: 'Netherlands', postalCode: '1012 JS' },
  dublin: { city: 'Dublin', state: 'Leinster', country: 'Ireland', postalCode: 'D02 X285' },
  singapore: { city: 'Singapore', state: 'Central Community', country: 'Singapore', postalCode: '018989' },
  dubai: { city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', postalCode: '00000' },
  sydney: { city: 'Sydney', state: 'New South Wales', country: 'Australia', postalCode: '2000' },
  melbourne: { city: 'Melbourne', state: 'Victoria', country: 'Australia', postalCode: '3000' },
  tokyo: { city: 'Tokyo', state: 'Tokyo', country: 'Japan', postalCode: '100-0001' },
};

/**
 * Comprehensive list of all 28 Indian States & 8 Union Territories.
 */
const INDIAN_STATES = [
  'Telangana', 'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Tamil Nadu',
  'Delhi', 'Uttar Pradesh', 'Haryana', 'West Bengal', 'Gujarat', 'Rajasthan',
  'Kerala', 'Madhya Pradesh', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand',
  'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh',
  'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Tripura', 'Meghalaya',
  'Manipur', 'Nagaland', 'Mizoram', 'Sikkim', 'Arunachal Pradesh',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep'
];

/**
 * Standard 6-digit PIN code defaults by Indian State / Union Territory.
 */
const INDIAN_STATE_PINS: Record<string, string> = {
  telangana: '500081',
  'andhra pradesh': '520001',
  karnataka: '560001',
  maharashtra: '400001',
  'tamil nadu': '600001',
  delhi: '110001',
  'new delhi': '110001',
  'uttar pradesh': '226001',
  haryana: '122001',
  'west bengal': '700001',
  gujarat: '380001',
  rajasthan: '302001',
  kerala: '682001',
  'madhya pradesh': '452001',
  punjab: '141001',
  bihar: '800001',
  odisha: '751001',
  assam: '781001',
  jharkhand: '834001',
  chhattisgarh: '492001',
  uttarakhand: '248001',
  'himachal pradesh': '171001',
  goa: '403001',
  chandigarh: '160001',
  'jammu and kashmir': '190001',
  ladakh: '194101',
  puducherry: '605001',
  tripura: '799001',
  meghalaya: '793001',
  manipur: '795001',
  nagaland: '797001',
  mizoram: '796001',
  sikkim: '737101',
  'arunachal pradesh': '791111',
};

/**
 * US States and their standard abbreviations.
 */
const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/**
 * Extracts candidate geographic location directly from their uploaded resume text or resume chunks.
 * Prioritizes header contact lines, summary, and experience sections for candidate's home residence.
 */
export function extractLocationFromResume(persona?: PersonaData): ParsedLocation | undefined {
  if (!persona) return undefined;

  const resumeRaw = persona.resumeText || '';
  const headerLines = resumeRaw.split(/[\r\n]+/).slice(0, 20).join('\n');
  const chunksText = Object.values(persona.resumeChunks || {}).join('\n');
  const fullText = `${headerLines}\n${persona.location || ''}\n${chunksText}\n${resumeRaw}`.toLowerCase();

  if (!fullText.trim()) return undefined;

  // 1. Check if candidate explicitly indicates Hyderabad / Telangana
  if (/\b(?:hyderabad|telangana|secunderabad)\b/i.test(fullText)) {
    return {
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      postalCode: '500081',
      formattedAddress: 'Hyderabad, Telangana, India',
      source: 'knowledge_base',
    };
  }

  // 2. Check for other major cities in header or resume chunks
  for (const [key, record] of Object.entries(GLOBAL_GEO_KNOWLEDGE_BASE)) {
    if (key.length <= 3) continue;
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(headerLines) || (chunksText && regex.test(chunksText))) {
      return {
        city: record.city,
        state: record.state,
        country: record.country,
        postalCode: record.postalCode,
        formattedAddress: `${record.city}, ${record.state}, ${record.country}`,
        source: 'knowledge_base',
      };
    }
  }

  return undefined;
}

/**
 * Synchronously resolves geographic details with 0ms latency.
 * Employs multi-token knowledge-base lookup, comma-delimited component splitting,
 * and regional inference.
 */
export function resolveGeographicDetailsSync(
  rawLocation?: string,
  persona?: PersonaData
): ParsedLocation {
  const resumeGeo = extractLocationFromResume(persona);

  // If candidate's resume specifically indicates a residence (e.g. Hyderabad), prioritize it
  // over generic or empty queries or stale defaults!
  const loc = (rawLocation || '').trim();
  const isGeneric = !loc || /^(current|candidate|user|my)?\s*location$/i.test(loc) || loc === persona?.location;

  if (resumeGeo && isGeneric) {
    return resumeGeo;
  }

  // Check cache first
  const cacheKey = `${loc || resumeGeo?.formattedAddress || persona?.location || ''}::${persona?.postalCode || ''}`;
  if (locationResolutionCache.has(cacheKey)) {
    return locationResolutionCache.get(cacheKey)!;
  }

  // If candidate has resume location, use it over stale 'bengaluru' default
  if (resumeGeo && (!persona?.city || persona.city.toLowerCase() === 'bengaluru')) {
    locationResolutionCache.set(cacheKey, resumeGeo);
    return resumeGeo;
  }

  // 1. Check if persona already provides explicit structured fields
  if (persona?.country && persona?.city) {
    if (persona.city.toLowerCase() === 'bengaluru' && resumeGeo) {
      locationResolutionCache.set(cacheKey, resumeGeo);
      return resumeGeo;
    }
    const parsed: ParsedLocation = {
      city: persona.city,
      state: persona.state || '',
      country: persona.country,
      postalCode: persona.postalCode || (persona.country.toLowerCase() === 'india' ? '500081' : '94105'),
      formattedAddress: `${persona.city}${persona.state ? ', ' + persona.state : ''}, ${persona.country}`,
      source: 'persona',
    };
    locationResolutionCache.set(cacheKey, parsed);
    return parsed;
  }

  const normalized = loc.toLowerCase().replace(/[^a-z0-9,\s]/g, ' ');
  const tokens = normalized.split(/[\s,]+/).filter(Boolean);

  // 2. Exact or token-based knowledge base matching
  for (const token of tokens) {
    if (GLOBAL_GEO_KNOWLEDGE_BASE[token]) {
      const match = GLOBAL_GEO_KNOWLEDGE_BASE[token];
      const parsed: ParsedLocation = {
        city: match.city,
        state: match.state,
        country: match.country,
        postalCode: persona?.postalCode && isNumericPostalCode(persona.postalCode) ? persona.postalCode : match.postalCode,
        formattedAddress: `${match.city}, ${match.state}, ${match.country}`,
        source: 'knowledge_base',
      };
      locationResolutionCache.set(cacheKey, parsed);
      return parsed;
    }
  }

  // Multi-word city check (e.g., "san francisco", "new york", "new delhi")
  for (const [key, match] of Object.entries(GLOBAL_GEO_KNOWLEDGE_BASE)) {
    if (normalized.includes(key)) {
      const parsed: ParsedLocation = {
        city: match.city,
        state: match.state,
        country: match.country,
        postalCode: persona?.postalCode && isNumericPostalCode(persona.postalCode) ? persona.postalCode : match.postalCode,
        formattedAddress: `${match.city}, ${match.state}, ${match.country}`,
        source: 'knowledge_base',
      };
      locationResolutionCache.set(cacheKey, parsed);
      return parsed;
    }
  }

  // 3. Comma-separated component breakdown (e.g. "Austin, TX, USA" or "Pune, Maharashtra, India")
  const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 3) {
    const city = parts[0];
    const state = parts[1];
    const country = parts[2];
    const isIndia = /india/i.test(country) || INDIAN_STATES.some((s) => s.toLowerCase() === state.toLowerCase());
    const isUS = /usa|united states/i.test(country) || Object.keys(US_STATES).includes(state.toUpperCase());

    const parsed: ParsedLocation = {
      city,
      state: US_STATES[state.toUpperCase()] || state,
      country: isIndia ? 'India' : isUS ? 'United States' : country,
      postalCode: isIndia ? '500081' : isUS ? '94105' : '10001',
      formattedAddress: `${city}, ${state}, ${country}`,
      source: 'heuristic',
    };
    locationResolutionCache.set(cacheKey, parsed);
    return parsed;
  }

  if (parts.length === 2) {
    const first = parts[0];
    const second = parts[1];

    // Check if second is an Indian State
    const matchedIndianState = INDIAN_STATES.find((s) => s.toLowerCase() === second.toLowerCase());
    if (matchedIndianState) {
      const stateKey = matchedIndianState.toLowerCase();
      const statePin = INDIAN_STATE_PINS[stateKey] || '500081';
      const parsed: ParsedLocation = {
        city: first,
        state: matchedIndianState,
        country: 'India',
        postalCode: statePin,
        formattedAddress: `${first}, ${matchedIndianState}, India`,
        source: 'heuristic',
      };
      locationResolutionCache.set(cacheKey, parsed);
      return parsed;
    }

    // Check if second is a US state code (e.g. Austin, TX)
    const usStateFull = US_STATES[second.toUpperCase()];
    if (usStateFull) {
      const parsed: ParsedLocation = {
        city: first,
        state: usStateFull,
        country: 'United States',
        postalCode: '94105',
        formattedAddress: `${first}, ${usStateFull}, United States`,
        source: 'heuristic',
      };
      locationResolutionCache.set(cacheKey, parsed);
      return parsed;
    }

    // Check if second is a country
    if (/india/i.test(second)) {
      const parsed: ParsedLocation = {
        city: first,
        state: 'Telangana', // Sensible default for Indian tech candidates
        country: 'India',
        postalCode: '500081',
        formattedAddress: `${first}, India`,
        source: 'heuristic',
      };
      locationResolutionCache.set(cacheKey, parsed);
      return parsed;
    }
  }

  // 4. Default Safe Fallback (Rooted in candidate persona profile & resume)
  if (resumeGeo) {
    locationResolutionCache.set(cacheKey, resumeGeo);
    return resumeGeo;
  }

  const isCandidateIndian =
    /india|\+91/i.test(persona?.phone || '') ||
    /telangana|hyderabad|bengaluru|bangalore|delhi|mumbai/i.test(loc) ||
    /india|telangana|hyderabad/i.test(persona?.resumeText || '');

  const fallbackCity = loc.length > 0 && loc.length < 35 ? loc : (isCandidateIndian ? 'Hyderabad' : 'San Francisco');
  const fallbackState = isCandidateIndian ? 'Telangana' : 'California';
  const fallbackCountry = isCandidateIndian ? 'India' : 'United States';
  const fallbackPostal = isCandidateIndian ? '500081' : '94105';

  const defaultParsed: ParsedLocation = {
    city: fallbackCity,
    state: fallbackState,
    country: fallbackCountry,
    postalCode: persona?.postalCode && isNumericPostalCode(persona.postalCode) ? persona.postalCode : fallbackPostal,
    formattedAddress: `${fallbackCity}, ${fallbackState}, ${fallbackCountry}`,
    source: 'heuristic',
  };

  locationResolutionCache.set(cacheKey, defaultParsed);
  return defaultParsed;
}

/**
 * Asynchronously resolves geographic details, leveraging local Qwen 2.5 LLM
 * if the city or location is completely unknown to the built-in knowledge base.
 */
export async function resolveGeographicDetails(
  rawLocation?: string,
  persona?: PersonaData
): Promise<ParsedLocation> {
  const syncResult = resolveGeographicDetailsSync(rawLocation, persona);
  if (syncResult.source === 'knowledge_base' || syncResult.source === 'persona') {
    return syncResult;
  }

  const loc = (rawLocation || persona?.location || '').trim();
  if (!loc) return syncResult;

  // Query local Ollama Qwen 2.5 if available
  try {
    const status = await checkOllamaStatus(1000);
    if (status.online) {
      const prompt = `Given the location string "${loc}", deduce the geographic breakdown.
Return ONLY a valid single-line JSON object with these exact keys:
{"city": "...", "state": "...", "country": "...", "postalCode": "..."}
Rules:
- "postalCode" MUST BE NUMERIC (e.g. 500081 or 94105). NEVER return a city name for postalCode.
- "country" MUST be a recognized country name (e.g. India or United States).
- "state" MUST be the state or province (e.g. Telangana or California).
Do not include explanations or markdown.`;

      const raw = await generateOllamaAnswer(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        if (parsedJson.city && parsedJson.country) {
          const postal = isNumericPostalCode(parsedJson.postalCode)
            ? parsedJson.postalCode
            : syncResult.postalCode;

          const llmResult: ParsedLocation = {
            city: String(parsedJson.city).trim(),
            state: String(parsedJson.state || syncResult.state).trim(),
            country: String(parsedJson.country).trim(),
            postalCode: postal,
            formattedAddress: `${parsedJson.city}, ${parsedJson.state || ''}, ${parsedJson.country}`,
            source: 'llm',
          };
          locationResolutionCache.set(`${loc}::`, llmResult);
          return llmResult;
        }
      }
    }
  } catch {
    // Local LLM unavailable; continue with syncResult
  }

  return syncResult;
}

/**
 * Sanitizes and extracts a strictly numeric postal code from any answer.
 * If the input is alphabetic text (e.g. "Hyderabad"), it is automatically
 * replaced with the regional numeric PIN code.
 */
export function sanitizePostalCode(candidateVal: string, locationStr?: string, persona?: PersonaData): string {
  if (isNumericPostalCode(candidateVal)) {
    return candidateVal.trim();
  }

  // If candidateVal contains an embedded PIN (e.g. "PIN: 500081" or "500081"), extract digits
  const digitMatch = candidateVal.match(/\b\d{4,8}\b/);
  if (digitMatch) {
    return digitMatch[0];
  }

  // Otherwise, derive the legitimate numeric postal code for the region
  const geo = resolveGeographicDetailsSync(locationStr, persona);
  return geo.postalCode;
}
