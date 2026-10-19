import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Role_Home } from "../constants/role";
import type { RoleId } from "../constants/role";
interface Props{
    allowedRoles: RoleId[];
}
export default function ProtectedRoute({allowedRoles}:Props) {
    const { user , isAuthenticated, isLoading} = useAuth();
    if (isLoading) {
        return <div>Loading...</div>;
    }
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    if (!allowedRoles.includes(user?.roleId as RoleId)) {
        const home = Role_Home[user?.roleId as RoleId] || '/';
        return <Navigate to={home} replace />;
    }
    return <Outlet />;
}
