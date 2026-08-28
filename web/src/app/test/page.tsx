import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('chambers').select('*')

  return <pre style={{ padding: 24 }}>{JSON.stringify({ data, error }, null, 2)}</pre>
}
