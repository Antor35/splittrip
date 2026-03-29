import { useState, useRef } from 'react'
import { Member } from '../lib/supabase'
import { CURRENCIES } from '../lib/currencies'

const CATEGORIES = [
  { id: 'food',          label: 'Food & Dining',  icon: '🍽️' },
  { id: 'transport',     label: 'Transport',      icon: '🚆' },
  { id: 'accommodation', label: 'Stay',           icon: '🏔️' },
  { id: 'activities',    label: 'Activities',     icon: '⛷️' },
  { id: 'shopping',      label: 'Shopping',       icon: '🛍️' },
  { id: 'drinks',        label: 'Drinks',         icon: '🍻' },
  { id: 'other',         label: 'Other',          icon: '💳' },
]

interface Props {
  tripId: string
  members: Member[]
  currentMember: Member
  baseCurrency: string
  onAdd: () => void
  onClose: () => void
}

export default function AddExpenseModal({ tripId, members, currentMember, baseCurrency, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(baseCurrency)
  const [category, setCategory] = useState('food')
  const [paidBy, setPaidBy] = useState(currentMember.id)
  const [sharedWith, setSharedWith] = useState<string[]>(members.map(m => m.id))
  const [notes, setNotes] = useState('')
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null)
  const [receiptType, setReceiptType] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleMember = (id: string) =>
    setSharedWith(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError('File too large (max 8MB)'); return }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setReceiptPreview(result)
      setReceiptBase64(result.split(',')[1])
      setReceiptType(file.type)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !amount || !sharedWith.length) { setError('Fill in all required fields'); return }
    setSaving(true); setError('')
    try {
      let receipt_url = undefined

      // Upload receipt if present
      if (receiptBase64) {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: receiptBase64, contentType: receiptType, tripId }),
        })
        if (upRes.ok) {
          const upData = await upRes.json()
          receipt_url = upData.url
        }
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId,
          title: title.trim(),
          amount: parseFloat(amount),
          currency,
          category,
          paid_by_id: paidBy,
          shared_with: sharedWith,
          receipt_url,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to save expense')
      onAdd()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const perPerson = sharedWith.length > 0 && parseFloat(amount) > 0
    ? (parseFloat(amount) / sharedWith.length).toFixed(2)
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,20,45,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 560,
        padding: '24px 24px 40px',
        maxHeight: '94vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 22 }}>Add Expense</h2>
          <button onClick={onClose} style={{ background: '#f0f2f6', borderRadius: '50%', width: 36, height: 36, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={LS}>What was it for? *</label>
            <input placeholder="e.g. Fondue dinner" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          {/* Amount + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10 }}>
            <div>
              <label style={LS}>Amount *</label>
              <input type="number" min="0.01" step="0.01" placeholder="0.00"
                value={amount} onChange={e => setAmount(e.target.value)}
                style={{ fontFamily: 'Fraunces, serif', fontSize: 22 }} required />
            </div>
            <div>
              <label style={LS}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={LS}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => setCategory(c.id)} style={{
                  padding: '7px 13px', borderRadius: 999,
                  background: category === c.id ? 'var(--blue)' : '#f0f2f6',
                  color: category === c.id ? '#fff' : 'var(--ink2)',
                  fontSize: 13, fontWeight: 600,
                }}>{c.icon} {c.label}</button>
              ))}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label style={LS}>Paid by *</label>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}{m.id === currentMember.id ? ' (you)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Split between */}
          <div>
            <label style={LS}>Split between *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {members.map(m => (
                <label key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  background: sharedWith.includes(m.id) ? '#eef5ff' : '#f7f8fb',
                  border: `1.5px solid ${sharedWith.includes(m.id) ? '#93c5fd' : 'transparent'}`,
                }}>
                  <input type="checkbox" checked={sharedWith.includes(m.id)}
                    onChange={() => toggleMember(m.id)} style={{ width: 16, height: 16, accentColor: 'var(--blue)' }} />
                  <span style={{ fontWeight: 500 }}>{m.name}{m.id === currentMember.id ? ' (you)' : ''}</span>
                </label>
              ))}
            </div>
            {perPerson && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
                {currency} {perPerson} per person · {sharedWith.length} people
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={LS}>Notes (optional)</label>
            <textarea placeholder="Any extra details…" value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} style={{ resize: 'vertical' }} />
          </div>

          {/* Receipt */}
          <div>
            <label style={LS}>Receipt (optional)</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {receiptPreview ? (
              <div style={{ position: 'relative', marginTop: 4 }}>
                <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} />
                <button type="button" onClick={() => { setReceiptPreview(null); setReceiptBase64(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: 28, height: 28, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                width: '100%', padding: '14px', borderRadius: 12, marginTop: 4,
                border: '2px dashed var(--line)', background: '#fafbfd',
                color: 'var(--muted)', fontSize: 14, fontWeight: 500,
              }}>
                📷 &nbsp; Tap to upload receipt
              </button>
            )}
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

          <button type="submit" disabled={saving} style={{
            background: 'var(--blue)', color: '#fff', padding: '15px',
            borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(29,78,216,0.3)',
          }}>
            {saving ? 'Saving…' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  )
}

const LS: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, textTransform: 'uppercase',
}
