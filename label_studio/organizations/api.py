"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.feature_flags import flag_set
from core.mixins import GetParentObjectMixin
from core.utils.common import load_func
from django.conf import settings
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils.functional import cached_property
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from organizations.models import Organization, OrganizationMember
from organizations.serializers import (
    OrganizationIdSerializer,
    OrganizationInviteSerializer,
    OrganizationMemberListParamsSerializer,
    OrganizationMemberRoleUpdateSerializer,
    OrganizationMemberSerializer,
    OrganizationMemberSuspendSerializer,
    OrganizationSerializer,
)
from projects.models import Project
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView
from tasks.models import Annotation
from users.models import User

from label_studio.core.permissions import ViewClassPermission, all_permissions
from label_studio.core.utils.params import bool_from_request

logger = logging.getLogger(__name__)

HasObjectPermission = load_func(settings.MEMBER_PERM)


# =========================================
# Helper: ensure caller is an Admin/Owner of the active org
# =========================================
def _require_admin(request):
    """Raise PermissionDenied unless the calling user is Owner or Admin of their active org."""
    user = request.user
    org = user.active_organization
    if org is None:
        raise PermissionDenied('You do not belong to any active organization.')
    try:
        membership = OrganizationMember.objects.get(user=user, organization=org, deleted_at__isnull=True)
    except OrganizationMember.DoesNotExist:
        raise PermissionDenied('Active membership not found.')
    if not membership.is_admin:
        raise PermissionDenied('Only organization admins can perform this action.')
    return membership, org


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='List your organizations',
        description="Return a list of the organizations you've created or that you have access to.",
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationListAPI(generics.ListAPIView):
    queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        POST=all_permissions.organizations_create,
        PATCH=all_permissions.organizations_change,
        DELETE=all_permissions.organizations_change,
    )
    serializer_class = OrganizationIdSerializer

    def get_object(self):
        org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])
        self.check_object_permissions(self.request, org)
        return org

    def get_queryset(self):
        return self.request.user.organizations.distinct()


class OrganizationMemberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization members list',
        description='Retrieve a list of members of a specific organization by ID.',
        parameters=[
            OpenApiParameter(
                name='id', type=OpenApiTypes.INT, location='path',
                description='A unique integer value identifying this organization.',
            ),
            OpenApiParameter(
                name='active', type=OpenApiTypes.BOOL, location='query',
                description='Whether to return only active users.',
            ),
            OpenApiParameter(
                name='contributed_to_projects', type=OpenApiTypes.BOOL, location='query',
                description='Whether to include projects created and contributed to by the member.',
            ),
        ],
        responses={200: OrganizationMemberSerializer(many=True)},
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationMemberListAPI(GetParentObjectMixin, generics.ListAPIView):
    queryset = OrganizationMember.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.organizations_view
    serializer_class = OrganizationMemberSerializer
    pagination_class = OrganizationMemberPagination
    parent_queryset = Organization.objects.all()

    def _get_created_projects_map(self):
        org = self.parent_object
        projects = Project.objects.filter(organization=org).values('id', 'title', 'created_by_id')
        result = {}
        for p in projects[:5000]:
            result.setdefault(p['created_by_id'], []).append({'id': p['id'], 'title': p['title']})
        return result

    def _get_contributed_to_projects_map(self):
        org = self.parent_object
        ann = (
            Annotation.objects.filter(project__organization=org)
            .values('completed_by_id', 'project__id', 'project__title')
            .distinct()
        )
        result = {}
        for a in ann[:5000]:
            result.setdefault(a['completed_by_id'], []).append({'id': a['project__id'], 'title': a['project__title']})
        return result

    @cached_property
    def paginated_members(self):
        qs = self.get_queryset()
        return self.paginate_queryset(qs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        contributed_to_projects = bool_from_request(self.request.GET, 'contributed_to_projects', False)
        return {
            'organization': self.parent_object,
            'contributed_to_projects': contributed_to_projects,
            'created_projects_map': self._get_created_projects_map() if contributed_to_projects else None,
            'contributed_to_projects_map': self._get_contributed_to_projects_map()
            if contributed_to_projects
            else None,
            **context,
        }

    def get_queryset(self):
        org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])
        if flag_set('fix_backend_dev_3134_exclude_deactivated_users', self.request.user):
            serializer = OrganizationMemberListParamsSerializer(data=self.request.GET)
            serializer.is_valid(raise_exception=True)
            active = serializer.validated_data.get('active')
            if active:
                return org.active_members.prefetch_related('user__om_through').order_by('user__username')
            return org.members.prefetch_related('user__om_through').order_by('user__username')
        return org.members.prefetch_related('user__om_through').order_by('user__username')

    def list(self, request, *args, **kwargs):
        page = self.paginated_members
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization member details',
        description='Get organization member details by user ID.',
        parameters=[
            OpenApiParameter(
                name='user_pk', type=OpenApiTypes.INT, location='path',
                description='A unique integer value identifying the user to get organization details for.',
            ),
            OpenApiParameter(
                name='contributed_to_projects', type=OpenApiTypes.BOOL, location='query',
                description='Whether to include projects created and contributed to by the member.',
            ),
        ],
        responses={200: OrganizationMemberSerializer()},
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Soft delete an organization member',
        description='Soft delete a member from the organization.',
        responses={
            204: OpenApiResponse(description='Member deleted successfully.'),
            405: OpenApiResponse(description='User cannot soft delete self.'),
            404: OpenApiResponse(description='Member not found'),
            403: OpenApiResponse(description='You can delete members only for your current active organization'),
        },
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationMemberDetailAPI(GetParentObjectMixin, generics.RetrieveDestroyAPIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        DELETE=all_permissions.organizations_change,
    )
    parent_queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = OrganizationMemberSerializer
    http_method_names = ['delete', 'get']

    @property
    def permission_classes(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated, HasObjectPermission]
        return api_settings.DEFAULT_PERMISSION_CLASSES

    def get_queryset(self):
        return OrganizationMember.objects.filter(organization=self.parent_object).select_related('user')

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            'organization': self.parent_object,
            'contributed_to_projects': bool_from_request(self.request.GET, 'contributed_to_projects', False),
        }

    def get(self, request, pk, user_pk):
        queryset = self.get_queryset()
        member = get_object_or_404(queryset, user=user_pk)
        self.check_object_permissions(request, member)
        serializer = self.get_serializer(member)
        return Response(serializer.data)

    def delete(self, request, pk=None, user_pk=None):
        org = self.parent_object
        if org != request.user.active_organization:
            raise PermissionDenied('You can delete members only for your current active organization')

        # FixStudio: only Admin / Owner can delete other members
        _require_admin(request)

        user = get_object_or_404(User, pk=user_pk)
        member = get_object_or_404(OrganizationMember, user=user, organization=org)
        if member.deleted_at is not None:
            raise NotFound('Member not found')

        if member.user_id == request.user.id:
            return Response({'detail': 'User cannot soft delete self'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

        if member.is_owner:
            return Response(
                {'detail': 'Organization owner cannot be deleted.'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )

        member.soft_delete()
        return Response(status=204)


# =========================================
# FixStudio: RBAC management endpoints
# =========================================


@extend_schema(
    tags=['Organizations'],
    summary='[FixStudio] Change a member role',
    description='Change a member role to admin / reviewer / annotator. Owner role cannot be reassigned.',
    request=OrganizationMemberRoleUpdateSerializer,
    responses={200: OrganizationMemberSerializer()},
)
class OrganizationMemberRoleAPI(GetParentObjectMixin, APIView):
    permission_classes = [IsAuthenticated]
    parent_queryset = Organization.objects.all()

    def post(self, request, pk, user_pk):
        org = self.parent_object
        if org != request.user.active_organization:
            raise PermissionDenied('You can manage members only for your current active organization.')

        _require_admin(request)

        member = get_object_or_404(
            OrganizationMember, user_id=user_pk, organization=org, deleted_at__isnull=True
        )

        if member.user_id == request.user.id:
            raise ValidationError('You cannot change your own role.')

        ser = OrganizationMemberRoleUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            member.change_role(ser.validated_data['role'])
        except ValueError as e:
            raise ValidationError(str(e))

        return Response(
            OrganizationMemberSerializer(member, context={'organization': org}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=['Organizations'],
    summary='[FixStudio] Suspend a member',
    description='Suspend a member, preventing login and releasing all task locks.',
    request=OrganizationMemberSuspendSerializer,
    responses={200: OrganizationMemberSerializer()},
)
class OrganizationMemberSuspendAPI(GetParentObjectMixin, APIView):
    permission_classes = [IsAuthenticated]
    parent_queryset = Organization.objects.all()

    def post(self, request, pk, user_pk):
        org = self.parent_object
        if org != request.user.active_organization:
            raise PermissionDenied('You can manage members only for your current active organization.')

        _require_admin(request)

        member = get_object_or_404(
            OrganizationMember, user_id=user_pk, organization=org, deleted_at__isnull=True
        )

        if member.user_id == request.user.id:
            raise ValidationError('You cannot suspend yourself.')

        ser = OrganizationMemberSuspendSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        reason = ser.validated_data.get('reason', '')

        try:
            member.suspend(reason=reason)
        except ValueError as e:
            raise ValidationError(str(e))

        return Response(
            OrganizationMemberSerializer(member, context={'organization': org}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=['Organizations'],
    summary='[FixStudio] Unsuspend a member',
    description='Re-enable a suspended member.',
    responses={200: OrganizationMemberSerializer()},
)
class OrganizationMemberUnsuspendAPI(GetParentObjectMixin, APIView):
    permission_classes = [IsAuthenticated]
    parent_queryset = Organization.objects.all()

    def post(self, request, pk, user_pk):
        org = self.parent_object
        if org != request.user.active_organization:
            raise PermissionDenied('You can manage members only for your current active organization.')

        _require_admin(request)

        member = get_object_or_404(
            OrganizationMember, user_id=user_pk, organization=org, deleted_at__isnull=True
        )
        member.unsuspend()
        return Response(
            OrganizationMemberSerializer(member, context={'organization': org}).data,
            status=status.HTTP_200_OK,
        )


# =========================================
# Existing endpoints kept as-is below
# =========================================


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization settings',
        description='Retrieve the settings for a specific organization by ID.',
        extensions={'x-fern-audiences': ['internal']},
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Update organization settings',
        description='Update the settings for a specific organization by ID.',
        extensions={'x-fern-audiences': ['internal']},
    ),
)
class OrganizationAPI(generics.RetrieveUpdateAPIView):
    queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_change,
        DELETE=all_permissions.organizations_change,
    )
    serializer_class = OrganizationSerializer

    redirect_route = 'organizations-dashboard'
    redirect_kwarg = 'pk'

    def get_object(self):
        org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])
        self.check_object_permissions(self.request, org)
        return org


class OrganizationInviteAPI(APIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_change

    def get(self, request, *args, **kwargs):
        org = request.user.active_organization
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        if hasattr(settings, 'FORCE_SCRIPT_NAME') and settings.FORCE_SCRIPT_NAME:
            invite_url = invite_url.replace(settings.FORCE_SCRIPT_NAME, '', 1)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=200)


class OrganizationResetTokenAPI(APIView):
    permission_required = all_permissions.organizations_invite
    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):
        org = request.user.active_organization
        org.reset_token() if hasattr(org, 'reset_token') else None
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=201)
