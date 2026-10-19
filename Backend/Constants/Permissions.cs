// Constants/Permissions.cs
namespace Backend.Constants
{
    public static class Permissions
    {
        // ========== FILE PERMISSIONS ==========
        public static class Files
        {
            public const string View = "Files.View";
            public const string ViewContent = "Files.ViewContent";
            public const string ViewDetails = "Files.ViewDetails";
            public const string Upload = "Files.Upload";
            public const string Rename = "Files.Rename";
            public const string Delete = "Files.Delete";
            public const string Inject = "Files.Inject";
            public const string Download = "Files.Download";
            public const string Export = "Files.Export";
            public const string Share = "Files.Share";
            public const string Archive = "Files.Archive";
            public const string Restore = "Files.Restore";
            public const string Search = "Files.Search";
            public const string Validate = "Files.Validate";
        }

        // ========== SUPPLIER PERMISSIONS ==========
        public static class Suppliers
        {
            public const string View = "Suppliers.View";
            public const string Create = "Suppliers.Create";
            public const string Edit = "Suppliers.Edit";
            public const string Delete = "Suppliers.Delete";
            public const string AssignFiles = "Suppliers.AssignFiles";
            public const string ViewContacts = "Suppliers.ViewContacts";
            public const string ExportContacts = "Suppliers.ExportContacts";
        }

        // ========== LEAD TYPE PERMISSIONS ==========
        public static class LeadTypes
        {
            public const string View = "LeadTypes.View";
            public const string Create = "LeadTypes.Create";
            public const string Edit = "LeadTypes.Edit";
            public const string Delete = "LeadTypes.Delete";
            public const string AssignSuppliers = "LeadTypes.AssignSuppliers";
        }

        // ====================== AGENTS ======================
        public static class Agents
        {
            public const string View = "Agents.View";
            public const string ViewAll = "Agents.ViewAll";
            public const string ViewOtherAgendas = "Agents.ViewOtherAgendas";
            public const string Manage = "Agents.Manage";
            public const string ViewPerformance = "Agents.ViewPerformance";
            public const string ViewPointage = "Agents.ViewPointage";
            public const string Evaluate = "Agents.Evaluate";
        }

        // ====================== APPOINTMENTS ======================
        public static class Appointments
        {
            public const string View = "Appointments.View";
            public const string ViewOwn = "Appointments.ViewOwn";
            public const string ViewTeam = "Appointments.ViewTeam";
            public const string Manage = "Appointments.Manage";
            public const string Confirm = "Appointments.Confirm";
            public const string Assign = "Appointments.Assign";
        }

        // ====================== STATISTICS ======================
        public static class Statistics
        {
            public const string ViewGlobal = "Statistics.ViewGlobal";
            public const string ViewPersonal = "Statistics.ViewPersonal";
            public const string ViewTeam = "Statistics.ViewTeam";
        }

        // ====================== CONTACTS ======================
        public static class Contacts
        {
            public const string View = "Contacts.View";
            public const string Create = "Contacts.Create";
            public const string Qualify = "Contacts.Qualify";
            public const string Update = "Contacts.Update";
            public const string ViewHistory = "Contacts.ViewHistory";
        }

        // ========== COUNTRY PERMISSIONS ==========
        public static class Countries
        {
            public const string View = "Countries.View";
            public const string Create = "Countries.Create";
            public const string Edit = "Countries.Edit";
            public const string Delete = "Countries.Delete";
        }

        // ========== USER MANAGEMENT ==========
        public static class Users
        {
            public const string View = "Users.View";
            public const string Create = "Users.Create";
            public const string Edit = "Users.Edit";
            public const string Delete = "Users.Delete";
            public const string AssignRoles = "Users.AssignRoles";
            public const string AssignPermissions = "Users.AssignPermissions";
            public const string ResetPassword = "Users.ResetPassword";
            public const string Impersonate = "Users.Impersonate";
        }

        // ========== ROLE MANAGEMENT ==========
        public static class Roles
        {
            public const string View = "Roles.View";
            public const string Create = "Roles.Create";
            public const string Edit = "Roles.Edit";
            public const string Delete = "Roles.Delete";
            public const string AssignPermissions = "Roles.AssignPermissions";
        }

        // ========== CAMPAIGN PERMISSIONS ==========
        public static class Campaigns
        {
            public const string View = "Campaigns.View";
            public const string Create = "Campaigns.Create";
            public const string Edit = "Campaigns.Edit";
            public const string Delete = "Campaigns.Delete";
            public const string Launch = "Campaigns.Launch";
            public const string Pause = "Campaigns.Pause";
            public const string Stop = "Campaigns.Stop";
            public const string ViewResults = "Campaigns.ViewResults";
            public const string ExportResults = "Campaigns.ExportResults";
        }

        // ========== DASHBOARD PERMISSIONS ==========
        public static class Dashboard
        {
            public const string View = "Dashboard.View";
            public const string ViewAnalytics = "Dashboard.ViewAnalytics";
            public const string ExportStats = "Dashboard.ExportStats";
            public const string Configure = "Dashboard.Configure";
        }

        // ========== SYSTEM PERMISSIONS ==========
        public static class System
        {
            public const string ViewSettings = "System.ViewSettings";
            public const string EditSettings = "System.EditSettings";
            public const string ViewLogs = "System.ViewLogs";
            public const string ClearCache = "System.ClearCache";
            public const string Backup = "System.Backup";
            public const string Restore = "System.Restore";
        }

        // ========== CLIENT PERMISSIONS ==========
        public static class Clients
        {
            public const string View = "Clients.View";
            public const string Create = "Clients.Create";
            public const string Edit = "Clients.Edit";
            public const string Delete = "Clients.Delete";
        }

        // ========== LEGACY FLAT CONSTANTS (backward compat) ==========
        public const string AdminDashboard = "Admin.Dashboard";
        public const string AdminUsersView = "Admin.Users.View";
        public const string AdminUsersCreate = "Admin.Users.Create";
        public const string AdminUsersEdit = "Admin.Users.Edit";
        public const string AdminUsersDelete = "Admin.Users.Delete";
        public const string AdminPointage = "Admin.Pointage";
        public const string AdminScorecards = "Admin.Scorecards";
        public const string AdminAnalytics = "Admin.Analytics";
        public const string AdminMap = "Admin.Map";
        public const string AdminIAConfig = "Admin.IAConfig";
        public const string AdminImportLeads = "Admin.ImportLeads";
        public const string AgentDashboard = "Agent.Dashboard";
        public const string AgentAppel = "Agent.Appel";
        public const string AgentContacts = "Agent.Contacts";
        public const string AgentHistorique = "Agent.Historique";
        public const string AgentPerformance = "Agent.Performance";
        public const string AgentAgenda = "Agent.Agenda";
        public const string Confirmation1View = "Confirmation1.View";
        public const string Confirmation1Edit = "Confirmation1.Edit";
        public const string Confirmation2View = "Confirmation2.View";
        public const string Confirmation2Edit = "Confirmation2.Edit";
        public const string ConfirmationClientView = "ConfirmationClient.View";
        public const string ConfirmationClientEdit = "ConfirmationClient.Edit";
        public const string ConfirmationClientAgenda = "ConfirmationClient.Agenda";
        public const string ConfirmationClientCommercials = "ConfirmationClient.Commercials";
        public const string ConfirmationClientAssign = "ConfirmationClient.Assign";
        public const string ConfirmationClientBankComment = "ConfirmationClient.BankComment";

        // =========================
        // GROUPES DE PERMISSIONS
        // =========================
        public static readonly Dictionary<string, string[]> RolePermissions = new()
        {
            ["ADMIN"] = new[] {
                AdminDashboard, AdminUsersView, AdminUsersCreate, AdminUsersEdit, AdminUsersDelete,
                AdminPointage, AdminScorecards, AdminAnalytics, AdminMap, AdminIAConfig, AdminImportLeads,
                Files.View, Files.Upload, Files.Inject, Files.Delete, Files.Rename,
                Campaigns.View, Campaigns.Create, Campaigns.Edit, Campaigns.Delete,
                Suppliers.View, Suppliers.Create, Countries.View, LeadTypes.View,
                Users.View, Users.Create, Users.Edit
            },
            ["AGENT"] = new[] {
                AgentDashboard, AgentAppel, AgentContacts, AgentHistorique, AgentPerformance, AgentAgenda,
                Agents.View
            },
            ["CONF1"] = new[] {
                Confirmation1View, Confirmation1Edit
            },
            ["CONF2"] = new[] {
                Confirmation2View, Confirmation2Edit
            },
            ["CONFCLIENT"] = new[] {
                ConfirmationClientView, ConfirmationClientEdit
            },
            ["SuperAdmin"] = new[] {
                AdminDashboard, AdminUsersView, AdminUsersCreate, AdminUsersEdit, AdminUsersDelete,
                AdminPointage, AdminScorecards, AdminAnalytics, AdminMap, AdminIAConfig, AdminImportLeads,
                Files.View, Files.Upload, Files.Inject, Files.Delete, Files.Rename,
                Campaigns.View, Campaigns.Create, Campaigns.Edit, Campaigns.Delete,
                Suppliers.View, Suppliers.Create, Countries.View, LeadTypes.View,
                Users.View, Users.Create, Users.Edit, Roles.AssignPermissions, Users.AssignPermissions
            }
        };
    }
}
