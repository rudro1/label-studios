export const API_CONFIG = {
  gateway: `${window.APP_SETTINGS.hostname}/api`,
  endpoints: {
    // Users
    users: "/users",
    updateUser: "PATCH:/users/:pk",
    updateUserAvatar: "POST:/users/:pk/avatar",
    deleteUserAvatar: "DELETE:/users/:pk/avatar",
    me: "/current-user/whoami",
    hotkeys: "GET:/current-user/hotkeys/",
    updateHotkeys: "PATCH:/current-user/hotkeys/",

    // Organization
    memberships: "/organizations/:pk/memberships",
    userMemberships: "/organizations/:pk/memberships/:userPk",
    inviteLink: "/invite",
    resetInviteLink: "POST:/invite/reset-token",

    // FixStudio RBAC endpoints
    setMemberRole: "POST:/organizations/:pk/memberships/:userPk/role/",
    suspendMember: "POST:/organizations/:pk/memberships/:userPk/suspend/",
    unsuspendMember: "POST:/organizations/:pk/memberships/:userPk/unsuspend/",

    // Project
    projects: "/projects",
    project: "/projects/:pk",
    updateProject: "PATCH:/projects/:pk",
    createProject: "POST:/projects",
    deleteProject: "DELETE:/projects/:pk",
    projectResetCache: "POST:/projects/:pk/summary/reset",

    // Presigning
    presignUrlForTask: "/../tasks/:taskID/presign",
    presignUrlForProject: "/../projects/:projectId/presign",

    // Config and Import
    configTemplates: "/templates",
    validateConfig: "POST:/projects/:pk/validate",
    createSampleTask: "POST:/projects/:pk/sample-task",
    fileUploads: "/projects/:pk/file-uploads",
    deleteFileUploads: "DELETE:/projects/:pk/file-uploads",
    importFiles: "POST:/projects/:pk/import",
    reimportFiles: "POST:/projects/:pk/reimport",
    dataSummary: "/projects/:pk/summary",

    // DM
    deleteTabs: "DELETE:/dm/views/reset",

    // Storages
    listStorages: "/storages/:target?",
    storageTypes: "/storages/:target/types",
    storageForms: "/storages/:target/:type/form",
    createStorage: "POST:/storages/:target/:type",
    updateStorage: "PATCH:/storages/:target/:type/:pk",
    storageValidation: "POST:/storages/:target/:type/validate",
    storageExistingValidation: "POST:/storages/:target/:type/:pk/validate",
    syncStorage: "POST:/storages/:target/:type/:pk/sync",
    deleteStorage: "DELETE:/storages/:target/:type/:pk",

    // ML
    mlBackends: "/ml",
    addMLBackend: "POST:/ml",
    updateMLBackend: "PATCH:/ml/:pk",
    deleteMLBackend: "DELETE:/ml/:pk",
    trainMLBackend: "POST:/ml/:pk/train",
    predictWithML: "POST:/ml/:pk/predict?:query",
    predictionsForTask: "/predictions",
    mlBackendVersions: "GET:/ml/:pk/versions",
    mlBackendInteractive: "POST:/ml/:pk/interactive-annotating",

    // Webhooks
    webhooks: "/webhooks/",
    createWebhook: "POST:/webhooks/",
    webhooksInfo: "/webhooks/info",
    updateWebhook: "PATCH:/webhooks/:pk",
    deleteWebhook: "DELETE:/webhooks/:pk",
  },
};
