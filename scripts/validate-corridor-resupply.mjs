// Validates src/data/corridor-resupply.json (the /backcountry-camping page data).
// Run: npm run validate:resupply   (exits 1 and lists every problem on failure)
import { readFileSync } from 'node:fs'
import { KIND_TO_CHIP, CHECK_BADGES } from '../src/data/corridor-resupply-kinds.js'

const file = new URL('../src/data/corridor-resupply.json', import.meta.url)
const data = JSON.parse(readFileSync(file, 'utf8'))
const errors = []
const isNumOrNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v))
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

if (!isDate(data.as_of)) errors.push(`as_of must be YYYY-MM-DD, got ${JSON.stringify(data.as_of)}`)
if (!data.check_values || typeof data.check_values !== 'object') errors.push('check_values is missing')
if (!Array.isArray(data.stops) || data.stops.length === 0) errors.push('stops must be a non-empty array')

const checkValues = data.check_values || {}
for (const k of Object.keys(checkValues)) {
  if (!CHECK_BADGES[k]) errors.push(`check_values.${k} has no badge in src/data/corridor-resupply-kinds.js`)
}

const seen = new Set()
for (const [i, s] of (data.stops || []).entries()) {
  const at = `stops[${i}] (${s.id ?? 'no id'})`
  if (typeof s.id !== 'string' || !s.id) errors.push(`${at}: id must be a non-empty string`)
  else if (seen.has(s.id)) errors.push(`${at}: duplicate id`)
  else seen.add(s.id)
  if (typeof s.name !== 'string' || !s.name) errors.push(`${at}: name is missing`)
  if (typeof s.group !== 'string' || !s.group) errors.push(`${at}: group is missing`)
  if (!(s.check in checkValues)) errors.push(`${at}: check "${s.check}" is not a key in check_values`)
  if (!isNumOrNull(s.trail_mile)) errors.push(`${at}: trail_mile must be a number or null`)
  if (!isNumOrNull(s.walk_miles_from_trail)) errors.push(`${at}: walk_miles_from_trail must be a number or null`)
  if (!KIND_TO_CHIP[s.kind]) errors.push(`${at}: kind "${s.kind}" is not mapped to a filter chip`)
  if (typeof s.call_first !== 'boolean') errors.push(`${at}: call_first must be true or false`)
  if (s.almanac !== null) {
    if (!s.almanac || !['mva', 'hva'].includes(s.almanac.site)) {
      errors.push(`${at}: almanac.site must be "mva" or "hva"`)
    }
    if (!Number.isInteger(s.almanac?.listing_id)) errors.push(`${at}: almanac.listing_id must be an integer`)
  }
  if (s.almanac_verified_at !== null && !isDate(s.almanac_verified_at)) {
    errors.push(`${at}: almanac_verified_at must be YYYY-MM-DD or null`)
  }
}

if (errors.length) {
  console.error(`corridor-resupply.json: ${errors.length} problem(s)`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`corridor-resupply.json OK: ${data.stops.length} stops, as of ${data.as_of}`)
