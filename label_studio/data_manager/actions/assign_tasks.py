import logging
from core.permissions import AllPermissions
from users.models import User
from organizations.models import OrganizationMember
from projects.assignment_utils import (
    assign_tasks_to_users,
    can_manage_assignments,
    ensure_assignment_manager,
    get_project_role_user,
)
from rest_framework.exceptions import PermissionDenied, ValidationError

all_permissions = AllPermissions()
logger = logging.getLogger(__name__)

def can_assign_tasks_action(user, project):
    return can_manage_assignments(user, project)

def assign_tasks_form(user, project):
    if not can_manage_assignments(user, project):
        return []

    project_member_ids = project.members.filter(enabled=True).values_list('user_id', flat=True)

    annotator_ids = OrganizationMember.objects.filter(
        organization=project.organization,
        role=OrganizationMember.ROLE_ANNOTATOR,
        deleted_at__isnull=True,
        user__is_superuser=False,
        user_id__in=project_member_ids,
    ).exclude(
        user_id=project.organization.created_by_id,
    ).values_list('user_id', flat=True)

    reviewer_ids = OrganizationMember.objects.filter(
        organization=project.organization,
        role=OrganizationMember.ROLE_REVIEWER,
        deleted_at__isnull=True,
        user__is_superuser=False,
        user_id__in=project_member_ids,
    ).exclude(
        user_id=project.organization.created_by_id,
    ).values_list('user_id', flat=True)

    annotators = User.objects.filter(id__in=annotator_ids)
    reviewers = User.objects.filter(id__in=reviewer_ids)

    return [
        {
            'columnCount': 1,
            'fields': [
                {
                    'type': 'select',
                    'name': 'annotator_id',
                    'label': 'Annotator',
                    'options': [
                        {'value': str(u.id), 'label': u.get_full_name() or u.username or u.email}
                        for u in annotators
                    ],
                    'searchable': True,
                },
                {
                    'type': 'select',
                    'name': 'reviewer_id',
                    'label': 'Reviewer (Optional)',
                    'options': [
                        {'value': '', 'label': 'None'}
                    ] + [
                        {'value': str(u.id), 'label': u.get_full_name() or u.username or u.email}
                        for u in reviewers
                    ],
                    'searchable': True,
                }
            ],
        }
    ]

def assign_tasks(project, queryset, **kwargs):
    request = kwargs['request']
    annotator_id = request.data.get('annotator_id')
    reviewer_id = request.data.get('reviewer_id')

    try:
        ensure_assignment_manager(request.user, project)
    except PermissionDenied as exc:
        return {'detail': str(exc.detail), 'status': 403}

    if not annotator_id:
        return {'detail': 'Annotator must be selected.', 'status': 400}

    try:
        annotator = get_project_role_user(project, annotator_id, OrganizationMember.ROLE_ANNOTATOR)
        reviewer = (
            get_project_role_user(project, reviewer_id, OrganizationMember.ROLE_REVIEWER)
            if reviewer_id else None
        )
    except ValidationError as exc:
        return {'detail': exc.detail, 'status': 400}

    assignment_ids = assign_tasks_to_users(project, queryset, annotator, reviewer)

    return {'processed_items': len(assignment_ids), 'detail': f'Assigned {len(assignment_ids)} tasks successfully.'}

actions = [
    {
        'entry_point': assign_tasks,
        'permission': all_permissions.projects_change,
        'permission_check': can_assign_tasks_action,
        'title': 'Assign Tasks',
        'order': 105,
        'dialog': {
            'text': 'Assign selected tasks to an annotator and an optional reviewer.',
            'type': 'confirm',
            'form': assign_tasks_form,
        },
    }
]
