import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { base64, contentType, tripId } = req.body
  if (!base64 || !contentType || !tripId) return res.status(400).json({ error: 'Missing fields' })

  const ext = contentType.split('/')[1] || 'jpg'
  const filename = `${tripId}/${uuidv4()}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filename, buffer, { contentType, upsert: false })

  if (error) return res.status(500).json({ error: error.message })

  const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filename)
  return res.status(200).json({ url: urlData.publicUrl })
}
