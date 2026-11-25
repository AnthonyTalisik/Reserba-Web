import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { homeFor } from './context/routes.js'

import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import RoomsPage from './pages/RoomsPage.jsx'
import RoomDetails from './pages/RoomDetails.jsx'
import RequestForm from './pages/RequestForm.jsx'
import MyReservations from './pages/MyReservations.jsx'
import Notifications from './pages/Notifications.jsx'
import Profile from './pages/Profile.jsx'
import AdminRequests from './pages/AdminRequests.jsx'
import AdminReview from './pages/AdminReview.jsx'
import VerifyAccounts from './pages/VerifyAccounts.jsx'
import ManageRooms from './pages/ManageRooms.jsx'

const REQUESTER = ['STUDENT', 'FACULTY']
const ADMIN = ['ADMIN']

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? homeFor(user) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        {/* Everyone */}
        <Route path="/rooms/:roomId" element={<RoomDetails />} />
        <Route path="/alerts" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />

        {/* Students and faculty */}
        <Route path="/rooms" element={<RequireAuth roles={REQUESTER}><RoomsPage /></RequireAuth>} />
        <Route path="/rooms/:roomId/request" element={<RequireAuth roles={REQUESTER}><RequestForm /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth roles={REQUESTER}><MyReservations /></RequireAuth>} />

        {/* Room administrator */}
        <Route path="/admin/requests" element={<RequireAuth roles={ADMIN}><AdminRequests /></RequireAuth>} />
        <Route path="/admin/requests/:reservationId" element={<RequireAuth roles={ADMIN}><AdminReview /></RequireAuth>} />
        <Route path="/admin/verify" element={<RequireAuth roles={ADMIN}><VerifyAccounts /></RequireAuth>} />
        <Route path="/admin/rooms" element={<RequireAuth roles={ADMIN}><ManageRooms /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  )
}
