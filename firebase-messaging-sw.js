/* Replace the config below with the same Firebase web app config from firebase-config.js. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyA2tDVdxI9PhSegLjkfNBa0vVh-WxIFIJ0",
  authDomain: "mzarena.firebaseapp.com",
  projectId: "mzarena",
  storageBucket: "mzarena.firebasestorage.app",
  messagingSenderId: "38637785963",
  appId: "1:38637785963:web:7e3da5b706dd8a1a47722e",
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function (payload) {
  const title = (payload.notification && payload.notification.title) || 'MZ Arena Alert';
  const options = {
    body: (payload.notification && payload.notification.body) || 'A student has been blocked.',
    icon: './assets/mzcet-logo.png',
    data: { url: './admin.html' }
  };
  self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow((event.notification.data && event.notification.data.url) || './admin.html'));
});
