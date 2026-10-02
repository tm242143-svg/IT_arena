
/* MZ ARENA - OVERALL + SUBJECT LEADERBOARD */
(function () {
  'use strict';

  const sb = MZ.sb;
  const box = document.getElementById('leaderboard');

  const subjects = [
    'Python', 'Java', 'C', 'DBMS',
    'HTML', 'CSS', 'JavaScript'
  ];

  async function loadLeaderboard(mode, subject) {
    const oldTable = document.getElementById('rankingTable');
    const oldMessage = document.getElementById('rankingMessage');
    if (oldTable) oldTable.remove();
    if (oldMessage) oldMessage.remove();

    const message = document.createElement('p');
    message.id = 'rankingMessage';
    message.textContent = 'Loading leaderboard...';
    box.appendChild(message);

    try {
      let result;

      if (mode === 'overall') {
        result = await sb.rpc('get_overall_leaderboard');
      } else {
        result = await sb.rpc('get_subject_leaderboard', {
          p_subject: subject
        });
      }

      if (result.error) throw result.error;

      const data = result.data;
      message.remove();

      if (!data || data.length === 0) {
        message.textContent = 'No completed quizzes yet.';
        box.appendChild(message);
        return;
      }

      const table = document.createElement('table');
      table.id = 'rankingTable';

      const headers = mode === 'overall'
        ? ['Rank', 'Student Name', 'Subjects Played',
           'Total Score', 'Overall Average']
        : ['Rank', 'Student Name', 'Subject',
           'Score', 'Percentage'];

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');

      headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headRow.appendChild(th);
      });

      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const medals = ['🥇', '🥈', '🥉'];

      data.forEach((r, i) => {
        const tr = document.createElement('tr');

        const values = mode === 'overall'
          ? [
              medals[i] || String(i + 1),
              r.out_name || 'Student',
              r.out_subjects,
              `${r.out_score}/${r.out_total}`,
              `${Number(r.out_percentage).toFixed(2)}%`
            ]
          : [
              medals[i] || String(i + 1),
              r.out_name || 'Student',
              r.out_subject,
              `${r.out_score}/${r.out_total}`,
              `${Number(r.out_percentage).toFixed(2)}%`
            ];

        values.forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      box.appendChild(table);

    } catch (err) {
      console.error('Leaderboard error:', err);
      message.textContent = MZ.friendlyError(err);
      if (!message.isConnected) box.appendChild(message);
    }
  }

  async function init() {
    if (!box) return;

    if (!sb) {
      box.textContent = MZ.problem();
      return;
    }

    const user = await MZ.requireUser();
    if (!user) return;

    box.innerHTML = '';

    const controls = document.createElement('div');
    controls.className = 'leaderboard-controls';

    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Leaderboard: ';
    modeLabel.htmlFor = 'leaderboardMode';

    const modeSelect = document.createElement('select');
    modeSelect.id = 'leaderboardMode';

    [
      { value: 'overall', text: 'Overall Leaderboard' },
      { value: 'subject', text: 'Subject Leaderboard' }
    ].forEach(item => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.text;
      modeSelect.appendChild(option);
    });

    const subjectLabel = document.createElement('label');
    subjectLabel.textContent = 'Subject: ';
    subjectLabel.htmlFor = 'subjectSelect';

    const subjectSelect = document.createElement('select');
    subjectSelect.id = 'subjectSelect';

    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });

    const params = new URLSearchParams(location.search);
    const initialSubject = params.get('subject');

    if (initialSubject) {
      const match = subjects.find(
        s => s.toLowerCase() === initialSubject.toLowerCase()
      );
      if (match) {
        subjectSelect.value = match;
        modeSelect.value = 'subject';
      }
    }

    function updateView() {
      const isSubject = modeSelect.value === 'subject';

      subjectLabel.style.display = isSubject ? '' : 'none';
      subjectSelect.style.display = isSubject ? '' : 'none';

      loadLeaderboard(
        modeSelect.value,
        subjectSelect.value
      );
    }

    controls.append(
      modeLabel,
      modeSelect,
      subjectLabel,
      subjectSelect
    );

    box.appendChild(controls);

    modeSelect.addEventListener('change', updateView);
    subjectSelect.addEventListener('change', updateView);

    updateView();
  }

  init();
})();