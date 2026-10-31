// The one Supabase connection for the whole app (keeps the login session shared)
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ibutllgwjgmmlydkcrzi.supabase.co'
export const PUBLIC_KEY = 'sb_publishable_VdkNDTcxwk0lkWpppf9vtQ_jAq4adZn'
export const sb = createClient(SUPABASE_URL, PUBLIC_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'forge.auth' },
})
