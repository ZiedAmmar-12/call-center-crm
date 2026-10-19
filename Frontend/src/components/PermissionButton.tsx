import type { Permission } from '../types/permissions';
import { useAuth } from '../contexts/AuthContext';

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    requiredPermission: Permission;
    fallback?: React.ReactNode;
}

const PermissionButton: React.FC<PermissionButtonProps> =
    ({ children,
        requiredPermission,
        fallback = null,
        ...buttonProps }) => {
        const { hasPermission } = useAuth();
        if (hasPermission(requiredPermission)) {
            return <button {...buttonProps}>{children}</button>
        }
        return <>{fallback}</>;
    };

export default PermissionButton;