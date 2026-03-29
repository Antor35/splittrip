import { Member, Expense } from './supabase'

export interface Balance {
  memberId: string
  memberName: string
  amount: number   // positive = owed money, negative = owes money
}

export interface Settlement {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
  currency: string
}

export function calcBalances(members: Member[], expenses: Expense[]): Balance[] {
  const bal: Record<string, number> = {}
  members.forEach(m => bal[m.id] = 0)

  expenses.forEach(exp => {
    if (!exp.shared_with || exp.shared_with.length === 0) return
    const share = exp.amount / exp.shared_with.length
    exp.shared_with.forEach(mid => {
      if (mid !== exp.paid_by_id) bal[mid] = (bal[mid] || 0) - share
    })
    const paid = exp.shared_with.includes(exp.paid_by_id)
      ? exp.amount - share
      : exp.amount
    bal[exp.paid_by_id] = (bal[exp.paid_by_id] || 0) + paid
  })

  return members.map(m => ({
    memberId: m.id,
    memberName: m.name,
    amount: bal[m.id] || 0,
  }))
}

export function calcSettlements(balances: Balance[], currency: string): Settlement[] {
  const cred = balances.filter(b => b.amount > 0.01).map(b => ({ ...b }))
  const debt = balances.filter(b => b.amount < -0.01).map(b => ({ ...b, amount: -b.amount }))

  const settlements: Settlement[] = []
  let ci = 0, di = 0

  while (ci < cred.length && di < debt.length) {
    const amt = Math.min(cred[ci].amount, debt[di].amount)
    settlements.push({
      fromId: debt[di].memberId,
      fromName: debt[di].memberName,
      toId: cred[ci].memberId,
      toName: cred[ci].memberName,
      amount: amt,
      currency,
    })
    cred[ci].amount -= amt
    debt[di].amount -= amt
    if (cred[ci].amount < 0.01) ci++
    if (debt[di].amount < 0.01) di++
  }

  return settlements
}
