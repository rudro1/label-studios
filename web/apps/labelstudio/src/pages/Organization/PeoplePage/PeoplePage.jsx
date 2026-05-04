import { Button } from "@humansignal/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUpdatePageTitle } from "@humansignal/core";
import { HeidiTips } from "../../../components/HeidiTips/HeidiTips";
import { modal } from "../../../components/Modal/Modal";
import { Space } from "../../../components/Space/Space";
import { cn } from "../../../utils/bem";
import { FF_AUTH_TOKENS, FF_LSDV_E_297, isFF } from "../../../utils/feature-flags";
import "./PeopleInvitation.prefix.css";
import { PeopleList } from "./PeopleList";
import "./PeoplePage.prefix.css";
import { TokenSettingsModal } from "@humansignal/app-common/blocks/TokenSettingsModal";
import { IconPlus } from "@humansignal/icons";
import { useToast } from "@humansignal/ui";
import { InviteLink } from "./InviteLink";
import { SelectedUser } from "./SelectedUser";
import { useAPI } from "../../../providers/ApiProvider";

const normalizeListResponse = (response) => {
  if (Array.isArray(response)) return response;
  return response?.results ?? [];
};

const formatOrganizationLabel = (organization) => {
  if (!organization?.created_at) return "Created: not available";
  return `Created: ${new Date(organization.created_at).toLocaleDateString()}`;
};

const SuperAdminDashboard = ({ toast }) => {
  const api = useAPI();
  const [organizations, setOrganizations] = useState([]);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingOrgId, setWorkingOrgId] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const [orgResponse, maintenanceResponse] = await Promise.all([
        api.callApi("superadminOrganizations", {
          params: {
            page_size: 1000,
          },
        }),
        api.callApi("superAdminMaintenanceGet"),
      ]);

      setOrganizations(normalizeListResponse(orgResponse));
      setMaintenanceEnabled(Boolean(maintenanceResponse?.enabled));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const copyAdminInvite = useCallback(async () => {
    setInviteLoading(true);
    try {
      const response = await api.callApi("superAdminInvite");
      await navigator.clipboard.writeText(response.invite_url);
      toast.show({ message: "Admin invite link copied" });
    } catch (_error) {
      toast.show({ message: "Could not generate admin invite link" });
    } finally {
      setInviteLoading(false);
    }
  }, [api, toast]);

  const toggleMaintenance = useCallback(async () => {
    const nextState = !maintenanceEnabled;
    setRefreshing(true);
    try {
      const response = await api.callApi("superAdminMaintenanceSet", {
        body: {
          enabled: nextState,
        },
      });
      setMaintenanceEnabled(Boolean(response?.enabled ?? nextState));
      toast.show({ message: `Maintenance mode ${nextState ? "enabled" : "disabled"}` });
    } finally {
      setRefreshing(false);
    }
  }, [api, maintenanceEnabled, toast]);

  const toggleOrganization = useCallback(
    async (organization) => {
      const nextAction = organization.is_suspended ? "unsuspend" : "suspend";
      setWorkingOrgId(organization.id);
      try {
        const response = await api.callApi("superadminOrganizationSuspend", {
          params: { pk: organization.id },
          body: { action: nextAction },
        });
        setOrganizations((current) =>
          current.map((item) =>
            item.id === organization.id
              ? { ...item, is_suspended: response?.status === "suspended" ? true : false }
              : item,
          ),
        );
        toast.show({ message: `Organization ${nextAction === "suspend" ? "suspended" : "unsuspended"}` });
      } finally {
        setWorkingOrgId(null);
      }
    },
    [api, toast],
  );

  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 16,
        padding: 20,
        border: "1px solid #E2E8F0",
        borderRadius: 16,
        background: "#FFFFFF",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <Space spread>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Platform Controls</h3>
          <div style={{ color: "#64748B", marginTop: 4 }}>Global maintenance and organization safeguards.</div>
        </div>
        <Button look="outlined" onClick={loadDashboard} waiting={refreshing} aria-label="Refresh super admin dashboard">
          Refresh
        </Button>
      </Space>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        <div
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 16,
            background: maintenanceEnabled ? "#FFF7ED" : "#F8FAFC",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
            Maintenance Mode
          </div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: maintenanceEnabled ? "#C2410C" : "#0F172A" }}>
            {maintenanceEnabled ? "Enabled" : "Disabled"}
          </div>
          <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
            {maintenanceEnabled
              ? "Annotators and reviewers are blocked while maintenance is on."
              : "The platform is currently available for normal use."}
          </div>
          <Button
            look={maintenanceEnabled ? "primary" : "danger"}
            onClick={toggleMaintenance}
            waiting={refreshing}
            style={{ marginTop: 12 }}
          >
            {maintenanceEnabled ? "Disable Maintenance" : "Enable Maintenance"}
          </Button>
        </div>

        <div
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 16,
            background: "#F8FAFC",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
            Admin Invite
          </div>
          <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
            Generate a new admin invite URL for onboarding platform administrators.
          </div>
          <Button look="outlined" onClick={copyAdminInvite} waiting={inviteLoading} style={{ marginTop: 12 }}>
            Copy Admin Invite
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Organizations</div>
        {loading ? (
          <div style={{ color: "#64748B" }}>Loading organizations…</div>
        ) : organizations.length === 0 ? (
          <div style={{ color: "#64748B" }}>No organizations found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {organizations.map((organization) => (
              <div
                key={organization.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: 14,
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  background: organization.is_suspended ? "#FEF2F2" : "#FFFFFF",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{organization.title}</div>
                  <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                    Org ID: {organization.id} · {formatOrganizationLabel(organization)}
                  </div>
                  {organization.contact_info && (
                    <div style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>{organization.contact_info}</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: organization.is_suspended ? "#B91C1C" : "#047857",
                    }}
                  >
                    {organization.is_suspended ? "Suspended" : "Active"}
                  </span>
                  <Button
                    look={organization.is_suspended ? "primary" : "danger"}
                    onClick={() => toggleOrganization(organization)}
                    waiting={workingOrgId === organization.id}
                  >
                    {organization.is_suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PeoplePage = () => {
  const apiSettingsModal = useRef();
  const toast = useToast();
  const [selectedUser, setSelectedUser] = useState(null);
  const [invitationOpen, setInvitationOpen] = useState(false);

  useUpdatePageTitle("People");

  const selectUser = useCallback(
    (user) => {
      setSelectedUser(user);

      localStorage.setItem("selectedUser", user?.id);
    },
    [setSelectedUser],
  );

  const apiTokensSettingsModalProps = useMemo(
    () => ({
      title: "API Token Settings",
      style: { width: 480 },
      body: () => (
        <TokenSettingsModal
          onSaved={() => {
            toast.show({ message: "API Token settings saved" });
            apiSettingsModal.current?.close();
          }}
        />
      ),
    }),
    [],
  );

  const showApiTokenSettingsModal = useCallback(() => {
    apiSettingsModal.current = modal(apiTokensSettingsModalProps);
    __lsa("organization.token_settings");
  }, [apiTokensSettingsModalProps]);

  const defaultSelected = useMemo(() => {
    return localStorage.getItem("selectedUser");
  }, []);

  return (
    <div className={cn("people").toClassName()}>
      <div className={cn("people").elem("controls").toClassName()}>
        <Space spread>
          <Space>{window.APP_SETTINGS?.user?.is_superuser && <h2 style={{ margin: 0 }}>Super Admin Dashboard</h2>}</Space>

          <Space>
            {!window.APP_SETTINGS?.user?.is_superuser && isFF(FF_AUTH_TOKENS) && (
              <Button look="outlined" onClick={showApiTokenSettingsModal} aria-label="Show API token settings">
                API Tokens Settings
              </Button>
            )}
            {!window.APP_SETTINGS?.user?.is_superuser && (
              <Button
                leading={<IconPlus className="!h-4" />}
                onClick={() => setInvitationOpen(true)}
                aria-label="Invite new member"
              >
                Add Members
              </Button>
            )}
          </Space>
        </Space>
        {window.APP_SETTINGS?.user?.is_superuser && <SuperAdminDashboard toast={toast} />}
      </div>
      <div className={cn("people").elem("content").toClassName()}>
        <PeopleList
          selectedUser={selectedUser}
          defaultSelected={defaultSelected}
          onSelect={(user) => selectUser(user)}
        />

        {selectedUser ? (
          <SelectedUser user={selectedUser} onClose={() => selectUser(null)} />
        ) : (
          isFF(FF_LSDV_E_297) && <HeidiTips collection="organizationPage" />
        )}
      </div>
      <InviteLink
        opened={invitationOpen}
        onClosed={() => {
          console.log("hidden");
          setInvitationOpen(false);
        }}
      />
    </div>
  );
};

PeoplePage.title = "People";
PeoplePage.path = "/";
