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
        await admin.from('profiles').update({ full_name: fullName, role, email }).eq('id', data.user.id)
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
      return json({ email: target.email, temporaryPassword: password })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
