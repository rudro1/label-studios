"""Release task assignments — admin yanks tasks back from annotators/reviewers."""

import logging

from core.permissions import AllPermissions
from projects.assignment_utils import can_manage_assignments
from tasks.models import TaskAssignment

all_permissions = AllPermissions()
logger = logging.getLogger(__name__)


def can_release_action(user, project):
    return can_manage_assignments(user, project)


def release_tasks(project, queryset, **kwargs):
    request = kwargs['request']
    if not can_manage_assignments(request.user, project):
        return {'detail': 'Only organization admins can release tasks.', 'status': 403}

    task_ids = list(queryset.values_list('id', flat=True))
    if not task_ids:
        return {'processed_items': 0, 'detail': 'No tasks selected.'}

    deleted, _ = TaskAssignment.objects.filter(task_id__in=task_ids).delete()
    logger.info(f'Admin {request.user.id} released {deleted} assignment(s) on project {project.id}.')
    return {
        'processed_items': deleted,
        'detail': f'Released {deleted} task assignment(s). Tasks are now unassigned.',
    }


actions = [
    {
        'entry_point': release_tasks,
        'permission': all_permissions.projects_change,
        'permission_check': can_release_action,
        'title': 'Release Tasks',
        'order': 106,
        'dialog': {
            'text': 'Release the selected tasks from their current annotator/reviewer? '
                    'Existing annotation work is preserved, but the assignment is removed and the '
                    'tasks become available for re-assignment.',
            'type': 'confirm',
        },
    }
]
