"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from core.permissions import all_permissions
from core.utils.common import load_func
from django.conf import settings
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers
from users.models import User


class BaseUserSerializer(FlexFieldsModelSerializer):
    # short form for user presentation
    initials = serializers.SerializerMethodField(default='?', read_only=True)
    avatar = serializers.SerializerMethodField(read_only=True)
    active_organization_meta = serializers.SerializerMethodField(read_only=True)
    last_activity = serializers.DateTimeField(read_only=True, source='last_activity_cached')

    # ----------------------------------------------------------
    # FixStudio: expose RBAC fields for the current viewer.
    # These read from OrganizationMember for the user's active org.
    # ----------------------------------------------------------
    role = serializers.SerializerMethodField(read_only=True)
    is_admin = serializers.SerializerMethodField(read_only=True)
    is_reviewer = serializers.SerializerMethodField(read_only=True)
    is_annotator = serializers.SerializerMethodField(read_only=True)
    is_suspended = serializers.SerializerMethodField(read_only=True)

    def _membership_for_active_org(self, instance):
        from organizations.models import OrganizationMember
        org_id = getattr(instance, 'active_organization_id', None)
        if not org_id:
            return None
        # use prefetched if available
        try:
            members = list(instance.om_through.all())
            for m in members:
                if m.organization_id == org_id and m.deleted_at is None:
                    return m
        except Exception:
            pass
        return OrganizationMember.objects.filter(
            user=instance, organization_id=org_id, deleted_at__isnull=True
        ).first()

    def get_role(self, instance):
        m = self._membership_for_active_org(instance)
        return m.role if m else None

    def get_is_admin(self, instance):
        m = self._membership_for_active_org(instance)
        return bool(m and m.is_admin)

    def get_is_reviewer(self, instance):
        m = self._membership_for_active_org(instance)
        return bool(m and m.is_reviewer)

    def get_is_annotator(self, instance):
        m = self._membership_for_active_org(instance)
        return bool(m and m.is_annotator_role)

    def get_is_suspended(self, instance):
        m = self._membership_for_active_org(instance)
        return bool(m and m.is_suspended)

    def get_avatar(self, instance):
        return instance.avatar_url

    def get_initials(self, instance):
        return instance.get_initials(self._is_deleted(instance))

    def get_active_organization_meta(self, instance):
        organization = instance.active_organization
        if organization is None:
            return {'title': '', 'email': ''}

        title = organization.title
        email = ''

        if organization.created_by is not None and organization.created_by.email is not None:
            email = organization.created_by.email

        return {'title': title, 'email': email}

    def _is_deleted(self, instance):
        if 'user' in self.context:
            org_id = self.context['user'].active_organization_id
        elif 'request' in self.context:
            org_id = self.context['request'].user.active_organization_id
        else:
            org_id = None

        if not org_id:
            return False

        # Will use prefetched objects if available
        organization_members = instance.om_through.all()
        organization_member_for_user = next(
            (
                organization_member
                for organization_member in organization_members
                if organization_member.organization_id == org_id
            ),
            None,
        )
        if not organization_member_for_user:
            return True
        return bool(organization_member_for_user.deleted_at)

    def to_representation(self, instance):
        """Returns user with cache, this helps to avoid multiple s3/gcs links resolving for avatars"""

        uid = instance.id
        key = 'user_cache'

        if key not in self.context:
            self.context[key] = {}
        if uid not in self.context[key]:
            self.context[key][uid] = super().to_representation(instance)

        if self._is_deleted(instance):
            for field in ['username', 'first_name', 'last_name', 'email']:
                self.context[key][uid][field] = 'User' if field == 'last_name' else 'Deleted'

        return self.context[key][uid]

    class Meta:
        model = User
        fields = (
            'id',
            'first_name',
            'last_name',
            'username',
            'email',
            'last_activity',
            'custom_hotkeys',
            'avatar',
            'initials',
            'phone',
            'active_organization',
            'active_organization_meta',
            'allow_newsletters',
            'date_joined',
            # FixStudio RBAC fields
            'role',
            'is_admin',
            'is_reviewer',
            'is_annotator',
            'is_suspended',
        )


class BaseUserSerializerUpdate(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        read_only_fields = ('email',)


class BaseWhoAmIUserSerializer(BaseUserSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        fields = BaseUserSerializer.Meta.fields + ('permissions',)

    def get_permissions(self, user) -> list[str]:
        return [perm for _, perm in all_permissions]


class UserSimpleSerializer(BaseUserSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'username', 'email', 'avatar')


UserSerializer = load_func(settings.USER_SERIALIZER)
UserSerializerUpdate = load_func(settings.USER_SERIALIZER_UPDATE)


class HotkeysSerializer(serializers.Serializer):
    custom_hotkeys = serializers.DictField(required=True)

    # Security: Define dangerous key combinations that should be blocked
    DANGEROUS_KEY_COMBINATIONS = [
        'ctrl+alt+delete',
        'cmd+alt+escape',
        'alt+f4',
        'ctrl+alt+esc',
        'cmd+option+esc',
        'ctrl+shift+esc',
        'cmd+shift+q',
        'alt+tab',
        'cmd+tab',
        'ctrl+alt+t',
        'cmd+space',
    ]

    MAX_HOTKEYS = 200

    def validate_custom_hotkeys(self, custom_hotkeys):
        if not isinstance(custom_hotkeys, dict):
            raise serializers.ValidationError('custom_hotkeys must be a dict')
        if len(custom_hotkeys) > self.MAX_HOTKEYS:
            raise serializers.ValidationError(
                f'Maximum {self.MAX_HOTKEYS} custom hotkeys allowed'
            )
        for action_key, hotkey_data in custom_hotkeys.items():
            if not isinstance(hotkey_data, dict):
                raise serializers.ValidationError(
                    f'Hotkey data for "{action_key}" must be a dict'
                )
            if 'key' not in hotkey_data:
                raise serializers.ValidationError(
                    f'Hotkey "{action_key}" must have a "key" field'
                )
            key_combo = str(hotkey_data['key']).lower().strip()
            if key_combo in self.DANGEROUS_KEY_COMBINATIONS:
                raise serializers.ValidationError(
                    f'Key combination "{key_combo}" is not allowed'
                )
        return custom_hotkeys
