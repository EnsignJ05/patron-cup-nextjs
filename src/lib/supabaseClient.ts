import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';

export const supabase = createSupabaseBrowserClient();

// Usage (client component):
// import { supabase } from '@/lib/supabaseClient';
// const { data, error } = await supabase.from('your_table').select('*'); 