# Rental Power - إجازات الموظفين
1. `npm install`
2. Supabase → SQL Editor → شغّل `supabase/schema.sql`
3. املأ `SUPABASE_SERVICE_ROLE_KEY` و `SESSION_SECRET` في `.env.local`


## إشعارات والتطبيق مقفول
- لازم النشر على HTTPS (مثلاً Vercel) وإضافة نفس متغيرات `.env.local` في إعدادات الاستضافة.
- شغّل `supabase/schema.sql` تاني (فيه جدول push_subscriptions).
- اعمل Cron كل 5 دقايق (cron-job.org مجاني) يفتح: `https://دومينك/api/cron?key=CRON_SECRET`
- آيفون: لازم Safari ← مشاركة ← إضافة للشاشة الرئيسية، وبعدها يفتح التطبيق من الأيقونة ويفعّل التنبيهات.
