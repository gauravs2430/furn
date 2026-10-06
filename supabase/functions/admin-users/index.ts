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

      return json({
        id: data.user?.id ?? '',
        email,
        fullName,
        role,
        temporaryPassword: password,
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
      return json({ email: target.email, temporaryPassword: password })
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
      return json({ ok: true, active: body.active })
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
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed' }, 500)
  }
})

async function readUser(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin.from('profiles').select('id, role, access_expires_on').eq('id', userId).maybeSingle()
  if (error) return { error: error.message, status: 400 as const, user: null }
  if (!data) return { error: 'User not found', status: 404 as const, user: null }
  if (data.role !== 'user') return { error: 'Only a user can be changed.', status: 400 as const, user: null }
  return { error: '', status: 200 as const, user: data }
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
