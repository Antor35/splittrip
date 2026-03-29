import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { trip_id, title, amount, currency, category, paid_by_id, shared_with, receipt_url, notes } = req.body
    if (!trip_id || !title || !amount || !paid_by_id || !shared_with?.length)
      return res.status(400).json({ error: 'Missing required fields' })

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        id: uuidv4(),
        trip_id,
        title: title.trim(),
        amount: parseFloat(amount),
        currency: currency || 'CHF',
        category: category || 'other',
        paid_by_id,
        shared_with,
        receipt_url: receipt_url || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'GET') {
    const { trip_id } = req.query
    if (!trip_id) return res.status(400).json({ error: 'trip_id required' })

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', trip_id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })

    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
