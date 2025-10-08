import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Debug: Check if env vars are loaded
console.log('🔍 Admin Client Debug:')
console.log('URL exists:', !!supabaseUrl)
console.log('Service Role Key exists:', !!supabaseServiceRoleKey)
console.log('Service Role Key prefix:', supabaseServiceRoleKey?.substring(0, 20) + '...')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Supabase admin env vars missing!')
  console.error('URL:', supabaseUrl)
  console.error('Service Key:', supabaseServiceRoleKey ? 'EXISTS' : 'MISSING')
  throw new Error('Missing Supabase admin credentials. Check your .env file.')
}

export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceRoleKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

console.log('✅ Admin client created successfully')