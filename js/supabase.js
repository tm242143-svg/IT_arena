/* =====================================================================
   MZ ARENA - Supabase connection + shared helpers
   1. Paste your Project URL and anon/publishable key below.
   2. NEVER paste a service_role / secret key here.
   ===================================================================== */
const SUPABASE_URL = 'https://bhtyztsqrweaiteofcgw.supabase.co';   // e.g. https://abcdxyz.supabase.co
const SUPABASE_KEY = 'sb_publishable_Zmdr0qmY0s5TfWDA-mT_sQ_Nq2fLfz1';

(function () {
  'use strict';

  const MZ = (window.MZ = {});
  MZ.configured = Boolean(
    typeof SUPABASE_URL === 'string' &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(SUPABASE_URL) &&
    typeof SUPABASE_KEY === 'string' &&
    !/^PASTE_/i.test(SUPABASE_KEY) &&
    SUPABASE_KEY.length > 20
  );

  // Note: the CDN script defines window.supabase, so our client uses a different name (MZ.sb).
  if (window.supabase && typeof window.supabase.createClient === 'function' && MZ.configured) {
    MZ.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    MZ.sb = null;
  }

  /* ---------- helpers ---------- */
  MZ.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  MZ.problem = function () {
    if (!window.supabase) return 'Could not load the Supabase library. Check your internet connection.';
    if (!MZ.configured) return 'Database is not connected. Open js/supabase.js and paste your Supabase Project URL and anon key.';
    return '';
  };

  MZ.friendlyError = function (err) {
    const m = (err && (err.message || err.error_description)) || String(err || 'Something went wrong');
    if (/failed to fetch|networkerror/i.test(m)) return 'Cannot reach the database. Check your internet and the Project URL in js/supabase.js.';
    if (/invalid api key|apikey/i.test(m)) return 'Invalid API key. Check the key in js/supabase.js.';
    if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
    if (/email not confirmed/i.test(m)) return 'Please confirm your email first (check your inbox), then login.';
    if (/already registered/i.test(m)) return 'This email is already registered. Please login.';
    if (/could not find the function|schema cache/i.test(m)) return 'Database setup is missing. Run sql/SUPABASE_SETUP.sql in Supabase.';
    if (/please login first/i.test(m)) return 'Your session expired. Please login again.';
    return m;
  };

  // Uses getUser() instead of getSession(): getSession() only reads whatever
  // is cached locally (which can be stale/expired, especially if the browser's
  // tracking prevention interferes with storage). getUser() asks Supabase's
  // auth server to verify the token and refresh it if needed, so RPC calls
  // that follow always carry a token Postgres will actually accept.
  MZ.requireUser = async function () {
    if (!MZ.sb) return null;
    try {
      const { data, error } = await MZ.sb.auth.getUser();
      if (error || !data || !data.user) {
        location.href = 'login.html';
        return null;
      }
      return data.user;
    } catch (e) {
      console.warn('requireUser error:', e);
      location.href = 'login.html';
      return null;
    }
  };

  MZ.getProfile = async function (userId) {
    const { data, error } = await MZ.sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  };

  MZ.logout = async function () {
    try {
      if (MZ.sb) await MZ.sb.auth.signOut();
    } catch (e) {
      console.warn('logout error:', e);
    }
    location.href = 'login.html';
  };

  /* Red banner at top of the page when the database isn't connected */
  document.addEventListener('DOMContentLoaded', function () {
    const p = MZ.problem();
    if (!p) return;
    const b = document.createElement('div');
    b.textContent = '⚠ ' + p;
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#b91c1c;color:#fff;' +
      'padding:10px 16px;font:600 14px system-ui,sans-serif;text-align:center';
    document.body.appendChild(b);
    console.error('[MZ Arena] ' + p);
  });
})();