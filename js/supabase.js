// ============================================================
// IT ARENA - SUPABASE CLIENT
// ============================================================

const SUPABASE_URL = 'https://bhtyztsqrweaiteofcgw.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_Zmdr0qmY0s5TfWDA-mT_sQ_Nq2fLfz1';

// Supabase CDN exposes window.supabase.
// We use quizSupabase to avoid variable-name conflicts.
const quizSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);