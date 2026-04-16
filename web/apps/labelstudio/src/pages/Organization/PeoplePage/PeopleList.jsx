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

export const PeopleList = ({ onSelect, selectedUser, defaultSelected }) => {
  const api = useAPI();
  const currentUserId = window.APP_SETTINGS?.user?.id || null;
  // FixStudio: viewer's role drives whether action controls render
  const viewerRole = window.APP_SETTINGS?.user?.role || null;
  const viewerIsAdmin = viewerRole === "owner" || viewerRole === "admin";
  const [usersList, setUsersList] = useState();
  const [currentPage] = usePage("page", 1);
  const [currentPageSize] = usePageSize("page_size", 30);
  const [totalItems, setTotalItems] = useState(0);

  const fetchUsers = useCallback(async (page, pageSize) => {
    const response = await api.callApi("memberships", {
      params: {
        pk: 1,
        contributed_to_projects: 1,
        page,
        page_size: pageSize,
      },
    });

    if (response.results) {
      setUsersList(response.results);
      setTotalItems(response.count);
    }
  }, []);

  const selectUser = useCallback(
    (user) => {
      if (selectedUser?.id === user.id) {
        onSelect?.(null);
      } else {
        onSelect?.(user);
      }
    },
    [selectedUser],
  );

  const removeUser = useCallback(
    async (user, e) => {
      e.stopPropagation();
      if (!window.confirm(`Remove ${user.email} from organization?`)) return;
      const response = await api.callApi("userMemberships", {
        params: { pk: 1, userPk: user.id },
        method: "DELETE",
      });
      if (response !== null && response !== undefined) {
        setUsersList((prev) => prev.filter(({ user: u }) => u.id !== user.id));
        setTotalItems((prev) => prev - 1);
        if (selectedUser?.id === user.id) onSelect?.(null);
      }
    },
    [selectedUser],
  );

  // FixStudio: helper to patch a single membership row in state
  const patchMember = useCallback((userId, patch) => {
    setUsersList((prev) =>
      (prev || []).map((row) => (row.user.id === userId ? { ...row, ...patch } : row)),
    );
  }, []);

  // FixStudio: change a member's role (admin/reviewer/annotator)
  const changeRole = useCallback(
    async (member, newRole, e) => {
      e.stopPropagation();
      if (!viewerIsAdmin || member.user.id === currentUserId || member.role === newRole) return;
      const resp = await api.callApi("setMemberRole", {
        params: { pk: 1, userPk: member.user.id },
        body: { role: newRole },
      });
      if (resp && !resp.error && resp.role) {
        patchMember(member.user.id, { role: resp.role });
      }
    },
    [api, viewerIsAdmin, currentUserId, patchMember],
  );

  // FixStudio: suspend a member
  const suspendMember = useCallback(
    async (member, e) => {
      e.stopPropagation();
      if (!viewerIsAdmin || member.user.id === currentUserId) return;
      const reason = window.prompt(
        `Suspend ${member.user.email}?\nOptional: enter a reason (visible to admins).`,
        "",
      );
      if (reason === null) return; // user cancelled
      const resp = await api.callApi("suspendMember", {
        params: { pk: 1, userPk: member.user.id },
        body: { reason: reason || "" },
      });
      if (resp && !resp.error) {
        patchMember(member.user.id, {
          is_suspended: true,
          suspended_at: resp.suspended_at,
          suspension_reason: resp.suspension_reason,
        });
      }
    },
    [api, viewerIsAdmin, currentUserId, patchMember],
  );

  // FixStudio: unsuspend a member
  const unsuspendMember = useCallback(
    async (member, e) => {
      e.stopPropagation();
      if (!viewerIsAdmin) return;
      const resp = await api.callApi("unsuspendMember", {
        params: { pk: 1, userPk: member.user.id },
      });
      if (resp && !resp.error) {
        patchMember(member.user.id, {
          is_suspended: false,
          suspended_at: null,
          suspension_reason: "",
        });
      }
    },
    [api, viewerIsAdmin, patchMember],
  );

  useEffect(() => {
    fetchUsers(currentPage, currentPageSize);
  }, []);

  useEffect(() => {
    if (isDefined(defaultSelected) && usersList) {
      const selected = usersList.find(({ user }) => user.id === Number(defaultSelected));

      if (selected) selectUser(selected.user);
    }
  }, [usersList, defaultSelected]);

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
                <div className={cn("people-list").elem("column").mix("role").toClassName()}>Role</div>
                <div className={cn("people-list").elem("column").mix("last-activity").toClassName()}>Last Activity</div>
                <div className={cn("people-list").elem("column").mix("action").toClassName()}>Action</div>
              </div>
              <div className={cn("people-list").elem("body").toClassName()}>
                {usersList.map((member) => {
                  const { user } = member;
                  const active = user.id === selectedUser?.id;
                  const isSelf = currentUserId && user.id === currentUserId;
                  // FixStudio: lock owner row & self row from any RBAC mutation
                  const lockedRow = member.is_owner || isSelf;

                  return (
                    <div
                      key={`user-${user.id}`}
                      className={cn("people-list")
                        .elem("user")
                        .mod({ active, suspended: !!member.is_suspended })
                        .toClassName()}
                      onClick={() => selectUser(user)}
                    >
                      <div className={cn("people-list").elem("field").mix("avatar").toClassName()}>
                        <CopyableTooltip title={`User ID: ${user.id}`} textForCopy={user.id}>
                          <Userpic user={user} style={{ width: 28, height: 28 }} />
                        </CopyableTooltip>
                      </div>
                      <div className={cn("people-list").elem("field").mix("email").toClassName()}>{user.email}</div>
                      <div className={cn("people-list").elem("field").mix("name").toClassName()}>
                        {user.first_name} {user.last_name}
                        {member.is_suspended && (
                          <span className={cn("people-list").elem("suspended-tag").toClassName()}>Suspended</span>
                        )}
                      </div>
                      <div className={cn("people-list").elem("field").mix("role").toClassName()}>
                        {member.role && (
                          <span
                            className={cn("people-list")
                              .elem("role-badge")
                              .mod({ [member.role]: true })
                              .toClassName()}
                          >
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        )}
                      </div>
                      <div className={cn("people-list").elem("field").mix("last-activity").toClassName()}>
                        {user.last_activity
                          ? formatDistance(new Date(user.last_activity), new Date(), { addSuffix: true })
                          : "—"}
                      </div>
                      <div
                        className={cn("people-list").elem("field").mix("action").toClassName()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* FixStudio: role select (admin-only, locked row read-only) */}
                        {viewerIsAdmin && !lockedRow && !member.is_suspended && (
                          <select
                            className={cn("people-list").elem("role-select").toClassName()}
                            value={member.role || "annotator"}
                            onChange={(e) => changeRole(member, e.target.value, e)}
                            title="Change role"
                          >
                            <option value="admin">Admin</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="annotator">Annotator</option>
                          </select>
                        )}

                        {/* FixStudio: suspend / unsuspend (admin-only, locked row hidden) */}
                        {viewerIsAdmin && !lockedRow && (
                          member.is_suspended ? (
                            <button
                              onClick={(e) => unsuspendMember(member, e)}
                              className={cn("people-list").elem("btn").mod({ unsuspend: true }).toClassName()}
                            >
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={(e) => suspendMember(member, e)}
                              className={cn("people-list").elem("btn").mod({ suspend: true }).toClassName()}
                            >
                              Suspend
                            </button>
                          )
                        )}

                        {/* Existing Remove button preserved */}
                        {!isSelf && !member.is_owner && (
                          <button
                            onClick={(e) => removeUser(user, e)}
                            className={cn("people-list").elem("btn").mod({ remove: true }).toClassName()}
                          >
                            Remove
                          </button>
                        )}
                      </div>
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
