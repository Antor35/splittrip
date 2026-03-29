import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { CURRENCIES } from '../lib/currencies'

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')

  // Create form
  const [tripName, setTripName] = useState('')
  const [tripDesc, setTripDesc] = useState('')
  const [currency, setCurrency] = useState('CHF')
  const [creatorName, setCreatorName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Join form
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!tripName.trim() || !creatorName.trim()) return
    setCreating(true); setCreateError('')
    try {
      // 1. Create trip
      const tripRes = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tripName.trim(), description: tripDesc.trim(), base_currency: currency }),
      })
      if (!tripRes.ok) throw new Error('Failed to create trip')
      const trip = await tripRes.json()

      // 2. Add creator as first member
      const memRes = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.id, name: creatorName.trim() }),
      })
      if (!memRes.ok) throw new Error('Failed to add member')
      const member = await memRes.json()

      // 3. Store identity in localStorage and navigate
      localStorage.setItem(`member_${trip.id}`, JSON.stringify(member))
      router.push(`/trip/${trip.code}`)
    } catch (err: any) {
      setCreateError(err.message || 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinCode.trim() || !joinName.trim()) return
    setJoining(true); setJoinError('')
    try {
      // 1. Find trip by code
      const tripRes = await fetch(`/api/trips?code=${joinCode.trim().toUpperCase()}`)
      if (!tripRes.ok) throw new Error('Trip not found — check your code')
      const trip = await tripRes.json()

      // 2. Check if already joined (same name)
      const memListRes = await fetch(`/api/members?trip_id=${trip.id}`)
      const members = await memListRes.json()
      const existing = members.find((m: any) => m.name.toLowerCase() === joinName.trim().toLowerCase())

      let member = existing
      if (!existing) {
        const memRes = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_id: trip.id, name: joinName.trim() }),
        })
        if (!memRes.ok) throw new Error('Failed to join trip')
        member = await memRes.json()
      }

      localStorage.setItem(`member_${trip.id}`, JSON.stringify(member))
      router.push(`/trip/${trip.code}`)
    } catch (err: any) {
      setJoinError(err.message || 'Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  return (
    <>
      <Head>
        <title>SplitTrip — Split expenses with friends</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>✈️</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 38, fontWeight: 700, color: 'var(--ink)', letterSpacing: -1 }}>SplitTrip</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 16 }}>Split travel expenses effortlessly</p>
        </div>

        <div style={{ width: '100%', maxWidth: 440 }}>
          {mode === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button onClick={() => setMode('create')} style={{
                background: 'var(--blue)', color: '#fff', padding: '16px 24px',
                borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 700,
                boxShadow: '0 4px 20px rgba(29,78,216,0.3)',
              }}>
                🗺️ &nbsp; Create a new trip
              </button>
              <button onClick={() => setMode('join')} style={{
                background: 'var(--surface)', color: 'var(--ink)', padding: '16px 24px',
                borderRadius: 'var(--radius)', fontSize: 16, fontWeight: 600,
                border: '1.5px solid var(--line)', boxShadow: 'var(--shadow)',
              }}>
                🔗 &nbsp; Join an existing trip
              </button>
            </div>
          )}

          {mode === 'create' && (
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow2)' }}>
              <button onClick={() => setMode('home')} style={{ background: 'none', color: 'var(--muted)', fontSize: 14, marginBottom: 18, padding: 0 }}>← Back</button>
              <h2 style={{ fontSize: 24, marginBottom: 24 }}>Create a trip</h2>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelS}>Trip Name *</label>
                  <input placeholder="e.g. Switzerland 2026" value={tripName} onChange={e => setTripName(e.target.value)} required />
                </div>
                <div>
                  <label style={labelS}>Description (optional)</label>
                  <input placeholder="e.g. Alps skiing with the crew" value={tripDesc} onChange={e => setTripDesc(e.target.value)} />
                </div>
                <div>
                  <label style={labelS}>Base Currency *</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelS}>Your Name *</label>
                  <input placeholder="e.g. Anna" value={creatorName} onChange={e => setCreatorName(e.target.value)} required />
                </div>
                {createError && <div style={{ color: 'var(--red)', fontSize: 13 }}>{createError}</div>}
                <button type="submit" disabled={creating} style={{
                  background: 'var(--blue)', color: '#fff', padding: '14px',
                  borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700, marginTop: 4,
                }}>
                  {creating ? 'Creating…' : 'Create Trip →'}
                </button>
              </form>
            </div>
          )}

          {mode === 'join' && (
            <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, boxShadow: 'var(--shadow2)' }}>
              <button onClick={() => setMode('home')} style={{ background: 'none', color: 'var(--muted)', fontSize: 14, marginBottom: 18, padding: 0 }}>← Back</button>
              <h2 style={{ fontSize: 24, marginBottom: 24 }}>Join a trip</h2>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelS}>Invite Code *</label>
                  <input placeholder="e.g. AB3X7K" value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 3, textTransform: 'uppercase' }}
                    maxLength={6} required />
                </div>
                <div>
                  <label style={labelS}>Your Name *</label>
                  <input placeholder="e.g. Jonas" value={joinName} onChange={e => setJoinName(e.target.value)} required />
                </div>
                {joinError && <div style={{ color: 'var(--red)', fontSize: 13 }}>{joinError}</div>}
                <button type="submit" disabled={joining} style={{
                  background: 'var(--blue)', color: '#fff', padding: '14px',
                  borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700, marginTop: 4,
                }}>
                  {joining ? 'Joining…' : 'Join Trip →'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 40, textAlign: 'center' }}>
          No account needed · Data stored securely · Free to use
        </p>
      </div>
    </>
  )
}

const labelS: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase',
}
