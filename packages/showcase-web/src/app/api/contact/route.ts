import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const TO_EMAIL   = process.env.CONTACT_TO_EMAIL   ?? 'hello@ai-agencee.com'
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL ?? 'contact@ai-agencee.com'

const TOPIC_LABELS: Record<string, string> = {
  general: 'General enquiry',
  bug:     'Bug report',
  feature: 'Feature request',
  other:   'Other',
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Validate required fields
  if (
    typeof body !== 'object' || body === null ||
    typeof (body as Record<string, unknown>).name    !== 'string' ||
    typeof (body as Record<string, unknown>).email   !== 'string' ||
    typeof (body as Record<string, unknown>).message !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const { name, email, topic, message, subscribeUpdates } = body as {
    name:             string
    email:            string
    topic:            string
    message:          string
    subscribeUpdates: boolean
  }

  // Basic sanitisation — strip HTML from user-supplied strings
  const safe = (s: string) => s.replaceAll('<', '&lt;').replaceAll('>', '&gt;').trim()
  const safeName    = safe(name).slice(0, 200)
  const safeEmail   = safe(email).slice(0, 254)
  const safeMessage = safe(message).slice(0, 5000)
  const topicLabel  = TOPIC_LABELS[topic] ?? safe(topic)

  if (!safeEmail.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY is not set')
    return NextResponse.json({ error: 'Mail service not configured.' }, { status: 503 })
  }

  // Instantiate lazily — after the key guard — so a missing key never crashes
  // the module at load time and Next.js never serves an HTML error page.
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    // 1. Internal notification
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      TO_EMAIL,
      replyTo: safeEmail,
      subject: `[ai-agencee contact] ${topicLabel} from ${safeName}`,
      html: `
        <h2>New contact form submission</h2>
        <table cellpadding="8" style="border-collapse:collapse">
          <tr><td><strong>Name</strong></td><td>${safeName}</td></tr>
          <tr><td><strong>Email</strong></td><td>${safeEmail}</td></tr>
          <tr><td><strong>Topic</strong></td><td>${topicLabel}</td></tr>
          <tr><td><strong>Subscribe</strong></td><td>${subscribeUpdates ? 'Yes' : 'No'}</td></tr>
        </table>
        <h3>Message</h3>
        <p style="white-space:pre-wrap">${safeMessage}</p>
      `,
    })

    // 2. Auto-reply to sender
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      safeEmail,
      subject: 'We received your message — ai-agencee',
      html: `
        <p>Hi ${safeName},</p>
        <p>Thanks for getting in touch! We've received your message and will get back to
           you within one business day.</p>
        <blockquote style="border-left:3px solid #ccc;padding-left:1em;color:#555">
          ${safeMessage}
        </blockquote>
        <p>— The ai-agencee team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[contact] Resend error', err)
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 502 })
  }
}
