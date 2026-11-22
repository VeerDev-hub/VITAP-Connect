import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppLayout from "./components/layout/AppLayout";
import PublicLayout from "./components/layout/PublicLayout";
import IncomingCallModal from "./components/IncomingCallModal";
import ProtectedRoute from "./components/ProtectedRoute";
import { Spinner } from "./components/ui";
import Auth from "./pages/Auth";
import Home from "./pages/Home";

// Route-level code splitting: the landing and auth pages load first, the app on demand.
const Admin = lazy(() => import("./pages/Admin"));
const Chat = lazy(() => import("./pages/Chat"));
const Connections = lazy(() => import("./pages/Connections"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Feedback = lazy(() => import("./pages/Feedback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const ProjectCall = lazy(() => import("./pages/ProjectCall"));
const Projects = lazy(() => import("./pages/Projects"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

export default function App() {
  return (
    <>
      <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/collaborations" element={<Projects />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        </Route>

        <Route path="/project-call/:roomId" element={<ProtectedRoute><ProjectCall /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      <IncomingCallModal />
      <Toaster
        position="top-center"
        toastOptions={{
          className: "!rounded-md !border !border-line !bg-surface !text-ink !text-sm !shadow-pop",
          success: { iconTheme: { primary: "rgb(var(--ok))", secondary: "rgb(var(--surface))" } },
          error: { iconTheme: { primary: "rgb(var(--bad))", secondary: "rgb(var(--surface))" } }
        }}
      />
    </>
  );
}
