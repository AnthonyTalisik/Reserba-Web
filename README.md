<div align="center">

# 📅 Reserba

**Campus room reservation, made simple.**

Find a free room. Request it in seconds. No more double-booked classrooms.

</div>

---

## ✨ What is Reserba?

Schools run on shared rooms, and booking them usually means paper forms, group chats and clashing schedules.
**Reserba** puts it all in one place:

- 🎓 **Students and faculty** browse rooms, see a live timeline, and send a reservation request.
- 🛡️ **Room administrators** review requests, approve or reject with quick remarks, and verify new accounts.
- 🚫 **No double bookings.** The system checks every request against approved bookings, blocked dates and a 20-minute gap between reservations. If a room is taken, it suggests the next free time and similar rooms.

## 🚀 Features

| For everyone | For admins |
|---|---|
| Room search, filters and "Free now" badges | Request queue with overlap warnings |
| Hourly availability timeline | Approve / reject with suggested remarks |
| Smart conflict check + alternative rooms | Verify new student and faculty accounts |
| My bookings and notifications | Add rooms, deactivate them, block dates |

## 🧰 Tech stack

- **Frontend:** React + Vite (`frontend/`)
- **Backend:** Spring Boot, Java 21 (`backend/`)
- **Database:** in-memory for now, Firebase Firestore next
- **Docs:** `docs/API.md` lists every endpoint

## ▶️ Run it locally

You need **Node.js 20+**, **JDK 21+** and **Git**.

**1. Backend** (terminal 1)

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

Runs on http://localhost:8080. Check it at http://localhost:8080/api/health.

**2. Frontend** (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | student@school.edu | 123456 |
| Faculty | faculty@school.edu | 123456 |
| Admin | admin@reserba.edu | admin123 |

> Data is stored in memory, so it resets whenever the app restarts.

## 📁 Project structure

```
Reserba-Web/
├── backend/    Spring Boot API (auth, rooms, reservations, admin)
├── frontend/   React app
├── docs/       API reference and project documents
└── README.md
```

## 🗺️ Roadmap

- [x] React UI for students, faculty and admins
- [x] Spring Boot API with all booking rules
- [ ] Connect the frontend to the API
- [ ] Move data to Firebase
- [ ] Deploy

## 👤 Author

Made by **Anthony Talisik** for INTPROG.
