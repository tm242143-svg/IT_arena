// Supabase client for IT Arena Subject Quiz.
// Replace these two values with the NEW Supabase project credentials.
const SUPABASE_URL = 'https://bhtyztsqrweaiteofcgw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Zmdr0qmY0s5TfWDA-mT_sQ_Nq2fLfz1';

// Do not name this variable `supabase`: the CDN already exposes a global
// `supabase` object. Using a separate name prevents a browser SyntaxError.
const quizSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
