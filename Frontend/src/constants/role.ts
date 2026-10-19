export const Roles = {
    SuperAdmin : 8,
    Admin : 1,
    Service_Confirmatrice_1 :3,
    Service_Confirmatrice_2 :4,
    Service_Technique :7,
    Agent : 2,
    Service_Qualite : 5,
} as const;

export type RoleId = typeof Roles[keyof typeof Roles];

//where each role lands after login 
export const Role_Home: Record<RoleId ,string> = {
    [Roles.SuperAdmin]: '/admin/dashboard',
    [Roles.Admin]: '/admin/dashboard',
    [Roles.Service_Confirmatrice_1]: '/confirmation/dashboard',
    [Roles.Service_Confirmatrice_2]: '/confirmation/dashboard',
    [Roles.Service_Technique]: '/tech/dashboard',
    [Roles.Agent]: '/agent/dashboard',
    [Roles.Service_Qualite]: '/quality/dashboard',
};

