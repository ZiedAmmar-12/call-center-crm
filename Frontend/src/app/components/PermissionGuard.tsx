// components/PermissionGuard.tsx
import { useAuth } from '../../contexts/AuthContext';
import type { Permission } from '../../types/permissions';

interface PermissionGuardProps {
    permission: Permission | Permission[];
    requireAll?: boolean;
    fallback?: React.ReactNode;
    // Optional: if passed, renders a button instead of a wrapper
    asButton?: boolean;
    onClick?: () => void;
    className?: string;
    children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    requireAll = false,
    fallback = null,
    asButton = false,
    onClick,
    className,
    children
}) => {
    const { hasAnyPermission, hasAllPermissions } = useAuth();

    const permissionsArray = Array.isArray(permission) 
        ? permission 
        : [permission];

    const hasAccess = requireAll
        ? hasAllPermissions(permissionsArray)
        : hasAnyPermission(permissionsArray);

    if (!hasAccess) return <>{fallback}</>;

    if (asButton) {
        return (
            <button onClick={onClick} className={className}>
                {children}
            </button>
        );
    }

    return <>{children}</>;
};

export default PermissionGuard;
