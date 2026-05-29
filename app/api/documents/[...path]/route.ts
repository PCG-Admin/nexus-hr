import { NextResponse } from 'next/server'

const MIME_TYPES: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  const { path } = await context.params
  const storagePath = path.join('/')
  const ext = storagePath.split('.').pop()?.toLowerCase() ?? ''
  const filename = storagePath.split('/').pop() ?? 'document'
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/leave-documents/${storagePath}`

  try {
    const upstream = await fetch(publicUrl)
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const buffer = await upstream.arrayBuffer()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new Response(buffer, {
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control':       'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Document proxy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
