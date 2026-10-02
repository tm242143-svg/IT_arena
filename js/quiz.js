/* =====================================================================
   MZ ARENA - quiz.html
   - Shows a "Start Quiz" screen first. Browsers only allow fullscreen
     right after a click, so the click on Start enters fullscreen.
   - Leaving fullscreen / switching tab / leaving the window = 1 warning.
   - 3 warnings = blocked (admin can unblock).
   - Result is saved once, only after every question is answered.
   ===================================================================== */
(function () {
  'use strict';

  const sb = MZ.sb;
  const MAX_WARNINGS = 3;
  const $ = function (id) { return document.getElementById(id); };
  const subject = new URLSearchParams(location.search).get('subject');

  const el = {
    progressText: $('progressText'), progressBar: $('progressBar'),
    subject: $('subject'), question: $('question'), options: $('options'),
    prev: $('prev'), next: $('next'), msg: $('msg'),
    overlay: $('warningOverlay'), wCount: $('warningCount'),
    wText: $('warningText'), wTitle: document.querySelector('#warningOverlay h1'),
    cont: $('continueExam')
  };

  let questions = [];
  let answers = {};          // { questionId: 'A' | 'B' | 'C' | 'D' }
  let idx = 0;
  let started = false;       // quiz is running
  let finished = false;      // submitted or leaving on purpose
  let blocked = false;
  let lock = false;          // one warning per incident (blur + tab-hide + fullscreen-exit fire together)
  let wasFullscreen = false;

  /* ---------------- fullscreen helpers ---------------- */
  const root = document.documentElement;
  function fsSupported() { return !!(root.requestFullscreen || root.webkitRequestFullscreen); }
  function inFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

  async function enterFs() {
    try {
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    } catch (e) { /* user/browser refused */ }
    wasFullscreen = inFs();
  }

  function exitFs() {
    try {
      if (inFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- small UI helpers ---------------- */
  function say(text, bad) {
    el.msg.textContent = text || '';
    el.msg.style.color = bad === false ? '#22e6a8' : '#ff6b6b';
  }

  function fatal(text) {
    el.question.textContent = text;
    el.options.innerHTML = '';
    el.prev.style.display = 'none';
    el.next.style.display = 'none';
    el.progressText.textContent = '';
    el.progressBar.style.width = '0';
  }

  function answeredCount() { return Object.keys(answers).length; }

  /* ---------------- start screen (created by JS, no HTML change needed) ---------------- */
  let startOverlay, startBtn, startText;

  function buildStartScreen() {
    startOverlay = document.createElement('div');
    startOverlay.className = 'warning-overlay';
    startOverlay.innerHTML =
      '<div class="warning-panel">' +
        '<div class="warning-icon">🎯</div>' +
        '<div class="warning-count">FOCUS MODE</div>' +
        '<h1>READY TO START?</h1>' +
        '<p id="startText">Loading questions…</p>' +
        '<button id="startBtn" type="button" class="btn primary" disabled>Please wait…</button>' +
      '</div>';
    document.body.appendChild(startOverlay);
    startBtn = startOverlay.querySelector('#startBtn');
    startText = startOverlay.querySelector('#startText');
    startBtn.addEventListener('click', startQuiz);
  }

  function setStartText(text) { if (startText) startText.textContent = text; }

  /* ---------------- rendering ---------------- */
  function render() {
    const q = questions[idx];
    const last = idx === questions.length - 1;

    el.subject.textContent = subject;
    el.question.textContent = (idx + 1) + '. ' + q.question;
    el.progressText.textContent = 'Question ' + (idx + 1) + ' of ' + questions.length +
                                  ' · ' + answeredCount() + ' answered';
    el.progressBar.style.width = ((idx + 1) / questions.length * 100) + '%';

    el.options.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(function (k) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'option' + (answers[q.id] === k ? ' selected' : '');
      b.textContent = k + '. ' + q['option_' + k.toLowerCase()];
      b.addEventListener('click', function () {
        answers[q.id] = k;
        say('');
        render();
      });
      el.options.appendChild(b);
    });

    el.prev.disabled = idx === 0;
    el.next.textContent = last ? 'Submit Quiz ✓' : 'Next';
  }

  /* ---------------- warnings ---------------- */
  function showWarning(title, count, text, buttonText) {
    el.wTitle.textContent = title;
    el.wCount.textContent = count;
    el.wText.textContent = text;
    el.cont.textContent = buttonText;
    el.overlay.classList.remove('hidden');
  }

  async function violation(reason) {
    if (!started || finished || blocked || lock) return;
    lock = true;
    showWarning('STAY IN THE ARENA', 'Recording warning…', reason, 'Return to Quiz');

    try {
      const { data, error } = await sb.rpc('record_warning');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const n = row ? row.out_warnings : 1;

      if (row && row.out_blocked) {
        blocked = true;
        finished = true;             // stop further checks
        exitFs();
        showWarning('YOU ARE BLOCKED', 'Warning ' + n + ' of ' + MAX_WARNINGS,
          'You left the quiz too many times. Please contact your admin to unblock you.',
          'Back to Dashboard');
      } else {
        showWarning('STAY IN THE ARENA', 'Warning ' + n + ' of ' + MAX_WARNINGS,
          reason + ' After ' + MAX_WARNINGS + ' warnings you will be blocked.', 'Return to Quiz');
      }
    } catch (err) {
      showWarning('STAY IN THE ARENA', 'Warning', reason, 'Return to Quiz');
    }
  }

  el.cont.addEventListener('click', async function () {
    if (blocked) { location.href = 'dashboard.html'; return; }
    if (fsSupported()) await enterFs();          // click = allowed to re-enter fullscreen
    el.overlay.classList.add('hidden');
    setTimeout(function () { lock = false; }, 800);
  });

  function attachGuards() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) violation('You switched tabs or minimised the window.');
    });
    window.addEventListener('blur', function () {
      violation('You left the quiz window.');
    });
    function onFsChange() {
      if (wasFullscreen && !inFs()) violation('You exited full screen mode.');
      wasFullscreen = inFs();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    // small deterrents
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.querySelector('.quiz-card').addEventListener('copy', function (e) { e.preventDefault(); });
  }

  /* ---------------- navigation + submit ---------------- */
  el.prev.addEventListener('click', function () {
    if (idx > 0) { idx--; say(''); render(); }
  });

  el.next.addEventListener('click', function () {
    if (idx < questions.length - 1) { idx++; say(''); render(); }
    else submit();
  });

  async function submit() {
    const missing = questions.findIndex(function (q) { return !answers[q.id]; });
    if (missing >= 0) {
      idx = missing;
      render();
      say('Please answer every question. Question ' + (missing + 1) + ' is not answered yet.');
      return;
    }

    el.next.disabled = true;
    el.prev.disabled = true;
    say('Submitting…', false);

    try {
      const { data, error } = await sb.rpc('submit_quiz', { p_subject: subject, p_answers: answers });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;

      finished = true;                 // set BEFORE leaving fullscreen so no warning fires
      exitFs();
      location.href = 'result.html?subject=' + encodeURIComponent(subject) +
        '&score=' + r.out_score + '&total=' + r.out_total + '&percentage=' + r.out_percentage;
    } catch (err) {
      say(MZ.friendlyError(err));
      el.next.disabled = false;
      el.prev.disabled = idx === 0;
    }
  }

  /* ---------------- start button ---------------- */
  async function startQuiz() {
    startBtn.disabled = true;
    if (fsSupported()) await enterFs();       // this runs inside a click, so the browser allows it
    startOverlay.remove();
    started = true;
    attachGuards();
    render();
  }

  /* ---------------- init ---------------- */
  (async function init() {
    if (!sb) return fatal(MZ.problem());
    if (!subject) return fatal('No subject selected. Go back to the dashboard and pick one.');

    // "Exit" link should never count as a violation
    const exitLink = document.querySelector('nav a[href="dashboard.html"]');
    if (exitLink) exitLink.addEventListener('click', function () { finished = true; exitFs(); });

    try {
      const user = await MZ.requireUser();
      if (!user) return;

      const profile = await MZ.getProfile(user.id);
      if (profile && profile.blocked) {
        return fatal('You are blocked from taking quizzes. Please contact your admin.');
      }

      buildStartScreen();
      el.subject.textContent = subject;

      const { data, error } = await sb.rpc('get_quiz_questions', { p_subject: subject });
      if (error) throw error;
      if (!data || !data.length) {
        startOverlay.remove();
        return fatal('No questions found for "' + subject + '".');
      }

      questions = data;
      setStartText(subject + ' · ' + questions.length + ' questions. The quiz opens in full screen. ' +
        'Leaving full screen, switching tabs or leaving this window gives a warning. ' +
        MAX_WARNINGS + ' warnings = blocked.');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Quiz';
    } catch (err) {
      if (startOverlay) startOverlay.remove();
      fatal(MZ.friendlyError(err));
    }
  })();
})();
