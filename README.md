<div align="center">

# 📅 Reserba

**Campus room reservation, made simple.**

Find a free room. Request it in seconds. No more double-booked classrooms.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-backend-6DB33F?logo=springboot&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)

</div>

---

## ✨ What is Reserba?

Schools run on shared rooms, and booking them usually means paper forms, group chats and clashing schedules.
**Reserba** puts it all in one place:

- 🎓 **Students and faculty** register, get verified, and (in later increments) browse rooms and send reservation requests.
- 🛡️ **Room administrators** verify new accounts and, in later increments, approve or reject requests.
- 🚫 **No double bookings.** The server checks every request against approved bookings, blocked dates and a 20-minute gap between reservations.

## ✅ Project Development Increment 1: User Accounts and Authentication

| Feature | What it does |
|---|---|
| **Account registration** | Validates required fields, ID format `000-00000`, email and password length. Blocks duplicate emails and ID numbers. Passwords are hashed (PBKDF2-SHA256 with a random salt). Roles: Student or Faculty. |
| **Admin verification** | New accounts start as *Pending*. The administrator approves or rejects them (with remarks) before they can log in. |
| **Login / Logout** | Checks registered credentials, shows clear error messages, issues a session token (8 hours). Logout revokes the token on the server. |
| **Role-based dashboards** | Student, Faculty and Administrator each get their own dashboard, redirect after login and menu. |
| **Access control** | Frontend route guards **and** backend checks: no token gives `401`, a non-admin on `/api/admin/**` gives `403`. |

> The room browsing and booking pages are not part of this increment yet.

## 🧰 Tech stack

- **Frontend:** React + Vite (`frontend/`)
- **Backend:** Spring Boot, Java 21 (`backend/`)
- **Database:** Firebase Firestore (collections: `users`, `rooms`, `reservations`, `blocks`, `notifications`)
- **Docs:** `docs/API.md` lists every endpoint, `docs/FIREBASE_SETUP.md` covers Firebase

## ▶️ Run it locally

You need **Node.js 20+**, **JDK 21+** and **Git**.

### 1. Clone

```bash
git clone https://github.com/AnthonyTalisik/Reserba-Web.git
cd Reserba-Web
```

### 2. Configure the backend

Edit `backend/src/main/resources/application.properties`:

```properties
# Where data is stored: "firestore" (database) or leave out for temporary in-memory storage
reserba.storage=firestore

# The administrator account, created automatically on first start
reserba.admin.email=admin@reserba.edu
reserba.admin.password=admin123

# Keep false: no sample users or bookings
reserba.seed-demo-data=false
```

**Firebase:** follow `docs/FIREBASE_SETUP.md`, then save your service-account key as
`backend/src/main/resources/firebase-service-account.json`.
This file is a secret and is listed in `.gitignore`. **Never commit it.**

### 3. Start the backend (terminal 1)

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

Runs on http://localhost:8080. Check it at http://localhost:8080/api/health.

### 4. Start the frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### 5. Try it

1. Click **Create an account** and register a student, then a faculty member.
2. Log in as the administrator (email and password from `application.properties`), open **Verify**, and approve both accounts.
3. Log in as each user and see their own dashboard.

### Test accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@reserba.edu` | `admin123` |
| Student | register in the app, then approve as admin | your choice |
| Faculty | register in the app, then approve as admin | your choice |

> Without `reserba.storage=firestore`, data is kept in memory and is lost when the backend restarts.
> Login sessions are always kept in memory, so restarting the backend logs everyone out.

## 📁 Project structure

```
Reserba-Web/
├── backend/    Spring Boot API (auth, rooms, reservations, admin)
├── frontend/   React app
├── docs/       API reference, SRS and completion report
└── README.md
```

## 🗺️ Roadmap

- [x] Spring Boot API with all booking rules
- [x] Registration, login/logout and role-based dashboards (Increment 1)
- [ ] Verify Firestore storage end to end
- [ ] Connect room browsing and reservation requests to the API
- [ ] Admin review of requests, notifications, profile editing
- [ ] Deploy

## 👤 Author

Made by **Anthony Talisik**.
