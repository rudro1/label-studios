"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.utils.common import create_hash, load_func
from django.conf import settings
from django.db import models, transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)

OrganizationMemberMixin = load_func(settings.ORGANIZATION_MEMBER_MIXIN)


class OrganizationMember(OrganizationMemberMixin, models.Model):
    """FixStudio OrganizationMember with RBAC (Admin, Reviewer, Annotator) and suspension support."""

    # ============================================================
    # FixStudio RBAC Role Choices
    # ------------------------------------------------------------
    # ADMIN     -> Full control. Manage users, projects, settings.
    # REVIEWER  -> Reviews annotations, approves/rejects, can reassign.
    # ANNOTATOR -> Creates annotations only. Limited project access.
    # OWNER     -> Organization owner (auto-assigned to creator).
    # ============================================================
    ROLE_OWNER = 'owner'
    ROLE_ADMIN = 'admin'
    ROLE_REVIEWER = 'reviewer'
    ROLE_ANNOTATOR = 'annotator'

    ROLE_CHOICES = (
        (ROLE_OWNER, _('Owner')),
        (ROLE_ADMIN, _('Admin')),
        (ROLE_REVIEWER, _('Reviewer')),
        (ROLE_ANNOTATOR, _('Annotator')),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='om_through', help_text='User ID'
    )
    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, help_text='Organization ID'
    )

    role = models.CharField(
        _('role'),
        max_length=32,
        choices=ROLE_CHOICES,
        default=ROLE_ANNOTATOR,
        db_index=True,
        help_text='RBAC role within the organization (owner / admin / reviewer / annotator).',
    )

    is_suspended = models.BooleanField(
        _('is suspended'),
        default=False,
        db_index=True,
        help_text='If True, the member cannot log in or perform any actions.',
    )

    suspended_at = models.DateTimeField(
        _('suspended at'),
        null=True,
        blank=True,
        help_text='Timestamp when the member was suspended.',
    )

    suspension_reason = models.TextField(
        _('suspension reason'),
        blank=True,
        default='',
        help_text='Reason for suspension (visible to admins).',
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    deleted_at = models.DateTimeField(
        _('deleted at'),
        default=None,
        null=True,
        blank=True,
        db_index=True,
        help_text='Timestamp indicating when the organization member was marked as deleted.  '
        'If NULL, the member is not considered deleted.',
    )

    @classmethod
    def find_by_user(cls, user_or_user_pk, organization_pk):
        from users.models import User

        user_pk = user_or_user_pk.pk if isinstance(user_or_user_pk, User) else user_or_user_pk
        return OrganizationMember.objects.get(user=user_pk, organization=organization_pk)

    @cached_property
    def is_deleted(self):
        return bool(self.deleted_at)

    @cached_property
    def is_owner(self):
        if self.organization.created_by is None:
            return False
        return self.user.id == self.organization.created_by.id

    # ============================================================
    # FixStudio RBAC helper properties
    # ============================================================
    @property
    def is_admin(self):
        """True if the member is Owner or Admin."""
        return self.role in (self.ROLE_OWNER, self.ROLE_ADMIN)

    @property
    def is_reviewer(self):
        """True if member can review annotations (Owner, Admin, or Reviewer)."""
        return self.role in (self.ROLE_OWNER, self.ROLE_ADMIN, self.ROLE_REVIEWER)

    @property
    def is_annotator_role(self):
        """True if the member's role is Annotator."""
        return self.role == self.ROLE_ANNOTATOR

    @property
    def can_login(self):
        """True if the member is allowed to log in (not suspended and not deleted)."""
        return not self.is_suspended and self.deleted_at is None

    class Meta:
        ordering = ['pk']

    # ============================================================
    # Soft delete
    # ============================================================
    def soft_delete(self):
        with transaction.atomic():
            self.deleted_at = timezone.now()
            self.save(update_fields=['deleted_at'])
            self.user.active_organization = self.user.organizations.filter(
                organizationmember__deleted_at__isnull=True
            ).first()
            if self.user.avatar:
                self.user.avatar.delete(save=False)
                self.user.avatar = None
            self.user.save(update_fields=['active_organization', 'avatar'])

        self.user.task_locks.all().delete()

    # ============================================================
    # Suspension management
    # ============================================================
    def suspend(self, reason=''):
        """Suspend the member. Releases all task locks. Owner cannot be suspended."""
        if self.is_owner:
            raise ValueError('Organization owner cannot be suspended.')
        with transaction.atomic():
            self.is_suspended = True
            self.suspended_at = timezone.now()
            self.suspension_reason = reason or ''
            self.save(update_fields=['is_suspended', 'suspended_at', 'suspension_reason'])
            # also flip Django auth flag so the user cannot log in
            if self.user.is_active:
                self.user.is_active = False
                self.user.save(update_fields=['is_active'])
            # release any locked tasks
            self.user.task_locks.all().delete()

    def unsuspend(self):
        """Unsuspend the member and re-enable login."""
        with transaction.atomic():
            self.is_suspended = False
            self.suspended_at = None
            self.suspension_reason = ''
            self.save(update_fields=['is_suspended', 'suspended_at', 'suspension_reason'])
            if not self.user.is_active:
                self.user.is_active = True
                self.user.save(update_fields=['is_active'])

    def change_role(self, new_role):
        """Change the role. Owner role cannot be reassigned via API."""
        valid_roles = {self.ROLE_ADMIN, self.ROLE_REVIEWER, self.ROLE_ANNOTATOR}
        if new_role not in valid_roles:
            raise ValueError(f'Invalid role: {new_role}. Allowed: {sorted(valid_roles)}')
        if self.is_owner:
            raise ValueError('Cannot change the role of the organization owner.')
        self.role = new_role
        self.save(update_fields=['role'])


OrganizationMixin = load_func(settings.ORGANIZATION_MIXIN)


class Organization(OrganizationMixin, models.Model):
    """ """

    title = models.CharField(_('organization title'), max_length=1000, null=False)

    token = models.CharField(_('token'), max_length=256, default=create_hash, unique=True, null=True, blank=True)

    users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='organizations', through=OrganizationMember)

    created_by = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='organization',
        verbose_name=_('created_by'),
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    contact_info = models.EmailField(_('contact info'), blank=True, null=True)

    def __str__(self):
        return self.title + ', id=' + str(self.pk)

    @classmethod
    def create_organization(cls, created_by=None, title='Your Organization', **kwargs):
        _create_organization = load_func(settings.CREATE_ORGANIZATION)
        return _create_organization(title=title, created_by=created_by, **kwargs)

    @classmethod
    def find_by_user(cls, user, check_deleted=False):
        memberships = OrganizationMember.objects.filter(user=user).prefetch_related('organization')
        if not memberships.exists():
            raise ValueError(f'No memberships found for user {user}')
        membership = memberships.first()
        if check_deleted:
            return (membership.organization, True) if membership.deleted_at else (membership.organization, False)

        return membership.organization

    @classmethod
    def find_by_invite_url(cls, url):
        token = url.strip('/').split('/')[-1]
        if len(token):
            return Organization.objects.get(token=token)
        else:
            raise KeyError(f"Can't find Organization by welcome URL: {url}")

    def has_user(self, user):
        return self.users.filter(pk=user.pk).exists()

    def has_deleted(self, user):
        return OrganizationMember.objects.filter(user=user, organization=self, deleted_at__isnull=False).exists()

    def has_project_member(self, user):
        return self.projects.filter(members__user=user).exists()

    def has_permission(self, user):
        return OrganizationMember.objects.filter(user=user, organization=self, deleted_at__isnull=True).exists()

    def add_user(self, user):
        if self.users.filter(pk=user.pk).exists():
            logger.debug('User already exists in organization.')
            return

        with transaction.atomic():
            om = OrganizationMember.objects.create(user=user, organization=self)
            user.active_organization = self
            user.save(update_fields=['active_organization'])

        return om

    @cached_property
    def members(self):
        return OrganizationMember.objects.filter(organization=self, deleted_at__isnull=True)

    def deleted_users(self):
        return self.users.filter(om_through__deleted_at__isnull=False, om_through__organization=self)

    def projects_count(self):
        return self.projects.count()

    def created_at_prettify(self):
        return self.created_at.strftime('%d %b %Y %H:%M:%S')

    def per_user_statistics(self):
        from tasks.models import Annotation

        annotations = Annotation.objects.filter(completed_by__in=self.users.all())
        return annotations.values('completed_by').annotate(count=Count('pk')).values('completed_by__username', 'count')

    def per_project_statistics(self):
        from projects.models import Project

        projects = Project.objects.filter(organization=self).annotate(
            annotations_count=Count(
                'tasks__annotations',
                filter=Q(tasks__annotations__was_cancelled=False),
            )
        )
        return projects.values('title', 'annotations_count')


# Keep Organization-level reference if some code expects pre-existing import
__all__ = ['OrganizationMember', 'Organization']
