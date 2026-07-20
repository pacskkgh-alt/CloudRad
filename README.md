# CloudRad ☁️🏥

نظام سحابي لإدارة صور الأشعة الطبية (Teleradiology Platform) — رفع ومعالجة ومشاركة صور DICOM مع تقارير PDF.

---

## التقنيات

| المكوّن | التقنية |
|---------|---------|
| Backend | FastAPI · SQLAlchemy · PostgreSQL |
| Frontend | React 18 · Vite · TailwindCSS 3 |
| PACS | Orthanc (via Docker) |
| Auth | JWT + bcrypt + RBAC |
| Infra | Docker Compose · Nginx · Let's Encrypt SSL |
| Deploy | Vercel (frontend) + VPS (backend) |

---

## البدء السريع (Development)

### المتطلبات
- Docker & Docker Compose
- Node.js 20+ (للفرونت المحلي)

### 1. استنساخ المشروع
```bash
git clone <repo-url>
cd CloudRad
```

### 2. إعداد المتغيرات
```bash
cp .env.example .env
# عدّل القيم في .env حسب بيئتك
```

### 3. تشغيل البيئة
```bash
docker-compose up --build -d
```

### 4. إنشاء بيانات تجريبية
```bash
docker exec -it cloudrad_fastapi python backend/seed.py
```

### 5. الوصول
| الخدمة | الرابط |
|--------|--------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Orthanc PACS | http://localhost:8042 |

---

## النشر (Production)

راجع [deployment_guide.md](../deployment_guide.md) للتعليمات الكاملة.

### باختصار:
```bash
# على خادم Ubuntu مع Docker
cp .env.example .env
# عدّل .env بالقيم الحقيقية
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## هيكل المشروع

```
CloudRad/
├── .env.example              # قالب متغيرات البيئة
├── docker-compose.yml        # بيئة التطوير
├── docker-compose.prod.yml   # بيئة الإنتاج + SSL
├── backend/
│   ├── main.py               # FastAPI entry point
│   ├── models.py             # 6 DB models
│   ├── auth.py               # JWT + bcrypt + RBAC
│   ├── api_auth.py           # POST /login + GET /me
│   ├── api_upload.py         # Upload DICOM (ZIP/files)
│   ├── api_upload_chunked.py # Chunked upload
│   ├── api_reports.py        # Reports + PDF generation
│   ├── api_links.py          # Share links
│   ├── api_admin.py          # Admin management
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx            # Routing + auth guard
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── CaseTimeline.jsx
    │       ├── AdminDashboard.jsx
    │       ├── PatientPortal.jsx
    │       └── PatientViewPage.jsx
    └── package.json
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | JWT | Current user info |
| GET | `/api/studies` | JWT | List studies (paginated) |
| POST | `/api/upload` | JWT | Upload DICOM ZIP |
| POST | `/api/upload-chunk` | JWT | Chunked upload |
| POST | `/api/reports/` | JWT | Create/update report |
| GET | `/api/reports/{id}` | JWT/Token | Get report |
| GET | `/api/reports/{id}/pdf` | Token | Download PDF |
| POST | `/api/links/` | JWT | Create share link |
| POST | `/api/links/{token}/verify` | — | Verify share link |
| GET | `/api/admin/*` | Admin | Admin endpoints |

---

## الأدوار

| الدور | الصلاحيات |
|-------|-----------|
| `admin` | إدارة كاملة — مستخدمين + عيادات + روابط |
| `doctor` | رفع + تقارير + مشاركة |
| `user` | عرض فقط |

---

## الأمان

- ✅ JWT + bcrypt password hashing
- ✅ RBAC (admin/doctor/user)
- ✅ Rate limiting (100/min)
- ✅ CORS restricted
- ✅ HTML sanitization (bleach + DOMPurify)
- ✅ Upload size limit (500MB)
- ✅ Auto-SSL via Let's Encrypt
- ✅ HTTPS redirect enforced

---

## الترخيص

Private — All rights reserved.
