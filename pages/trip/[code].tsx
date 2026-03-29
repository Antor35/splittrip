import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Trip, Member, Expense } from '../../lib/supabase'
import { calcBalances, calcSettlements } from '../../lib/balances'
import { formatAmount, getCurrency } from '../../lib/currencies'
import AddExpenseModal from '../../components/AddExpenseModal'

const CATEGORIES: Record<string, { icon: string; color: string }> = {
  food:          { icon: '🍽️', color: '#fde68a' },
  transport:     { icon: '🚆', color: '#bfdbfe' },
  accommodation: { icon: '🏔️', color: '#bbf7d0' },
  activities:    { icon: '⛷️', color: '#fecdd3' },
  shopping:      { icon: '🛍️', color: '#e9d5ff' },
  drinks:        { icon: '🍻', color: '#fed7aa' },
  other:         { icon: '💳', color: '#e5e7eb' },
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,72%)`, color: `hsl(${hue},55%,22%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.7)',
    }}>{initials}</div>
  )
}

function ReceiptModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <img src={url} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
    </div>
  )
}

export default function TripPage() {
  const router = useRouter()
  const { code } = router.query as { code: string }

  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'expenses' | 'balances' | 'members'>('expenses')
  const [showAdd, setShowAdd] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const [copied, setCopied] = useState(false)
  const [notMember, setNotMember] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)

  const fetchAll = useCallback(async (tripId: string) => {
    const [memRes, expRes] = await Promise.all([
      fetch(`/api/members?trip_id=${tripId}`),
      fetch(`/api/expenses?trip_id=${tripId}`),
    ])
    const [mems, exps] = await Promise.all([memRes.json(), expRes.json()])
    setMembers(Array.isArray(mems) ? mems : [])
    setExpenses(Array.isArray(exps) ? exps : [])
  }, [])

  useEffect(() => {
    if (!code) return
    ;(async () => {
      try {
        const tripRes = await fetch(`/api/trips?code=${code}`)
        if (!tripRes.ok) { setError('Trip not found'); setLoading(false); return }
        const tripData: Trip = await tripRes.json()
        setTrip(tripData)

        await fetchAll(tripData.id)

        // Check if user is a member
        const stored = localStorage.getItem(`member_${tripData.id}`)
        if (stored) {
          setCurrentMember(JSON.parse(stored))
        } else {
          setNotMember(true)
        }
      } catch {
        setError('Failed to load trip')
      } finally {
        setLoading(false)
      }
    })()
  }, [code, fetchAll])

  // Poll for updates every 10s
  useEffect(() => {
    if (!trip) return
    const id = setInterval(() => fetchAll(trip.id), 10000)
    return () => clearInterval(id)
  }, [trip, fetchAll])

  const handleJoinHere = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trip || !joinName.trim()) return
    setJoining(true)
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_id: trip.id, name: joinName.trim() }),
    })
    if (res.ok) {
      const member = await res.json()
      localStorage.setItem(`member_${trip.id}`, JSON.stringify(member))
      setCurrentMember(member)
      setNotMember(false)
      await fetchAll(trip.id)
    }
    setJoining(false)
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    if (trip) await fetchAll(trip.id)
  }

  const copyInvite = () => {
    const url = `${window.location.origin}/trip/${trip?.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 40 }}>✈️</div>
      <div style={{ color: 'var(--muted)' }}>Loading trip…</div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 40 }}>😕</div>
      <div style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</div>
      <button onClick={() => router.push('/')} style={{ background: 'var(--blue)', color: '#fff', padding: '12px 24px', borderRadius: 'var(--radius)', fontWeight: 600 }}>Go Home</button>
    </div>
  )

  if (!trip) return null

  // ── Join prompt (visiting via link but not yet a member) ────────────────────
  if (notMember) return (
    <>
      <Head><title>Join {trip.name} — SplitTrip</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%', boxShadow: 'var(--shadow2)', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✈️</div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{trip.name}</h1>
          {trip.description && <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 14 }}>{trip.description}</p>}
          <div style={{ background: '#f2f5fa', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: 'var(--ink2)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} already joined
          </div>
          <form onSubmit={handleJoinHere} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={LS}>Your Name *</label>
              <input placeholder="e.g. Jonas" value={joinName} onChange={e => setJoinName(e.target.value)} required />
            </div>
            <button type="submit" disabled={joining} style={{ background: 'var(--blue)', color: '#fff', padding: '14px', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: 15 }}>
              {joining ? 'Joining…' : 'Join Trip →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )

  if (!currentMember) return null

  // ── Computed data ────────────────────────────────────────────────────────────
  const balances = calcBalances(members, expenses)
  const settlements = calcSettlements(balances, trip.base_currency)
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const myBal = balances.find(b => b.memberId === currentMember.id)?.amount || 0
  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat)

  return (
    <>
      <Head><title>{trip.name} — SplitTrip</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f1c2e 0%, #1d3a6e 55%, #1d4ed8 100%)',
          padding: '24px 20px 72px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -70, left: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 4 }}>✈️ SplitTrip</div>
                <h1 style={{ color: '#fff', fontSize: 26, lineHeight: 1.2 }}>{trip.name}</h1>
                {trip.description && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>{trip.description}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 0.5 }}>YOUR BALANCE</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: myBal >= 0 ? '#6ee7b7' : '#fca5a5', marginTop: 2 }}>
                  {myBal >= 0 ? '+' : ''}{trip.base_currency} {Math.abs(myBal).toFixed(2)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                  {myBal > 0.01 ? 'you are owed' : myBal < -0.01 ? 'you owe' : 'all settled ✓'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {[
                ['TOTAL', `${trip.base_currency} ${totalSpent.toFixed(0)}`],
                ['MEMBERS', `${members.length}`],
                ['EXPENSES', `${expenses.length}`],
              ].map(([l, v]) => (
                <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 0.5 }}>{l}</div>
                  <div style={{ color: '#fff', fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, marginTop: 1 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main card ── */}
        <div style={{ maxWidth: 600, margin: '-48px auto 0', padding: '0 16px 100px', position: 'relative' }}>
          <div style={{ background: '#fff', borderRadius: 22, boxShadow: 'var(--shadow2)', overflow: 'hidden' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
              {(['expenses', 'balances', 'members'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '14px 0', background: 'none',
                  fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
                  color: tab === t ? 'var(--blue)' : 'var(--muted)',
                  borderBottom: `2.5px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}>{t}</button>
              ))}
            </div>

            <div style={{ padding: 20 }}>

              {/* ── EXPENSES TAB ── */}
              {tab === 'expenses' && (
                <div>
                  {/* Category filter */}
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
                    {[{ id: 'all', icon: '✦' }, ...Object.entries(CATEGORIES).map(([id, v]) => ({ id, icon: v.icon }))].map(c => (
                      <button key={c.id} onClick={() => setFilterCat(c.id)} style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                        background: filterCat === c.id ? 'var(--blue)' : '#f0f2f6',
                        color: filterCat === c.id ? '#fff' : 'var(--ink2)',
                        fontSize: 13, fontWeight: 600,
                      }}>{c.icon}{c.id === 'all' ? ' All' : ''}</button>
                    ))}
                  </div>

                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
                      No expenses yet. Tap + to add one!
                    </div>
                  ) : filtered.map(exp => {
                    const cat = CATEGORIES[exp.category] || CATEGORIES.other
                    const payer = members.find(m => m.id === exp.paid_by_id)
                    const myShare = exp.shared_with?.includes(currentMember.id) ? exp.amount / exp.shared_with.length : 0
                    const isMyExpense = exp.paid_by_id === currentMember.id
                    return (
                      <div key={exp.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                          {cat.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{exp.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                            Paid by {isMyExpense ? 'you' : payer?.name} · split {exp.shared_with?.length || 1} ways
                          </div>
                          {exp.notes && <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{exp.notes}</div>}
                          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            {exp.receipt_url && (
                              <button type="button" onClick={() => setReceiptUrl(exp.receipt_url!)} style={{
                                background: '#f0f2f6', padding: '4px 10px', borderRadius: 999,
                                fontSize: 11, fontWeight: 600, color: 'var(--ink2)',
                              }}>📷 Receipt</button>
                            )}
                            {isMyExpense && (
                              <button type="button" onClick={() => handleDeleteExpense(exp.id)} style={{
                                background: '#fee2e2', padding: '4px 10px', borderRadius: 999,
                                fontSize: 11, fontWeight: 600, color: 'var(--red)',
                              }}>Delete</button>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700 }}>
                            {exp.currency} {exp.amount.toFixed(2)}
                          </div>
                          {myShare > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                              your share: {exp.currency} {myShare.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── BALANCES TAB ── */}
              {tab === 'balances' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, marginBottom: 14 }}>INDIVIDUAL BALANCES</div>
                  {balances.map(b => (
                    <div key={b.memberId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
                      <Avatar name={b.memberName} />
                      <div style={{ flex: 1, fontWeight: b.memberId === currentMember.id ? 700 : 500 }}>
                        {b.memberName}{b.memberId === currentMember.id ? ' (you)' : ''}
                      </div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 16, color: b.amount >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {b.amount >= 0 ? '+' : ''}{trip.base_currency} {b.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {settlements.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, margin: '24px 0 14px' }}>WHO PAYS WHOM</div>
                      {settlements.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8faff', borderRadius: 14, padding: '13px 16px', marginBottom: 10 }}>
                          <Avatar name={s.fromName} size={32} />
                          <div style={{ flex: 1, fontSize: 14 }}>
                            <strong>{s.fromId === currentMember.id ? 'You' : s.fromName}</strong>
                            <span style={{ color: 'var(--muted)' }}> pay </span>
                            <strong>{s.toId === currentMember.id ? 'you' : s.toName}</strong>
                          </div>
                          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--blue)', fontSize: 16 }}>
                            {trip.base_currency} {s.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {settlements.length === 0 && expenses.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--green)', fontWeight: 600 }}>✅ All settled up!</div>
                  )}
                </div>
              )}

              {/* ── MEMBERS TAB ── */}
              {tab === 'members' && (
                <div>
                  {/* Invite box */}
                  <div style={{ background: 'linear-gradient(135deg, #eef5ff, #e0ecff)', borderRadius: 16, padding: '18px 20px', marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, marginBottom: 8 }}>INVITE YOUR FRIENDS</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: 4, background: '#fff', padding: '8px 16px', borderRadius: 10 }}>
                        {trip.code}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink2)' }}>← Code to type in</div>
                    </div>
                    <button onClick={copyInvite} style={{
                      background: copied ? 'var(--green)' : 'var(--blue)', color: '#fff',
                      padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    }}>
                      {copied ? '✓ Link copied!' : '🔗 Copy invite link'}
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                      Share the link OR the code — either works
                    </div>
                  </div>

                  {/* Member list */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, marginBottom: 14 }}>MEMBERS ({members.length})</div>
                  {members.map(m => {
                    const expCount = expenses.filter(e => e.paid_by_id === m.id).length
                    const paid = expenses.filter(e => e.paid_by_id === m.id).reduce((s, e) => s + e.amount, 0)
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                        <Avatar name={m.name} size={44} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {m.name}
                            {m.id === currentMember.id && <span style={{ background: '#dbeafe', color: 'var(--blue)', fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>you</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                            {expCount} expense{expCount !== 1 ? 's' : ''} paid · {trip.base_currency} {paid.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAB */}
        <button onClick={() => setShowAdd(true)} style={{
          position: 'fixed', bottom: 28, right: 24,
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1d3a6e, #1d4ed8)',
          color: '#fff', fontSize: 28, fontWeight: 300,
          boxShadow: '0 6px 28px rgba(29,78,216,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>+</button>

        {showAdd && (
          <AddExpenseModal
            tripId={trip.id}
            members={members}
            currentMember={currentMember}
            baseCurrency={trip.base_currency}
            onAdd={async () => { await fetchAll(trip.id); setShowAdd(false) }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {receiptUrl && <ReceiptModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
      </div>
    </>
  )
}

const LS: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase',
}
