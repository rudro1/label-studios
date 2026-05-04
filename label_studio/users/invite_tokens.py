from django.core import signing


ADMIN_INVITE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
ADMIN_INVITE_SALT = 'fixensy.admin-invite'


def make_admin_invite_token(organization_id=None):
    payload = {'role': 'admin'}
    if organization_id is not None:
        payload['organization_id'] = int(organization_id)
    return signing.dumps(payload, salt=ADMIN_INVITE_SALT)


def get_admin_invite_payload(token):
    if not token:
        return None

    try:
        return signing.loads(token, salt=ADMIN_INVITE_SALT, max_age=ADMIN_INVITE_MAX_AGE_SECONDS)
    except signing.BadSignature:
        return None
    except signing.SignatureExpired:
        return None


def is_valid_admin_invite_token(token):
    payload = get_admin_invite_payload(token)
    if not payload:
        return False
    return payload.get('role') == 'admin'
