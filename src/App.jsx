import React, { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from './supabase'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: '#1C3A5E',
  accent: '#C4862D',
  bg: '#EFF0E8',
  surface: '#F5F6F0',
  text: '#1A2B3C',
  muted: '#5C7A8A',
  border: '#D8DBCF',
}

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
]

const slugify = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const catLabel = (k) => CATEGORIES.find((c) => c.key === k)?.label || k

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
      <a key={key++} href={href} target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: 'underline' }}>
        {url}
      </a>
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

// ── Global styles ────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { margin: 0; padding: 0; }
      body {
        background: ${C.bg};
        color: ${C.text};
        font-family: 'Lora', Georgia, serif;
        font-size: 16px;
        line-height: 1.55;
        -webkit-font-smoothing: antialiased;
      }
      a { color: ${C.primary}; text-decoration: none; }
      a:hover { text-decoration: underline; }
      h1, h2, h3, h4 { font-family: 'Libre Baskerville', Georgia, serif; color: ${C.text}; margin: 0 0 .5em; }
      h1 { font-size: 2rem; line-height: 1.15; }
      h2 { font-size: 1.4rem; }
      h3 { font-size: 1.1rem; }
      code, .mono { font-family: 'DM Mono', ui-monospace, monospace; }
      input, select, textarea, button { font-family: inherit; font-size: 1rem; }
      input, select, textarea {
        background: ${C.surface};
        border: 1px solid ${C.border};
        color: ${C.text};
        padding: .55rem .7rem;
        border-radius: 4px;
        width: 100%;
      }
      input:focus, select:focus, textarea:focus { outline: 2px solid ${C.accent}; outline-offset: 0; border-color: ${C.accent}; }
      button { cursor: pointer; }

      .spinner {
        width: 38px; height: 38px;
        border: 3px solid ${C.border};
        border-top-color: ${C.primary};
        border-radius: 50%;
        animation: mv-spin 0.9s linear infinite;
        margin: 2rem auto;
      }
      @keyframes mv-spin { to { transform: rotate(360deg); } }

      .cat-scroll { overflow-x: auto; scrollbar-width: thin; }
      .cat-scroll::-webkit-scrollbar { height: 6px; }
      .cat-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

      .mobile-only { display: none; }
      @media (max-width: 760px) {
        .desktop-only { display: none !important; }
        .mobile-only { display: block; }
        h1 { font-size: 1.5rem; }
        .layout-grid { grid-template-columns: 1fr !important; }
        .filter-card { grid-template-columns: 1fr !important; }
      }

      .drawer-backdrop {
        position: fixed; inset: 0; background: rgba(28,58,94,.45);
        z-index: 90;
      }
      .drawer {
        position: fixed; top: 0; bottom: 0; left: 0; width: 84%; max-width: 340px;
        background: ${C.surface}; z-index: 100; padding: 1rem 1.25rem;
        overflow-y: auto; box-shadow: 2px 0 16px rgba(0,0,0,.15);
      }

      .card { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 6px; padding: 1rem 1.1rem; }
      .tag {
        display: inline-block; font-size: .75rem; padding: .15rem .55rem;
        background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 999px;
        color: ${C.muted}; margin: 0 .35rem .35rem 0;
      }
      .badge {
        display: inline-block; font-size: .7rem; letter-spacing: .04em;
        text-transform: uppercase; color: ${C.accent}; font-weight: 700;
        font-family: 'DM Mono', monospace;
      }
    `}</style>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header>
      <div
        style={{
          background: C.primary,
          color: '#fff',
          fontFamily: "'DM Mono', monospace",
          fontSize: '.75rem',
          textAlign: 'center',
          padding: '.4rem .75rem',
          letterSpacing: '.02em',
        }}
      >
        {SITE.topbar}
      </div>
      <div
        style={{
          background: C.primary,
          color: '#fff',
          padding: '1.4rem 1.25rem 1.6rem',
          borderBottom: `4px solid ${C.accent}`,
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
            <h1
              style={{
                margin: 0,
                color: '#fff',
                fontFamily: "'Libre Baskerville', Georgia, serif",
                fontWeight: 700,
                letterSpacing: '.01em',
              }}
            >
              {SITE.name}
            </h1>
          </Link>
          <div
            style={{
              fontStyle: 'italic',
              color: '#E8D9B8',
              marginTop: '.35rem',
              fontSize: '1rem',
            }}
          >
            {SITE.tagline}
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      style={{
        background: C.primary,
        color: '#E8D9B8',
        padding: '2rem 1.25rem',
        marginTop: '3rem',
        borderTop: `4px solid ${C.accent}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '1.1rem', color: '#fff' }}>
            {SITE.name}
          </div>
          <div style={{ fontSize: '.9rem', marginTop: '.5rem' }}>{SITE.footer}</div>
        </div>
        <div style={{ fontSize: '.9rem' }}>
          <div>
            <a href={`mailto:${SITE.email}`} style={{ color: '#E8D9B8' }}>
              {SITE.email}
            </a>
          </div>
          <div style={{ marginTop: '.4rem' }}>
            <Link to="/admin" style={{ color: '#E8D9B8' }}>
              Admin
            </Link>
          </div>
        </div>
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

// ── Category nav ─────────────────────────────────────────────────────────────
function CategoryNav({ active, onSelect }) {
  return (
    <nav
      className="cat-scroll desktop-only"
      style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '.5rem 1.25rem',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <button
          onClick={() => onSelect('all')}
          style={catBtnStyle(active === 'all')}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            style={catBtnStyle(active === c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
function catBtnStyle(active) {
  return {
    background: active ? C.primary : 'transparent',
    color: active ? '#fff' : C.text,
    border: `1px solid ${active ? C.primary : C.border}`,
    padding: '.35rem .8rem',
    marginRight: '.4rem',
    borderRadius: 999,
    fontSize: '.85rem',
    cursor: 'pointer',
  }
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ counts, active, onSelect }) {
  return (
    <aside className="desktop-only">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Browse by Category</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <button
              onClick={() => onSelect('all')}
              style={sideBtn(active === 'all')}
            >
              <span>All Listings</span>
              <span className="mono" style={{ color: C.muted }}>
                {counts._total || 0}
              </span>
            </button>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.key}>
              <button
                onClick={() => onSelect(c.key)}
                style={sideBtn(active === c.key)}
              >
                <span>{c.label}</span>
                <span className="mono" style={{ color: C.muted }}>
                  {counts[c.key] || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
function sideBtn(active) {
  return {
    width: '100%',
    background: active ? C.bg : 'transparent',
    color: C.text,
    border: 'none',
    borderLeft: `3px solid ${active ? C.accent : 'transparent'}`,
    padding: '.45rem .6rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'inherit',
    fontSize: '.95rem',
    cursor: 'pointer',
    textAlign: 'left',
  }
}

// ── Listing card ─────────────────────────────────────────────────────────────
function ListingCard({ l }) {
  const slug = l.slug || slugify(l.name)
  return (
    <article className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="badge">{catLabel(l.category)}</div>
          <h3 style={{ margin: '.25rem 0 .15rem' }}>
            <Link to={`/listing/${slug}`} style={{ color: C.text }}>
              {l.name}
            </Link>
          </h3>
          <div style={{ color: C.muted, fontSize: '.9rem' }}>
            {[l.town, l.county && `${l.county} County`].filter(Boolean).join(' · ')}
            {l.established && (
              <>
                {' · '}
                <span className="mono">Est. {l.established}</span>
              </>
            )}
          </div>
          {l.description && (
            <p style={{ margin: '.6rem 0 .5rem', color: C.text }}>
              {linkifyDescription(l.description)}
            </p>
          )}
          {Array.isArray(l.tags) && l.tags.length > 0 && (
            <div>
              {l.tags.slice(0, 6).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Submit form ──────────────────────────────────────────────────────────────
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

  if (done) {
    return (
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Thank you</h3>
        <p>Your listing has been submitted for review.</p>
        <button onClick={onClose} style={btnPrimary()}>
          Close
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginTop: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Submit a Listing</h3>
      <div style={{ display: 'grid', gap: '.7rem' }}>
        <label>
          Name <input required value={form.name} onChange={upd('name')} />
        </label>
        <label>
          Category{' '}
          <select value={form.category} onChange={upd('category')}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
          <label>
            County{' '}
            <select value={form.county} onChange={upd('county')}>
              <option value="">—</option>
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Town <input value={form.town} onChange={upd('town')} />
          </label>
        </div>
        <label>
          Description{' '}
          <textarea rows={3} value={form.description} onChange={upd('description')} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
          <label>
            Phone <input value={form.phone} onChange={upd('phone')} />
          </label>
          <label>
            Website <input value={form.website} onChange={upd('website')} />
          </label>
        </div>
        <label>
          Address <input value={form.address} onChange={upd('address')} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '.7rem' }}>
          <label>
            Hours <input value={form.hours} onChange={upd('hours')} />
          </label>
          <label>
            Established <input value={form.established} onChange={upd('established')} />
          </label>
        </div>
        <label>
          Tags (comma-separated)
          <input value={form.tags} onChange={upd('tags')} />
        </label>
        {err && <div style={{ color: '#b00020' }}>{err}</div>}
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button type="submit" disabled={submitting} style={btnPrimary()}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button type="button" onClick={onClose} style={btnGhost()}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

function btnPrimary() {
  return {
    background: C.accent,
    color: '#fff',
    border: 'none',
    padding: '.6rem 1.1rem',
    borderRadius: 4,
    fontWeight: 600,
  }
}
function btnGhost() {
  return {
    background: 'transparent',
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: '.6rem 1.1rem',
    borderRadius: 4,
  }
}

// ── Home ─────────────────────────────────────────────────────────────────────
function Home() {
  const { listings, loading, error } = useListings()
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') || ''
  const county = searchParams.get('county') || 'all'
  const town = searchParams.get('town') || 'all'
  const category = searchParams.get('category') || 'all'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

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
      <CategoryNav active={category} onSelect={setCategory} />

      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '1.25rem',
        }}
      >
        {/* Search bar + filters */}
        <div
          className="card filter-card"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr auto',
            gap: '.7rem',
            alignItems: 'end',
            marginBottom: '1rem',
          }}
        >
          <label>
            Search
            <input
              placeholder="Name, tag, town…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            County
            <select value={county} onChange={(e) => setCounty(e.target.value)}>
              <option value="all">All Counties</option>
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Town
            <select value={town} onChange={(e) => setTown(e.target.value)}>
              <option value="all">All Towns</option>
              {towns.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="mobile-only"
            onClick={() => setDrawerOpen(true)}
            style={btnPrimary()}
          >
            Categories
          </button>
        </div>

        <div
          className="layout-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          <Sidebar counts={counts} active={category} onSelect={setCategory} />
          <main>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '.75rem',
              }}
            >
              <div style={{ color: C.muted }}>
                {loading
                  ? 'Loading…'
                  : `${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'}`}
              </div>
              <button onClick={() => setShowSubmit((v) => !v)} style={btnPrimary()}>
                {showSubmit ? 'Hide form' : 'Submit a Listing'}
              </button>
            </div>

            {showSubmit && <SubmitForm onClose={() => setShowSubmit(false)} />}

            {error && (
              <div className="card" style={{ marginBottom: '1rem', color: '#b00020' }}>
                Error loading listings: {error}
              </div>
            )}

            {loading ? (
              <div className="spinner" />
            ) : filtered.length === 0 ? (
              <div className="card">
                <p style={{ margin: 0 }}>
                  No listings match. Try clearing filters or{' '}
                  <button
                    onClick={() => setShowSubmit(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.primary,
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    submit one
                  </button>
                  .
                </p>
              </div>
            ) : (
              filtered.map((l) => <ListingCard key={l.id || l.slug || l.name} l={l} />)
            )}
          </main>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '.75rem',
              }}
            >
              <h3 style={{ margin: 0 }}>Categories</h3>
              <button onClick={() => setDrawerOpen(false)} style={btnGhost()}>
                Close
              </button>
            </div>
            <Sidebar counts={counts} active={category} onSelect={(k) => {
              setCategory(k)
              setDrawerOpen(false)
            }} />
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={() => {
                  setCategory('all')
                  setDrawerOpen(false)
                }}
                style={btnGhost()}
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Listing page ─────────────────────────────────────────────────────────────
function ListingPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

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
      } catch (e) {
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
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.25rem' }}>
        <div className="spinner" />
      </div>
    )
  if (notFound)
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.25rem' }}>
        <div className="card">
          <h2>Listing not found</h2>
          <button onClick={() => navigate('/')} style={btnPrimary()}>
            Back to directory
          </button>
        </div>
      </div>
    )

  const l = listing
  const mapsHref = l.address
    ? `https://maps.google.com/?q=${encodeURIComponent(l.address)}`
    : null
  const updateSubject = `Update listing: ${l.name}`
  const mailtoHref = `mailto:${SITE.email}?subject=${encodeURIComponent(updateSubject)}`

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.25rem' }}>
      <div style={{ marginBottom: '.75rem' }}>
        <Link to="/">← Back to directory</Link>
      </div>
      <article className="card">
        <div className="badge">{catLabel(l.category)}</div>
        <h1 style={{ margin: '.25rem 0 .35rem' }}>{l.name}</h1>
        <div style={{ color: C.muted, marginBottom: '.6rem' }}>
          {[l.town, l.county && `${l.county} County`].filter(Boolean).join(' · ')}
          {l.established && (
            <>
              {' · '}
              <span className="mono">Est. {l.established}</span>
            </>
          )}
        </div>

        {l.description && <p style={{ marginTop: 0 }}>{linkifyDescription(l.description)}</p>}

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            gap: '.4rem .9rem',
            margin: '1rem 0',
          }}
        >
          {l.phone && (
            <>
              <dt style={{ color: C.muted }}>Phone</dt>
              <dd style={{ margin: 0 }}>
                <a
                  href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}
                  style={{
                    color: C.accent,
                    fontFamily: "'DM Mono', ui-monospace, monospace",
                    fontWeight: 500,
                    fontSize: '1.05rem',
                  }}
                >
                  {l.phone}
                </a>
              </dd>
            </>
          )}
          {l.address && (
            <>
              <dt style={{ color: C.muted }}>Address</dt>
              <dd style={{ margin: 0 }}>
                <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                  {l.address}
                </a>
              </dd>
            </>
          )}
          {l.website && (
            <>
              <dt style={{ color: C.muted }}>Website</dt>
              <dd style={{ margin: 0 }}>
                <a
                  href={l.website.startsWith('http') ? l.website : `https://${l.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.accent, textDecoration: 'underline' }}
                >
                  {l.website}
                </a>
              </dd>
            </>
          )}
          {l.hours && (
            <>
              <dt style={{ color: C.muted }}>Hours</dt>
              <dd style={{ margin: 0 }}>{l.hours}</dd>
            </>
          )}
        </dl>

        {Array.isArray(l.tags) && l.tags.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {l.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={share} style={btnPrimary()}>
            Share
          </button>
          <a href={mailtoHref} style={{ ...btnGhost(), textDecoration: 'none', display: 'inline-block' }}>
            Update My Listing
          </a>
          {shareMsg && <span style={{ color: C.muted }}>{shareMsg}</span>}
        </div>
      </article>
    </div>
  )
}

// ── Admin ────────────────────────────────────────────────────────────────────
function Admin() {
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
      <div style={{ maxWidth: 420, margin: '3rem auto', padding: '1.25rem' }}>
        <form className="card" onSubmit={tryAuth}>
          <h2 style={{ marginTop: 0 }}>Admin</h2>
          <label>
            Password
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
            />
          </label>
          {msg && <div style={{ color: '#b00020', marginTop: '.5rem' }}>{msg}</div>}
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" style={btnPrimary()}>
              Enter
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.25rem' }}>
      <h2>Pending Listings</h2>
      {msg && <div className="card" style={{ marginBottom: '1rem' }}>{msg}</div>}
      {loading ? (
        <div className="spinner" />
      ) : pending.length === 0 ? (
        <div className="card">No pending submissions.</div>
      ) : (
        pending.map((l) => (
          <div key={l.id} className="card" style={{ marginBottom: '1rem' }}>
            <div className="badge">{catLabel(l.category)}</div>
            <h3 style={{ margin: '.25rem 0' }}>{l.name}</h3>
            <div style={{ color: C.muted, fontSize: '.9rem' }}>
              {[l.town, l.county && `${l.county} County`].filter(Boolean).join(' · ')}
            </div>
            {l.description && <p>{l.description}</p>}
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button onClick={() => setStatus(l.id, 'published')} style={btnPrimary()}>
                Approve
              </button>
              <button onClick={() => setStatus(l.id, 'rejected')} style={btnGhost()}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/listing/:slug" element={<ListingPage />} />
            <Route path="/listings/:slug" element={<ListingPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </>
  )
}
