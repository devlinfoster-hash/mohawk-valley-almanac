import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import FreezerFullContent from './FreezerFullPage.jsx'
import { supabase } from './supabase'

// ── Palette ──────────────────────────────────────────────────────────────────
// The site's colors are CSS custom properties defined once in THEME_TOKENS
// below; every stylesheet rule and inline style reads from them.

const SITE = {
  name: 'Mohawk Valley Almanac',
  tagline: "The Mohawk Valley's homesteading & rural living guide",
  topbar:
    'Montgomery · Fulton · Herkimer · Oneida · Madison · Schoharie · Otsego · Schenectady Counties',
  footer:
    'Serving Montgomery, Fulton, Herkimer, Oneida, Madison, Schoharie, Otsego and Schenectady Counties',
  email: 'hello@mohawkvalleyalmanac.com',
}

const COUNTIES = [
  'Montgomery',
  'Fulton',
  'Herkimer',
  'Oneida',
  'Madison',
  'Schoharie',
  'Otsego',
  'Schenectady',
]

const CATEGORIES = [
  { key: 'feed', label: 'Feed & Grain' },
  { key: 'animals', label: 'Livestock & Animals' },
  { key: 'makers', label: 'Makers & Crafters' },
  { key: 'land', label: 'Land & Property' },
  { key: 'food', label: 'Farm Food' },
  { key: 'water', label: 'Water & Wells' },
  { key: 'seeds', label: 'Seeds & Nursery' },
  { key: 'learn', label: 'Learn & Workshops' },
  { key: 'equipment', label: 'Equipment & Repair' },
  { key: 'hearth', label: 'Hearth & Heat' },
  { key: 'farmservices', label: 'Farm Services' },
  { key: 'health', label: 'Health & Wellness' },
  { key: 'fiber', label: 'Fiber Arts' },
  { key: 'maple', label: 'Maple & Honey' },
  { key: 'trades', label: 'Trades & Builders' },
  { key: 'markets', label: 'Farmers Markets' },
  { key: 'legal', label: 'Legal & Financial' },
  { key: 'outdoor', label: 'Outdoor & Recreation' },
  { key: 'apothecary', label: 'Apothecary' },
  { key: 'forage', label: 'Foraging' },
  { key: 'artisan', label: 'Artisan Food' },
  { key: 'cannabis', label: 'Cannabis' },
  // Present in the listings table (breweries, cideries, wineries) but had no
  // label, so these listings were unreachable from the category browser.
  { key: 'craftbeverages', label: 'Craft Beverages' },
]

// Home page quick filters: shortcuts to the categories with the most listings.
const QUICK_CATEGORIES = ['food', 'animals', 'markets', 'maple', 'craftbeverages', 'artisan']

// "Show only" chips on county/category pages. Values are tags that exist in the
// listings data; a chip only appears when a listing on the page carries it.
const TAG_FILTERS = ['Farm Stand', 'U-Pick', 'CSA']

const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const catLabel = (k) => CATEGORIES.find((c) => c.key === k)?.label || k
const countyBySlug = (s) => COUNTIES.find((c) => slugify(c) === s)
const hasTag = (l, tag) => Array.isArray(l.tags) && l.tags.includes(tag)
const plural = (n, word) => `${n} ${n === 1 ? word : word + 's'}`

// verified_at is a plain date ("YYYY-MM-DD"); show it as "Month Year". Parsed
// by hand rather than with new Date() so the month can't shift with the
// viewer's time zone. Returns null when the value is missing or malformed.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function formatVerified(d) {
  const m = /^(\d{4})-(\d{2})/.exec(String(d || '').trim())
  if (!m) return null
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${month} ${m[1]}` : null
}

function linkifyDescription(text) {
  if (!text) return null
  const urlRegex = /(?<!@)(https?:\/\/\S+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|farm|store|shop)(?:\/\S*)?)/gi
  const parts = []
  let lastIndex = 0
  let match
  let key = 0
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const url = match[0]
    const href = url.startsWith('http') ? url : 'https://' + url
    parts.push(
      <a key={key++} href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--mva-accent)', textDecoration: 'underline' }}>
        {url}
      </a>
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE.name}` : `${SITE.name} — homesteading & rural living guide`
  }, [title])
}

// Lets a clickable non-button element (role="button") respond to Enter/Space.
function handleKeyActivate(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

// ── Global styles ────────────────────────────────────────────────────────────
const THEME_TOKENS = `
  :root {
    --mva-primary: #1C3A5E;
    --mva-primary-rgb: 28, 58, 94;
    --mva-accent: #C4862D;
    --mva-accent-rgb: 196, 134, 45;
    --mva-bg: #EFF0E8;
    --mva-surface: #F5F6F0;
    --mva-text: #1A2B3C;
    --mva-muted: #5C7A8A;
    --mva-border: #D8DBCF;
    --mva-cream: #E8D9B8;
    --mva-on-primary: #fff;
    --mva-on-primary-muted: rgba(255, 255, 255, 0.72);
    --mva-error: #b00020;
    --mva-tint: rgba(var(--mva-primary-rgb), 0.08);
    --mva-line: rgba(var(--mva-primary-rgb), 0.2);

    --font-display: 'Libre Baskerville', Georgia, serif;
    --font-body: 'Lora', Georgia, serif;
    --font-mono: 'DM Mono', ui-monospace, monospace;
    --content-width: 1140px;
    --reading-width: 760px;
  }
`

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; }
  body { background: var(--mva-bg); color: var(--mva-text); font-family: var(--font-body); font-size: 16px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, h4, p { margin: 0; }
  a { color: var(--mva-primary); }
  input, select, textarea, button { font-family: inherit; }
  button { cursor: pointer; }
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .app-main { flex: 1; }

  /* Buttons */
  .btn-primary { display: inline-block; background: var(--mva-primary); color: var(--mva-on-primary); border: none; padding: 11px 28px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: filter 0.2s; }
  .btn-primary:hover { filter: brightness(0.85); }
  .btn-primary:disabled { opacity: 0.6; cursor: default; }
  .btn-ghost { display: inline-block; background: transparent; color: var(--mva-primary); border: 1.5px solid var(--mva-primary); padding: 8px 18px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: background 0.2s, color 0.2s; }
  .btn-ghost:hover { background: var(--mva-primary); color: var(--mva-on-primary); }
  .link-button { background: none; border: none; padding: 0; font: inherit; color: inherit; text-decoration: underline; cursor: pointer; }

  /* Top navigation */
  .topnav { background: var(--mva-primary); border-bottom: 3px solid var(--mva-accent); padding: 12px 24px; }
  .topnav-inner { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px 24px; max-width: var(--content-width); margin: 0 auto; }
  .topnav-link { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mva-on-primary-muted); text-decoration: none; padding: 4px 0; border-bottom: 2px solid transparent; transition: color 0.2s; }
  .topnav-link:hover { color: var(--mva-on-primary); }
  .topnav-link.active { color: var(--mva-on-primary); border-bottom-color: var(--mva-accent); }
  .topnav-link:focus-visible { outline: 2px solid var(--mva-accent); outline-offset: 3px; }
  @media (max-width: 640px) { .topnav-secondary { display: none; } }

  /* Home hero */
  .hero { background: var(--mva-bg); border-bottom: 3px double var(--mva-primary); padding: 48px 24px 40px; text-align: center; }
  .masthead-title { font-family: var(--font-display); font-size: clamp(32px, 6vw, 64px); font-weight: 700; line-height: 1.05; color: var(--mva-text); margin-bottom: 8px; }
  .masthead-title em { font-style: italic; color: var(--mva-primary); }
  .masthead-sub { font-family: var(--font-body); font-size: 17px; color: var(--mva-muted); font-style: italic; margin: 10px 0 8px; }
  .masthead-counties { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mva-muted); margin: 0 auto 32px; max-width: 760px; }
  .search-row { display: flex; gap: 10px; max-width: 700px; margin: 0 auto; flex-wrap: wrap; justify-content: center; }
  .search-input { flex: 1; min-width: 220px; padding: 11px 16px; font-family: var(--font-body); font-size: 15px; border: 1.5px solid var(--mva-primary); background: var(--mva-surface); color: var(--mva-text); outline: none; transition: border-color 0.2s; }
  .search-input:focus { border-color: var(--mva-accent); }
  .search-input::placeholder { color: var(--mva-muted); font-style: italic; }
  .town-select { padding: 11px 14px; font-family: var(--font-body); font-size: 15px; border: 1.5px solid var(--mva-primary); background: var(--mva-surface); color: var(--mva-text); outline: none; cursor: pointer; min-width: 150px; }
  .town-select:focus { border-color: var(--mva-accent); }
  .quick-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; max-width: var(--content-width); margin: 22px auto 0; }
  .quick-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 10px 16px; background: var(--mva-surface); color: var(--mva-primary); border: 1.5px solid var(--mva-primary); border-radius: 8px; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .quick-btn:hover { background: var(--mva-tint); }
  .quick-btn.active { background: var(--mva-primary); color: var(--mva-on-primary); }
  .quick-btn:focus-visible { outline: 2px solid var(--mva-accent); outline-offset: 2px; }
  @media (max-width: 760px) { .quick-row { display: grid; grid-template-columns: repeat(3, 1fr); } .quick-btn { text-align: center; padding: 10px 8px; } }
  @media (max-width: 480px) { .quick-row { grid-template-columns: repeat(2, 1fr); } }

  /* Section bar under the hero (county directory links) */
  .cat-nav { background: var(--mva-primary); overflow-x: auto; white-space: nowrap; scrollbar-width: none; border-bottom: 3px solid var(--mva-accent); text-align: center; }
  .cat-nav::-webkit-scrollbar { display: none; }
  .cat-nav-inner { display: inline-flex; padding: 0 16px; }
  .cat-btn { background: none; border: none; color: var(--mva-on-primary-muted); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 14px 18px; cursor: pointer; transition: color 0.2s; white-space: nowrap; border-bottom: 3px solid transparent; margin-bottom: -3px; text-decoration: none; }
  .cat-btn:hover { color: var(--mva-on-primary); }
  .cat-btn.active { color: var(--mva-on-primary); border-bottom-color: var(--mva-accent); }
  @media (max-width: 640px) {
    .cat-nav { overflow-x: visible; white-space: normal; }
    .cat-nav-inner { display: flex; flex-wrap: wrap; justify-content: center; padding: 0 8px; }
    .cat-btn { padding: 11px 10px; }
  }

  /* Home: sidebar + results */
  .main { max-width: var(--content-width); margin: 0 auto; padding: 40px 24px; display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 40px; align-items: start; }
  @media (max-width: 760px) { .main { grid-template-columns: minmax(0, 1fr); padding: 28px 16px; } .sidebar { display: none; } }
  .sidebar-box { border: 1.5px solid var(--mva-primary); background: var(--mva-surface); margin-bottom: 20px; overflow: hidden; }
  .sidebar-box-header { background: var(--mva-primary); color: var(--mva-on-primary); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 10px 16px; }
  .sidebar-box-body { padding: 16px; }
  .sidebar-note { font-size: 13px; line-height: 1.6; font-style: italic; margin-bottom: 14px; }
  .sidebar-cat-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--mva-line); cursor: pointer; font-size: 14px; color: var(--mva-text); transition: color 0.15s; }
  .sidebar-cat-item:last-child { border-bottom: none; }
  .sidebar-cat-item:hover, .sidebar-cat-item.active { color: var(--mva-accent); font-weight: 600; }
  .sidebar-cat-item:focus-visible { outline: 2px solid var(--mva-accent); outline-offset: 2px; }
  .sidebar-count { margin-left: auto; font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); }
  .listings-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 8px; border-bottom: 2px solid var(--mva-primary); padding-bottom: 12px; scroll-margin-top: 16px; }
  .listings-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--mva-text); }
  .result-count { font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); letter-spacing: 0.08em; }
  .notice { background: var(--mva-surface); border: 1.5px solid var(--mva-line); padding: 16px 20px; margin-bottom: 20px; font-size: 15px; line-height: 1.55; }
  .notice-error { color: var(--mva-error); border-color: var(--mva-error); }

  /* Listing cards */
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-bottom: 20px; }
  @media (max-width: 480px) { .results-grid { grid-template-columns: minmax(0, 1fr); } }
  .listing-card { background: var(--mva-surface); border: 1.5px solid var(--mva-line); padding: 22px 24px; display: flex; flex-direction: column; height: 100%; text-decoration: none; color: inherit; transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s; }
  .listing-card:hover { border-color: var(--mva-primary); box-shadow: 3px 3px 0 var(--mva-primary); transform: translate(-1px, -1px); }
  .listing-card:focus-visible { outline: 2px solid var(--mva-accent); outline-offset: 2px; }
  .listing-name { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--mva-text); margin-bottom: 3px; line-height: 1.2; }
  .listing-meta { font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); letter-spacing: 0.06em; margin-bottom: 10px; }
  .listing-desc { font-size: 15px; line-height: 1.65; color: var(--mva-text); margin-bottom: 12px; flex: 1; overflow-wrap: anywhere; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; padding: 3px 8px; background: var(--mva-tint); color: var(--mva-primary); text-transform: uppercase; border: 1px solid var(--mva-line); }
  .hours-line { font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); margin-top: 8px; }
  .no-results { text-align: center; padding: 60px 0; font-style: italic; color: var(--mva-muted); font-size: 18px; }
  .no-results .link-button { color: var(--mva-accent); }

  /* Pagination */
  .load-more-row { display: flex; flex-direction: column; align-items: center; gap: 10px; margin: 8px 0 40px; }
  .load-more-btn { min-width: 220px; }
  .load-more-count { font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); letter-spacing: 0.08em; }

  /* Loading */
  .loading { text-align: center; padding: 60px; }
  .spinner { width: 40px; height: 40px; border: 3px solid var(--mva-line); border-top-color: var(--mva-primary); border-radius: 50%; animation: mv-spin 0.8s linear infinite; margin: 0 auto 14px; }
  .loading-text { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mva-muted); }
  @keyframes mv-spin { to { transform: rotate(360deg); } }

  /* Mobile category drawer */
  .mobile-category-toggle { display: none; }
  @media (max-width: 760px) {
    .mobile-category-toggle { display: inline-block; margin: 18px auto 0; padding: 11px 24px; background: var(--mva-primary); color: var(--mva-on-primary); border: none; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; }
  }
  .overlay { position: fixed; inset: 0; background: rgba(var(--mva-primary-rgb), 0.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
  .overlay-top { align-items: flex-start; }
  .mobile-drawer { background: var(--mva-surface); max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid var(--mva-primary); box-shadow: 6px 6px 0 var(--mva-primary); }
  .mobile-drawer-header { background: var(--mva-primary); color: var(--mva-on-primary); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; position: sticky; top: 0; }
  .mobile-drawer-body { padding: 12px 18px 18px; }
  .close-btn { background: none; border: none; color: var(--mva-on-primary-muted); font-family: var(--font-mono); font-size: 18px; cursor: pointer; padding: 0 4px; }
  .close-btn:hover { color: var(--mva-on-primary); }

  /* Submit modal */
  .modal { background: var(--mva-surface); max-width: 660px; width: 100%; max-height: 88vh; overflow-y: auto; border: 2px solid var(--mva-primary); box-shadow: 8px 8px 0 var(--mva-primary); }
  .modal:focus { outline: none; }
  .modal-header { background: var(--mva-primary); padding: 28px 28px 24px; position: sticky; top: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; z-index: 1; }
  .modal-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--mva-on-primary); }
  .modal-body { padding: 28px; }
  .submit-form label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mva-muted); display: block; margin-bottom: 4px; }
  .submit-form input, .submit-form select, .submit-form textarea { width: 100%; padding: 10px 14px; font-family: var(--font-body); font-size: 15px; border: 1.5px solid var(--mva-line); background: var(--mva-surface); color: var(--mva-text); outline: none; margin-bottom: 14px; }
  .submit-form input:focus, .submit-form select:focus, .submit-form textarea:focus { border-color: var(--mva-accent); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-row-wide { grid-template-columns: 2fr 1fr; }
  .form-error { color: var(--mva-error); margin-bottom: 12px; }

  /* Single-page shell: listing detail, About, admin, 404 */
  .listing-page-nav { max-width: var(--reading-width); margin: 0 auto; padding: 24px 24px 0; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .listing-page-nav.wide { max-width: var(--content-width); }
  .back-link { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mva-primary); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s, color 0.15s; }
  .back-link:hover { border-bottom-color: var(--mva-accent); color: var(--mva-accent); }
  .share-msg { font-family: var(--font-mono); font-size: 11px; color: var(--mva-muted); margin-left: 10px; }
  .listing-page-article { max-width: var(--reading-width); margin: 0 auto; padding: 24px 24px 80px; }
  .listing-page-masthead { background: var(--mva-primary); padding: 32px 32px 28px; border: 2px solid var(--mva-primary); }
  .listing-page-eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mva-accent); margin-bottom: 10px; }
  .listing-page-title { font-family: var(--font-display); font-size: clamp(26px, 4vw, 36px); font-weight: 700; color: var(--mva-on-primary); line-height: 1.15; margin-bottom: 8px; overflow-wrap: anywhere; }
  .listing-page-sub { font-family: var(--font-mono); font-size: 12px; color: var(--mva-cream); letter-spacing: 0.08em; }
  .masthead-tag { font-family: var(--font-mono); font-size: 10px; padding: 3px 7px; border: 1px solid rgba(var(--mva-accent-rgb), 0.5); color: var(--mva-accent); letter-spacing: 0.08em; text-transform: uppercase; }
  .listing-page-body { background: var(--mva-surface); border: 2px solid var(--mva-primary); border-top: none; padding: 32px; }
  .listing-desc-lede { font-size: 17px; line-height: 1.7; color: var(--mva-text); margin-bottom: 24px; font-style: italic; border-left: 3px solid var(--mva-accent); padding-left: 16px; overflow-wrap: anywhere; }
  .listing-desc-lede a { font-style: normal; }
  .verified-note { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.06em; color: var(--mva-muted); margin: -8px 0 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin: 0 0 24px; padding-bottom: 24px; border-bottom: 1px solid var(--mva-line); }
  .info-field dt { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mva-muted); margin-bottom: 3px; }
  .info-field dd { margin: 0; font-size: 15px; color: var(--mva-text); overflow-wrap: anywhere; }
  .info-field-wide { grid-column: 1 / -1; }
  .info-field a { color: var(--mva-accent); text-decoration: underline; }
  .info-field a.plain { color: inherit; text-decoration: none; }
  .info-phone { font-family: var(--font-mono); font-weight: 500; font-size: 1.05rem; }
  .claim-box { background: var(--mva-tint); border: 1.5px solid var(--mva-primary); padding: 20px; text-align: center; }
  .panel { background: var(--mva-surface); border: 2px solid var(--mva-primary); padding: 40px; text-align: center; }
  .panel-code { font-family: var(--font-display); font-size: 48px; font-weight: 700; color: var(--mva-accent); margin-bottom: 8px; }
  .panel-title { font-family: var(--font-display); font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .panel-sub { color: var(--mva-muted); font-style: italic; margin-bottom: 24px; }
  .about-lede { font-size: 19px; line-height: 1.6; font-style: italic; color: var(--mva-muted); margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid var(--mva-line); }
  .about-body p { font-size: 17px; line-height: 1.75; color: var(--mva-text); margin-bottom: 20px; }
  .about-body .link-button { color: var(--mva-primary); }
  @media (max-width: 600px) {
    .listing-page-nav { padding: 16px 16px 0; }
    .listing-page-article { padding: 16px 16px 64px; }
    .listing-page-masthead { padding: 24px 20px; }
    .listing-page-body { padding: 24px 20px; }
  }
  @media (max-width: 500px) { .form-row, .form-row-wide, .info-grid { grid-template-columns: 1fr; } }

  /* County / category landing pages */
  .landing-article { max-width: var(--content-width); margin: 0 auto; padding: 24px 24px 80px; }
  .landing-masthead { background: var(--mva-primary); padding: 32px 32px 28px; border: 2px solid var(--mva-primary); margin-bottom: 28px; }
  .landing-title { font-family: var(--font-display); font-size: clamp(26px, 4vw, 38px); font-weight: 700; color: var(--mva-on-primary); line-height: 1.15; margin: 8px 0; }
  .landing-sub { font-family: var(--font-mono); font-size: 12px; color: var(--mva-cream); letter-spacing: 0.06em; line-height: 1.6; }
  .landing-crosslinks { margin-bottom: 28px; }
  .landing-crosslinks-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--mva-muted); margin-bottom: 10px; }
  .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; border-radius: 999px; border: 1.5px solid var(--mva-primary); background: transparent; color: var(--mva-primary); text-decoration: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .chip:hover, .chip.chip-active { background: var(--mva-primary); color: var(--mva-on-primary); }
  .chip-count { color: var(--mva-muted); }
  .chip:hover .chip-count, .chip.chip-active .chip-count { color: var(--mva-cream); }
  @media (max-width: 600px) { .landing-article { padding: 16px 16px 64px; } .landing-masthead { padding: 24px 20px; } }

  /* Footer */
  .footer { background: var(--mva-primary); color: var(--mva-cream); padding: 40px 24px; border-top: 4px solid var(--mva-accent); text-align: center; }
  .footer-inner { max-width: 800px; margin: 0 auto; }
  .footer-name { font-family: var(--font-display); font-size: 1.4rem; color: var(--mva-on-primary); margin-bottom: 6px; }
  .footer-tagline { font-size: 0.9rem; font-style: italic; margin-bottom: 24px; }
  .footer-links { display: flex; justify-content: center; gap: 12px 24px; flex-wrap: wrap; margin-bottom: 24px; }
  .footer-links a, .footer-links .link-button { color: var(--mva-cream); text-decoration: none; font-size: 0.9rem; }
  .footer-links a:hover, .footer-links .link-button:hover { color: var(--mva-on-primary); text-decoration: underline; }
  .footer-counties { font-size: 0.8rem; line-height: 1.6; border-top: 1px solid rgba(var(--mva-accent-rgb), 0.4); padding-top: 20px; }
`

function GlobalStyles() {
  return <style>{THEME_TOKENS + STYLES}</style>
}

// Opens the site-wide SubmitForm modal (owned by App). Every "Submit a Listing"
// entry point (top nav, home sidebar, footer, About, empty results) calls it.
const SubmitFormContext = createContext(() => {})
const useOpenSubmitForm = () => useContext(SubmitFormContext)

// ── Top navigation ───────────────────────────────────────────────────────────
function TopNav() {
  const openSubmitForm = useOpenSubmitForm()
  return (
    <nav className="topnav" aria-label="Primary">
      <div className="topnav-inner">
        <NavLink to="/" end className="topnav-link">Home</NavLink>
        <NavLink to="/about" className="topnav-link">About</NavLink>
        <button type="button" className="link-button topnav-link" onClick={openSubmitForm}>
          Submit a Listing
        </button>
        <a href={`mailto:${SITE.email}`} className="topnav-link topnav-secondary">Contact Us</a>
      </div>
    </nav>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const openSubmitForm = useOpenSubmitForm()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-name">{SITE.name}</div>
        <p className="footer-tagline">{SITE.tagline}</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <button type="button" className="link-button" onClick={openSubmitForm}>Submit a Listing</button>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <Link to="/admin">Admin</Link>
        </div>
        <p className="footer-counties">{SITE.footer}</p>
      </div>
    </footer>
  )
}

// ── Listings hook ────────────────────────────────────────────────────────────
function useListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'published')
          .order('name', { ascending: true })
          .limit(2000)
        console.log('Supabase response:', data, error);
        if (cancelled) return
        if (error) {
          setError(error.message)
          setListings([])
        } else {
          setListings(data || [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || String(e))
          setListings([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { listings, loading, error }
}

function Loading({ label }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <div className="loading-text">{label}</div>
    </div>
  )
}

// ── Listing card + results grid ──────────────────────────────────────────────
function ListingCard({ l }) {
  const slug = l.slug || slugify(l.name)
  const meta = [
    catLabel(l.category),
    l.town,
    l.county && `${l.county} County`,
    l.established && `Est. ${l.established}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    // The whole card is the link, so the description is plain text here (a
    // linkified URL would nest an <a> inside this one); the listing page
    // renders it with live links.
    <Link to={`/listing/${slug}`} className="listing-card">
      <div className="listing-name">{l.name}</div>
      <div className="listing-meta">{meta}</div>
      {l.description && <p className="listing-desc">{l.description}</p>}
      {Array.isArray(l.tags) && l.tags.length > 0 && (
        <div className="tag-row">
          {l.tags.slice(0, 6).map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}
      {l.hours && <div className="hours-line">{l.hours}</div>}
    </Link>
  )
}

const listingKey = (l) => l.id || l.slug || l.name

function ResultsGrid({ listings }) {
  return (
    <div className="results-grid">
      {listings.map((l) => <ListingCard key={listingKey(l)} l={l} />)}
    </div>
  )
}

// Renders RESULTS_PAGE_SIZE cards at a time with a "Load more" button, and
// starts over whenever resetKey (the active filters) changes.
const RESULTS_PAGE_SIZE = 30
function PaginatedResultsGrid({ listings, resetKey }) {
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE)
  useEffect(() => {
    setVisibleCount(RESULTS_PAGE_SIZE)
  }, [resetKey])
  const visible = listings.slice(0, visibleCount)
  const remaining = listings.length - visible.length
  return (
    <>
      <ResultsGrid listings={visible} />
      {remaining > 0 && (
        <div className="load-more-row">
          <button
            type="button"
            className="btn-primary load-more-btn"
            onClick={() => setVisibleCount((v) => v + RESULTS_PAGE_SIZE)}
          >
            Load {Math.min(RESULTS_PAGE_SIZE, remaining)} More
          </button>
          <span className="load-more-count">{plural(remaining, 'more listing')}</span>
        </div>
      )}
    </>
  )
}

// ── Category list (sidebar + mobile drawer) ─────────────────────────────────
function CategoryList({ counts, active, onSelect }) {
  const items = [{ key: 'all', label: 'All Listings', count: counts._total || 0 }].concat(
    CATEGORIES.map((c) => ({ ...c, count: counts[c.key] || 0 }))
  )
  return items.map((c) => (
    <div
      key={c.key}
      role="button"
      tabIndex={0}
      aria-pressed={active === c.key}
      className={'sidebar-cat-item' + (active === c.key ? ' active' : '')}
      onClick={() => onSelect(c.key)}
      onKeyDown={(e) => handleKeyActivate(e, () => onSelect(c.key))}
    >
      <span>{c.label}</span>
      <span className="sidebar-count">{c.count}</span>
    </div>
  ))
}

// ── County bar (under the home hero) ─────────────────────────────────────────
function CountyNav() {
  return (
    <nav className="cat-nav" aria-label="Browse by county">
      <div className="cat-nav-inner">
        {COUNTIES.map((c) => (
          <Link key={c} to={`/county/${slugify(c)}`} className="cat-btn">
            {c}
          </Link>
        ))}
      </div>
    </nav>
  )
}

// ── Submit form (modal) ──────────────────────────────────────────────────────
function SubmitForm({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    category: 'feed',
    county: '',
    town: '',
    description: '',
    phone: '',
    address: '',
    website: '',
    hours: '',
    established: '',
    tags: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState(null)
  const modalRef = useRef(null)

  // Close on Escape and move focus into the dialog on open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    const payload = {
      ...form,
      established: form.established ? parseInt(form.established, 10) : null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      slug: slugify(form.name),
      status: 'pending',
    }
    const { error } = await supabase.from('listings').insert(payload)
    setSubmitting(false)
    if (error) {
      setErr(error.message)
    } else {
      setDone(true)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        tabIndex={-1}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div id="submit-title" className="modal-title">Submit a Listing</div>
          <button type="button" className="close-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="panel-title">Thank you</div>
              <p className="panel-sub">Your listing has been submitted for review.</p>
              <button type="button" className="btn-primary" onClick={onClose}>Close</button>
            </div>
          ) : (
            <form className="submit-form" onSubmit={submit}>
              <label htmlFor="sf-name">Name</label>
              <input id="sf-name" required value={form.name} onChange={upd('name')} />
              <label htmlFor="sf-category">Category</label>
              <select id="sf-category" value={form.category} onChange={upd('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <div className="form-row">
                <div>
                  <label htmlFor="sf-county">County</label>
                  <select id="sf-county" value={form.county} onChange={upd('county')}>
                    <option value="">—</option>
                    {COUNTIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sf-town">Town</label>
                  <input id="sf-town" value={form.town} onChange={upd('town')} />
                </div>
              </div>
              <label htmlFor="sf-description">Description</label>
              <textarea id="sf-description" rows={3} value={form.description} onChange={upd('description')} />
              <div className="form-row">
                <div>
                  <label htmlFor="sf-phone">Phone</label>
                  <input id="sf-phone" value={form.phone} onChange={upd('phone')} />
                </div>
                <div>
                  <label htmlFor="sf-website">Website</label>
                  <input id="sf-website" value={form.website} onChange={upd('website')} />
                </div>
              </div>
              <label htmlFor="sf-address">Address</label>
              <input id="sf-address" value={form.address} onChange={upd('address')} />
              <div className="form-row form-row-wide">
                <div>
                  <label htmlFor="sf-hours">Hours</label>
                  <input id="sf-hours" value={form.hours} onChange={upd('hours')} />
                </div>
                <div>
                  <label htmlFor="sf-established">Established</label>
                  <input id="sf-established" value={form.established} onChange={upd('established')} />
                </div>
              </div>
              <label htmlFor="sf-tags">Tags (comma-separated)</label>
              <input id="sf-tags" value={form.tags} onChange={upd('tags')} />
              {err && <div className="form-error">{err}</div>}
              <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', padding: 14 }}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// Counties covered by both this site and the Hudson Valley Almanac.
const HVA_SHARED_COUNTIES = new Set(['Fulton', 'Montgomery', 'Schoharie', 'Otsego', 'Schenectady'])

function SisterSiteNote({ county }) {
  return (
    <div className="notice">
      Our sister site, the{' '}
      <a href={`https://www.hudsonvalleyalmanac.com/county/${county.toLowerCase()}`} target="_blank" rel="noreferrer">
        Hudson Valley Almanac
      </a>
      , also covers {county} County, along with the Hudson Valley, Catskills, and Capital Region.
    </div>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────
function Home() {
  useDocumentTitle(null)
  const { listings, loading, error } = useListings()
  const [searchParams, setSearchParams] = useSearchParams()
  const openSubmitForm = useOpenSubmitForm()
  const resultsRef = useRef(null)

  const query = searchParams.get('q') || ''
  const county = searchParams.get('county') || 'all'
  const town = searchParams.get('town') || 'all'
  const category = searchParams.get('category') || 'all'

  const [drawerOpen, setDrawerOpen] = useState(false)

  // Single setter that updates URL search params while keeping the URL clean.
  // Pass null/'all'/'' for a key to remove it.
  const updateParams = (patch) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v == null || v === '' || v === 'all') next.delete(k)
          else next.set(k, v)
        }
        return next
      },
      { replace: false }
    )
  }

  const setQuery = (v) => updateParams({ q: v })
  const setCounty = (v) => updateParams({ county: v, town: null }) // cascade: clear town
  const setTown = (v) => updateParams({ town: v })
  const setCategory = (v) => updateParams({ category: v })

  function applyQuickCategory(key) {
    setCategory(category === key ? 'all' : key)
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Close the mobile category drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const towns = useMemo(() => {
    const t = new Set()
    listings.forEach((l) => {
      if (county === 'all' || l.county === county) {
        if (l.town) t.add(l.town)
      }
    })
    return Array.from(t).sort()
  }, [listings, county])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((l) => {
      if (category !== 'all' && l.category !== category) return false
      if (county !== 'all' && l.county !== county) return false
      if (town !== 'all' && l.town !== town) return false
      if (!q) return true
      const hay = [
        l.name,
        l.description,
        l.town,
        l.county,
        Array.isArray(l.tags) ? l.tags.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [listings, query, category, county, town])

  const counts = useMemo(() => {
    const acc = { _total: listings.length }
    listings.forEach((l) => {
      acc[l.category] = (acc[l.category] || 0) + 1
    })
    return acc
  }, [listings])

  return (
    <>
      <section className="hero">
        <h1 className="masthead-title">
          Mohawk Valley<br />
          <em>Almanac</em>
        </h1>
        <p className="masthead-sub">{SITE.tagline}</p>
        <p className="masthead-counties">{SITE.topbar}</p>
        <div className="search-row">
          <input
            className="search-input"
            aria-label="Search listings"
            placeholder="Name, tag, town…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="town-select" aria-label="Filter by county" value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="all">All Counties</option>
            {COUNTIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className="town-select" aria-label="Filter by town" value={town} onChange={(e) => setTown(e.target.value)}>
            <option value="all">All Towns</option>
            {towns.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="quick-row">
          {QUICK_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              className={'quick-btn' + (category === key ? ' active' : '')}
              aria-pressed={category === key}
              onClick={() => applyQuickCategory(key)}
            >
              {catLabel(key)}
            </button>
          ))}
        </div>
        <button type="button" className="mobile-category-toggle" onClick={() => setDrawerOpen(true)}>
          Categories
        </button>
      </section>

      <CountyNav />

      <div className="main">
        <aside className="sidebar">
          <div className="sidebar-box">
            <div className="sidebar-box-header">Browse by Category</div>
            <div className="sidebar-box-body">
              <CategoryList counts={counts} active={category} onSelect={setCategory} />
            </div>
          </div>
          <div className="sidebar-box">
            <div className="sidebar-box-header">Submit a Listing</div>
            <div className="sidebar-box-body">
              <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={openSubmitForm}>
                Submit a Listing
              </button>
            </div>
          </div>
        </aside>

        <main>
          <div className="listings-header" ref={resultsRef}>
            <h2 className="listings-title">{category === 'all' ? 'All Listings' : catLabel(category)}</h2>
            <div className="result-count">{loading ? 'Loading…' : plural(filtered.length, 'listing')}</div>
          </div>

          {HVA_SHARED_COUNTIES.has(county) && <SisterSiteNote county={county} />}

          {error && <div className="notice notice-error">Error loading listings: {error}</div>}

          {loading ? (
            <Loading label="Loading listings" />
          ) : filtered.length === 0 ? (
            <div className="no-results">
              No listings match. Try clearing filters or{' '}
              <button type="button" className="link-button" onClick={openSubmitForm}>submit one</button>.
            </div>
          ) : (
            <PaginatedResultsGrid listings={filtered} resetKey={`${category}|${query}|${county}|${town}`} />
          )}
        </main>
      </div>

      {drawerOpen && (
        <div className="overlay overlay-top" onClick={() => setDrawerOpen(false)}>
          <div
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Categories"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <span>Categories</span>
              <button type="button" className="close-btn" aria-label="Close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="mobile-drawer-body">
              <CategoryList
                counts={counts}
                active={category}
                onSelect={(k) => {
                  setCategory(k)
                  setDrawerOpen(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── County / category landing pages ──────────────────────────────────────────
function BackNav({ wide, children }) {
  return (
    <div className={'listing-page-nav' + (wide ? ' wide' : '')}>
      <Link to="/" className="back-link">← Back to directory</Link>
      {children}
    </div>
  )
}

function ListingCollection({ eyebrow, title, sub, crosslinks, feature, listings, loading, error }) {
  const [active, setActive] = useState(null)
  const available = TAG_FILTERS.filter((tag) => listings.some((l) => hasTag(l, tag)))
  const current = available.includes(active) ? active : null
  const shown = current ? listings.filter((l) => hasTag(l, current)) : listings
  return (
    <>
      <BackNav wide />
      <div className="landing-article">
        <header className="landing-masthead">
          <div className="listing-page-eyebrow">{eyebrow}</div>
          <h1 className="landing-title">{title}</h1>
          {sub && !loading && <p className="landing-sub">{sub}</p>}
        </header>
        {crosslinks}
        {feature}
        {available.length > 0 && (
          <div className="landing-crosslinks">
            <div className="landing-crosslinks-label">Show only</div>
            <div className="chip-row">
              {available.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={'chip' + (current === tag ? ' chip-active' : '')}
                  aria-pressed={current === tag}
                  onClick={() => setActive(current === tag ? null : tag)}
                >
                  {tag}{' '}
                  <span className="chip-count">{listings.filter((l) => hasTag(l, tag)).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="listings-header">
          <h2 className="listings-title">{loading ? 'Listings' : plural(shown.length, 'listing')}</h2>
        </div>
        {error && <div className="notice notice-error">Error loading listings: {error}</div>}
        {loading ? (
          <Loading label="Loading listings" />
        ) : shown.length === 0 ? (
          <div className="no-results">No listings here yet.</div>
        ) : (
          <PaginatedResultsGrid listings={shown} resetKey={current || ''} />
        )}
      </div>
    </>
  )
}

function countByCategory(listings) {
  const acc = {}
  listings.forEach((l) => {
    acc[l.category] = (acc[l.category] || 0) + 1
  })
  return CATEGORIES.filter((c) => acc[c.key]).map((c) => ({ ...c, count: acc[c.key] }))
}

function CountyPage() {
  const { countySlug } = useParams()
  const county = countyBySlug(countySlug)
  useDocumentTitle(county ? `${county} County` : 'Page not found')
  const { listings, loading, error } = useListings()
  const inCounty = useMemo(() => listings.filter((l) => l.county === county), [listings, county])
  if (!county) return <NotFoundPage />
  const cats = countByCategory(inCounty)
  return (
    <ListingCollection
      eyebrow={`${SITE.name} · County Directory`}
      title={`${county} County`}
      sub={`${plural(inCounty.length, 'listing')} in ${county} County.`}
      crosslinks={
        cats.length > 0 && (
          <div className="landing-crosslinks">
            <div className="landing-crosslinks-label">Browse {county} County by category</div>
            <div className="chip-row">
              {cats.map((c) => (
                <Link key={c.key} className="chip" to={`/county/${countySlug}/${c.key}`}>
                  {c.label} <span className="chip-count">{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )
      }
      feature={HVA_SHARED_COUNTIES.has(county) && <SisterSiteNote county={county} />}
      listings={inCounty}
      loading={loading}
      error={error}
    />
  )
}

function CategoryPage() {
  const { categoryKey } = useParams()
  const cat = CATEGORIES.find((c) => c.key === categoryKey)
  useDocumentTitle(cat ? cat.label : 'Page not found')
  const { listings, loading, error } = useListings()
  const inCat = useMemo(() => listings.filter((l) => l.category === categoryKey), [listings, categoryKey])
  if (!cat) return <NotFoundPage />
  const counties = COUNTIES.map((c) => ({ name: c, count: inCat.filter((l) => l.county === c).length })).filter((c) => c.count)
  return (
    <ListingCollection
      eyebrow={`${SITE.name} · Category Directory`}
      title={cat.label}
      sub={`${plural(inCat.length, 'listing')} across the Mohawk Valley.`}
      crosslinks={
        counties.length > 0 && (
          <div className="landing-crosslinks">
            <div className="landing-crosslinks-label">Browse {cat.label} by county</div>
            <div className="chip-row">
              {counties.map((c) => (
                <Link key={c.name} className="chip" to={`/county/${slugify(c.name)}/${cat.key}`}>
                  {c.name} County <span className="chip-count">{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )
      }
      listings={inCat}
      loading={loading}
      error={error}
    />
  )
}

function ComboPage() {
  const { countySlug, categoryKey } = useParams()
  const county = countyBySlug(countySlug)
  const cat = CATEGORIES.find((c) => c.key === categoryKey)
  useDocumentTitle(county && cat ? `${cat.label} in ${county} County` : 'Page not found')
  const { listings, loading, error } = useListings()
  const inCombo = useMemo(
    () => listings.filter((l) => l.county === county && l.category === categoryKey),
    [listings, county, categoryKey]
  )
  if (!county || !cat) return <NotFoundPage />
  return (
    <ListingCollection
      eyebrow={`${SITE.name} · County & Category`}
      title={`${cat.label} in ${county} County`}
      sub={`${plural(inCombo.length, 'listing')} in ${county} County.`}
      crosslinks={
        <div className="landing-crosslinks">
          <div className="landing-crosslinks-label">Also browse</div>
          <div className="chip-row">
            <Link className="chip" to={`/county/${countySlug}`}>All listings in {county} County</Link>
            <Link className="chip" to={`/category/${cat.key}`}>All {cat.label}</Link>
          </div>
        </div>
      }
      listings={inCombo}
      loading={loading}
      error={error}
    />
  )
}

// ── Listing page ─────────────────────────────────────────────────────────────
function ListingPage() {
  const { slug } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  useDocumentTitle(listing ? listing.name : notFound ? 'Listing not found' : null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .limit(1)
      console.log('Supabase response:', data, error);
      if (cancelled) return
      if (error || !data || data.length === 0) {
        setNotFound(true)
      } else {
        setListing(data[0])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.name, url })
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareMsg('Link copied')
        setTimeout(() => setShareMsg(''), 2000)
      } catch {
        setShareMsg('Could not copy')
      }
    }
  }

  if (loading)
    return (
      <>
        <BackNav />
        <div className="listing-page-article">
          <Loading label="Loading listing" />
        </div>
      </>
    )
  if (notFound)
    return (
      <>
        <BackNav />
        <div className="listing-page-article">
          <div className="panel">
            <div className="panel-title">Listing not found</div>
            <Link to="/" className="btn-primary">Back to directory</Link>
          </div>
        </div>
      </>
    )

  const l = listing
  const mapsHref = l.address
    ? `https://maps.google.com/?q=${encodeURIComponent(l.address)}`
    : null
  const verified = formatVerified(l.verified_at)
  const updateSubject = `Update listing: ${l.name}`
  const mailtoHref = `mailto:${SITE.email}?subject=${encodeURIComponent(updateSubject)}`
  const sub = [
    catLabel(l.category),
    [l.town, l.county && `${l.county} County`].filter(Boolean).join(', '),
    l.established && `Est. ${l.established}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <BackNav>
        <span>
          <button type="button" className="btn-ghost" onClick={share}>Share</button>
          {shareMsg && <span className="share-msg">{shareMsg}</span>}
        </span>
      </BackNav>
      <article className="listing-page-article">
        <header className="listing-page-masthead">
          <div className="listing-page-eyebrow">{SITE.name}</div>
          <h1 className="listing-page-title">{l.name}</h1>
          <div className="listing-page-sub">{sub}</div>
          {Array.isArray(l.tags) && l.tags.length > 0 && (
            <div className="tag-row" style={{ marginTop: 14 }}>
              {l.tags.map((t) => (
                <span key={t} className="masthead-tag">{t}</span>
              ))}
            </div>
          )}
        </header>
        <div className="listing-page-body">
          {l.description && <p className="listing-desc-lede">{linkifyDescription(l.description)}</p>}
          {verified && <p className="verified-note">Details last checked {verified}</p>}

          <dl className="info-grid">
            {l.address && (
              <div className="info-field">
                <dt>Address</dt>
                <dd>
                  <a className="plain" href={mapsHref} target="_blank" rel="noopener noreferrer">{l.address}</a>
                </dd>
              </div>
            )}
            {l.phone && (
              <div className="info-field">
                <dt>Phone</dt>
                <dd>
                  <a className="info-phone" href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} style={{ textDecoration: 'none' }}>
                    {l.phone}
                  </a>
                </dd>
              </div>
            )}
            {l.hours && (
              <div className="info-field">
                <dt>Hours</dt>
                <dd>{l.hours}</dd>
              </div>
            )}
            {l.category && (
              <div className="info-field">
                <dt>Category</dt>
                <dd>
                  <Link className="plain" to={`/category/${l.category}`}>{catLabel(l.category)}</Link>
                </dd>
              </div>
            )}
            {l.website && (
              <div className="info-field info-field-wide">
                <dt>Website</dt>
                <dd>
                  <a
                    href={l.website.startsWith('http') ? l.website : `https://${l.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.website}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          <div className="claim-box">
            <a href={mailtoHref} className="btn-primary">Update My Listing</a>
          </div>
        </div>
      </article>
    </>
  )
}

// ── About ────────────────────────────────────────────────────────────────────
function AboutPage() {
  useDocumentTitle('About')
  const openSubmitForm = useOpenSubmitForm()
  return (
    <>
      <BackNav />
      <article className="listing-page-article">
        <header className="listing-page-masthead">
          <div className="listing-page-eyebrow">{SITE.name} · About</div>
          <h1 className="listing-page-title">About the Almanac</h1>
        </header>
        <div className="listing-page-body">
          <p className="about-lede">{SITE.tagline}.</p>
          <div className="about-body">
            <p>{SITE.footer}.</p>
            <p>
              Run a farm, shop, or service in the region?{' '}
              <button type="button" className="link-button" onClick={openSubmitForm}>Submit a Listing</button>. Every
              submission is reviewed before it's published.
            </p>
            <p>
              Questions, corrections, or updates to an existing listing: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
            </p>
            <p>
              Our sister site, the{' '}
              <a href="https://www.hudsonvalleyalmanac.com" target="_blank" rel="noreferrer">Hudson Valley Almanac</a>, also
              covers Fulton, Montgomery, Schoharie, Otsego and Schenectady Counties, along with the Hudson Valley,
              Catskills, and Capital Region.
            </p>
          </div>
        </div>
      </article>
    </>
  )
}

// ── Admin ────────────────────────────────────────────────────────────────────
function Admin() {
  useDocumentTitle('Admin')
  const [pw, setPw] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const requiredPw = import.meta.env.VITE_ADMIN_PASSWORD

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(2000)
    console.log('Supabase response:', data, error);
    if (!error) setPending(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (authed) load()
  }, [authed])

  function tryAuth(e) {
    e.preventDefault()
    if (pw && pw === requiredPw) {
      setAuthed(true)
      setMsg('')
    } else {
      setMsg('Incorrect password')
    }
  }

  async function setStatus(id, status) {
    const { error } = await supabase.from('listings').update({ status }).eq('id', id)
    if (error) setMsg(error.message)
    else load()
  }

  if (!authed) {
    return (
      <div className="listing-page-article" style={{ maxWidth: 480 }}>
        <header className="listing-page-masthead">
          <h1 className="listing-page-title">Admin</h1>
        </header>
        <form className="listing-page-body submit-form" onSubmit={tryAuth}>
          <label htmlFor="admin-pw">Password</label>
          <input id="admin-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          {msg && <div className="form-error">{msg}</div>}
          <button type="submit" className="btn-primary">Enter</button>
        </form>
      </div>
    )
  }

  return (
    <div className="landing-article">
      <header className="landing-masthead">
        <div className="listing-page-eyebrow">{SITE.name} · Admin</div>
        <h1 className="landing-title">Pending Listings</h1>
      </header>
      {msg && <div className="notice">{msg}</div>}
      {loading ? (
        <Loading label="Loading" />
      ) : pending.length === 0 ? (
        <div className="no-results">No pending submissions.</div>
      ) : (
        <div className="results-grid">
          {pending.map((l) => (
            <div key={l.id} className="listing-card" style={{ cursor: 'default' }}>
              <div className="listing-name">{l.name}</div>
              <div className="listing-meta">
                {[catLabel(l.category), l.town, l.county && `${l.county} County`].filter(Boolean).join(' · ')}
              </div>
              {l.description && <p className="listing-desc">{l.description}</p>}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" onClick={() => setStatus(l.id, 'published')}>Approve</button>
                <button type="button" className="btn-ghost" onClick={() => setStatus(l.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Companion page for the book "Freezer Full: Mohawk Valley Edition". The book
// sends readers here for the current farm list; data lives in src/data/freezer-full.js.
function FreezerFullPage() {
  useDocumentTitle('Freezer Full: Farm List')
  return (
    <>
      <BackNav />
      <FreezerFullContent siteName="Mohawk Valley Almanac" bookTitle="Freezer Full: Mohawk Valley Edition" />
    </>
  )
}

function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <>
      <BackNav />
      <div className="listing-page-article">
        <div className="panel">
          <div className="panel-code">404</div>
          <div className="panel-title">Page not found</div>
          <Link to="/" className="btn-primary">Back to directory</Link>
        </div>
      </div>
    </>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [showSubmit, setShowSubmit] = useState(false)
  const openSubmitForm = useMemo(() => () => setShowSubmit(true), [])
  const closeSubmitForm = useMemo(() => () => setShowSubmit(false), [])
  return (
    <>
      <GlobalStyles />
      <SubmitFormContext.Provider value={openSubmitForm}>
        <div className="app">
          <TopNav />
          <div className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/county/:countySlug" element={<CountyPage />} />
              <Route path="/county/:countySlug/:categoryKey" element={<ComboPage />} />
              <Route path="/category/:categoryKey" element={<CategoryPage />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/listing/:slug" element={<ListingPage />} />
              <Route path="/listings/:slug" element={<ListingPage />} />
              <Route path="/freezer-full" element={<FreezerFullPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
        {showSubmit && <SubmitForm onClose={closeSubmitForm} />}
      </SubmitFormContext.Provider>
    </>
  )
}
