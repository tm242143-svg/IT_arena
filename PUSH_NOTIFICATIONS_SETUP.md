# MZ Arena device push notifications

This integration is prepared but requires Firebase/Supabase setup before it can send real alerts.

## 1. Firebase web configuration
- Create/select the Firebase project and register a Web App.
- Copy its public web config into `firebase-config.js`.
- Copy the Web Push certificate (VAPID) key into `MZ_FIREBASE_VAPID_KEY`.
- Copy the same Firebase web config into `firebase-messaging-sw.js`.
- Enable Firebase Cloud Messaging. Serve the site over HTTPS (localhost is okay for local testing).

## 2. Database
Run `sql/PUSH_NOTIFICATIONS_SETUP.sql` in the Supabase SQL Editor. The project uses `profiles.id`, `profiles.name`, `profiles.role`, and `profiles.blocked`.

## 3. Deploy the Edge Function
Deploy `supabase/functions/send-admin-push/index.ts` as `send-admin-push`. Set these function secrets securely:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (the newly generated service account JSON, server only)
- `BLOCK_WEBHOOK_SECRET` (a long random secret)

Never put service-account JSON or the Supabase service-role key in frontend files or commit them to Git. The old service-account JSON included in the uploaded archive was deliberately excluded; revoke it and generate a new one.

## 4. Database webhook
In Supabase Dashboard, create a Database Webhook for `INSERT` on `public.admin_notifications`. Point it to the deployed Edge Function URL. Configure the request header `x-webhook-secret` with the same value as `BLOCK_WEBHOOK_SECRET`. The webhook should forward the inserted row as JSON.

## 5. Enable on the admin device
- Sign in as an admin on the device/browser that should receive alerts.
- Click **Enable Device Alerts** and allow browser notifications.
- Keep the browser/device notification permission enabled. The admin does not need to remain signed into the dashboard for push delivery, but the device must be online and supported by the browser/OS.

## Notes
- A push token is registered per browser/device. Repeat the enable step on each device.
- This package does not contain live Firebase credentials and cannot verify delivery until the setup above is completed.
- The existing dashboard notification code expects `admin_notifications.is_read` and `student_name`; the SQL file creates those columns.
