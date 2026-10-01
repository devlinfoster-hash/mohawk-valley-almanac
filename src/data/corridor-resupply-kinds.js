// Filter chips for the backcountry-camping resupply page, and which stop
// `kind` values fall under each. Shared by the page and the data validator
// (scripts/validate-corridor-resupply.mjs), so keep this file plain JS.

export const RESUPPLY_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food and groceries' },
  { key: 'farm', label: 'Farm stands' },
  { key: 'services', label: 'Services' },
  { key: 'post', label: 'Post offices' },
  { key: 'camping', label: 'Campgrounds and lodging' },
]

export const KIND_TO_CHIP = {
  supermarket: 'food',
  grocery: 'food',
  convenience_store: 'food',
  restaurant: 'food',
  coffee_shop: 'food',
  cidery: 'food',
  brewery: 'food',
  winery: 'food',
  soda_shop: 'food',
  camp_store: 'food',
  hardware: 'services',
  pharmacy: 'services',
  laundromat: 'services',
  farm_stand: 'farm',
  farm_store: 'farm',
  post_office: 'post',
  campground: 'camping',
  lodging: 'camping',
  state_park: 'camping',
}

// Status badge for each `check` value. tone: good (green), neutral, caution (amber).
export const CHECK_BADGES = {
  almanac_verified: { label: 'Verified', tone: 'good' },
  source_official: { label: 'Hours from USPS', tone: 'neutral' },
  book_researched: { label: 'Checked for the book', tone: 'neutral' },
  listing_only: { label: 'Listing only', tone: 'caution' },
  hours_not_checked: { label: 'Hours not checked', tone: 'caution' },
  unconfirmed: { label: 'Unconfirmed', tone: 'caution' },
  owner_confirmed: { label: 'Confirmed with the owner', tone: 'good' },
  directory_listing: { label: 'Local directory listing', tone: 'caution' },
}
