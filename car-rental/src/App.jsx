import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardShell from "./components/DashboardShell";
import { Car, Wallet, History, User, LayoutGrid, Users, ClipboardCheck, Tag, Landmark, BarChart3, Settings as SettingsIcon, MapPin } from "lucide-react";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import PBook from "./pages/passenger/Book";
import PRides from "./pages/passenger/Rides";
import PRideDetail from "./pages/passenger/RideDetail";
import PProfile from "./pages/passenger/Profile";

import DWallet from "./pages/driver/Wallet";
import DRequests from "./pages/driver/RideRequests";
import DHistory from "./pages/driver/History";
import DVehicle from "./pages/driver/Vehicle";
import DProfile from "./pages/driver/Profile";

import AOverview from "./pages/admin/Overview";
import ADrivers from "./pages/admin/Drivers";
import AVehicles from "./pages/admin/Vehicles";
import APricing from "./pages/admin/Pricing";
import AWallets from "./pages/admin/Wallets";
import AReports from "./pages/admin/Reports";
import ASettings from "./pages/admin/Settings";

const passengerLinks = [
  { to: "/passenger", label: "Book", icon: MapPin, end: true },
  { to: "/passenger/rides", label: "My rides", icon: History },
  { to: "/passenger/profile", label: "Profile", icon: User },
];

const driverLinks = [
  { to: "/driver", label: "Wallet", icon: Wallet, end: true },
  { to: "/driver/requests", label: "Ride requests", icon: Car },
  { to: "/driver/history", label: "History", icon: History },
  { to: "/driver/vehicle", label: "My vehicle", icon: Car },
  { to: "/driver/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/admin/drivers", label: "Drivers", icon: Users },
  { to: "/admin/vehicles", label: "Vehicles", icon: ClipboardCheck },
  { to: "/admin/pricing", label: "Pricing", icon: Tag },
  { to: "/admin/wallets", label: "Wallets", icon: Landmark },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Passenger */}
          <Route path="/passenger" element={<ProtectedRoute role="passenger"><DashboardShell links={passengerLinks}><PBook /></DashboardShell></ProtectedRoute>} />
          <Route path="/passenger/rides" element={<ProtectedRoute role="passenger"><DashboardShell links={passengerLinks}><PRides /></DashboardShell></ProtectedRoute>} />
          <Route path="/passenger/rides/:id" element={<ProtectedRoute role="passenger"><DashboardShell links={passengerLinks}><PRideDetail /></DashboardShell></ProtectedRoute>} />
          <Route path="/passenger/profile" element={<ProtectedRoute role="passenger"><DashboardShell links={passengerLinks}><PProfile /></DashboardShell></ProtectedRoute>} />

          {/* Driver */}
          <Route path="/driver" element={<ProtectedRoute role="driver"><DashboardShell links={driverLinks}><DWallet /></DashboardShell></ProtectedRoute>} />
          <Route path="/driver/requests" element={<ProtectedRoute role="driver"><DashboardShell links={driverLinks}><DRequests /></DashboardShell></ProtectedRoute>} />
          <Route path="/driver/history" element={<ProtectedRoute role="driver"><DashboardShell links={driverLinks}><DHistory /></DashboardShell></ProtectedRoute>} />
          <Route path="/driver/vehicle" element={<ProtectedRoute role="driver"><DashboardShell links={driverLinks}><DVehicle /></DashboardShell></ProtectedRoute>} />
          <Route path="/driver/profile" element={<ProtectedRoute role="driver"><DashboardShell links={driverLinks}><DProfile /></DashboardShell></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><AOverview /></DashboardShell></ProtectedRoute>} />
          <Route path="/admin/drivers" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><ADrivers /></DashboardShell></ProtectedRoute>} />
          <Route path="/admin/vehicles" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><AVehicles /></DashboardShell></ProtectedRoute>} />
          <Route path="/admin/pricing" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><APricing /></DashboardShell></ProtectedRoute>} />
          <Route path="/admin/wallets" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><AWallets /></DashboardShell></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><AReports /></DashboardShell></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute role="super_admin"><DashboardShell links={adminLinks}><ASettings /></DashboardShell></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
