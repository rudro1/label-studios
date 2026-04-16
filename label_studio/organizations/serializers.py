"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from typing import TypedDict

from drf_dynamic_fields import DynamicFieldsMixin
from drf_spectacular.utils import extend_schema_serializer
from organizations.models import Organization, OrganizationMember
from projects.models import Project
from rest_framework import serializers
from tasks.models import Annotation
from users.serializers import UserSerializer


class OrganizationIdSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'title', 'contact_info', 'created_at']


class OrganizationSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


# =========================================
# OrganizationMemberListAPI
# OrganizationMemberDetailAPI
# =========================================


class ProjectInfo(TypedDict):
    id: int
    title: str


class OrganizationMemberListParamsSerializer(serializers.Serializer):
    active = serializers.BooleanField(required=False, default=False)
    contributed_to_projects = serializers.BooleanField(required=False, default=False)


@extend_schema_serializer(
    deprecate_fields=[
        'created_projects',
        'contributed_to_projects',
    ]
)
class UserOrganizationMemberListSerializer(UserSerializer):
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    def get_created_projects(self, user) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        created_projects_map = self.context.get('created_projects_map', {})
        return created_projects_map.get(user.id, [])

    def get_contributed_to_projects(self, user) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        contributed_to_projects_map = self.context.get('contributed_to_projects_map', {})
        return contributed_to_projects_map.get(user.id, [])

    class Meta:
        model = UserSerializer.Meta.model
        fields = UserSerializer.Meta.fields + (
            'created_projects',
            'contributed_to_projects',
        )


class OrganizationMemberUserSerializer(UserSerializer):
    """Serializes the User part of a membership row (slim)."""

    class Meta:
        model = UserSerializer.Meta.model
        fields = UserSerializer.Meta.fields


class OrganizationMemberListSerializer(serializers.ModelSerializer):
    """Default list serializer (kept for compatibility)."""

    user = OrganizationMemberUserSerializer()

    class Meta:
        model = OrganizationMember
        fields = ['user', 'role', 'is_suspended', 'suspended_at', 'created_at']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """
    FixStudio: full member detail with RBAC + suspension fields.
    Replaces the old serializer that only exposed user/projects info.
    """

    user = UserOrganizationMemberListSerializer()
    contributed_projects_count = serializers.SerializerMethodField(read_only=True)
    annotations_count = serializers.SerializerMethodField(read_only=True)
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    # FixStudio RBAC fields (read-only here; mutation happens via dedicated endpoints)
    role = serializers.CharField(read_only=True)
    is_suspended = serializers.BooleanField(read_only=True)
    suspended_at = serializers.DateTimeField(read_only=True)
    suspension_reason = serializers.CharField(read_only=True)
    is_owner = serializers.SerializerMethodField(read_only=True)

    def get_is_owner(self, member) -> bool:
        try:
            return bool(member.is_owner)
        except Exception:
            return False

    def get_annotations_count(self, member) -> int:
        org = self.context.get('organization')
        if org is None:
            return 0
        return Annotation.objects.filter(completed_by=member.user, project__organization=org).count()

    def get_contributed_projects_count(self, member) -> int:
        org = self.context.get('organization')
        if org is None:
            return 0
        return (
            member.user.annotations.filter(project__organization=org).values('project').distinct().count()
        )

    def get_created_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        organization = self.context.get('organization')
        projects = Project.objects.filter(created_by=member.user, organization=organization).values('id', 'title')
        projects = projects[:100]
        return [{'id': p['id'], 'title': p['title']} for p in projects]

    def get_contributed_to_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        organization = self.context.get('organization')
        annotations = (
            Annotation.objects.filter(completed_by=member.user, project__organization=organization)
            .values('project__id', 'project__title')
            .distinct()
        )
        annotations = annotations[:100]
        return [{'id': a['project__id'], 'title': a['project__title']} for a in annotations]

    class Meta:
        model = OrganizationMember
        fields = [
            'user',
            'organization',
            'role',
            'is_suspended',
            'suspended_at',
            'suspension_reason',
            'is_owner',
            'contributed_projects_count',
            'annotations_count',
            'created_at',
            'created_projects',
            'contributed_to_projects',
        ]


# =========================================


class OrganizationInviteSerializer(serializers.Serializer):
    token = serializers.CharField(required=False)
    invite_url = serializers.CharField(required=False)


# =========================================
# FixStudio: write-side serializers for RBAC endpoints
# =========================================


class OrganizationMemberRoleUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[
        OrganizationMember.ROLE_ADMIN,
        OrganizationMember.ROLE_REVIEWER,
        OrganizationMember.ROLE_ANNOTATOR,
    ])


class OrganizationMemberSuspendSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)
