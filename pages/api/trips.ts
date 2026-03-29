import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

function generateCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Create trip
    const { name, description, base_currency } = req.body
    if (!name || !base_currency) return res.status(400).json({ error: 'name and base_currency required' })

    let code = generateCode()
    // ensure uniqueness
    let tries = 0
    while (tries < 5) {
      const { data } = await supabase.from('trips').select('id').eq('code', code).single()
      if (!data) break
      code = generateCode()
      tries++
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({ id: uuidv4(), name, description, base_currency, code })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  if (req.method === 'GET') {
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'code required' })

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('code', (code as string).toUpperCase())
      .single()

    if (error || !data) return res.status(404).json({ error: 'Trip not found' })
    return res.status(200).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
