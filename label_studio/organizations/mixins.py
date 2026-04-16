"""FixStudio organization mixins.

`active_members` now correctly excludes:
  - soft-deleted members (deleted_at IS NOT NULL)
  - suspended members (is_suspended = True)

`OrganizationMemberMixin.has_permission` additionally blocks suspended users.
"""

from django.utils.functional import cached_property


class OrganizationMixin:
    @cached_property
    def active_members(self):
        # Lazy import to avoid AppRegistryNotReady during Django bootstrapping
        from organizations.models import OrganizationMember
        return OrganizationMember.objects.filter(
            organization=self,
            deleted_at__isnull=True,
            is_suspended=False,
        )


class OrganizationMemberMixin:
    def has_permission(self, user):
        # FixStudio: a suspended/deleted member should NOT have permission.
        if getattr(self, 'deleted_at', None) is not None:
            return False
        if getattr(self, 'is_suspended', False):
            return False
        if user.active_organization_id == self.organization_id:
            return True
        return False
