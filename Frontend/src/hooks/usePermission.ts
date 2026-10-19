import type { Permission } from '../types/permissions';
import { useAuth } from '../contexts/AuthContext';
export const usePermission =(permission : Permission)=>{
    const { hasPermission } = useAuth();
    return hasPermission(permission);
};
