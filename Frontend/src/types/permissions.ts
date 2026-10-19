// types/permissions.ts
export type Permission =
  // File Permissions
  | "Files.View"
  | "Files.ViewContent"
  | "Files.ViewDetails"
  | "Files.Upload"
  | "Files.Rename"
  | "Files.Delete"
  | "Files.Inject"
  | "Files.Download"
  | "Files.Export"
  | "Files.Share"
  | "Files.Archive"
  | "Files.Restore"
  // Supplier Permissions
  | "Suppliers.View"
  | "Suppliers.Create"
  | "Suppliers.Edit"
  | "Suppliers.Delete"
  | "Suppliers.AssignFiles"
  | "Suppliers.ViewContacts"
  | "Suppliers.ExportContacts"
  // Lead Type Permissions
  | "LeadTypes.View"
  | "LeadTypes.Create"
  | "LeadTypes.Edit"
  | "LeadTypes.Delete"
  | "LeadTypes.AssignSuppliers"
  // Country Permissions
  | "Countries.View"
  | "Countries.Create"
  | "Countries.Edit"
  | "Countries.Delete"
  // User Permissions
  | "Users.View"
  | "Users.Create"
  | "Users.Edit"
  | "Users.Delete"
  | "Users.AssignRoles"
  | "Users.AssignPermissions"
  | "Users.ResetPassword"
  | "Users.Impersonate"
  // Role Permissions
  | "Roles.View"
  | "Roles.Create"
  | "Roles.Edit"
  | "Roles.Delete"
  | "Roles.AssignPermissions"
  // Campaign Permissions
  | "Campaigns.View"
  | "Campaigns.Create"
  | "Campaigns.Edit"
  | "Campaigns.Delete"
  | "Campaigns.Launch"
  | "Campaigns.Pause"
  | "Campaigns.Stop"
  | "Campaigns.ViewResults"
  | "Campaigns.ExportResults"
  // Dashboard Permissions
  | "Dashboard.View"
  | "Dashboard.ViewAnalytics"
  | "Dashboard.ExportStats"
  | "Dashboard.Configure"
  // System Permissions
  | "System.ViewSettings"
  | "System.EditSettings"
  | "System.ViewLogs"
  | "System.ClearCache"
  | "System.Backup"
  | "System.Restore"
  // Audit & Reports
  | "Audit.View"
  | "Audit.Export"
  | "Audit.Delete"
  | "Reports.View"
  | "Reports.Create"
  | "Reports.Export"
  | "Reports.Schedule";

export const PERMISSIONS = {  // Note: ALL CAPS name
  Files: {
    View: "Files.View" as Permission,
    Upload: "Files.Upload" as Permission,
    Rename: "Files.Rename" as Permission,
    Delete: "Files.Delete" as Permission,
  }
} as const;