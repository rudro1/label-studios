import { formatDistance } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Userpic } from "@humansignal/ui";
import { Pagination, Spinner } from "../../../components";
import { usePage, usePageSize } from "../../../components/Pagination/Pagination";
import { useAPI } from "../../../providers/ApiProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/helpers";
import "./PeopleList.prefix.css";
import { CopyableTooltip } from "../../../components/CopyableTooltip/CopyableTooltip";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

export const PeopleList = ({ onSelect, selectedUser, defaultSelected }) => {
  const api = useAPI();
  const currentUserId = window.APP_SETTINGS?.user?.id || null;
  const isSuperUser = window.APP_SETTINGS?.user?.is_superuser;
  const currentOrganizationId = window.APP_SETTINGS?.user?.active_organization;
  const [usersList, setUsersList] = useState();
  const [currentPage] = usePage("page", 1);
  const [currentPageSize] = usePageSize("page_size", 30);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedAdminId, setExpandedAdminId] = useState(null);
  const [adminDetailById, setAdminDetailById] = useState({});

  const toSelectedUser = useCallback((member) => {
    if (!member?.user) return member;
    return {
      ...member.user,
      role: member.role,
      is_suspended: member.is_suspended,
      membership_id: member.id,
    };
  }, []);

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === `${name}=`) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const fetchUsers = useCallback(
    async (page, pageSize) => {
      if (isSuperUser) {
        const response = await fetch("/api/super-admin/admins/", {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          setUsersList(data);
          setTotalItems(data.length);
        }
      } else {
        const response = await api.callApi("memberships", {
          params: {
            pk: currentOrganizationId,
            contributed_to_projects: 1,
            page,
            page_size: pageSize,
          },
        });

        if (response.results) {
          setUsersList(response.results);
          setTotalItems(response.count);
        }
      }
    },
    [api, isSuperUser, currentOrganizationId],
  );

  const selectUser = useCallback(
    (user) => {
      if (isSuperUser) return;
      const nextUser = user?.user ? toSelectedUser(user) : user;
      if (selectedUser?.id === nextUser.id) {
        onSelect?.(null);
      } else {
        onSelect?.(nextUser);
      }
    },
    [selectedUser, isSuperUser, toSelectedUser],
  );

  const toggleAdminDetail = useCallback(
    async (admin) => {
      if (expandedAdminId === admin.id) {
        setExpandedAdminId(null);
        return;
      }
      setExpandedAdminId(admin.id);
      if (adminDetailById[admin.id]) return;
      try {
        const response = await fetch(`/api/super-admin/admins/${admin.id}/detail/`, {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          setAdminDetailById((prev) => ({ ...prev, [admin.id]: data }));
        }
      } catch (err) {
        console.error("admin detail fetch failed", err);
      }
    },
    [expandedAdminId, adminDetailById],
  );

  const removeUser = useCallback(
    async (user, e) => {
      e.stopPropagation();
      if (!window.confirm(`Permanently delete ${user.email} and all of this user's data?`)) return;
      const response = await fetch(`/api/organizations/${currentOrganizationId}/memberships/${user.id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
      });
      if (response.ok) {
        setUsersList((prev) => prev.filter(({ user: u }) => u.id !== user.id));
        setTotalItems((prev) => prev - 1);
        if (selectedUser?.id === user.id) onSelect?.(null);
      }
    },
    [selectedUser, currentOrganizationId],
  );

  const suspendMember = useCallback(
    async (member, e) => {
      e.stopPropagation();
      const userObj = member.user;
      const verb = member.is_suspended ? "unsuspend" : "suspend";
      if (!window.confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${userObj.email}?`)) return;
      const response = await fetch(
        `/api/organizations/${currentOrganizationId}/memberships/${userObj.id}/suspend/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setUsersList((prev) =>
          prev.map((row) =>
            row.user && row.user.id === userObj.id ? { ...row, is_suspended: data.is_suspended } : row,
          ),
        );
      }
    },
    [currentOrganizationId],
  );

  const suspendAdmin = useCallback(async (admin, e) => {
    e.stopPropagation();
    if (
      !window.confirm(`Are you sure you want to ${admin.is_suspended ? "unsuspend" : "suspend"} admin ${admin.email}?`)
    )
      return;
    const response = await fetch(`/api/super-admin/admins/${admin.id}/suspend/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
    });
    if (response.ok) {
      const data = await response.json();
      setUsersList((prev) => prev.map((u) => (u.id === admin.id ? { ...u, is_suspended: data.is_suspended } : u)));
    }
  }, []);

  const deleteAdmin = useCallback(async (admin, e) => {
    e.stopPropagation();
    if (!window.confirm(`DANGER: Are you sure you want to permanently DELETE admin ${admin.email} and ALL their data?`))
      return;
    const response = await fetch(`/api/super-admin/admins/${admin.id}/`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
    });
    if (response.ok) {
      setUsersList((prev) => prev.filter((u) => u.id !== admin.id));
      setTotalItems((prev) => prev - 1);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, currentPageSize);
  }, [fetchUsers, currentPage, currentPageSize]);

  useEffect(() => {
    if (isDefined(defaultSelected) && usersList && !isSuperUser) {
      const selected = usersList.find(({ user }) => user && user.id === Number(defaultSelected));

      if (selected) selectUser(selected);
    }
  }, [usersList, defaultSelected, isSuperUser, selectUser]);

  return (
    <>
      <div className={cn("people-list").toClassName()}>
        <div className={cn("people-list").elem("wrapper").toClassName()}>
          {usersList ? (
            <div className={cn("people-list").elem("users").toClassName()}>
              <div className={cn("people-list").elem("header").toClassName()}>
                <div className={cn("people-list").elem("column").mix("avatar").toClassName()} />
                <div className={cn("people-list").elem("column").mix("email").toClassName()}>Email</div>
                <div className={cn("people-list").elem("column").mix("name").toClassName()}>Name</div>
                {isSuperUser ? (
                  <>
                    <div className={cn("people-list").elem("column").mix("last-activity").toClassName()}>Members</div>
                    <div className={cn("people-list").elem("column").mix("last-activity").toClassName()}>Storage</div>
                    <div className={cn("people-list").elem("column").mix("last-activity").toClassName()}>Status</div>
                  </>
                ) : (
                  <div className={cn("people-list").elem("column").mix("last-activity").toClassName()}>
                    Last Activity
                  </div>
                )}
                {!isSuperUser && <div className={cn("people-list").elem("column").mix("role").toClassName()}>Role</div>}
                <div className={cn("people-list").elem("column").mix("action").toClassName()}>Action</div>
              </div>
              <div className={cn("people-list").elem("body").toClassName()}>
                {usersList.map((item) => {
                  const user = isSuperUser ? item : item.user;
                  if (!user) return null;

                  const active = user.id === selectedUser?.id;
                  const isSelf = currentUserId && user.id === currentUserId;

                  const expanded = isSuperUser && expandedAdminId === user.id;
                  const detail = isSuperUser ? adminDetailById[user.id] : null;

                  return (
                    <div key={`user-${user.id}`}>
                    <div
                      className={cn("people-list").elem("user").mod({ active }).toClassName()}
                      onClick={() => (isSuperUser ? toggleAdminDetail(user) : selectUser(item))}
                      style={isSuperUser ? { cursor: "pointer" } : undefined}
                    >
                      <div className={cn("people-list").elem("field").mix("avatar").toClassName()}>
                        <CopyableTooltip title={`User ID: ${user.id}`} textForCopy={user.id}>
                          <Userpic user={user} style={{ width: 28, height: 28 }} />
                        </CopyableTooltip>
                      </div>
                      <div className={cn("people-list").elem("field").mix("email").toClassName()}>{user.email}</div>
                      <div className={cn("people-list").elem("field").mix("name").toClassName()}>
                        {user.first_name} {user.last_name}
                      </div>

                      {isSuperUser ? (
                        <>
                          <div className={cn("people-list").elem("field").mix("last-activity").toClassName()}>
                            {item.total_members} users
                          </div>
                          <div className={cn("people-list").elem("field").mix("last-activity").toClassName()}>
                            {formatBytes(item.storage_bytes)}
                          </div>
                          <div className={cn("people-list").elem("field").mix("last-activity").toClassName()}>
                            {item.is_suspended ? (
                              <span style={{ color: "#DC2626", fontWeight: "bold" }}>Suspended</span>
                            ) : (
                              <span style={{ color: "#059669", fontWeight: "bold" }}>Active</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className={cn("people-list").elem("field").mix("last-activity").toClassName()}>
                          {user.last_activity
                            ? formatDistance(new Date(user.last_activity), new Date(), { addSuffix: true })
                            : "Never"}
                        </div>
                      )}

                      {!isSuperUser && (
                        <div className={cn("people-list").elem("field").mix("role").toClassName()}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              color: item.role === "reviewer" ? "#7C3AED" : "#2563EB",
                            }}
                          >
                            {item.role}
                            {item.is_suspended && <span style={{ marginLeft: 6, color: "#DC2626" }}>SUSPENDED</span>}
                          </span>
                        </div>
                      )}

                      <div className={cn("people-list").elem("field").mix("action").toClassName()}>
                        {!isSelf && isSuperUser && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={(e) => suspendAdmin(item, e)}
                              style={{
                                background: item.is_suspended ? "#ECFDF5" : "#FFFBEB",
                                color: item.is_suspended ? "#059669" : "#D97706",
                                border: `1px solid ${item.is_suspended ? "#10B981" : "#F59E0B"}`,
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              {item.is_suspended ? "Unsuspend" : "Suspend"}
                            </button>
                            <button
                              onClick={(e) => deleteAdmin(item, e)}
                              style={{
                                background: "#FEE2E2",
                                color: "#991B1B",
                                border: "1px solid #EF4444",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {!isSelf && !isSuperUser && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={(e) => suspendMember(item, e)}
                              style={{
                                background: item.is_suspended ? "#ECFDF5" : "#FFFBEB",
                                color: item.is_suspended ? "#059669" : "#D97706",
                                border: `1px solid ${item.is_suspended ? "#10B981" : "#F59E0B"}`,
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              {item.is_suspended ? "Unsuspend" : "Suspend"}
                            </button>
                            <button
                              onClick={(e) => removeUser(user, e)}
                              style={{
                                background: "#FEE2E2",
                                color: "#991B1B",
                                border: "1px solid #EF4444",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {expanded && (
                      <div
                        style={{
                          padding: "16px 24px",
                          background: "#F8FAFC",
                          borderTop: "1px solid #E2E8F0",
                          borderBottom: "1px solid #E2E8F0",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                            TEAM MEMBERS ({detail?.members?.length ?? "…"})
                          </div>
                          {!detail && <div style={{ color: "#94A3B8", fontSize: 13 }}>Loading…</div>}
                          {detail?.members?.length === 0 && (
                            <div style={{ color: "#94A3B8", fontSize: 13 }}>No team members yet.</div>
                          )}
                          {detail?.members?.map((m) => (
                            <div
                              key={m.id}
                              style={{ fontSize: 13, padding: "4px 0", display: "flex", justifyContent: "space-between" }}
                            >
                              <span>
                                {m.email}
                                {m.is_owner && (
                                  <span style={{ marginLeft: 6, color: "#6366F1", fontWeight: 700 }}>(owner)</span>
                                )}
                              </span>
                              <span style={{ color: "#64748B", textTransform: "uppercase", fontSize: 11, fontWeight: 700 }}>
                                {m.role}
                                {m.is_suspended && <span style={{ marginLeft: 6, color: "#DC2626" }}>SUSPENDED</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                            PROJECTS ({detail?.projects?.length ?? "…"}) · TOTAL{" "}
                            {detail ? formatBytes(detail.organization.storage_bytes) : "…"}
                          </div>
                          {!detail && <div style={{ color: "#94A3B8", fontSize: 13 }}>Loading…</div>}
                          {detail?.projects?.length === 0 && (
                            <div style={{ color: "#94A3B8", fontSize: 13 }}>No projects yet.</div>
                          )}
                          {detail?.projects?.map((p) => (
                            <div
                              key={p.id}
                              style={{ fontSize: 13, padding: "4px 0", display: "flex", justifyContent: "space-between" }}
                            >
                              <span>{p.title}</span>
                              <span style={{ color: "#64748B", fontSize: 12 }}>
                                {p.task_count} tasks · {formatBytes(p.storage_bytes)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={cn("people-list").elem("loading").toClassName()}>
              <Spinner size={36} />
            </div>
          )}
        </div>
        <Pagination
          page={currentPage}
          urlParamName="page"
          totalItems={totalItems}
          pageSize={currentPageSize}
          pageSizeOptions={[30, 50, 100]}
          onPageLoad={fetchUsers}
          style={{ paddingTop: 16 }}
        />
      </div>
    </>
  );
};
