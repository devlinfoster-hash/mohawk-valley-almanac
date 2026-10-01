// Companion page for the MeanderNY book "Free & Legal Backcountry Camping North
// of the Catskills": food, post offices, farm stands, services, and campgrounds
// along the northern Long Path (Gilboa to Altamont), in trail order.
//
// Data: src/data/corridor-resupply.json (validate with `npm run validate:resupply`).
// Stops linked to an MVA listing are refreshed from the live `listings` table;
// everything else (HVA-linked or unlinked) shows the JSON snapshot as is.
//
// Deliberately no "open now" badge: hours are free text and seasonal, and a
// wrong "open" is worse than none.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import data from './data/corridor-resupply.json'
import { RESUPPLY_CHIPS, KIND_TO_CHIP, CHECK_BADGES } from './data/corridor-resupply-kinds.js'

const CONTACT_EMAIL = 'hello@mohawkvalleyalmanac.com'
const MEANDERNY_URL = 'https://www.meanderny.com/'
const GUIDE_URL = 'https://devlinfoster.gumroad.com/l/longpath-camping?utm_source=mva&utm_medium=companion'
const CONTACT_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Backcountry camping page: correction')}`

export const BACKCOUNTRY_TITLE = 'Resupply & Services: Free & Legal Backcountry Camping North of the Catskills'
const META_DESCRIPTION =
  'Food, post offices, farm stands, services, and campgrounds along the northern Long Path from Gilboa to Altamont, in trail order. The online companion to the MeanderNY book.'

// "2026-09-30" -> "September 30, 2026". Parsed by hand so the day can't shift
// with the viewer's time zone. Falls back to the raw value if malformed.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function formatDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim())
  if (!m || !MONTHS[Number(m[2]) - 1]) return d || null
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

const telHref = (phone) => `tel:${phone.replace(/[^0-9+]/g, '')}`
const byTrailMile = (a, b) => {
  if (a.trail_mile == null && b.trail_mile == null) return 0
  if (a.trail_mile == null) return 1
  if (b.trail_mile == null) return -1
  return a.trail_mile - b.trail_mile
}

// Groups in the order they first appear in the JSON; stops sorted by
// trail_mile within each group (nulls last, ties keep JSON order).
function groupStops(stops) {
  const groups = new Map()
  for (const s of stops) {
    if (!groups.has(s.group)) groups.set(s.group, [])
    groups.get(s.group).push(s)
  }
  return [...groups].map(([name, list]) => ({ name, stops: [...list].sort(byTrailMile) }))
}

// One query for every MVA-linked stop. Returns { [listing_id]: row } holding
// only published rows; any error leaves the map empty (snapshot fallback).
function useLiveMvaListings(stops) {
  const [live, setLive] = useState({})
  useEffect(() => {
    const ids = [...new Set(stops.filter((s) => s.almanac?.site === 'mva').map((s) => s.almanac.listing_id))]
    if (!ids.length) return
    let cancelled = false
    supabase
      .from('listings')
      .select('id,name,phone,hours,address,website,status,verified_at')
      .in('id', ids)
      .then(({ data: rows, error }) => {
        if (cancelled || error || !rows) return
        const map = {}
        for (const r of rows) if (r.status === 'published') map[r.id] = r
        setLive(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [stops])
  return live
}

// Snapshot stop, with live MVA fields laid over it where the live row has them.
function mergeLive(stop, live) {
  const row = stop.almanac?.site === 'mva' ? live[stop.almanac.listing_id] : null
  if (!row) return { ...stop, website: null, live_verified_at: null }
  return {
    ...stop,
    phone: row.phone || stop.phone,
    hours_text: row.hours || stop.hours_text,
    website: row.website || null,
    live_verified_at: row.verified_at || null,
    almanac_verified_at: row.verified_at || stop.almanac_verified_at,
  }
}

function useMetaDescription(content) {
  useEffect(() => {
    let tag = document.querySelector('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    const previous = tag.getAttribute('content')
    tag.setAttribute('content', content)
    return () => {
      if (previous != null) tag.setAttribute('content', previous)
    }
  }, [content])
}

const STYLES = `
  .rs-asof { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--mva-on-primary); margin-top: 14px; }
  .rs-intro { font-size: 17px; line-height: 1.65; margin-bottom: 14px; max-width: var(--reading-width); }
  .rs-book-link { color: var(--mva-cream); text-decoration: underline; }
  .rs-book-link:hover { color: var(--mva-on-primary); }
  .rs-cta { margin-bottom: 20px; }
  .rs-warning { max-width: var(--reading-width); background: var(--mva-surface); border-left: 4px solid var(--mva-accent); padding: 12px 16px; font-weight: 600; margin-bottom: 20px; }
  .rs-legend-toggle { margin-bottom: 12px; }
  .rs-legend { max-width: var(--reading-width); background: var(--mva-surface); border: 1.5px solid var(--mva-line); padding: 16px 20px; margin-bottom: 20px; }
  .rs-legend dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 10px 14px; align-items: start; }
  .rs-legend dd { margin: 0; font-size: 15px; line-height: 1.5; }
  .rs-legend-note { font-size: 14px; color: var(--mva-muted); font-style: italic; margin-top: 12px; }
  @media (max-width: 520px) { .rs-legend dl { grid-template-columns: 1fr; gap: 4px; } .rs-legend dd { margin-bottom: 10px; } }
  .rs-chips { position: sticky; top: 0; z-index: 2; background: var(--mva-bg); padding: 10px 0; margin-bottom: 8px; }
  .rs-chips .chip { min-height: 40px; font-size: 12px; }
  .rs-count { font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); letter-spacing: 0.08em; margin-top: 8px; }
  .rs-group-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--mva-text); border-bottom: 2px solid var(--mva-primary); padding-bottom: 8px; margin: 32px 0 14px; }
  .rs-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 14px; }
  .rs-card { background: var(--mva-surface); border: 1.5px solid var(--mva-line); padding: 18px 20px; break-inside: avoid; }
  .rs-card-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 12px; align-items: flex-start; margin-bottom: 6px; }
  .rs-name { font-family: var(--font-display); font-size: 19px; font-weight: 700; line-height: 1.25; color: var(--mva-text); margin: 0; }
  .rs-where { font-family: var(--font-mono); font-size: 12px; color: var(--mva-muted); letter-spacing: 0.04em; margin-bottom: 8px; }
  .rs-line { font-size: 15px; line-height: 1.55; margin: 4px 0; overflow-wrap: anywhere; }
  .rs-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mva-muted); margin-right: 6px; }
  .rs-note { font-size: 15px; line-height: 1.6; margin-top: 10px; }
  .rs-phone { font-family: var(--font-mono); font-weight: 500; }
  .rs-actions { margin-top: 12px; }
  .rs-call { display: inline-flex; align-items: center; min-height: 44px; padding: 10px 20px; border-radius: 6px; }
  .rs-badge, .rs-pill { display: inline-block; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.05em; padding: 4px 9px; border-radius: 999px; border: 1px solid; white-space: nowrap; }
  .rs-badge.good { color: #1D5230; background: #E4F0E6; border-color: #1D5230; }
  .rs-badge.neutral { color: var(--mva-primary); background: var(--mva-tint); border-color: var(--mva-line); }
  .rs-badge.caution { color: #6E4200; background: #FBEED3; border-color: #9A5F00; }
  .rs-badge { cursor: help; }
  .rs-pill { color: var(--mva-primary); background: var(--mva-cream); border-color: var(--mva-cream); margin-right: 6px; }
  .rs-footer-block { margin-top: 40px; background: var(--mva-surface); border: 2px solid var(--mva-primary); padding: 20px 24px; font-size: 17px; }
  .rs-footer-block a { color: var(--mva-primary); font-weight: 600; }
  .rs-hidden { display: none; }
  @media print {
    .topnav, .listing-page-nav, .footer, .rs-chips, .rs-legend-toggle { display: none !important; }
    .rs-hidden, .rs-legend { display: block !important; }
    body { background: #fff; }
    .landing-masthead { background: none; border: none; padding: 0; }
    .landing-masthead .landing-title, .landing-masthead .rs-asof, .landing-masthead .landing-sub, .landing-masthead .listing-page-eyebrow, .rs-book-link { color: #000; }
    .rs-card { border-color: #999; }
    .rs-call { display: none; }
    .rs-footer-block a::after { content: " (" attr(data-email) ")"; font-weight: 400; }
  }
`

function StopCard({ stop, checkValues, hidden }) {
  const badge = CHECK_BADGES[stop.check]
  const badgeLabel =
    stop.check === 'almanac_verified' && stop.almanac_verified_at
      ? `${badge.label} ${formatDate(stop.almanac_verified_at)}`
      : badge?.label || stop.check
  const walk = stop.walk_miles_from_trail
  const where = [
    stop.trail_mile != null ? `Mile ${stop.trail_mile} from Gilboa` : null,
    walk == null ? null : walk === 0 ? 'On the trail' : `${walk} mi walk from the trail`,
  ].filter(Boolean)

  return (
    <li className={`rs-card${hidden ? ' rs-hidden' : ''}`}>
      <div className="rs-card-head">
        <h3 className="rs-name">{stop.name}</h3>
        <span className={`rs-badge ${badge?.tone || 'caution'}`} title={checkValues[stop.check]}>
          {badgeLabel}
        </span>
      </div>
      {where.length > 0 && <div className="rs-where">{where.join(' · ')}</div>}
      {stop.address && <p className="rs-line">{stop.address}</p>}
      {stop.phone && (
        <p className="rs-line">
          <span className="rs-label">Phone</span>
          <a className="rs-phone" href={telHref(stop.phone)}>{stop.phone}</a>
        </p>
      )}
      {stop.hours_text && (
        <p className="rs-line">
          <span className="rs-label">Hours</span>
          {stop.hours_text}
        </p>
      )}
      {stop.season_text && (
        <p className="rs-line">
          <span className="rs-pill">Seasonal</span>
          {stop.season_text}
        </p>
      )}
      {stop.website && (
        <p className="rs-line">
          <a href={stop.website} target="_blank" rel="noopener noreferrer">{stop.name} website</a>
        </p>
      )}
      {stop.note && <p className="rs-note">{stop.note}</p>}
      {stop.live_verified_at && stop.check !== 'almanac_verified' && (
        <p className="rs-line rs-where">Almanac listing checked {formatDate(stop.live_verified_at)}</p>
      )}
      {stop.call_first && stop.phone && (
        <div className="rs-actions">
          <a className="btn-primary rs-call" href={telHref(stop.phone)} aria-label={`Call ${stop.name} first at ${stop.phone}`}>
            Call first
          </a>
        </div>
      )}
    </li>
  )
}

export default function BackcountryCampingContent() {
  useMetaDescription(META_DESCRIPTION)
  const [chip, setChip] = useState('all')
  const [showLegend, setShowLegend] = useState(false)
  const live = useLiveMvaListings(data.stops)
  const groups = useMemo(
    () => groupStops(data.stops.map((s) => mergeLive(s, live))),
    [live]
  )
  const matches = (s) => chip === 'all' || KIND_TO_CHIP[s.kind] === chip
  const shown = data.stops.filter(matches).length
  const usedChecks = Object.keys(CHECK_BADGES).filter((k) => data.check_values[k])

  return (
    <article className="landing-article">
      <style>{STYLES}</style>
      <header className="landing-masthead">
        <div className="listing-page-eyebrow">Mohawk Valley Almanac · Book companion</div>
        <h1 className="landing-title">{BACKCOUNTRY_TITLE}</h1>
        <p className="landing-sub">
          The online companion to the{' '}
          <a className="rs-book-link" href={MEANDERNY_URL} target="_blank" rel="noopener noreferrer">MeanderNY book</a> of
          the same name.
        </p>
        <p className="rs-asof">Checked through {formatDate(data.as_of)}</p>
      </header>

      <p className="rs-intro">
        This page lists the food, post offices, farm stands, and campgrounds along the northern Long Path from Gilboa
        to Altamont, in trail order. Miles are measured along the trail from the Schoharie Creek bridge in Gilboa;
        walking distances are by road from the nearest point of the trail.
      </p>
      <p className="rs-cta">
        <a className="btn-primary" href={GUIDE_URL} target="_blank" rel="noopener noreferrer">
          Get the Long Path North guide <span aria-hidden="true">→</span>
        </a>
      </p>
      <p className="rs-warning">Hours change. Call before you count on any stop.</p>

      <button
        type="button"
        className="btn-ghost rs-legend-toggle"
        aria-expanded={showLegend}
        aria-controls="rs-legend"
        onClick={() => setShowLegend((v) => !v)}
      >
        {showLegend ? 'Hide what these mean' : 'What do these mean?'}
      </button>
      <section id="rs-legend" className={`rs-legend${showLegend ? '' : ' rs-hidden'}`} aria-label="What the status badges mean">
        <dl>
          {usedChecks.map((k) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt><span className={`rs-badge ${CHECK_BADGES[k].tone}`}>{CHECK_BADGES[k].label}</span></dt>
              <dd>{data.check_values[k]}</dd>
            </div>
          ))}
        </dl>
        <p className="rs-legend-note">No stop is marked open or closed here. Hours are seasonal, so call first.</p>
      </section>

      <nav className="rs-chips" aria-label="Filter stops by type">
        <div className="chip-row">
          {RESUPPLY_CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`chip${chip === c.key ? ' chip-active' : ''}`}
              aria-pressed={chip === c.key}
              onClick={() => setChip(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="rs-count" aria-live="polite">
          Showing {shown} of {data.stops.length} stops
        </p>
      </nav>

      {groups.map((g) => {
        const anyShown = g.stops.some(matches)
        return (
          <section key={g.name} className={anyShown ? undefined : 'rs-hidden'}>
            <h2 className="rs-group-title">{g.name}</h2>
            <ul className="rs-list">
              {g.stops.map((s) => (
                <StopCard key={s.id} stop={s} checkValues={data.check_values} hidden={!matches(s)} />
              ))}
            </ul>
          </section>
        )
      })}

      <aside className="rs-footer-block">
        <a href={CONTACT_URL} data-email={CONTACT_EMAIL}>Found a change? Tell me.</a>
      </aside>
    </article>
  )
}
