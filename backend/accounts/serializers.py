from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from .models import CompanyContract

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone_number', 'first_name', 'last_name',
            'user_type', 'company_name', 'company_id',
            'password', 'confirm_password',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({'email': 'Email already registered.'})
        if attrs.get('user_type') == 'company':
            cid = attrs.get('company_id', '')
            if not cid or not cid.isdigit() or len(cid) != 11:
                raise serializers.ValidationError({'company_id': 'Company ID must be exactly 11 digits.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone_number', 'first_name', 'last_name',
            'full_name', 'role', 'user_type', 'company_name', 'company_id',
            'avatar', 'avatar_url',
            'is_active', 'must_change_password', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'avatar', 'must_change_password', 'created_at', 'updated_at']

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url


class ProfileUpdateSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone_number', 'user_type', 'company_name', 'avatar', 'avatar_url']

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url

    def to_internal_value(self, data):
        # Allow clearing the avatar by sending empty string
        if hasattr(data, 'get') and data.get('avatar') == '':
            mutable = {k: data[k] for k in data}
            mutable['avatar'] = None
            return super().to_internal_value(mutable)
        return super().to_internal_value(data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context['request'].user
        old_pw = attrs.get('old_password') or ''
        new_pw = attrs.get('new_password')
        confirm = attrs.get('confirm_password')

        # When forced to change password, old_password is not required.
        if not user.must_change_password:
            if not old_pw:
                raise serializers.ValidationError({'old_password': 'Current password is required.'})
            if not user.check_password(old_pw):
                raise serializers.ValidationError({'old_password': 'Current password is incorrect.'})

        if confirm is not None and confirm != '' and new_pw != confirm:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        if old_pw and new_pw and new_pw == old_pw:
            raise serializers.ValidationError({'new_password': 'New password must be different from the current one.'})
        return attrs


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    order_count = serializers.IntegerField(read_only=True, required=False)
    contract_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone_number', 'first_name', 'last_name',
            'full_name', 'role', 'user_type', 'company_name', 'company_id',
            'is_active', 'must_change_password', 'created_at', 'updated_at',
            'order_count', 'contract_count',
        ]
        read_only_fields = ['id', 'must_change_password', 'created_at', 'updated_at']


class AdminResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, validators=[validate_password])


class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone_number', 'first_name', 'last_name',
            'role', 'user_type', 'company_name', 'company_id', 'is_active', 'password',
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CompanyContractSerializer(serializers.ModelSerializer):
    document_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.full_name', read_only=True, default='',
    )

    class Meta:
        model = CompanyContract
        fields = [
            'id', 'title', 'original_filename', 'file_size',
            'document', 'document_url',
            'uploaded_by', 'uploaded_by_name',
            'created_at',
        ]
        read_only_fields = [
            'id', 'original_filename', 'file_size', 'document_url',
            'uploaded_by', 'uploaded_by_name', 'created_at',
        ]
        extra_kwargs = {
            'document': {'write_only': True, 'required': True},
            'title': {'required': False, 'allow_blank': True},
        }

    def get_document_url(self, obj):
        if not obj.document:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.document.url)
        return obj.document.url

    def create(self, validated_data):
        request = self.context['request']
        target_user = self.context['target_user']
        document = validated_data['document']
        validated_data['original_filename'] = getattr(document, 'name', '') or ''
        validated_data['file_size'] = getattr(document, 'size', 0) or 0
        if not validated_data.get('title'):
            # Drop the extension so the visible label is "Service Agreement"
            # rather than "Service Agreement.pdf".
            base = validated_data['original_filename'].rsplit('.', 1)[0]
            validated_data['title'] = base or 'Contract'
        validated_data['user'] = target_user
        validated_data['uploaded_by'] = request.user
        return CompanyContract.objects.create(**validated_data)
