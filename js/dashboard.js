/* MZ ARENA - dashboard.html */
(function () {
  'use strict';
  const sb = MZ.sb;
  const grid = document.getElementById('subjects');

  function note(text) {
    grid.innerHTML = '<p class="note">' + MZ.esc(text) + '</p>';
  }

  document.getElementById('logout').addEventListener('click', MZ.logout);

  (async function init() {
    if (!sb) return note(MZ.problem());

    try {
      const user = await MZ.requireUser();
      if (!user) return;

      const profile = await MZ.getProfile(user.id);
      if (profile && profile.role === 'admin') {
        document.getElementById('adminLink').classList.remove('hidden');
      }
      if (profile && profile.blocked) {
        return note('You have been blocked after 3 quiz warnings. Please contact your admin to unblock you.');
      }

      grid.innerHTML = '<p class="note">Loading subjects…</p>';
      const { data, error } = await sb.rpc('get_subjects');
      if (error) throw error;

      if (!data || !data.length) {
        return note('No subjects yet. Ask your admin to add questions.');
      }

      grid.innerHTML = data.map(function (s) {
        const url = 'quiz.html?subject=' + encodeURIComponent(s.category);
        return '<a class="subject-card" href="' + url + '">' +
                 '<span class="subject-icon">⚙</span>' +
                 '<h3>' + MZ.esc(s.category) + '</h3>' +
                 '<p>' + Number(s.question_count) + ' questions</p>' +
                 '<span class="btn primary">Start →</span>' +
               '</a>';
      }).join('');
    } catch (err) {
      note(MZ.friendlyError(err));
    }
  })();
})();
