/* =====================================================================
   MZ ARENA - admin.html
   Stats, create question, CSV import, results, question bank, students
   ===================================================================== */
(function () {
  'use strict';

  const sb = MZ.sb;
  const $ = function (id) { return document.getElementById(id); };
  const esc = MZ.esc;

  let questions = [];
  let students = [];
  let results = [];
  let csvValid = [];

  /* ---------------- helpers ---------------- */
  function notify(text, ok) {
    const box = $('adminMessage');
    box.textContent = text || '';
    box.style.display = text ? 'block' : 'none';
    box.style.color = ok === false ? '#ff6b6b' : '#22e6a8';
    clearTimeout(notify.t);
    if (text) notify.t = setTimeout(function () { box.textContent = ''; box.style.display = 'none'; }, 7000);
  }
  function fail(err) { notify(MZ.friendlyError(err), false); console.error(err); }
  function fmtDate(d) { return d ? new Date(d).toLocaleString() : ''; }

  function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;            // stop Excel formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function downloadCSV(filename, rows) {
    const text = '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const rows = []; let row = [], cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
  }

  /* ---------------- stats ---------------- */
  function updateStats() {
    $('totalQuestions').textContent = questions.length;
    $('totalStudents').textContent = students.length;
    $('totalAttempts').textContent = results.length;
  }

  /* ---------------- questions ---------------- */
  async function loadQuestions() {
    const { data, error } = await sb.from('questions').select('*')
      .order('id', { ascending: false }).limit(5000);
    if (error) return fail(error);
    questions = data || [];
    fillSubjectFilter();
    renderQuestions();
    updateStats();
  }

  function fillSubjectFilter() {
    const sel = $('subjectFilter');
    const keep = sel.value;
    const subjects = Array.from(new Set(questions.map(function (q) { return q.category; }))).sort();
    sel.innerHTML = '<option value="">All Subjects</option>' +
      subjects.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join('');
    sel.value = subjects.indexOf(keep) >= 0 ? keep : '';
  }

  function renderQuestions() {
    const term = $('questionSearch').value.trim().toLowerCase();
    const subj = $('subjectFilter').value;
    const list = questions.filter(function (q) {
      return (!subj || q.category === subj) &&
             (!term || (q.question + ' ' + q.category).toLowerCase().indexOf(term) >= 0);
    });
    const body = $('questionsBody');
    if (!list.length) { body.innerHTML = '<tr><td colspan="5">No questions found.</td></tr>'; return; }
    body.innerHTML = list.slice(0, 500).map(function (q) {
      const text = q.question.length > 120 ? q.question.slice(0, 120) + '…' : q.question;
      return '<tr><td>' + q.id + '</td><td>' + esc(q.category) + '</td><td>' + esc(text) + '</td>' +
             '<td>' + esc(q.correct_answer) + '</td>' +
             '<td><button type="button" class="btn ghost small" data-del="' + q.id + '">Delete</button></td></tr>';
    }).join('') + (list.length > 500 ? '<tr><td colspan="5">Showing first 500 of ' + list.length + '. Use search to narrow.</td></tr>' : '');
  }

  $('questionsBody').addEventListener('click', async function (e) {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!confirm('Delete question #' + btn.dataset.del + '? This cannot be undone.')) return;
    const { error } = await sb.from('questions').delete().eq('id', btn.dataset.del);
    if (error) return fail(error);
    notify('Question deleted.');
    loadQuestions();
  });
  $('questionSearch').addEventListener('input', renderQuestions);
  $('subjectFilter').addEventListener('change', renderQuestions);

  $('questionForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const row = {
      category: $('category').value.trim(),
      question: $('question').value.trim(),
      option_a: $('optionA').value.trim(),
      option_b: $('optionB').value.trim(),
      option_c: $('optionC').value.trim(),
      option_d: $('optionD').value.trim(),
      correct_answer: $('correctAnswer').value
    };
    if (Object.keys(row).some(function (k) { return !row[k]; })) {
      return notify('Please fill in every field.', false);
    }
    const { error } = await sb.from('questions').insert(row);
    if (error) return fail(error);
    notify('Question created.');
    $('questionForm').reset();
    $('question').value = '';
    loadQuestions();
  });

  /* ---------------- CSV import ---------------- */
  const CSV_COLS = ['category', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];

  function resetCsv() {
    csvValid = [];
    $('csvFile').value = '';
    $('csvSummary').innerHTML = '';
    $('csvErrors').style.display = 'none';
    $('csvErrors').innerHTML = '';
    $('csvPreview').innerHTML = '';
    $('csvImportActions').style.display = 'none';
  }

  $('downloadTemplate').addEventListener('click', function () {
    downloadCSV('mz-arena-question-template.csv', [
      CSV_COLS,
      ['Python', 'Which keyword defines a function in Python?', 'func', 'def', 'function', 'lambda', 'B'],
      ['Circuits', 'Unit of electrical resistance?', 'Volt', 'Ampere', 'Ohm', 'Watt', 'C']
    ]);
  });

  $('validateCsv').addEventListener('click', async function () {
    const file = $('csvFile').files[0];
    if (!file) return notify('Choose a CSV file first.', false);

    const rows = parseCSV(await file.text());
    const errors = [];
    csvValid = [];

    if (rows.length < 2) { errors.push('The file has no data rows.'); }
    else if (rows.length > 2001) { errors.push('Too many rows. Import up to 2000 questions at a time.'); }
    else {
      const header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
      const pos = CSV_COLS.map(function (c) { return header.indexOf(c); });
      const missing = CSV_COLS.filter(function (c, i) { return pos[i] < 0; });
      if (missing.length) {
        errors.push('Missing column(s): ' + missing.join(', ') + '.');
      } else {
        const seen = {};
        questions.forEach(function (q) { seen[(q.category + '|' + q.question).toLowerCase()] = 'existing'; });

        rows.slice(1).forEach(function (r, i) {
          const line = i + 2;
          const v = {};
          CSV_COLS.forEach(function (c, k) { v[c] = (r[pos[k]] || '').trim(); });
          v.correct_answer = v.correct_answer.toUpperCase();

          const empty = CSV_COLS.filter(function (c) { return !v[c]; });
          if (empty.length) return errors.push('Line ' + line + ': empty ' + empty.join(', ') + '.');
          if (['A', 'B', 'C', 'D'].indexOf(v.correct_answer) < 0)
            return errors.push('Line ' + line + ': correct_answer must be A, B, C or D.');

          const key = (v.category + '|' + v.question).toLowerCase();
          if (seen[key]) return errors.push('Line ' + line + ': duplicate question (' + seen[key] + ').');
          seen[key] = 'in this file';
          csvValid.push(v);
        });
      }
    }

    $('csvSummary').innerHTML = '<strong>' + csvValid.length + '</strong> valid · <strong>' +
      errors.length + '</strong> problem(s)';

    const errBox = $('csvErrors');
    if (errors.length) {
      errBox.style.display = 'block';
      errBox.innerHTML = errors.slice(0, 50).map(function (m) { return '<div>' + esc(m) + '</div>'; }).join('') +
        (errors.length > 50 ? '<div>…and ' + (errors.length - 50) + ' more.</div>' : '');
    } else { errBox.style.display = 'none'; errBox.innerHTML = ''; }

    $('csvPreview').innerHTML = csvValid.length
      ? '<div class="table-card"><table><thead><tr><th>Category</th><th>Question</th><th>Correct</th></tr></thead><tbody>' +
        csvValid.slice(0, 10).map(function (v) {
          return '<tr><td>' + esc(v.category) + '</td><td>' + esc(v.question) + '</td><td>' + v.correct_answer + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (csvValid.length > 10 ? '<p>Showing 10 of ' + csvValid.length + '.</p>' : '')
      : '';

    $('csvImportActions').style.display = csvValid.length ? 'block' : 'none';
  });

  $('importCsv').addEventListener('click', async function () {
    if (!csvValid.length) return;
    const btn = $('importCsv');
    btn.disabled = true; btn.textContent = 'Importing…';
    let done = 0;
    try {
      for (let i = 0; i < csvValid.length; i += 200) {
        const batch = csvValid.slice(i, i + 200);
        const { error } = await sb.from('questions').insert(batch);
        if (error) throw error;
        done += batch.length;
      }
      notify(done + ' questions imported.');
      resetCsv();
    } catch (err) {
      fail(err);
      notify(done + ' imported before an error occurred. ' + MZ.friendlyError(err), false);
    }
    btn.disabled = false; btn.textContent = 'Import Valid Questions';
    loadQuestions();
  });

  $('cancelCsv').addEventListener('click', resetCsv);

  /* ---------------- results ---------------- */
  async function loadResults() {
    const { data, error } = await sb.rpc('admin_get_results');
    if (error) { $('resultsBody').innerHTML = '<tr><td colspan="6">' + esc(MZ.friendlyError(error)) + '</td></tr>'; return; }
    results = data || [];
    $('resultsBody').innerHTML = results.length
      ? results.map(function (r) {
          return '<tr><td>' + esc(r.out_name) + '</td><td>' + esc(r.out_email) + '</td><td>' + esc(r.out_subject) +
                 '</td><td>' + r.out_score + '/' + r.out_total + '</td><td>' + Number(r.out_percentage) +
                 '%</td><td>' + esc(fmtDate(r.out_completed)) + '</td></tr>';
        }).join('')
      : '<tr><td colspan="6">No completed attempts yet.</td></tr>';
    updateStats();
  }

  $('refreshResults').addEventListener('click', function () { loadResults(); loadStudents(); });

  $('downloadFinishedReport').addEventListener('click', function () {
    if (!results.length) return notify('No attempts to download yet.', false);
    downloadCSV('mz-arena-completed-attempts.csv',
      [['Student', 'Email', 'Subject', 'Score', 'Total', 'Percentage', 'Completed']].concat(
        results.map(function (r) {
          return [r.out_name, r.out_email, r.out_subject, r.out_score, r.out_total, r.out_percentage, fmtDate(r.out_completed)];
        })));
  });

  async function loadAdminData() {
    const { data: students, error: studentsError } =
        await MZ.sb.rpc("admin_get_students");

    if (studentsError) {
        console.error("Students error:", studentsError);
        return;
    }

    const { data: results, error: resultsError } =
        await MZ.sb.rpc("admin_get_results");

    if (resultsError) {
        console.error("Results error:", resultsError);
        return;
    }

    console.log("Students:", students);
    console.log("Results:", results);

    // Dashboard statistics
    const totalStudents = students.length;
    const blockedStudents = students.filter(s => s.blocked).length;
    const studentsWithWarnings =
        students.filter(s => s.warning_count > 0).length;
    const completedQuizzes = results.length;

    console.log({
        totalStudents,
        blockedStudents,
        studentsWithWarnings,
        completedQuizzes
    });

    // Connect these values to your admin dashboard elements.
    document.getElementById("totalStudents").textContent = totalStudents;
    document.getElementById("blockedStudents").textContent = blockedStudents;
    document.getElementById("warningStudents").textContent =
        studentsWithWarnings;
    document.getElementById("completedQuizzes").textContent =
        completedQuizzes;

    // Render detailed student and result tables.
    renderStudents(students);
    renderResults(results);
}
  /* ---------------- students ---------------- */
  async function loadStudents() {
    const { data, error } = await sb.rpc('admin_get_students');
    if (error) { $('studentsBody').innerHTML = '<tr><td colspan="5">' + esc(MZ.friendlyError(error)) + '</td></tr>'; return; }
    students = data || [];
    $('studentsBody').innerHTML = students.length
      ? students.map(function (s) {
          const action = (s.out_blocked || s.out_warnings > 0)
            ? '<button type="button" class="btn ghost small" data-reset="' + s.out_id + '">' +
              (s.out_blocked ? 'Unblock' : 'Reset warnings') + '</button>'
            : '—';
          return '<tr><td>' + esc(s.out_name) + '</td><td>' + esc(s.out_email) + '</td><td>' + s.out_warnings +
                 ' / 3</td><td>' + (s.out_blocked ? '🚫 Blocked' : 'Active') + '</td><td>' + action + '</td></tr>';
        }).join('')
      : '<tr><td colspan="5">No students registered yet.</td></tr>';
    updateStats();
  }

  $('studentsBody').addEventListener('click', async function (e) {
    const btn = e.target.closest('[data-reset]');
    if (!btn) return;
    const { error } = await sb.rpc('admin_reset_student', { p_id: btn.dataset.reset });
    if (error) return fail(error);
    notify('Student warnings reset and unblocked.');
    loadStudents();
  });

  $('downloadWarningsReport').addEventListener('click', function () {
    if (!students.length) return notify('No students to download yet.', false);
    downloadCSV('mz-arena-student-warnings.csv',
      [['Student', 'Email', 'Warnings', 'Status']].concat(
        students.map(function (s) { return [s.out_name, s.out_email, s.out_warnings, s.out_blocked ? 'Blocked' : 'Active']; })));
  });

  $('logoutBtn').addEventListener('click', MZ.logout);

  let notificationChannel = null;

async function loadAdminNotifications() {
    const { data, error } = await sb
        .from('admin_notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Notification loading error:', error);
        return;
    }

    renderAdminNotifications(data || []);
}

function renderAdminNotifications(notifications) {
    const container = document.getElementById('adminNotifications');
    const count = document.getElementById('notificationCount');

    if (!container || !count) return;

    count.textContent = notifications.length;

    if (!notifications.length) {
        container.innerHTML = '<p>No notifications yet.</p>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="admin-notification unread">
            <strong>${esc(n.student_name || 'Student')}</strong>
            <p>${esc(n.message)}</p>
            <small>${esc(fmtDate(n.created_at))}</small>
        </div>
    `).join('');
}

function subscribeAdminNotifications() {
    notificationChannel = sb
        .channel('admin-block-notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'admin_notifications'
            },
            (payload) => {
                const notification = payload.new;

                // Refresh the list and update the unread count.
                loadAdminNotifications();

                // Browser alert is optional; the dashboard also shows the notification.
                console.log('New admin notification:', notification);
            }
        )
        .subscribe();
}

async function markAllNotificationsRead() {
    const { error } = await sb
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

    if (error) {
        console.error('Mark read error:', error);
        return;
    }

    await loadAdminNotifications();
}

const markReadButton = document.getElementById('markNotificationsRead');

if (markReadButton) {
    markReadButton.addEventListener('click', markAllNotificationsRead);
}

  /* ---------------- init ---------------- */
  (async function init() {
    if (!sb) { notify(MZ.problem(), false); return; }
    try {
      const user = await MZ.requireUser();
      if (!user) return;
      const profile = await MZ.getProfile(user.id);
      if (!profile || profile.role !== 'admin') {
        alert('Admin access only.');
        location.href = 'dashboard.html';
        return;
      }
      $('question').value = '';                     // textarea in admin.html starts with whitespace
      await Promise.all([loadQuestions(), loadResults(), loadStudents(), loadAdminNotifications()]);
      subscribeAdminNotifications();
    } catch (err) { fail(err); }
  })();
})();
