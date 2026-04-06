from rest_framework import serializers
from .models import Order, OrderImage, OrderStatusHistory
from categories.serializers import TransportCategoryPublicSerializer
from accounts.serializers import UserSerializer
from vehicles.serializers import VehicleListSerializer


class OrderImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderImage
        fields = ['id', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True, default='')

    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'old_status', 'new_status', 'changed_by', 'changed_by_name', 'comment', 'created_at']


class OrderListSerializer(serializers.ModelSerializer):
    selected_category_name = serializers.CharField(
        source='selected_category.name', read_only=True, default=''
    )
    selected_category_icon = serializers.CharField(
        source='selected_category.icon', read_only=True, default='car'
    )
    selected_category_color = serializers.CharField(
        source='selected_category.color', read_only=True, default='#1677ff'
    )
    final_category_name = serializers.CharField(
        source='final_category.name', read_only=True, default=''
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    image_count = serializers.IntegerField(source='images.count', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'pickup_location', 'destination_location', 'requested_date',
            'requested_time', 'contact_name', 'status', 'status_display',
            'urgency', 'urgency_display', 'selected_category_name',
            'selected_category_icon', 'selected_category_color',
            'final_category_name', 'is_cancellable', 'image_count', 'created_at',
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    images = OrderImageSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    selected_category_detail = TransportCategoryPublicSerializer(source='selected_category', read_only=True)
    suggested_category_detail = TransportCategoryPublicSerializer(source='suggested_category', read_only=True)
    final_category_detail = TransportCategoryPublicSerializer(source='final_category', read_only=True)
    assigned_vehicle_detail = VehicleListSerializer(source='assigned_vehicle', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_detail',
            'suggested_category', 'suggested_category_detail',
            'selected_category', 'selected_category_detail',
            'final_category', 'final_category_detail',
            'assigned_vehicle', 'assigned_vehicle_detail',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination_location', 'destination_lat', 'destination_lng',
            'requested_date', 'requested_time',
            'contact_name', 'contact_phone',
            'description', 'cargo_details',
            'urgency', 'urgency_display',
            'status', 'status_display',
            'admin_comment', 'user_note',
            'is_cancellable',
            'images', 'status_history',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )

    class Meta:
        model = Order
        fields = [
            'selected_category', 'suggested_category',
            'pickup_location', 'pickup_lat', 'pickup_lng',
            'destination_location', 'destination_lat', 'destination_lng',
            'requested_date', 'requested_time',
            'contact_name', 'contact_phone',
            'description', 'cargo_details',
            'urgency', 'user_note', 'images',
        ]

    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        user = self.context['request'].user
        order = Order.objects.create(user=user, **validated_data)

        for image_file in images_data:
            OrderImage.objects.create(order=order, image=image_file)

        OrderStatusHistory.objects.create(
            order=order, old_status='', new_status=Order.STATUS_NEW,
            changed_by=user, comment='Order created',
        )
        return order


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['final_category', 'assigned_vehicle', 'admin_comment', 'status']

    def update(self, instance, validated_data):
        new_status = validated_data.get('status')
        if new_status and new_status != instance.status:
            OrderStatusHistory.objects.create(
                order=instance,
                old_status=instance.status,
                new_status=new_status,
                changed_by=self.context['request'].user,
                comment=validated_data.get('admin_comment', ''),
            )
        return super().update(instance, validated_data)


class AdminCommentSerializer(serializers.Serializer):
    comment = serializers.CharField()
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, required=False)
