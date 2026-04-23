from django.urls import path
from . import views

urlpatterns = [
    # Customer
    path('', views.CustomerOrderListView.as_view(), name='customer_orders'),
    path('active/', views.CustomerActiveOrdersView.as_view(), name='customer_active_orders'),
    path('notifications/', views.CustomerNotificationsView.as_view(), name='customer_notifications'),
    path('notifications/mark-read/', views.CustomerMarkAllReadView.as_view(), name='customer_mark_read'),
    path('create/', views.CustomerOrderCreateView.as_view(), name='customer_order_create'),
    path('<int:pk>/', views.CustomerOrderDetailView.as_view(), name='customer_order_detail'),
    path('<int:pk>/cancel/', views.CustomerCancelOrderView.as_view(), name='customer_order_cancel'),
    path('<int:pk>/accept/', views.CustomerAcceptOfferView.as_view(), name='customer_order_accept'),
    path('<int:pk>/upload/', views.CustomerUploadImagesView.as_view(), name='customer_order_upload'),

    # Admin
    path('admin/', views.AdminOrderListView.as_view(), name='admin_orders'),
    path('admin/export/', views.AdminOrdersExportView.as_view(), name='admin_orders_export'),
    path('admin/notifications/', views.AdminNotificationsView.as_view(), name='admin_notifications'),
    path('admin/notifications/mark-read/', views.AdminMarkAllReadView.as_view(), name='admin_mark_read'),
    path('admin/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin_order_detail'),
    path('admin/<int:pk>/export/', views.AdminOrderExportDetailView.as_view(), name='admin_order_export'),
    path('admin/<int:pk>/status/', views.AdminOrderStatusChangeView.as_view(), name='admin_order_status'),
]
