// Attributes/RequirePermissionAttribute.cs
using Microsoft.AspNetCore.Authorization;

namespace Backend.Attributes
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
    public class RequirePermissionAttribute : AuthorizeAttribute
    {
        public RequirePermissionAttribute(string permission)
        {
            Policy = $"Permission_{permission}";
            Permission = permission;
        }

        public string Permission { get; }
    }
}