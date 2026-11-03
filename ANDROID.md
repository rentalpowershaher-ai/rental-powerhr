# بناء APK للأندرويد (إنذار بصوت صفارة والتطبيق مقفول)
1. انشر المشروع على Vercel (HTTPS) واكتب الدومين في `capacitor.config.json` مكان `server.url`.
2. Firebase Console → مشروع جديد → Add app (Android) باسم الحزمة `com.rentalpower.vacations` → نزّل `google-services.json`.
3. Firebase → Project settings → Service accounts → Generate new private key → الصق محتوى الملف (سطر واحد) في متغير `FIREBASE_SERVICE_ACCOUNT` على Vercel.
4. في مجلد المشروع:
   npm install
   npx cap add android
   - انسخ `google-services.json` إلى `android/app/`
   - انسخ `android-res/raw/siren.wav` إلى `android/app/src/main/res/raw/` (اعمل مجلد raw لو مش موجود)
   - في `android/app/src/main/AndroidManifest.xml` أضف: <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   npx cap sync android
   npx cap open android
5. Android Studio: Build ▸ Build Bundle(s)/APK(s) ▸ Build APK(s). الأيقونة: File ▸ New ▸ Image Asset (استخدم public/icon-512.png).
6. شغّل Cron كل دقيقة أو 5 دقايق على /api/cron?key=... (بيكرر الإنذار لحد ما الموظف يتصرف).
