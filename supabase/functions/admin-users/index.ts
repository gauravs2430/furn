import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing login' }, 401)

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not logged in' }, 401)

    const admin = createClient(url, service)
    const { data: profile } = await admin
      .from('profiles')
      .select('role, active')
      .eq('id', userData.user.id)
      .single()

    if (profile?.role !== 'admin' || profile?.active !== true) {
      return json({ error: 'Admin only' }, 403)
    }

    const body = await req.json()
    const action = String(body.action ?? '')

    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const fullName = String(body.fullName ?? '').trim()
      const role = body.role === 'admin' ? 'admin' : 'user'
      if (!email.includes('@')) return json({ error: 'Enter a valid email' }, 400)
      if (password.length < 8) return json({ error: 'Password needs at least 8 characters' }, 400)

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      })
      if (error) return json({ error: error.message }, 400)

      if (data.user) {
        const { error: profileError } = await admin
          .from('profiles')
          .update({
            full_name: fullName,
            role,
            email,
            password_set_at: new Date().toISOString(),
          })
          .eq('id', data.user.id)
        if (profileError) return json({ error: profileError.message }, 400)
      }

      const emailError = await credentialEmail(email, 'Your SunnyPlast login', 'Your SunnyPlast login is ready.', password)
      return json({
        id: data.user?.id ?? '',
        email,
        fullName,
        role,
        temporaryPassword: password,
        ...emailError,
      })
    }

    if (action === 'set-password') {
      const password = String(body.password ?? '')
      const userId = String(body.userId ?? '')
      if (password.length < 8) return json({ error: 'Password needs at least 8 characters' }, 400)
      const { data: target } = await admin.from('profiles').select('email').eq('id', userId).single()
      if (!target) return json({ error: 'User not found' }, 404)
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message }, 400)
      const { error: stampError } = await admin
        .from('profiles')
        .update({ password_set_at: new Date().toISOString() })
        .eq('id', userId)
      if (stampError) return json({ error: stampError.message }, 400)
      const emailError = await credentialEmail(
        String(target.email ?? ''),
        'Your SunnyPlast password',
        'Your SunnyPlast password has been changed.',
        password,
      )
      return json({ email: target.email, temporaryPassword: password, ...emailError })
    }

    if (action === 'set-active') {
      const userId = String(body.userId ?? '')
      if (typeof body.active !== 'boolean') return json({ error: 'Choose active or inactive.' }, 400)
      if (!userId) return json({ error: 'User not found' }, 404)
      if (userId === userData.user.id && body.active === false) {
        return json({ error: 'You cannot turn off your own account.' }, 400)
      }
      const target = await readUser(admin, userId)
      if (target.error || !target.user) return json({ error: target.error || 'User not found' }, target.status)
      const { data, error } = await userClient
        .from('profiles')
        .update({ active: body.active })
        .eq('id', userId)
        .eq('role', 'user')
        .select('id')
      if (error) return json({ error: error.message }, 400)
      if (!Array.isArray(data) || data.length === 0) return json({ error: 'Could not save that change.' }, 400)
      const active = body.active === true
      const emailError = await noticeEmail(
        target.user.email,
        active ? 'Your SunnyPlast account is active' : 'Your SunnyPlast account is inactive',
        active ? 'Your SunnyPlast account is active.' : 'Your SunnyPlast account is inactive.',
      )
      return json({ ok: true, active, ...emailError })
    }

    if (action === 'unlock') {
      const userId = String(body.userId ?? '')
      if (!userId) return json({ error: 'User not found' }, 404)
      const target = await readUser(admin, userId)
      if (target.error || !target.user) return json({ error: target.error || 'User not found' }, target.status)
      const stored = typeof target.user.access_expires_on === 'string' ? target.user.access_expires_on.slice(0, 10) : ''
      const today = new Date().toISOString().slice(0, 10)
      const supplied = typeof body.accessExpiresOn === 'string' ? body.accessExpiresOn.trim() : ''
      const needsDate = stored !== '' && stored <= today
      const patch: { locked: boolean; access_expires_on?: string } = { locked: false }
      if (supplied) {
        if (!isAfterToday(supplied, today)) return json({ error: 'Enter a date after today.' }, 400)
        patch.access_expires_on = supplied
      } else if (needsDate) {
        return json({ error: 'Enter a date after today.' }, 400)
      }
      const { data, error } = await userClient
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .eq('role', 'user')
        .select('id')
      if (error) return json({ error: error.message }, 400)
      if (!Array.isArray(data) || data.length === 0) return json({ error: 'Could not unlock that user.' }, 400)
      const emailError = await noticeEmail(
        target.user.email,
        'Your SunnyPlast account is unlocked',
        'Your SunnyPlast account is unlocked.',
      )
      return json({ ok: true, ...emailError })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed' }, 500)
  }
})

async function readUser(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, role, email, access_expires_on')
    .eq('id', userId)
    .maybeSingle()
  if (error) return { error: error.message, status: 400 as const, user: null }
  if (!data) return { error: 'User not found', status: 404 as const, user: null }
  if (data.role !== 'user') return { error: 'Only a user can be changed.', status: 400 as const, user: null }
  return {
    error: '',
    status: 200 as const,
    user: { ...data, email: typeof data.email === 'string' ? data.email : '' },
  }
}

function loginLink(): string | null {
  const site = (Deno.env.get('SITE_URL') ?? '').trim().replace(/\/+$/, '')
  if (!site) return null
  return `${site}/login`
}

async function credentialEmail(to: string, subject: string, lead: string, password: string) {
  const link = loginLink()
  const reason = link
    ? await sendPlainEmail(to, subject, `${lead}\n\nLogin: ${link}\nEmail: ${to}\nPassword: ${password}\n`)
    : 'SITE_URL is not configured.'
  return mailFailure(reason)
}

async function noticeEmail(to: string, subject: string, lead: string) {
  const link = loginLink()
  const reason = link
    ? await sendPlainEmail(to, subject, `${lead}\n\nLogin: ${link}\n`)
    : 'SITE_URL is not configured.'
  return mailFailure(reason)
}

function mailFailure(reason: string | null): { emailError?: string } {
  if (!reason) return {}
  return { emailError: `Saved, but the email was not sent: ${reason}` }
}

async function sendPlainEmail(to: string, subject: string, text: string): Promise<string | null> {
  const key = (Deno.env.get('RESEND_API_KEY') ?? '').trim()
  const from = (Deno.env.get('MAIL_FROM') ?? '').trim()
  if (!key || !from) return 'Resend is not configured.'
  if (!to.includes('@')) return 'That person has no email address.'
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    })
    if (response.ok) return null
    return await resendReason(response)
  } catch (error) {
    return error instanceof Error && error.message ? error.message : 'Could not reach Resend.'
  }
}

async function resendReason(response: Response): Promise<string> {
  const fallback = `Resend returned ${response.status}.`
  try {
    const body: unknown = await response.json()
    return reasonFromBody(body, fallback)
  } catch {
    return fallback
  }
}

function reasonFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const record = body as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim()
  if (typeof record.error === 'string' && record.error.trim()) return record.error.trim()
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as Record<string, unknown>
    if (typeof nested.message === 'string' && nested.message.trim()) return nested.message.trim()
  }
  return fallback
}

function isAfterToday(value: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return real && value > today
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
