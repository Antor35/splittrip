import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { trip_id, name } = req.body
    if (!trip_id || !name) return res.status(400).json({ error: 'trip_id and name required' })

    const { data, error } = await supabase
      .from('members')
      .insert({ id: uuidv4(), trip_id, name: name.trim() })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'GET') {
    const { trip_id } = req.query
    if (!trip_id) return res.status(400).json({ error: 'trip_id required' })

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('trip_id', trip_id)
      .order('joined_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
