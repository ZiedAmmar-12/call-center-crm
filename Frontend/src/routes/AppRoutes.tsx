import {Routes , Route , Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {Roles, Role_Home} from '../constants/role.ts';
import LoginPage from '../Pages/LoginPage';
import ProtectedRoute from '../components/ProtectedRoute';
import DashboardPage from '../Pages/admin/dashboardPage.tsx';
import InjectionPage from '../Pages/admin/injectionPage.tsx';
import PointagePage from '../Pages/admin/pointagePage.tsx';
import PermissionPage from '../Pages/admin/PermissionPage.tsx';
import ClientsPage from '../Pages/admin/ClientsPage.tsx';
import type { RoleId } from '../constants/role';
export default function AppRoutes() {
    const { isAuthenticated, user } = useAuth();
    return (
         <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={[Roles.SuperAdmin, Roles.Admin]} />}>
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/injection" element={<InjectionPage />} />
        <Route path="/admin/leads" element={<InjectionPage />} />
        <Route path="/admin/pointage" element={<PointagePage />} />
        <Route path="/admin/permissions" element={<PermissionPage />} />
        <Route path="/admin/clients" element={<ClientsPage />} />
      </Route>

      <Route
        path="*"
        element={
          isAuthenticated() && user
            ? <Navigate to={Role_Home[user.roleId as RoleId] ?? '/login'} replace />
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
    );
}
