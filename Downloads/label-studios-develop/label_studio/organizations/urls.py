"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.urls import include, path
from organizations import api, views

app_name = 'organizations'

# Page URLs
_urlpatterns = [
    path('', views.organization_people_list, name='organization-index'),
]

# API URLs
_api_urlpattens = [
    # organization list
    path('', api.OrganizationListAPI.as_view(), name='organization-list'),
    # organization detail
    path('<int:pk>', api.OrganizationAPI.as_view(), name='organization-detail'),
    # organization memberships list
    path('<int:pk>/memberships', api.OrganizationMemberListAPI.as_view(), name='organization-memberships-list'),
    path(
        '<int:pk>/memberships/<int:user_pk>/',
        api.OrganizationMemberDetailAPI.as_view(),
        name='organization-membership-detail',
    ),

    # ----------------------------------------------------------
    # FixStudio RBAC endpoints
    # ----------------------------------------------------------
    path(
        '<int:pk>/memberships/<int:user_pk>/role/',
        api.OrganizationMemberRoleAPI.as_view(),
        name='organization-membership-role',
    ),
    path(
        '<int:pk>/memberships/<int:user_pk>/suspend/',
        api.OrganizationMemberSuspendAPI.as_view(),
        name='organization-membership-suspend',
    ),
    path(
        '<int:pk>/memberships/<int:user_pk>/unsuspend/',
        api.OrganizationMemberUnsuspendAPI.as_view(),
        name='organization-membership-unsuspend',
    ),
]

urlpatterns = [
    path('organization/', views.simple_view, name='organization-simple'),
    path('organization/webhooks', views.simple_view, name='organization-simple-webhooks'),
    path('people/', include(_urlpatterns)),
    path('models/', views.simple_view, name='models'),
    path('api/organizations/', include((_api_urlpattens, app_name), namespace='api')),
    # invite
    path('api/invite', api.OrganizationInviteAPI.as_view(), name='organization-invite'),
    path('api/invite/reset-token', api.OrganizationResetTokenAPI.as_view(), name='organization-reset-token'),
]
