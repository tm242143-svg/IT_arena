
/* MZ ARENA - login.html + register.html */
(function () {
  'use strict';

  const sb = MZ.sb;
  const msg = document.getElementById('msg');

  function show(text, ok = false) {
    if (!msg) return;
    msg.textContent = text || '';
    msg.style.color = ok ? '#22e6a8' : '#ff6b6b';
  }

  function busy(form, on, label) {
    const btn = form.querySelector('button');
    if (!btn) return;

    if (on) {
      btn.dataset.label = btn.textContent;
      btn.textContent = label;
    } else if (btn.dataset.label) {
      btn.textContent = btn.dataset.label;
    }

    btn.disabled = on;
  }

  /* ---------------- LOGIN ---------------- */

  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!sb) return show(MZ.problem());

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        return show('Please enter your email and password.');
      }

      busy(loginForm, true, 'Logging in…');
      show('');

      try {
        const { error } = await sb.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        location.href = 'dashboard.html';
      } catch (err) {
        show(MZ.friendlyError(err));
        busy(loginForm, false);
      }
    });
  }

  /* ---------------- REGISTER ---------------- */

  const registerForm = document.getElementById('registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!sb) return show(MZ.problem());

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();

      const departmentField =
        document.getElementById('department');

      const yearField =
        document.getElementById('year');

      const department = departmentField
        ? departmentField.value.trim()
        : '';

      const year = yearField
        ? yearField.value.trim()
        : '';

      const password =
        document.getElementById('password').value;

      /* ---------- VALIDATION ---------- */

      if (!name) {
        return show('Please enter your full name.');
      }

      if (!email) {
        return show('Please enter your email.');
      }

      if (!department) {
        return show('Please select your department.');
      }

      if (!year) {
        return show('Please select your year.');
      }

      if (!['1', '2', '3', '4'].includes(year)) {
        return show('Please select a valid year.');
      }

      if (password.length < 6) {
        return show('Password must be at least 6 characters.');
      }

      /* ---------- CREATE ACCOUNT ---------- */

      busy(registerForm, true, 'Creating account…');
      show('');

      try {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              department,
              year
            }
          }
        });

        if (error) throw error;

        // Detect an already registered email.
        if (
          data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        ) {
          throw new Error(
            'This email is already registered. Please login.'
          );
        }

        if (data.session) {
          location.href = 'dashboard.html';
        } else {
          show(
            'Account created! Check your email to confirm it, then login.',
            true
          );

          busy(registerForm, false);
        }

      } catch (err) {
        show(MZ.friendlyError(err));
        busy(registerForm, false);
      }
    });
  }
})();