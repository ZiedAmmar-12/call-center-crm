import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Target,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { Layout } from "../../shared/components/Layout";
import { Button } from "../../shared/components/ui/Button";
import {
  PermissionAdminService,
  type PermissionDto,
  type PermissionTargetUserDto,
  type RolePermissionDto,
  type UserPermissionDto,
  type UserPermissionScopeDto,
} from "../../services/permissionAdminService";

type PermissionMode = "roles" | "users";

const USER_SCOPE_TYPE = "User";
const FEATURED_SCOPED_PERMISSION = "Agents.ViewOtherAgendas";

function sameStringList(left: string[], right: string[]) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function scopeKey(scope: UserPermissionScopeDto) {
  return `${scope.permissionName}|${scope.scopeType ?? ""}|${scope.scopeUserId ?? ""}`;
}

function sameScopes(left: UserPermissionScopeDto[], right: UserPermissionScopeDto[]) {
  const leftKeys = left.map(scopeKey).sort();
  const rightKeys = right.map(scopeKey).sort();
  return sameStringList(leftKeys, rightKeys);
}

function includesText(value: string | undefined | null, query: string) {
  return (value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}

function userLabel(user: Pick<UserPermissionDto | PermissionTargetUserDto, "userName" | "email">) {
  return user.userName || user.email;
}

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function PermissionPage() {
  const [mode, setMode] = useState<PermissionMode>("roles");
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [roles, setRoles] = useState<RolePermissionDto[]>([]);
  const [users, setUsers] = useState<UserPermissionDto[]>([]);
  const [targetUsers, setTargetUsers] = useState<PermissionTargetUserDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string[]>([]);
  const [selectedScopedPermissions, setSelectedScopedPermissions] = useState<UserPermissionScopeDto[]>([]);
  const [newScopedPermission, setNewScopedPermission] = useState("");
  const [newScopedTargetUserId, setNewScopedTargetUserId] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedRole = roles.find((role) => role.roleId === selectedRoleId) ?? null;
  const selectedUser = users.find((user) => user.userId === selectedUserId) ?? null;

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionDto[]>>((groups, permission) => {
      const group = permission.groupName || permission.name.split(".")[0];
      groups[group] ??= [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const filteredGroupedPermissions = useMemo(() => {
    if (!permissionSearch.trim()) return groupedPermissions;

    return Object.entries(groupedPermissions).reduce<Record<string, PermissionDto[]>>(
      (groups, [group, groupPermissions]) => {
        const filtered = groupPermissions.filter(
          (permission) => includesText(permission.name, permissionSearch) || includesText(group, permissionSearch),
        );
        if (filtered.length > 0) groups[group] = filtered;
        return groups;
      },
      {},
    );
  }, [groupedPermissions, permissionSearch]);

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => includesText(role.roleName, roleSearch));
  }, [roleSearch, roles]);

  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        includesText(user.userName, userSearch) ||
        includesText(user.email, userSearch) ||
        includesText(user.roleName, userSearch),
    );
  }, [userSearch, users]);

  const roleHasChanges = useMemo(() => {
    return selectedRole ? !sameStringList(selectedRole.permissionNames, selectedPermissions) : false;
  }, [selectedPermissions, selectedRole]);

  const userHasChanges = useMemo(() => {
    if (!selectedUser) return false;

    return (
      !sameStringList(selectedUser.permissionNames, selectedUserPermissions) ||
      !sameScopes(selectedUser.scopedPermissions, selectedScopedPermissions)
    );
  }, [selectedScopedPermissions, selectedUser, selectedUserPermissions]);

  const totalRoleAssignments = useMemo(
    () => roles.reduce((total, role) => total + role.permissionNames.length, 0),
    [roles],
  );

  const totalDirectUserAssignments = useMemo(
    () => users.reduce((total, user) => total + user.permissionNames.length, 0),
    [users],
  );

  const totalScopedAssignments = useMemo(
    () => users.reduce((total, user) => total + user.scopedPermissions.length, 0),
    [users],
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [allPermissions, rolePermissions, userPermissions, permissionTargets] = await Promise.all([
        PermissionAdminService.getPermissions(),
        PermissionAdminService.getRolesWithPermissions(),
        PermissionAdminService.getUsersWithPermissions(),
        PermissionAdminService.getPermissionTargetUsers(),
      ]);

      setPermissions(allPermissions);
      setRoles(rolePermissions);
      setUsers(userPermissions);
      setTargetUsers(permissionTargets);

      const nextRole = rolePermissions.find((role) => role.roleId === selectedRoleId) ?? rolePermissions[0];
      setSelectedRoleId(nextRole?.roleId ?? null);
      setSelectedPermissions(nextRole?.permissionNames ?? []);

      const nextUser = userPermissions.find((user) => user.userId === selectedUserId) ?? userPermissions[0];
      setSelectedUserId(nextUser?.userId ?? null);
      setSelectedUserPermissions(nextUser?.permissionNames ?? []);
      setSelectedScopedPermissions(nextUser?.scopedPermissions ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible de charger les permissions.");
    } finally {
      setLoading(false);
    }
  }

  function selectRole(role: RolePermissionDto) {
    setSelectedRoleId(role.roleId);
    setSelectedPermissions(role.permissionNames);
    setError("");
    setSuccess("");
  }

  function selectUser(user: UserPermissionDto) {
    setSelectedUserId(user.userId);
    setSelectedUserPermissions(user.permissionNames);
    setSelectedScopedPermissions(user.scopedPermissions);
    setNewScopedPermission("");
    setNewScopedTargetUserId("");
    setError("");
    setSuccess("");
  }

  function togglePermission(permissionName: string) {
    setSelectedPermissions((current) =>
      current.includes(permissionName)
        ? current.filter((name) => name !== permissionName)
        : [...current, permissionName],
    );
    setSuccess("");
  }

  function toggleUserPermission(permissionName: string) {
    setSelectedUserPermissions((current) =>
      current.includes(permissionName)
        ? current.filter((name) => name !== permissionName)
        : [...current, permissionName],
    );
    setSuccess("");
  }

  function setGroupPermissions(
    groupPermissions: PermissionDto[],
    enabled: boolean,
    target: "role" | "user",
  ) {
    const groupNames = groupPermissions.map((permission) => permission.name);
    const update = (current: string[]) => {
      const withoutGroup = current.filter((name) => !groupNames.includes(name));
      return enabled ? [...withoutGroup, ...groupNames] : withoutGroup;
    };

    if (target === "role") {
      setSelectedPermissions(update);
    } else {
      setSelectedUserPermissions(update);
    }

    setSuccess("");
  }

  function addScopedPermission() {
    const scopeUserId = Number(newScopedTargetUserId);
    const targetUser = targetUsers.find((user) => user.userId === scopeUserId);

    if (!newScopedPermission || !targetUser) return;

    const nextScope: UserPermissionScopeDto = {
      permissionName: newScopedPermission,
      scopeType: USER_SCOPE_TYPE,
      scopeUserId,
      scopeUserName: targetUser.userName,
    };

    setSelectedScopedPermissions((current) => {
      if (current.some((scope) => scopeKey(scope) === scopeKey(nextScope))) return current;
      return [...current, nextScope];
    });
    setNewScopedPermission("");
    setNewScopedTargetUserId("");
    setSuccess("");
  }

  function removeScopedPermission(scopeToRemove: UserPermissionScopeDto) {
    const keyToRemove = scopeKey(scopeToRemove);
    setSelectedScopedPermissions((current) => current.filter((scope) => scopeKey(scope) !== keyToRemove));
    setSuccess("");
  }

  function useFeaturedScopedPermission() {
    if (permissions.some((permission) => permission.name === FEATURED_SCOPED_PERMISSION)) {
      setNewScopedPermission(FEATURED_SCOPED_PERMISSION);
    }
  }

  async function saveRolePermissions() {
    if (!selectedRoleId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await PermissionAdminService.updateRolePermissions(selectedRoleId, selectedPermissions);
      setRoles((current) =>
        current.map((role) =>
          role.roleId === selectedRoleId
            ? { ...role, permissionNames: [...selectedPermissions].sort() }
            : role,
        ),
      );
      setSuccess("Permissions du role enregistrees.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible d'enregistrer les permissions du role.");
    } finally {
      setSaving(false);
    }
  }

  async function saveUserPermissions() {
    if (!selectedUserId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await PermissionAdminService.updateUserPermissions(
        selectedUserId,
        selectedUserPermissions,
        selectedScopedPermissions,
      );
      setUsers((current) =>
        current.map((user) =>
          user.userId === selectedUserId
            ? {
                ...user,
                permissionNames: [...selectedUserPermissions].sort(),
                scopedPermissions: [...selectedScopedPermissions].sort((a, b) =>
                  scopeKey(a).localeCompare(scopeKey(b)),
                ),
              }
            : user,
        ),
      );
      setSuccess("Permissions utilisateur enregistrees.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible d'enregistrer les permissions utilisateur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-5 border-b border-border pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Shield className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-foreground">Permissions</h1>
                  <p className="text-sm text-muted-foreground">
                    Administrer les droits globaux, les exceptions utilisateur et les acces limites par agent.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={loadData} disabled={loading || saving}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </Button>
              {mode === "roles" ? (
                <Button onClick={saveRolePermissions} disabled={!selectedRole || saving || !roleHasChanges}>
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              ) : (
                <Button onClick={saveUserPermissions} disabled={!selectedUser || saving || !userHasChanges}>
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Permissions" value={permissions.length} tone="primary" />
            <Metric label="Roles actifs" value={roles.length} tone="info" />
            <Metric label="Droits par role" value={totalRoleAssignments} tone="success" />
            <Metric label="Droits cibles" value={totalScopedAssignments} tone="warning" />
          </div>

          <ModeSwitch
            mode={mode}
            rolesCount={roles.length}
            usersCount={users.length}
            directUserAssignments={totalDirectUserAssignments}
            scopedAssignments={totalScopedAssignments}
            disabled={loading || saving}
            onChange={setMode}
          />
        </header>

        <StatusMessage type="error" message={error} />
        <StatusMessage type="success" message={success} />

        {loading ? (
          <div className="rounded-md border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Chargement des permissions...
          </div>
        ) : mode === "roles" ? (
          <RolePermissionsView
            groupedPermissions={filteredGroupedPermissions}
            roles={filteredRoles}
            selectedPermissions={selectedPermissions}
            selectedRole={selectedRole}
            selectedRoleId={selectedRoleId}
            hasChanges={roleHasChanges}
            roleSearch={roleSearch}
            permissionSearch={permissionSearch}
            totalRoles={roles.length}
            onRoleSearchChange={setRoleSearch}
            onPermissionSearchChange={setPermissionSearch}
            onSelectRole={selectRole}
            onTogglePermission={togglePermission}
            onSetGroupPermissions={(groupPermissions, enabled) =>
              setGroupPermissions(groupPermissions, enabled, "role")
            }
          />
        ) : (
          <UserPermissionsView
            groupedPermissions={filteredGroupedPermissions}
            users={filteredUsers}
            targetUsers={targetUsers}
            permissions={permissions}
            selectedUser={selectedUser}
            selectedUserId={selectedUserId}
            selectedUserPermissions={selectedUserPermissions}
            selectedScopedPermissions={selectedScopedPermissions}
            hasChanges={userHasChanges}
            userSearch={userSearch}
            permissionSearch={permissionSearch}
            newScopedPermission={newScopedPermission}
            newScopedTargetUserId={newScopedTargetUserId}
            totalUsers={users.length}
            onUserSearchChange={setUserSearch}
            onPermissionSearchChange={setPermissionSearch}
            onSelectUser={selectUser}
            onToggleUserPermission={toggleUserPermission}
            onSetGroupPermissions={(groupPermissions, enabled) =>
              setGroupPermissions(groupPermissions, enabled, "user")
            }
            onNewScopedPermissionChange={setNewScopedPermission}
            onNewScopedTargetUserChange={setNewScopedTargetUserId}
            onUseFeaturedScopedPermission={useFeaturedScopedPermission}
            onAddScopedPermission={addScopedPermission}
            onRemoveScopedPermission={removeScopedPermission}
          />
        )}
      </div>
    </Layout>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "info" | "success" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  }[tone];

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ModeSwitch({
  mode,
  rolesCount,
  usersCount,
  directUserAssignments,
  scopedAssignments,
  disabled,
  onChange,
}: {
  mode: PermissionMode;
  rolesCount: number;
  usersCount: number;
  directUserAssignments: number;
  scopedAssignments: number;
  disabled: boolean;
  onChange: (mode: PermissionMode) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-muted p-1 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange("roles")}
        disabled={disabled}
        className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 text-left transition-colors ${
          mode === "roles" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:bg-card/70"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <KeyRound className="h-4 w-4 flex-shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Roles</span>
            <span className="block truncate text-xs">{rolesCount} roles, droits par defaut</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange("users")}
        disabled={disabled}
        className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 text-left transition-colors ${
          mode === "users" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:bg-card/70"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <UserCog className="h-4 w-4 flex-shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Utilisateurs</span>
            <span className="block truncate text-xs">
              {usersCount} comptes, {directUserAssignments} directs, {scopedAssignments} cibles
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

function StatusMessage({ type, message }: { type: "error" | "success"; message: string }) {
  if (!message) return null;

  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/30 bg-success/10 text-success"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SearchBox({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
      />
    </div>
  );
}

function RolePermissionsView({
  groupedPermissions,
  roles,
  selectedPermissions,
  selectedRole,
  selectedRoleId,
  hasChanges,
  roleSearch,
  permissionSearch,
  totalRoles,
  onRoleSearchChange,
  onPermissionSearchChange,
  onSelectRole,
  onTogglePermission,
  onSetGroupPermissions,
}: {
  groupedPermissions: Record<string, PermissionDto[]>;
  roles: RolePermissionDto[];
  selectedPermissions: string[];
  selectedRole: RolePermissionDto | null;
  selectedRoleId: number | null;
  hasChanges: boolean;
  roleSearch: string;
  permissionSearch: string;
  totalRoles: number;
  onRoleSearchChange: (value: string) => void;
  onPermissionSearchChange: (value: string) => void;
  onSelectRole: (role: RolePermissionDto) => void;
  onTogglePermission: (permissionName: string) => void;
  onSetGroupPermissions: (groupPermissions: PermissionDto[], enabled: boolean) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-md border border-border bg-card">
        <PanelHeader
          title="Roles"
          subtitle={`${roles.length}/${totalRoles} visibles`}
          icon={<KeyRound className="h-4 w-4" />}
        />
        <div className="border-b border-border p-3">
          <SearchBox value={roleSearch} placeholder="Rechercher un role" onChange={onRoleSearchChange} />
        </div>
        <div className="max-h-[calc(100vh-365px)] overflow-y-auto p-2">
          {roles.map((role) => (
            <RoleListItem
              key={role.roleId}
              role={role}
              selected={role.roleId === selectedRoleId}
              onClick={() => onSelectRole(role)}
            />
          ))}
          {roles.length === 0 && <EmptyState text="Aucun role trouve." />}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <SelectionHeader
          title={selectedRole ? selectedRole.roleName : "Aucun role selectionne"}
          subtitle={`${selectedPermissions.length} permissions activees pour ce role`}
          hasChanges={hasChanges}
          icon={<KeyRound className="h-4 w-4" />}
        />
        <PermissionToolbar
          value={permissionSearch}
          selectedCount={selectedPermissions.length}
          onChange={onPermissionSearchChange}
        />
        <PermissionGroups
          groupedPermissions={groupedPermissions}
          selectedPermissions={selectedPermissions}
          onTogglePermission={onTogglePermission}
          onSetGroupPermissions={onSetGroupPermissions}
        />
      </section>
    </div>
  );
}

function UserPermissionsView({
  groupedPermissions,
  users,
  targetUsers,
  permissions,
  selectedUser,
  selectedUserId,
  selectedUserPermissions,
  selectedScopedPermissions,
  hasChanges,
  userSearch,
  permissionSearch,
  newScopedPermission,
  newScopedTargetUserId,
  totalUsers,
  onUserSearchChange,
  onPermissionSearchChange,
  onSelectUser,
  onToggleUserPermission,
  onSetGroupPermissions,
  onNewScopedPermissionChange,
  onNewScopedTargetUserChange,
  onUseFeaturedScopedPermission,
  onAddScopedPermission,
  onRemoveScopedPermission,
}: {
  groupedPermissions: Record<string, PermissionDto[]>;
  users: UserPermissionDto[];
  targetUsers: PermissionTargetUserDto[];
  permissions: PermissionDto[];
  selectedUser: UserPermissionDto | null;
  selectedUserId: number | null;
  selectedUserPermissions: string[];
  selectedScopedPermissions: UserPermissionScopeDto[];
  hasChanges: boolean;
  userSearch: string;
  permissionSearch: string;
  newScopedPermission: string;
  newScopedTargetUserId: string;
  totalUsers: number;
  onUserSearchChange: (value: string) => void;
  onPermissionSearchChange: (value: string) => void;
  onSelectUser: (user: UserPermissionDto) => void;
  onToggleUserPermission: (permissionName: string) => void;
  onSetGroupPermissions: (groupPermissions: PermissionDto[], enabled: boolean) => void;
  onNewScopedPermissionChange: (permissionName: string) => void;
  onNewScopedTargetUserChange: (userId: string) => void;
  onUseFeaturedScopedPermission: () => void;
  onAddScopedPermission: () => void;
  onRemoveScopedPermission: (scope: UserPermissionScopeDto) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="rounded-md border border-border bg-card">
        <PanelHeader
          title="Utilisateurs"
          subtitle={`${users.length}/${totalUsers} visibles`}
          icon={<Users className="h-4 w-4" />}
        />
        <div className="border-b border-border p-3">
          <SearchBox value={userSearch} placeholder="Nom, email ou role" onChange={onUserSearchChange} />
        </div>
        <div className="max-h-[calc(100vh-365px)] overflow-y-auto p-2">
          {users.map((user) => (
            <UserListItem
              key={user.userId}
              user={user}
              selected={user.userId === selectedUserId}
              onClick={() => onSelectUser(user)}
            />
          ))}
          {users.length === 0 && <EmptyState text="Aucun utilisateur trouve." />}
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <SelectionHeader
          title={selectedUser ? userLabel(selectedUser) : "Aucun utilisateur selectionne"}
          subtitle={`${selectedUserPermissions.length} droits directs, ${selectedScopedPermissions.length} droits cibles`}
          hasChanges={hasChanges}
          icon={<UserCog className="h-4 w-4" />}
        />

        <ScopedPermissionEditor
          permissions={permissions}
          targetUsers={targetUsers}
          selectedScopedPermissions={selectedScopedPermissions}
          newScopedPermission={newScopedPermission}
          newScopedTargetUserId={newScopedTargetUserId}
          onNewScopedPermissionChange={onNewScopedPermissionChange}
          onNewScopedTargetUserChange={onNewScopedTargetUserChange}
          onUseFeaturedScopedPermission={onUseFeaturedScopedPermission}
          onAddScopedPermission={onAddScopedPermission}
          onRemoveScopedPermission={onRemoveScopedPermission}
        />

        <div className="rounded-md border border-border bg-card">
          <PanelHeader
            title="Permissions directes"
            subtitle="Globales pour cet utilisateur"
            icon={<Shield className="h-4 w-4" />}
          />
          <div className="border-t border-border p-4">
            <PermissionToolbar
              value={permissionSearch}
              selectedCount={selectedUserPermissions.length}
              onChange={onPermissionSearchChange}
            />
            <div className="mt-4">
              <PermissionGroups
                groupedPermissions={groupedPermissions}
                selectedPermissions={selectedUserPermissions}
                onTogglePermission={onToggleUserPermission}
                onSetGroupPermissions={onSetGroupPermissions}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoleListItem({
  role,
  selected,
  onClick,
}: {
  role: RolePermissionDto;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left transition-colors ${
        selected ? "bg-primary text-primary-foreground" : "text-card-foreground hover:bg-muted"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{role.roleName}</span>
        <span className={`block text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {role.permissionNames.length} permissions
        </span>
      </span>
      {selected && <Check className="h-4 w-4 flex-shrink-0" />}
    </button>
  );
}

function UserListItem({
  user,
  selected,
  onClick,
}: {
  user: UserPermissionDto;
  selected: boolean;
  onClick: () => void;
}) {
  const name = userLabel(user);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors ${
        selected ? "bg-primary text-primary-foreground" : "text-card-foreground hover:bg-muted"
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
          selected ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {userInitials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className={`block truncate text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          {user.roleName} - {user.email}
        </span>
        <span className={`mt-1 block text-xs ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
          {user.permissionNames.length} directs, {user.scopedPermissions.length} cibles
        </span>
      </span>
      {selected && <Check className="h-4 w-4 flex-shrink-0" />}
    </button>
  );
}

function PanelHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-card-foreground">{title}</h2>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function SelectionHeader({
  title,
  subtitle,
  hasChanges,
  icon,
}: {
  title: string;
  subtitle: string;
  hasChanges: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-card-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {hasChanges && (
        <span className="inline-flex w-fit rounded-md bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
          Modifications non enregistrees
        </span>
      )}
    </div>
  );
}

function PermissionToolbar({
  value,
  selectedCount,
  onChange,
}: {
  value: string;
  selectedCount: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-sm">
        <SearchBox value={value} placeholder="Filtrer les permissions" onChange={onChange} />
      </div>
      <span className="inline-flex w-fit rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        {selectedCount} selectionnees
      </span>
    </div>
  );
}

function ScopedPermissionEditor({
  permissions,
  targetUsers,
  selectedScopedPermissions,
  newScopedPermission,
  newScopedTargetUserId,
  onNewScopedPermissionChange,
  onNewScopedTargetUserChange,
  onUseFeaturedScopedPermission,
  onAddScopedPermission,
  onRemoveScopedPermission,
}: {
  permissions: PermissionDto[];
  targetUsers: PermissionTargetUserDto[];
  selectedScopedPermissions: UserPermissionScopeDto[];
  newScopedPermission: string;
  newScopedTargetUserId: string;
  onNewScopedPermissionChange: (permissionName: string) => void;
  onNewScopedTargetUserChange: (userId: string) => void;
  onUseFeaturedScopedPermission: () => void;
  onAddScopedPermission: () => void;
  onRemoveScopedPermission: (scope: UserPermissionScopeDto) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card">
      <PanelHeader
        title="Permissions ciblees"
        subtitle="Limiter un droit a un agent ou utilisateur precis"
        icon={<Target className="h-4 w-4" />}
      />

      <div className="border-t border-border p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUseFeaturedScopedPermission}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Target className="h-4 w-4" />
            RDV autre agent
          </button>
          <span className="text-sm text-muted-foreground">
            Ajoute typiquement `{FEATURED_SCOPED_PERMISSION}` avec une cible.
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            value={newScopedPermission}
            onChange={(event) => onNewScopedPermissionChange(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="">Permission</option>
            {permissions.map((permission) => (
              <option key={permission.id} value={permission.name}>
                {permission.name}
              </option>
            ))}
          </select>

          <select
            value={newScopedTargetUserId}
            onChange={(event) => onNewScopedTargetUserChange(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="">Utilisateur cible</option>
            {targetUsers.map((user) => (
              <option key={user.userId} value={user.userId}>
                {userLabel(user)} - {user.roleName}
              </option>
            ))}
          </select>

          <Button type="button" onClick={onAddScopedPermission} disabled={!newScopedPermission || !newScopedTargetUserId}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border border-border">
          {selectedScopedPermissions.length === 0 ? (
            <EmptyState text="Aucune permission ciblee." />
          ) : (
            <div className="divide-y divide-border">
              {selectedScopedPermissions.map((scope) => (
                <div key={scopeKey(scope)} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-card-foreground">{scope.permissionName}</p>
                    <p className="text-xs text-muted-foreground">Permission</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {scope.scopeUserName ?? `Utilisateur ${scope.scopeUserId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Cible</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveScopedPermission(scope)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PermissionGroups({
  groupedPermissions,
  selectedPermissions,
  onTogglePermission,
  onSetGroupPermissions,
}: {
  groupedPermissions: Record<string, PermissionDto[]>;
  selectedPermissions: string[];
  onTogglePermission: (permissionName: string) => void;
  onSetGroupPermissions: (groupPermissions: PermissionDto[], enabled: boolean) => void;
}) {
  const groups = Object.entries(groupedPermissions);

  if (groups.length === 0) {
    return <EmptyState text="Aucune permission trouvee." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map(([group, groupPermissions]) => {
        const selectedCount = groupPermissions.filter((permission) =>
          selectedPermissions.includes(permission.name),
        ).length;
        const allSelected = selectedCount === groupPermissions.length;

        return (
          <div key={group} className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-card-foreground">{group}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCount}/{groupPermissions.length} selectionnees
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSetGroupPermissions(groupPermissions, !allSelected)}
              >
                {allSelected ? "Tout retirer" : "Tout cocher"}
              </Button>
            </div>

            <div className="divide-y divide-border">
              {groupPermissions.map((permission) => {
                const checked = selectedPermissions.includes(permission.name);

                return (
                  <button
                    key={permission.id}
                    type="button"
                    onClick={() => onTogglePermission(permission.name)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/70"
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-card-foreground">{permission.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
