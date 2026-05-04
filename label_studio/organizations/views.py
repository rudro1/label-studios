"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from organizations.models import Organization, OrganizationMember


def _user_can_view_org(user):
    """Return True if user is Super Admin or Admin/Owner of their active org."""
    if getattr(user, 'is_superuser', False):
        return True
    org = getattr(user, 'active_organization', None)
    if not org:
        return False
    om = OrganizationMember.objects.filter(
        user=user, organization=org, deleted_at__isnull=True
    ).first()
    if not om:
        return False
    # Owner of org OR member with admin role
    return getattr(om, 'is_owner', False) or getattr(om, 'role', '') == OrganizationMember.ROLE_ADMIN


@login_required
def organization_people_list(request):
    if not _user_can_view_org(request.user):
        return redirect('projects:project-index')
    organization = getattr(request.user, 'active_organization', None)
    if request.user.is_superuser and organization is None:
        organization = Organization.objects.order_by('id').first()
    return render(
        request,
        'organizations/people_list.html',
        {'organization': organization, 'organization_id': organization.id if organization else None},
    )


@login_required
def simple_view(request):
    if not _user_can_view_org(request.user):
        return redirect('projects:project-index')
    organization = getattr(request.user, 'active_organization', None)
    if request.user.is_superuser and organization is None:
        organization = Organization.objects.order_by('id').first()
    return render(
        request,
        'organizations/people_list.html',
        {'organization': organization, 'organization_id': organization.id if organization else None},
    )
