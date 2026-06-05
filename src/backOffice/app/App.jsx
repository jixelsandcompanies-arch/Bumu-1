import { Navigate, Route, Routes } from "react-router-dom";
import { BackOfficeLayout } from "../components/layout/BackOfficeLayout.jsx";
import BackOfficeApplicationDetail from "../pages/BackOfficeApplicationDetail.jsx";
import BackOfficeCompleted from "../pages/BackOfficeCompleted.jsx";
import BackOfficeOverview from "../pages/BackOfficeOverview.jsx";
import BackOfficeProfile from "../pages/BackOfficeProfile.jsx";
import BackOfficeScreening from "../pages/BackOfficeScreening.jsx";
import { ProtectedRoute } from "../../uploadedAdmin/features/auth/ProtectedRoute.jsx";
import Login from "../../uploadedAdmin/pages/auth/Login.jsx";
import ResetPassword from "../../uploadedAdmin/pages/auth/ResetPassword.jsx";

export default function BackOfficeApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/backoffice/overview" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin/*" element={<Navigate to="/backoffice/overview" replace />} />

      <Route
        path="/backoffice"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "back_office_officer"]}>
            <BackOfficeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/backoffice/overview" replace />} />
        <Route path="overview" element={<BackOfficeOverview />} />
        <Route path="screening" element={<BackOfficeScreening />} />
        <Route path="applications/:applicationId" element={<BackOfficeApplicationDetail />} />
        <Route path="completed" element={<BackOfficeCompleted />} />
        <Route path="profile" element={<BackOfficeProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/backoffice/overview" replace />} />
    </Routes>
  );
}
