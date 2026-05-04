"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.feature_flags import flag_set
from core.mixins import GetParentObjectMixin
from core.utils.common import load_func
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils.functional import cached_property
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from organizations.functions import destroy_user_in_organization
from organizations.models import Organization, OrganizationMember
from organizations.serializers import (
    OrganizationIdSerializer,
    OrganizationInviteSerializer,
    OrganizationMemberListParamsSerializer,
    OrganizationMemberListSerializer,
    OrganizationMemberSerializer,
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


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='List your organizations',
        description="""
        Return a list of the organizations you've created or that you have access to.
        """,
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationListAPI(generics.ListCreateAPIView):
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

    def filter_queryset(self, queryset):
        return queryset.filter(
            organizationmember__in=self.request.user.om_through.filter(deleted_at__isnull=True)
        ).distinct()

    def get(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).get(request, *args, **kwargs)

    @extend_schema(exclude=True)
    def post(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).post(request, *args, **kwargs)


class OrganizationMemberListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'

    def get_page_size(self, request):
        # emulate "unlimited" page_size
        if (
            self.page_size_query_param in request.query_params
            and request.query_params[self.page_size_query_param] == '-1'
        ):
            return 1000000
        return super().get_page_size(request)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization members list',
        description='Retrieve a list of the organization members and their IDs.',
        parameters=[
            OpenApiParameter(
                name='contributed_to_projects',
                type=OpenApiTypes.BOOL,
                location='query',
                description='Whether to include projects created and contributed to by the members.',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
            'x-fern-pagination': {
                'offset': '$request.page',
                'results': '$response.results',
            },
        },
    ),
)
class OrganizationMemberListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_change,
        DELETE=all_permissions.organizations_change,
    )
    serializer_class = OrganizationMemberListSerializer
    pagination_class = OrganizationMemberListPagination

    @cached_property
    def paginated_members(self):
        return self.paginate_queryset(self.filter_queryset(self.get_queryset()))

    def _get_created_projects_map(self):
        members = self.paginated_members
        user_ids = [member.user_id for member in members]
        projects = (
            Project.objects.filter(created_by_id__in=user_ids, organization=self.request.user.active_organization)
            .values('created_by_id', 'id', 'title')
            .distinct()
        )
        projects_map = {}
        for project in projects:
            projects_map.setdefault(project['created_by_id'], []).append(
                {
                    'id': project['id'],
                    'title': project['title'],
                }
            )
        return projects_map

    def _get_contributed_to_projects_map(self):
        members = self.paginated_members
        user_ids = [member.user_id for member in members]
        org_project_ids = Project.objects.filter(organization=self.request.user.active_organization).values_list(
            'id', flat=True
        )
        annotations = (
            Annotation.objects.filter(completed_by__in=list(user_ids), project__in=list(org_project_ids))
            .values('completed_by', 'project_id')
            .distinct()
        )
        project_ids = [annotation['project_id'] for annotation in annotations]
        projects_map = Project.objects.in_bulk(id_list=project_ids, field_name='id')

        contributed_to_projects_map = {}
        for annotation in annotations:
            project = projects_map[annotation['project_id']]
            contributed_to_projects_map.setdefault(annotation['completed_by'], []).append(
                {
                    'id': project.id,
                    'title': project.title,
                }
            )
        return contributed_to_projects_map

    def get_serializer_context(self):
        context = super().get_serializer_context()
        contributed_to_projects = bool_from_request(self.request.GET, 'contributed_to_projects', False)
        return {
            'contributed_to_projects': contributed_to_projects,
            'created_projects_map': self._get_created_projects_map() if contributed_to_projects else None,
            'contributed_to_projects_map': self._get_contributed_to_projects_map()
            if contributed_to_projects
            else None,
            **context,
        }

    def get_queryset(self):
        # Super Admin can list members of any org
        if self.request.user.is_superuser:
            org = generics.get_object_or_404(Organization, pk=self.kwargs[self.lookup_field])
        else:
            org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])

        # Annotators and reviewers cannot view the org member list
        if not self.request.user.is_superuser:
            om = OrganizationMember.objects.filter(user=self.request.user, organization=org).first()
            if not om or (om.role in ['annotator', 'reviewer'] and not om.is_owner):
                raise PermissionDenied("You do not have permission to view the organization page.")

        if flag_set('fix_backend_dev_3134_exclude_deactivated_users', self.request.user):
            serializer = OrganizationMemberListParamsSerializer(data=self.request.GET)
            serializer.is_valid(raise_exception=True)
            active = serializer.validated_data.get('active')

            # return only active users (exclude DISABLED and NOT_ACTIVATED)
            if active:
                return (
                    org.active_members.exclude(user__is_superuser=True)
                    .prefetch_related('user__om_through')
                    .order_by('user__username')
                )

            # organization page to show all members
            return (
                org.members.exclude(user__is_superuser=True)
                .prefetch_related('user__om_through')
                .order_by('user__username')
            )
        else:
            return (
                org.members.exclude(user__is_superuser=True)
                .prefetch_related('user__om_through')
                .order_by('user__username')
            )

    def list(self, request, *args, **kwargs):
        page = self.paginated_members  # Using cached property to avoid multiple queries
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
                name='user_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying the user to get organization details for.',
            ),
            OpenApiParameter(
                name='contributed_to_projects',
                type=OpenApiTypes.BOOL,
                location='query',
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
        parameters=[
            OpenApiParameter(
                name='user_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying the user to be deleted from the organization.',
            ),
        ],
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

        user = get_object_or_404(User, pk=user_pk)
        member = get_object_or_404(OrganizationMember, user=user, organization=org)
        if member.deleted_at is not None:
            raise NotFound('Member not found')

        if member.user_id == request.user.id:
            return Response({'detail': 'User cannot soft delete self'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        if member.user.is_superuser:
            raise PermissionDenied('Super Admin cannot be removed from tenant organization pages.')
        if member.is_owner:
            return Response({'detail': 'Cannot remove the organization owner.'}, status=400)

        destroy_user_in_organization(user, org)
        return Response({'detail': 'User permanently deleted'}, status=200)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization settings',
        description='Retrieve the settings for a specific organization by ID.',
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Update organization settings',
        description='Update the settings for a specific organization by ID.',
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationAPI(generics.RetrieveUpdateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_change
    serializer_class = OrganizationSerializer

    redirect_route = 'organizations-dashboard'
    redirect_kwarg = 'pk'

    def get_object(self):
        obj = super().get_object()
        # Super Admin can always access org settings
        if self.request.user.is_superuser:
            return obj
        om = OrganizationMember.objects.filter(user=self.request.user, organization=obj).first()
        if not om or (om.role in ['annotator', 'reviewer'] and not om.is_owner):
            raise PermissionDenied("You do not have permission to view organization settings.")
        return obj

    def patch(self, request, *args, **kwargs):
        # Only Super Admin can promote someone to admin role
        role = request.data.get('role')
        if role == OrganizationMember.ROLE_ADMIN and not request.user.is_superuser:
            raise PermissionDenied("Only Super Admin can assign the Admin role.")
        return super().patch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).get(request, *args, **kwargs)

    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).put(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Invites'],
        summary='Get organization invite link',
        description='Get a link to use to invite a new member to an organization in Label Studio Enterprise.',
        responses={200: OrganizationInviteSerializer()},
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'get_invite',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationInviteAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_invite

    def get(self, request, *args, **kwargs):
        if getattr(request.user, 'is_superuser', False):
            from users.invite_tokens import make_admin_invite_token
            admin_token = make_admin_invite_token()
            query = f'admin_token={admin_token}'
            invite_url = request.build_absolute_uri(f'{reverse("user-signup")}?{query}')
            if hasattr(settings, 'FORCE_SCRIPT_NAME') and settings.FORCE_SCRIPT_NAME:
                invite_url = invite_url.replace(settings.FORCE_SCRIPT_NAME, '', 1)
            # return dummy token to pass serializer validation
            serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': 'admin-invite-link'})
            serializer.is_valid()
            return Response(serializer.data, status=200)

        org = request.user.active_organization
        om = OrganizationMember.objects.filter(user=request.user, organization=org).first()
        if not om or (om.role in ['annotator', 'reviewer'] and not om.is_owner):
            raise PermissionDenied("You do not have permission to generate invite links.")

        invite_url = request.build_absolute_uri(
            '{}?token={}'.format(reverse('user-signup'), org.token)
        )
        if hasattr(settings, 'FORCE_SCRIPT_NAME') and settings.FORCE_SCRIPT_NAME:
            invite_url = invite_url.replace(settings.FORCE_SCRIPT_NAME, '', 1)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=200)


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Invites'],
        summary='Reset organization token',
        description='Reset the token used in the invitation link to invite someone to an organization.',
        responses={200: OrganizationInviteSerializer()},
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'reset_token',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationResetTokenAPI(APIView):
    permission_required = all_permissions.organizations_invite
    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):
        org = request.user.active_organization
        om = OrganizationMember.objects.filter(user=request.user, organization=org).first()
        if not om or (om.role in ['annotator', 'reviewer'] and not om.is_owner):
            raise PermissionDenied("You do not have permission to reset invite tokens.")

        org.reset_token()
        logger.debug(f'New token for organization {org.pk} is {org.token}')
        invite_url = request.build_absolute_uri(
            '{}?token={}'.format(reverse('user-signup'), org.token)
        )
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=201)

class OrganizationMemberSuspendAPI(APIView):
    """Toggle is_suspended on a single organization member. Admin/owner of the org only."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, user_pk, *args, **kwargs):
        org = get_object_or_404(Organization, pk=pk)

        if not request.user.is_superuser:
            requester_member = OrganizationMember.objects.filter(
                user=request.user, organization=org, deleted_at__isnull=True
            ).first()
            if not requester_member or not (requester_member.is_owner or requester_member.role == OrganizationMember.ROLE_ADMIN):
                raise PermissionDenied('Only organization admins can suspend members.')

        target = get_object_or_404(
            OrganizationMember.objects.select_related('user'),
            user_id=user_pk, organization=org, deleted_at__isnull=True,
        )
        if target.user_id == request.user.id:
            return Response({'detail': 'You cannot suspend yourself.'}, status=400)
        if target.user.is_superuser:
            raise PermissionDenied('Super Admin cannot be suspended from tenant organization pages.')
        if target.is_owner:
            return Response({'detail': 'Cannot suspend the organization owner.'}, status=400)

        target.is_suspended = not target.is_suspended
        target.save(update_fields=['is_suspended', 'updated_at'])
        return Response({'user_id': target.user_id, 'is_suspended': target.is_suspended})


class SuperAdminOrganizationListAPI(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrganizationSerializer

    def get_queryset(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only Super Admin can access this endpoint.")
        return Organization.objects.all().order_by('-id')


class SuperAdminOrganizationSuspendAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied("Only Super Admin can access this endpoint.")

        org = get_object_or_404(Organization, pk=pk)
        action = request.data.get('action')

        if action == 'suspend':
            org.is_suspended = True
            org.save(update_fields=['is_suspended'])
            return Response({"status": "suspended", "org_id": org.pk})
        elif action == 'unsuspend':
            org.is_suspended = False
            org.save(update_fields=['is_suspended'])
            return Response({"status": "active", "org_id": org.pk})

        raise ValidationError("Invalid action. Use 'suspend' or 'unsuspend'.")


class SuperAdminMaintenanceToggleAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise PermissionDenied("Only Super Admin can access this endpoint.")

        is_maintenance = cache.get('maintenance_mode_enabled', False)

        if is_maintenance:
            cache.set('maintenance_mode_enabled', False, timeout=None)
            status_text = "disabled"
        else:
            cache.set('maintenance_mode_enabled', True, timeout=None)
            status_text = "enabled"

        return Response({"maintenance_mode": status_text})
