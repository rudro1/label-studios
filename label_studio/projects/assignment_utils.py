"""Shared helpers for Fixensy task assignment rules."""

from organizations.models import OrganizationMember
from rest_framework.exceptions import PermissionDenied, ValidationError
from tasks.models import TaskAssignment


def can_manage_assignments(user, project):
    if not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    if not project.organization_id or user.active_organization_id != project.organization_id:
        return False

    member = OrganizationMember.objects.filter(
        user=user,
        organization_id=project.organization_id,
        deleted_at__isnull=True,
    ).first()
    if not member:
        return False

    return member.role == OrganizationMember.ROLE_ADMIN or project.organization.created_by_id == user.id


def ensure_assignment_manager(user, project):
    if not can_manage_assignments(user, project):
        raise PermissionDenied('Only organization admins can assign tasks.')


def get_project_role_user(project, user_id, role):
    member = OrganizationMember.objects.select_related('user').filter(
        organization_id=project.organization_id,
        user_id=user_id,
        role=role,
        deleted_at__isnull=True,
    ).first()
    if not member or member.user_id == project.organization.created_by_id:
        raise ValidationError(f'User must be an active {role} in this organization.')
    return member.user


def assign_tasks_to_users(project, tasks, annotator, reviewer=None):
    project.add_collaborator(annotator)
    if reviewer:
        project.add_collaborator(reviewer)

    assignment_ids = []
    for task in tasks.iterator():
        TaskAssignment.objects.filter(task=task).exclude(annotator=annotator).delete()
        assignment, _ = TaskAssignment.objects.update_or_create(
            task=task,
            annotator=annotator,
            defaults={
                'reviewer': reviewer,
                'status': 'pending_annotation',
            },
        )
        assignment_ids.append(assignment.id)
    return assignment_ids


def filter_tasks_for_user(queryset, user, project):
    if can_manage_assignments(user, project):
        return queryset

    member = OrganizationMember.objects.filter(
        user=user,
        organization_id=project.organization_id,
        deleted_at__isnull=True,
    ).first()
    if not member:
        return queryset.none()

    if member.role == OrganizationMember.ROLE_ANNOTATOR:
        return queryset.filter(
            assignments__annotator=user,
            assignments__status__in=['pending_annotation', 'rejected'],
        )
    if member.role == OrganizationMember.ROLE_REVIEWER:
        return queryset.filter(
            assignments__reviewer=user,
            assignments__status='pending_review',
        )
    return queryset.none()


def user_can_access_task(user, task):
    if can_manage_assignments(user, task.project):
        return True

    member = OrganizationMember.objects.filter(
        user=user,
        organization_id=task.project.organization_id,
        deleted_at__isnull=True,
    ).first()
    if not member:
        return False

    if member.role == OrganizationMember.ROLE_ANNOTATOR:
        return TaskAssignment.objects.filter(
            task=task,
            annotator=user,
            status__in=['pending_annotation', 'rejected'],
        ).exists()
    if member.role == OrganizationMember.ROLE_REVIEWER:
        return TaskAssignment.objects.filter(
            task=task,
            reviewer=user,
            status='pending_review',
        ).exists()
    return False
