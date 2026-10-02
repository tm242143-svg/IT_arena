/* MZ Arena web push registration. Requires Firebase web config and a secure context (HTTPS/localhost). */
(function () {
  'use strict';
  const button = document.getElementById('enablePushNotifications');
  if (!button) return;
  const configured = window.MZ_FIREBASE_CONFIG &&
    !String(window.MZ_FIREBASE_CONFIG.apiKey || '').startsWith('REPLACE_') &&
    window.MZ_FIREBASE_VAPID_KEY && !window.MZ_FIREBASE_VAPID_KEY.startsWith('REPLACE_');
  button.addEventListener('click', async function () {
    if (!window.MZ || !MZ.sb) return alert('Supabase is not connected.');
    if (!configured || !window.firebase || !firebase.messaging) {
      return alert('Complete firebase-config.js first, then reload this page.');
    }
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      return alert('This browser does not support web push notifications.');
    }
    button.disabled = true;
    try {
      const { data: userData, error: userError } = await MZ.sb.auth.getUser();
      if (userError || !userData.user) throw new Error('Please sign in as an admin first.');
      const { data: profile, error: profileError } = await MZ.sb.from('profiles').select('role').eq('id', userData.user.id).single();
      if (profileError || !profile || profile.role !== 'admin') throw new Error('Admin access only.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      if (!firebase.apps.length) firebase.initializeApp(window.MZ_FIREBASE_CONFIG);
      const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
      const messaging = firebase.messaging();
      const token = await messaging.getToken({ vapidKey: window.MZ_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
      if (!token) throw new Error('Could not obtain a push token. Check Firebase Cloud Messaging setup.');
      const { error } = await MZ.sb.from('admin_push_tokens').upsert({ user_id: userData.user.id, token }, { onConflict: 'token' });
      if (error) throw error;
      alert('Device alerts enabled on this browser.');
      button.textContent = 'Device Alerts Enabled';
    } catch (err) {
      console.error('Push setup failed:', err);
      alert(err.message || 'Could not enable device alerts.');
    } finally { button.disabled = false; }
  });
})();
