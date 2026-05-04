from core.utils.common import temporary_disconnect_all_signals
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from organizations.models import Organization, OrganizationMember
from projects.models import Project
from tasks.models import Annotation, AnnotationDraft, TaskAssignment


def create_organization(title, created_by, legacy_api_tokens_enabled=False, **kwargs):
    from core.feature_flags import flag_set

    JWT_ACCESS_TOKEN_ENABLED = flag_set('fflag__feature_develop__prompts__dia_1829_jwt_token_auth')

    with transaction.atomic():
        org = Organization.objects.create(title=title, created_by=created_by, **kwargs)
        OrganizationMember.objects.create(user=created_by, organization=org)
        if JWT_ACCESS_TOKEN_ENABLED:
            # set auth tokens to new system for new users, unless specified otherwise
            org.jwt.api_tokens_enabled = True
            org.jwt.legacy_api_tokens_enabled = (
                legacy_api_tokens_enabled or settings.LABEL_STUDIO_ENABLE_LEGACY_API_TOKEN
            )
            org.jwt.save()
        return org


def destroy_organization(org):
    with temporary_disconnect_all_signals():
        Project.objects.filter(organization=org).delete()
        # JWT settings are one-to-one with DO_NOTHING, so we must delete them first.
        if hasattr(org, 'jwt'):
            org.jwt.delete()
        if hasattr(org, 'session_timeout_policy'):
            org.session_timeout_policy.delete()
        if hasattr(org, 'saml'):
            org.saml.delete()
        org.delete()


def destroy_user_in_organization(user, org):
    with temporary_disconnect_all_signals():
        Project.objects.filter(organization=org, created_by=user).delete()
        AnnotationDraft.objects.filter(user=user, task__project__organization=org).delete()
        Annotation.objects.filter(completed_by=user, project__organization=org).delete()
        TaskAssignment.objects.filter(
            Q(task__project__organization=org),
            Q(annotator=user) | Q(reviewer=user),
        ).delete()
        OrganizationMember.objects.filter(user=user, organization=org).delete()

        if user.active_organization_id == org.id:
            user.active_organization = user.organizations.filter(organizationmember__deleted_at__isnull=True).first()
            user.save(update_fields=['active_organization'])

        if user.avatar:
            user.avatar.delete(save=False)
            user.avatar = None
            user.save(update_fields=['avatar'])

        if not user.organizations.filter(organizationmember__deleted_at__isnull=True).exists():
            user.delete()
