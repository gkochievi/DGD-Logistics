from rest_framework import generics, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, F, Q, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta

from .models import CompanyContract
from .serializers import (
    RegisterSerializer, UserSerializer, ProfileUpdateSerializer,
    ChangePasswordSerializer, AdminUserSerializer, AdminCreateUserSerializer,
    AdminResetPasswordSerializer, CompanyContractSerializer,
)
from .permissions import IsAdmin

User = get_user_model()

# Tracks contract documents accepted on upload. Mirrors the frontend
# accept attribute. Anything else is rejected with a clear message.
ALLOWED_CONTRACT_EXTS = {'.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt',
                         '.jpg', '.jpeg', '.png', '.webp'}
MAX_CONTRACT_SIZE = 20 * 1024 * 1024  # 20 MB


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Include user role and name in token response."""
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfileUpdateSerializer
        return UserSerializer


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.must_change_password = False
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


class ProfileStatsView(APIView):
    def get(self, request):
        user = request.user
        orders = user.orders.all()
        return Response({
            'total_orders': orders.count(),
            'active_orders': orders.filter(
                status__in=['new', 'under_review', 'approved', 'in_progress']
            ).count(),
            'completed_orders': orders.filter(status='completed').count(),
            'cancelled_orders': orders.filter(status='cancelled').count(),
        })


# --- Admin views ---

class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']
    ordering_fields = ['created_at', 'email', 'first_name']

    def get_queryset(self):
        return User.objects.annotate(order_count=Count('orders'))


class AdminUserCreateView(generics.CreateAPIView):
    serializer_class = AdminCreateUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.annotate(order_count=Count('orders'))


def _validate_contract_file(uploaded):
    """Reject obvious bad uploads early so the serializer error path is
    consistent (and we never persist a 50MB PDF). Returns a string error
    or None on success."""
    if uploaded is None:
        return 'No file was uploaded.'
    name = (getattr(uploaded, 'name', '') or '').lower()
    ext = name.rsplit('.', 1)[-1] if '.' in name else ''
    if f'.{ext}' not in ALLOWED_CONTRACT_EXTS:
        return 'Unsupported file type. Allowed: PDF, DOC, DOCX, ODT, RTF, TXT, JPG, PNG, WEBP.'
    if getattr(uploaded, 'size', 0) > MAX_CONTRACT_SIZE:
        return 'File exceeds the 20MB limit.'
    return None


class AdminUserContractsView(APIView):
    """List a user's contracts and upload new ones (admin only)."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_target(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        target = self._get_target(pk)
        if target is None:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        qs = target.contracts.all().order_by('-created_at')
        return Response(
            CompanyContractSerializer(qs, many=True, context={'request': request}).data
        )

    def post(self, request, pk):
        target = self._get_target(pk)
        if target is None:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target.user_type != User.COMPANY:
            return Response(
                {'detail': 'Contracts can only be uploaded for company users.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        err = _validate_contract_file(request.FILES.get('document'))
        if err:
            return Response({'document': [err]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CompanyContractSerializer(
            data=request.data,
            context={'request': request, 'target_user': target},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminUserContractDetailView(APIView):
    """Delete a single contract belonging to a user (admin only)."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def delete(self, request, pk, contract_id):
        try:
            contract = CompanyContract.objects.get(pk=contract_id, user_id=pk)
        except CompanyContract.DoesNotExist:
            return Response({'detail': 'Contract not found.'}, status=status.HTTP_404_NOT_FOUND)
        contract.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerContractsView(APIView):
    """A company customer reads their own contracts. Personal users get
    an empty list — no error so the frontend can render a single profile
    page regardless of user_type."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.user_type != User.COMPANY:
            return Response([])
        qs = request.user.contracts.all().order_by('-created_at')
        return Response(
            CompanyContractSerializer(qs, many=True, context={'request': request}).data
        )


class AdminResetUserPasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target.set_password(serializer.validated_data['new_password'])
        target.must_change_password = True
        target.save()
        return Response({'detail': 'Password reset. User must change it on next login.'})


class AdminDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        from orders.models import Order
        from vehicles.models import Vehicle
        from drivers.models import Driver
        users = User.objects.all()
        orders = Order.objects.all()
        open_orders = orders.filter(status__in=['new', 'under_review', 'approved', 'in_progress'])

        today = timezone.now().date()
        week_start = today - timedelta(days=6)
        prev_week_start = week_start - timedelta(days=7)
        daily = (
            orders.filter(created_at__date__gte=week_start)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(total=Count('id'), completed=Count('id', filter=Q(status='completed')))
            .order_by('date')
        )
        daily_map = {d['date'].isoformat(): {'total': d['total'], 'completed': d['completed']} for d in daily}
        daily_trend = []
        for i in range(7):
            day = week_start + timedelta(days=i)
            key = day.isoformat()
            entry = daily_map.get(key, {'total': 0, 'completed': 0})
            daily_trend.append({'date': key, 'total': entry['total'], 'completed': entry['completed']})

        current_week_total = orders.filter(created_at__date__gte=week_start).count()
        prev_week_total = orders.filter(
            created_at__date__gte=prev_week_start,
            created_at__date__lt=week_start,
        ).count()

        return Response({
            'total_users': users.count(),
            'active_users': users.filter(is_active=True).count(),
            'new_orders': orders.filter(status='new').count(),
            'under_review_orders': orders.filter(status='under_review').count(),
            'approved_orders': orders.filter(status='approved').count(),
            'in_progress_orders': orders.filter(status='in_progress').count(),
            'active_orders': orders.filter(
                status__in=['under_review', 'approved', 'in_progress']
            ).count(),
            'completed_orders': orders.filter(status='completed').count(),
            'rejected_orders': orders.filter(status='rejected').count(),
            'cancelled_orders': orders.filter(status='cancelled').count(),
            'total_orders': orders.count(),
            'total_vehicles': Vehicle.objects.count(),
            'total_drivers': Driver.objects.count(),
            'open_urgency': {
                'low': open_orders.filter(urgency='low').count(),
                'normal': open_orders.filter(urgency='normal').count(),
                'high': open_orders.filter(urgency='high').count(),
                'urgent': open_orders.filter(urgency='urgent').count(),
            },
            'daily_trend': daily_trend,
            'current_week_total': current_week_total,
            'prev_week_total': prev_week_total,
        })


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        from orders.models import Order
        from vehicles.models import Vehicle

        now = timezone.now()
        today = now.date()
        days_param = int(request.query_params.get('days', 30))
        start_date = today - timedelta(days=days_param)

        orders = Order.objects.all()
        period_orders = orders.filter(created_at__date__gte=start_date)

        # ── Daily order counts (last N days) ──
        daily_orders = (
            period_orders
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
                cancelled=Count('id', filter=Q(status='cancelled')),
                rejected=Count('id', filter=Q(status='rejected')),
            )
            .order_by('date')
        )
        daily_list = []
        for d in daily_orders:
            daily_list.append({
                'date': d['date'].isoformat(),
                'total': d['total'],
                'completed': d['completed'],
                'cancelled': d['cancelled'],
                'rejected': d['rejected'],
            })

        # ── Weekly order counts (last 12 weeks) ──
        week_start = today - timedelta(weeks=12)
        weekly_orders = (
            orders.filter(created_at__date__gte=week_start)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
            )
            .order_by('week')
        )
        weekly_list = [
            {'week': w['week'].isoformat(), 'total': w['total'], 'completed': w['completed']}
            for w in weekly_orders
        ]

        # ── Monthly order counts (last 12 months) ──
        month_start = today - timedelta(days=365)
        monthly_orders = (
            orders.filter(created_at__date__gte=month_start)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
            )
            .order_by('month')
        )
        monthly_list = [
            {'month': m['month'].strftime('%Y-%m'), 'total': m['total'], 'completed': m['completed']}
            for m in monthly_orders
        ]

        # ── Orders by service (customer-facing pivot) ──
        by_service = (
            period_orders
            .filter(selected_service__isnull=False)
            .values(name=F('selected_service__name'), color=F('selected_service__color'))
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # ── Orders by status (all time) ──
        by_status = (
            orders.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # ── Orders by urgency ──
        by_urgency = (
            period_orders.values('urgency')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # ── Vehicle fleet stats ──
        vehicles = Vehicle.objects.all()
        fleet_by_status = (
            vehicles.values('status')
            .annotate(count=Count('id'))
        )
        fleet_by_category = (
            vehicles.filter(is_active=True, categories__isnull=False)
            .values(cat_name=F('categories__name'), color=F('categories__color'))
            .annotate(count=Count('id', distinct=True))
            .order_by('-count')
        )
        fleet_by_category = [
            {'name': f['cat_name'], 'color': f['color'], 'count': f['count']}
            for f in fleet_by_category
        ]

        # ── Income / pricing analytics ──
        # Estimated revenue from completed orders with assigned vehicles
        completed_with_vehicle = orders.filter(
            status='completed',
            assigned_vehicle__isnull=False,
        )
        total_revenue_hourly = completed_with_vehicle.aggregate(
            total=Sum('assigned_vehicle__price_per_hour')
        )['total'] or 0

        avg_price_per_hour = vehicles.filter(
            is_active=True, price_per_hour__isnull=False
        ).aggregate(avg=Avg('price_per_hour'))['avg'] or 0

        avg_price_per_km = vehicles.filter(
            is_active=True, price_per_km__isnull=False
        ).aggregate(avg=Avg('price_per_km'))['avg'] or 0

        # Revenue by service (estimated hourly rate per completed order)
        revenue_by_service = (
            completed_with_vehicle
            .filter(assigned_vehicle__price_per_hour__isnull=False)
            .values(name=F('selected_service__name'), color=F('selected_service__color'))
            .annotate(
                orders=Count('id'),
                revenue=Sum('assigned_vehicle__price_per_hour'),
            )
            .order_by('-revenue')
        )

        # Daily revenue trend
        daily_revenue = (
            completed_with_vehicle
            .filter(
                assigned_vehicle__price_per_hour__isnull=False,
                created_at__date__gte=start_date,
            )
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(revenue=Sum('assigned_vehicle__price_per_hour'))
            .order_by('date')
        )
        daily_revenue_list = [
            {'date': d['date'].isoformat(), 'revenue': float(d['revenue'])}
            for d in daily_revenue
        ]

        # ── Period comparison ──
        prev_start = start_date - timedelta(days=days_param)
        current_count = period_orders.count()
        prev_count = orders.filter(
            created_at__date__gte=prev_start,
            created_at__date__lt=start_date,
        ).count()
        current_completed = period_orders.filter(status='completed').count()
        prev_completed = orders.filter(
            created_at__date__gte=prev_start,
            created_at__date__lt=start_date,
            status='completed',
        ).count()

        # ── Today's stats ──
        today_orders = orders.filter(created_at__date=today).count()
        this_week_orders = orders.filter(
            created_at__date__gte=today - timedelta(days=today.weekday())
        ).count()
        this_month_orders = orders.filter(
            created_at__date__year=today.year,
            created_at__date__month=today.month,
        ).count()

        # ── New users trend ──
        new_users_daily = (
            User.objects.filter(created_at__date__gte=start_date)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        new_users_list = [
            {'date': d['date'].isoformat(), 'count': d['count']}
            for d in new_users_daily
        ]

        # ── Users by type (personal vs company) ──
        all_users = User.objects.filter(role='customer')
        users_by_type = list(
            all_users.values('user_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        total_personal = all_users.filter(user_type='personal').count()
        total_company = all_users.filter(user_type='company').count()

        # Orders by user type
        orders_by_user_type = list(
            period_orders
            .values(user_type=F('user__user_type'))
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # ── Completion / cancellation / rejection rates (period) ──
        period_total = period_orders.count()
        period_completed = period_orders.filter(status='completed').count()
        period_cancelled = period_orders.filter(status='cancelled').count()
        period_rejected = period_orders.filter(status='rejected').count()

        def _pct(n, d):
            return round((n / d) * 100, 1) if d else 0.0

        completion_rate = _pct(period_completed, period_total)
        cancellation_rate = _pct(period_cancelled, period_total)
        rejection_rate = _pct(period_rejected, period_total)

        # ── Avg completion time (hours) — uses status history 'completed' entry ──
        from orders.models import OrderStatusHistory
        completed_durations = (
            OrderStatusHistory.objects
            .filter(
                new_status='completed',
                order__created_at__date__gte=start_date,
            )
            .annotate(duration=ExpressionWrapper(
                F('created_at') - F('order__created_at'),
                output_field=DurationField(),
            ))
            .aggregate(avg=Avg('duration'))
        )
        avg_duration = completed_durations['avg']
        avg_completion_hours = (
            round(avg_duration.total_seconds() / 3600, 1) if avg_duration else 0.0
        )

        # ── Top customers (period, by order count, with est. revenue) ──
        top_customers_qs = (
            period_orders
            .values(
                'user__id',
                'user__first_name',
                'user__last_name',
                'user__email',
                'user__user_type',
            )
            .annotate(
                orders=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
                revenue=Sum(
                    'assigned_vehicle__price_per_hour',
                    filter=Q(status='completed', assigned_vehicle__price_per_hour__isnull=False),
                ),
            )
            .order_by('-orders')[:10]
        )
        top_customers = [
            {
                'user_id': c['user__id'],
                'name': f"{c['user__first_name'] or ''} {c['user__last_name'] or ''}".strip() or c['user__email'],
                'email': c['user__email'],
                'user_type': c['user__user_type'],
                'orders': c['orders'],
                'completed': c['completed'],
                'revenue': float(c['revenue'] or 0),
            }
            for c in top_customers_qs
        ]

        return Response({
            'period_days': days_param,
            'today_orders': today_orders,
            'this_week_orders': this_week_orders,
            'this_month_orders': this_month_orders,
            'daily_orders': daily_list,
            'weekly_orders': weekly_list,
            'monthly_orders': monthly_list,
            'by_service': list(by_service),
            'by_status': list(by_status),
            'by_urgency': list(by_urgency),
            'fleet_by_status': list(fleet_by_status),
            'fleet_by_category': list(fleet_by_category),
            'revenue': {
                'total_estimated': float(total_revenue_hourly),
                'avg_price_per_hour': round(float(avg_price_per_hour), 2),
                'avg_price_per_km': round(float(avg_price_per_km), 2),
                'by_service': list(revenue_by_service),
                'daily_trend': daily_revenue_list,
            },
            'comparison': {
                'current_orders': current_count,
                'previous_orders': prev_count,
                'current_completed': current_completed,
                'previous_completed': prev_completed,
            },
            'new_users_daily': new_users_list,
            'users_by_type': users_by_type,
            'total_personal_users': total_personal,
            'total_company_users': total_company,
            'orders_by_user_type': orders_by_user_type,
            'rates': {
                'completion': completion_rate,
                'cancellation': cancellation_rate,
                'rejection': rejection_rate,
            },
            'avg_completion_hours': avg_completion_hours,
            'top_customers': top_customers,
        })
