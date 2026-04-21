from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from config.media_utils import user_avatar_path


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    CUSTOMER = 'customer'
    ADMIN = 'admin'
    ROLE_CHOICES = [
        (CUSTOMER, 'Customer'),
        (ADMIN, 'Admin'),
    ]

    PERSONAL = 'personal'
    COMPANY = 'company'
    USER_TYPE_CHOICES = [
        (PERSONAL, 'Personal'),
        (COMPANY, 'Company'),
    ]

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default=PERSONAL)
    company_name = models.CharField(max_length=200, blank=True)
    company_id = models.CharField(max_length=11, blank=True, help_text='საიდენტიფიკაციო კოდი (11 digits)')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to=user_avatar_path, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=CUSTOMER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'
