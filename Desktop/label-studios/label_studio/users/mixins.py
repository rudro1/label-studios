"""FixStudio user mixin with role-aware helpers."""

from organizations.models import OrganizationMember


class UserMixin:
    """
    Mixin attached to the User model. Adds RBAC helper properties for FixStudio:
      - user.role          -> 'owner' | 'admin' | 'reviewer' | 'annotator' | None
      - user.is_admin      -> bool (Owner or Admin)
      - user.is_reviewer   -> bool (Owner / Admin / Reviewer)
      - user.is_annotator  -> bool (Annotator)
      - user.is_suspended  -> bool
    These read from OrganizationMember for the user's *active* organization.
    """

    # ----------------------------------------------------------
    # Internal helper
    # ----------------------------------------------------------
    def _active_membership(self):
        org_id = getattr(self, 'active_organization_id', None)
        if not org_id:
            return None
        return (
            OrganizationMember.objects.filter(
                user=self, organization_id=org_id, deleted_at__isnull=True
            ).first()
        )

    # ----------------------------------------------------------
    # Role properties
    # ----------------------------------------------------------
    @property
    def role(self):
        m = self._active_membership()
        return m.role if m else None

    @property
    def is_admin(self):
        m = self._active_membership()
        return bool(m and m.is_admin)

    @property
    def is_reviewer(self):
        m = self._active_membership()
        return bool(m and m.is_reviewer)

    @property
    def is_annotator(self):
        # NOTE: kept as a property for backward compatibility with existing
        # `user.is_annotator` checks across the codebase.
        m = self._active_membership()
        return bool(m and m.is_annotator_role)

    @property
    def is_suspended(self):
        m = self._active_membership()
        return bool(m and m.is_suspended)

    # ----------------------------------------------------------
    # Existing API kept intact
    # ----------------------------------------------------------
    def is_project_annotator(self, project):
        return False

    def has_permission(self, user):
        return OrganizationMember.objects.filter(
            user=user, organization=user.active_organization, deleted_at__isnull=True
        ).exists()
