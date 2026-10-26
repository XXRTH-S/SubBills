# เตรียมระบบบัญชี — สถานะ 18 ตุลาคม 2026

## สิ่งที่เตรียมแล้ว

- `supabase/schemas/01_core.sql` เป็น declarative target schema สำหรับตรวจและสร้าง migration ภายหลัง ยังไม่ใช่ migration ที่นำไปใช้แล้ว
- บัตรและบริการมีเจ้าของชัดเจน RLS จำกัดตาม `auth.uid()` ทั้งอ่านและเขียน; composite foreign key ป้องกันอ้างอิงบัตร/บริการของบัญชีอื่น
- ตารางรอบเรียกเก็บเก็บ snapshot ราคา ชื่อบริการ และบัตร ไม่เก็บเลขเต็มหรือ CVV ผู้ใช้แก้ได้เฉพาะสถานะอ่าน/จ่ายแล้ว การสร้างรอบต้องทำผ่าน backend ที่ตรวจสิทธิ์หรือ scheduled worker ซึ่งยังไม่สร้าง
- unique constraint ป้องกันรอบซ้ำตามบริการและวันครบกำหนด บริการที่มีประวัติให้ archive แทนลบ บัตรที่ยังถูกใช้ต้องเปลี่ยน/ถอดจากบริการก่อนลบ
- `account-import.js` ตรวจและเตรียมข้อมูลนำเข้าแบบไม่มี side effects ไม่อ่าน localStorage เอง ไม่ติดต่อเครือข่าย ไม่แนบเจ้าของบัญชีจากข้อมูลนำเข้า
- `.env.example` แสดงค่าที่ต้องใช้ภายหลัง แต่เซิร์ฟเวอร์ปัจจุบันยังไม่อ่านไฟล์นี้

## การแยกโหมดและข้อมูลที่จะทำตอนเชื่อมจริง

หน้า login/signup/reset และ dashboard ปัจจุบันยังเป็น demo ทั้งหมด ห้ามใช้ demoSession เป็นหลักฐานยืนยันตัวตน ข้อมูล demo ยังอยู่ใน localStorage และไม่ได้ถูกอัปโหลด

เมื่อเชื่อมจริง ให้ backend ตรวจ session กับ Supabase ทุกคำขอและใช้ token ของผู้ใช้ในการเข้าถึงข้อมูลเพื่อให้ RLS มีผล ใช้ cookie HttpOnly/Secure/SameSite ตามรูปแบบ deployment พร้อม CSRF/origin validation ไม่วาง service-role key หรือ refresh token ในโค้ดหน้าเว็บ

บัญชีใหม่เริ่มว่างเสมอ หากผู้ใช้ต้องการนำเข้า ให้แสดง preview ขอการยืนยัน แล้ว backend ตรวจข้อมูลซ้ำ ใช้ user ID จาก session สร้าง UUID ใหม่และ map legacy IDs ใน transaction เดียว พร้อม idempotency key ป้องกันกดซ้ำ ห้าม merge ข้อมูล demo อัตโนมัติ หลัง logout ให้ล้างข้อมูลบัญชีจากหน่วยความจำ และไม่แสดงข้อมูลบัญชีก่อนหน้าระหว่างโหลด

สถานะจ่าย/อ่านเดิมจะรายงานว่าไม่นำเข้า เพราะต้นแบบคำนวณยอดย้อนหลังจากบริการปัจจุบัน จึงรับรองประวัติเดิมไม่ได้ ผู้ใช้ยังส่งออกสำเนาเดิมได้

## สิ่งที่ต้องตั้งค่าภายนอก

1. ยืนยันและสร้าง Supabase test project เลือก region เก็บ Project URL และ publishable key ใน configuration ฝั่งเซิร์ฟเวอร์ ไม่ส่งรหัสผ่านทางแชต
2. เปิด email confirmation ตั้ง Site URL และ redirect allowlist แบบเจาะจงสำหรับ localhost และ production HTTPS ห้าม wildcard production
3. ตั้ง Gmail SMTP ใน Supabase: host `smtp.gmail.com`, port 587, username/ผู้ส่งเป็นอีเมลที่ใช้ส่ง และ App Password หลังเปิด 2-Step Verification
4. ตั้ง rate limit/CAPTCHA และทดสอบยืนยันอีเมล รีเซ็ต ลิงก์หมดอายุ และการส่งซ้ำด้วยบัญชีทดสอบ
5. เมื่อมี Supabase CLI และ local stack ให้ใช้ `--help` ตรวจคำสั่งก่อน initialize ตั้ง `db.migrations.schema_paths` ให้โหลด `./schemas/*.sql` สร้างและตรวจ diff/migration ในฐานข้อมูลทดสอบก่อน apply จริง อย่ารันไฟล์ซ้ำบนฐานข้อมูลที่มีตารางชื่อเดียวกัน

## เกณฑ์ตรวจฐานข้อมูลก่อนเชื่อม UI

ใช้ผู้ใช้ทดสอบ A/B และ anon โดยเชื่อมผ่านบทบาทจริง ไม่ทดสอบทุกอย่างด้วย service-role:

- A อ่าน/แก้/ลบรายการ B ไม่ได้ และ insert/update `user_id` เป็น B ไม่ได้
- A ผูก subscription กับ card ของ B ไม่ได้ แม้ทราบ UUID
- anon อ่าน/เขียนทุกตารางไม่ได้
- A แก้สถานะรอบตนเองได้ แต่แก้ราคา/ชื่อบัตรหรือสร้างรอบเองไม่ได้
- สร้างรอบซ้ำไม่สำเร็จ แก้ราคาบริการไม่กระทบรอบที่สร้างแล้ว
- การลบบัญชีในระบบทดสอบลบข้อมูลที่เกี่ยวข้องครบ และทดสอบ token/session revocation แยกต่างหาก
- ตรวจ advisors, migration rollback/recovery และ backup restore ก่อน production

SQL ยังไม่ได้ทดสอบบน PostgreSQL/Supabase จึงยังไม่ถือว่าผ่านการทดสอบ RLS จริง ห้ามเปิด production จนกว่าเกณฑ์ข้างต้นผ่าน

## งานถัดไป

เชื่อม server-side Auth และ cookie session, endpoint CRUD, UI account mode, worker สร้างรอบ, import transaction, export/delete account และทดสอบ end-to-end กับ test project จากนั้นเลือกโฮสติ้ง HTTPS และกำหนด retention/backup ตามบริการที่เลือก

อ้างอิง: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Declarative schemas](https://supabase.com/docs/guides/local-development/declarative-database-schemas), [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## Google Login (แนวทางปัจจุบัน)

เปลี่ยนเป็น Google OAuth ก่อน ส่วน email/password ผ่าน Resend เป็นงานภายหลัง ไม่ต้องตั้ง Gmail SMTP สำหรับ Google Login

1. Google Cloud / Google Auth Platform: ตั้ง Branding เป็น SubBill, Audience เป็น External (ช่วง Testing เพิ่มบัญชีทดสอบ), ขอเฉพาะ openid, email, profile
2. สร้าง OAuth Client ชนิด Web application และเพิ่ม Authorized redirect URI:
   `https://efhzmryoujakbkhwtzwx.supabase.co/auth/v1/callback`
3. นำ Client ID และ Client Secret ไปตั้งใน Supabase Authentication / Google provider แล้วเปิด provider
4. Supabase URL Configuration: เพิ่ม redirect URL `http://127.0.0.1:4173/auth/callback` และใช้ Site URL `http://127.0.0.1:4173`
5. คัดลอก `.env.example` เป็น `.env` ใส่ publishable key แล้ว restart `npm start` เปิดเว็บด้วย 127.0.0.1 (ไม่ใช่ localhost เพราะ origin ตรวจตรงกัน)

Server ใช้ PKCE verifier และ cookie HttpOnly SameSite=Lax เก็บ access token ในหน่วยความจำ ตรวจ user ผ่าน Supabase ก่อนแสดงสถานะ login ไม่เก็บ refresh token จึงต้องล็อกอินใหม่เมื่อ token หมดอายุหรือ restart server การเชื่อมฐานข้อมูลและ account dashboard ยังไม่พร้อม แสดงเฉพาะสถานะยืนยันตัวตนและโหมดทดลองแยกกัน ไม่อัปโหลด demo data

สำหรับ production ต้องเพิ่ม durable session store, refresh lifecycle, rate limiting ต่อ client, HTTPS และ deployment configuration ก่อนใช้งานจริง ขณะนี้ยังไม่ได้ทดสอบ Google OAuth จริงเพราะขาด key/provider configuration
