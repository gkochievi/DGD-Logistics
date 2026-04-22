from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from categories.models import TransportCategory
from services.models import Service
from orders.models import Order, OrderStatusHistory
from vehicles.models import Vehicle
from datetime import date, time, timedelta
import random

User = get_user_model()

CATEGORIES = [
    # --- Transport services (from → to) ---
    {'name': 'Tow Truck', 'description': 'Towing and roadside recovery for broken-down or accident vehicles.', 'icon': 'car', 'color': '#1677ff', 'requires_destination': True, 'suggestion_keywords': 'tow,towing,broken car,accident,roadside,recovery,breakdown,stuck vehicle,flat tire,car transport'},
    {'name': 'Flatbed Truck', 'description': 'Open flatbed for transporting heavy equipment, containers, and oversized loads.', 'icon': 'inbox', 'color': '#2f54eb', 'requires_destination': True, 'suggestion_keywords': 'flatbed,heavy load,container,oversized,platform,equipment transport,machinery'},
    {'name': 'Concrete Mixer', 'description': 'Concrete mixing and delivery for construction sites and foundations.', 'icon': 'experiment', 'color': '#722ed1', 'requires_destination': True, 'suggestion_keywords': 'concrete,cement,mixing,pouring,foundation,slab,floor,driveway,sidewalk'},
    {'name': 'Dump Truck', 'description': 'Hauling and dumping sand, gravel, dirt, demolition debris.', 'icon': 'database', 'color': '#a0522d', 'requires_destination': True, 'suggestion_keywords': 'dump,sand,gravel,dirt,debris,hauling,rubble,waste,fill,aggregate,rock'},
    {'name': 'Tanker Truck', 'description': 'Liquid transport — water, fuel, chemicals, milk, and other fluids.', 'icon': 'fire', 'color': '#f5222d', 'requires_destination': True, 'suggestion_keywords': 'tanker,water,fuel,liquid,chemical,milk,oil,gasoline,diesel,fluid,tank'},
    {'name': 'Refrigerated Truck', 'description': 'Temperature-controlled transport for perishable goods and food.', 'icon': 'cloud', 'color': '#36cfc9', 'requires_destination': True, 'suggestion_keywords': 'refrigerated,cold,frozen,perishable,food,temperature,cool,ice cream,meat,fish'},
    {'name': 'Car Carrier', 'description': 'Multi-car transport trailer for moving multiple vehicles at once.', 'icon': 'car', 'color': '#597ef7', 'requires_destination': True, 'suggestion_keywords': 'car carrier,auto transport,vehicle,multiple cars,dealer,auction,fleet,car shipping'},
    {'name': 'Lowboy Trailer', 'description': 'Low-deck trailer for transporting tall or extra-heavy machinery.', 'icon': 'minus', 'color': '#8c8c8c', 'requires_destination': True, 'suggestion_keywords': 'lowboy,low loader,heavy machinery,oversize,tall,heavy haul,transport'},
    # --- On-site services (just need location) ---
    {'name': 'Crane Truck', 'description': 'Mobile crane for lifting and moving heavy objects at construction sites.', 'icon': 'column-height', 'color': '#13c2c2', 'requires_destination': False, 'suggestion_keywords': 'crane,lift,lifting,hoist,heavy,construction,steel,beam,prefab,installation'},
    {'name': 'Excavator', 'description': 'Digging, trenching, and earth-moving for construction and utility work.', 'icon': 'build', 'color': '#fa8c16', 'requires_destination': False, 'suggestion_keywords': 'excavator,digging,trench,earth,utility,pipe,foundation,basement,pool,ditch'},
    {'name': 'Bulldozer', 'description': 'Earth-moving, grading and land clearing for construction sites.', 'icon': 'thunderbolt', 'color': '#eb2f96', 'requires_destination': False, 'suggestion_keywords': 'bulldozer,leveling,grading,earth moving,demolition,clearing,push,land,site prep'},
    {'name': 'Tractor', 'description': 'Agricultural tractor for plowing, seeding, and farm work.', 'icon': 'tool', 'color': '#52c41a', 'requires_destination': False, 'suggestion_keywords': 'tractor,field,agriculture,farm,soil,plowing,harvesting,crop,farmland,seeding'},
    {'name': 'Forklift', 'description': 'Warehouse and site forklift for pallet and cargo handling.', 'icon': 'vertical-align-top', 'color': '#faad14', 'requires_destination': False, 'suggestion_keywords': 'forklift,pallet,warehouse,cargo,loading,unloading,stack,storage,dock'},
    {'name': 'Boom Lift / Cherry Picker', 'description': 'Aerial work platform for high-altitude repairs and installations.', 'icon': 'arrow-up', 'color': '#ff7a45', 'requires_destination': False, 'suggestion_keywords': 'boom,lift,cherry picker,aerial,height,high,platform,window,sign,tree,painting'},
    {'name': 'Road Roller / Compactor', 'description': 'Road surface compaction for asphalt, gravel, and soil.', 'icon': 'compress', 'color': '#595959', 'requires_destination': False, 'suggestion_keywords': 'roller,compactor,road,asphalt,paving,surface,compact,flatten,parking'},
    {'name': 'Generator Truck', 'description': 'Mobile power generator for events, construction, or emergency backup.', 'icon': 'bulb', 'color': '#ffc53d', 'requires_destination': False, 'suggestion_keywords': 'generator,power,electricity,backup,event,construction,mobile power,outage'},
]


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding categories...')
        cats = {}
        for cat_data in CATEGORIES:
            cat, created = TransportCategory.objects.update_or_create(
                name=cat_data['name'],
                defaults={
                    'description': cat_data['description'],
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'suggestion_keywords': cat_data['suggestion_keywords'],
                },
            )
            cats[cat.name] = cat
            status_msg = 'created' if created else 'updated'
            self.stdout.write(f'  {cat.name} - {status_msg}')

        # Remove old categories that were renamed
        old_names = [
            'Tow Truck / Recovery Vehicle',
            'Cement Mixer / Concrete Mixer Truck',
        ]
        TransportCategory.objects.filter(name__in=old_names).delete()

        # Seed one Service per category so the customer-facing flow has tiles
        # on first boot. Each service is linked to its matching car category
        # (the M2M `car_categories` captures "which vehicles can perform this").
        self.stdout.write('Seeding services...')
        for cat_data in CATEGORIES:
            slug = slugify(cat_data['name']) or 'service'
            svc, created = Service.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description'],
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'requires_destination': cat_data.get('requires_destination', False),
                    'suggestion_keywords': cat_data['suggestion_keywords'],
                    'is_active': True,
                },
            )
            matching_cat = cats.get(cat_data['name'])
            if matching_cat:
                svc.car_categories.set([matching_cat])
            status_msg = 'created' if created else 'updated'
            self.stdout.write(f'  {cat_data["name"]} - {status_msg}')

        self.stdout.write('Seeding users...')
        admin_user, created = User.objects.get_or_create(
            email='admin@transport.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'phone_number': '+1234567890',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write('  Admin user created (admin@transport.com / admin123)')
        else:
            self.stdout.write('  Admin user exists')

        customer, created = User.objects.get_or_create(
            email='customer@demo.com',
            defaults={
                'first_name': 'John',
                'last_name': 'Doe',
                'phone_number': '+1987654321',
                'role': 'customer',
            },
        )
        if created:
            customer.set_password('customer123')
            customer.save()
            self.stdout.write('  Customer user created (customer@demo.com / customer123)')
        else:
            self.stdout.write('  Customer user exists')

        customer2, created = User.objects.get_or_create(
            email='jane@demo.com',
            defaults={
                'first_name': 'Jane',
                'last_name': 'Smith',
                'phone_number': '+1555000111',
                'role': 'customer',
            },
        )
        if created:
            customer2.set_password('customer123')
            customer2.save()
            self.stdout.write('  Customer 2 created (jane@demo.com / customer123)')
        else:
            self.stdout.write('  Customer 2 exists')

        customer3, created = User.objects.get_or_create(
            email='mike@demo.com',
            defaults={
                'first_name': 'Mike',
                'last_name': 'Wilson',
                'phone_number': '+1555222333',
                'role': 'customer',
            },
        )
        if created:
            customer3.set_password('customer123')
            customer3.save()
            self.stdout.write('  Customer 3 created (mike@demo.com / customer123)')
        else:
            self.stdout.write('  Customer 3 exists')

        self.stdout.write('Seeding orders...')
        today = date.today()

        demo_orders = [
            {'user': customer, 'selected_category': cats['Tow Truck'], 'pickup_location': '123 Main Street, Downtown', 'destination_location': 'City Auto Repair Shop', 'requested_date': today + timedelta(days=7), 'requested_time': time(9, 0), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'My car broke down on the highway, need towing to repair shop', 'urgency': 'high', 'status': 'new'},
            {'user': customer, 'selected_category': cats['Concrete Mixer'], 'pickup_location': 'Central Concrete Plant', 'destination_location': '456 Oak Avenue, Building Site', 'requested_date': today + timedelta(days=12), 'requested_time': time(7, 0), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'Need 10 cubic meters of concrete for foundation pouring', 'cargo_details': '10 cubic meters, grade C25/30', 'urgency': 'normal', 'status': 'approved'},
            {'user': customer2, 'selected_category': cats['Tractor'], 'pickup_location': 'Farm Equipment Depot', 'destination_location': 'Green Valley Farm', 'requested_date': today + timedelta(days=17), 'contact_name': 'Jane Smith', 'contact_phone': '+1555000111', 'description': 'Need tractor for spring plowing of 5 hectare field', 'urgency': 'low', 'status': 'under_review'},
            {'user': customer2, 'selected_category': cats['Bulldozer'], 'pickup_location': 'Heavy Equipment Yard', 'destination_location': '789 Pine Road, New Development', 'requested_date': today - timedelta(days=5), 'requested_time': time(8, 30), 'contact_name': 'Jane Smith', 'contact_phone': '+1555000111', 'description': 'Land leveling for new residential plot, 2000 sq meters', 'cargo_details': 'Moderate slope, rocky soil', 'urgency': 'normal', 'status': 'completed'},
            {'user': customer, 'selected_category': cats['Tow Truck'], 'pickup_location': 'Highway Exit 14', 'destination_location': 'Doe Residence Parking', 'requested_date': today - timedelta(days=10), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'Flat tire on the road, car is undriveable', 'urgency': 'urgent', 'status': 'completed'},
            {'user': customer3, 'selected_category': cats['Crane Truck'], 'pickup_location': 'Steel Fabrication Ltd', 'destination_location': '200 Harbor Blvd, Construction Site', 'requested_date': today + timedelta(days=5), 'requested_time': time(6, 0), 'contact_name': 'Mike Wilson', 'contact_phone': '+1555222333', 'description': 'Need crane to lift steel beams to 4th floor of building under construction', 'cargo_details': '12 beams, 500kg each, 8m length', 'urgency': 'high', 'status': 'in_progress'},
            {'user': customer3, 'selected_category': cats['Excavator'], 'pickup_location': 'Wilson Construction HQ', 'destination_location': '55 Lake Drive, Pool Project', 'requested_date': today + timedelta(days=3), 'requested_time': time(8, 0), 'contact_name': 'Mike Wilson', 'contact_phone': '+1555222333', 'description': 'Excavation for swimming pool installation, 10x5m, 2m deep', 'cargo_details': 'Clay soil, tight backyard access (3m gate)', 'urgency': 'normal', 'status': 'new'},
            {'user': customer, 'selected_category': cats['Flatbed Truck'], 'pickup_location': 'Port Container Terminal', 'destination_location': 'Warehouse District, Unit 14', 'requested_date': today + timedelta(days=8), 'requested_time': time(10, 0), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'Transport 20ft shipping container from port to warehouse', 'cargo_details': '20ft container, approx 8 tons', 'urgency': 'normal', 'status': 'under_review'},
            {'user': customer2, 'selected_category': cats['Dump Truck'], 'pickup_location': 'Quarry Road Gravel Pit', 'destination_location': 'Green Valley Farm, Access Road', 'requested_date': today + timedelta(days=6), 'contact_name': 'Jane Smith', 'contact_phone': '+1555000111', 'description': 'Deliver 3 loads of gravel for new farm access road', 'cargo_details': '30 tons total, crushed limestone', 'urgency': 'low', 'status': 'approved'},
            {'user': customer3, 'selected_category': cats['Tanker Truck'], 'pickup_location': 'Municipal Water Station', 'destination_location': 'Wilson Ranch, Cistern Fill', 'requested_date': today + timedelta(days=2), 'requested_time': time(7, 30), 'contact_name': 'Mike Wilson', 'contact_phone': '+1555222333', 'description': 'Fill ranch water cistern - 20,000 liters potable water', 'cargo_details': 'Potable water, cistern hatch is 50cm', 'urgency': 'high', 'status': 'new'},
            {'user': customer, 'selected_category': cats['Forklift'], 'pickup_location': 'Doe Imports Warehouse', 'destination_location': '', 'requested_date': today + timedelta(days=4), 'requested_time': time(9, 0), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'Unload delivery truck and organize pallets in warehouse', 'cargo_details': '40 pallets, max 800kg each', 'urgency': 'normal', 'status': 'approved'},
            {'user': customer2, 'selected_category': cats['Refrigerated Truck'], 'pickup_location': 'Seaview Fish Market', 'destination_location': '300 Restaurant Row', 'requested_date': today + timedelta(days=1), 'requested_time': time(5, 0), 'contact_name': 'Jane Smith', 'contact_phone': '+1555000111', 'description': 'Transport fresh seafood, must stay below 4C at all times', 'cargo_details': '2 tons of fish, ice packed', 'urgency': 'urgent', 'status': 'in_progress'},
            {'user': customer3, 'selected_category': cats['Car Carrier'], 'pickup_location': 'Metro Auto Auction', 'destination_location': 'Wilson Motors Dealership', 'requested_date': today - timedelta(days=3), 'contact_name': 'Mike Wilson', 'contact_phone': '+1555222333', 'description': 'Transport 6 cars purchased at auction to dealership', 'cargo_details': '4 sedans, 1 SUV, 1 pickup truck', 'urgency': 'normal', 'status': 'completed'},
            {'user': customer, 'selected_category': cats['Boom Lift / Cherry Picker'], 'pickup_location': 'Equipment Rentals Inc', 'destination_location': '88 Commerce Blvd', 'requested_date': today + timedelta(days=9), 'requested_time': time(8, 0), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'Need cherry picker for exterior building sign installation at 15m height', 'urgency': 'normal', 'status': 'new'},
            {'user': customer2, 'selected_category': cats['Road Roller / Compactor'], 'pickup_location': 'Highway Construction Co', 'destination_location': 'Green Valley Farm Entrance', 'requested_date': today - timedelta(days=8), 'contact_name': 'Jane Smith', 'contact_phone': '+1555000111', 'description': 'Compact new gravel driveway, 200m long', 'urgency': 'low', 'status': 'completed'},
            {'user': customer3, 'selected_category': cats['Generator Truck'], 'pickup_location': 'PowerGen Rentals', 'destination_location': 'City Park, Festival Grounds', 'requested_date': today + timedelta(days=14), 'requested_time': time(12, 0), 'contact_name': 'Mike Wilson', 'contact_phone': '+1555222333', 'description': 'Mobile generator needed for outdoor music festival, 3-day event', 'cargo_details': '200kW minimum, diesel', 'urgency': 'high', 'status': 'under_review'},
            {'user': customer, 'selected_category': cats['Lowboy Trailer'], 'pickup_location': 'Mining Equipment Depot', 'destination_location': 'Northern Quarry Site', 'requested_date': today + timedelta(days=11), 'requested_time': time(6, 0), 'contact_name': 'John Doe', 'contact_phone': '+1987654321', 'description': 'Transport large mining excavator to new quarry site, 45 tons', 'cargo_details': 'CAT 330 excavator, 45 tons, 3.2m tall', 'urgency': 'normal', 'status': 'rejected', 'admin_comment': 'Vehicle too heavy for requested route. Please contact us for alternative routing.'},
            {'user': customer2, 'selected_category': cats['Tow Truck'], 'pickup_location': 'Shopping Mall Parking, Level B2', 'destination_location': 'Smith Auto Service', 'requested_date': today - timedelta(days=1), 'contact_name': 'Jane Smith', 'contact_phone': '+1555000111', 'description': 'Car won\'t start, battery or starter issue, underground parking', 'urgency': 'normal', 'status': 'cancelled'},
        ]

        # Quick slug→Service lookup so we can mirror the category pick onto
        # selected_service (customer-facing taxonomy).
        svc_by_slug = {s.slug: s for s in Service.objects.all()}

        for order_data in demo_orders:
            desc = order_data['description']
            if not Order.objects.filter(user=order_data['user'], description=desc).exists():
                admin_comment = order_data.pop('admin_comment', '')
                matched_cat = order_data['selected_category']
                # Services are keyed on the same slug as their matching car
                # category (see services-seeding block above), so a slug lookup
                # maps the legacy category pick onto the customer-facing service.
                order_data['selected_service'] = svc_by_slug.get(matched_cat.slug)
                order = Order.objects.create(admin_comment=admin_comment, **order_data)
                OrderStatusHistory.objects.create(
                    order=order, old_status='', new_status='new',
                    changed_by=order_data['user'], comment='Order created (seed)',
                )
                if order_data['status'] != 'new':
                    OrderStatusHistory.objects.create(
                        order=order, old_status='new',
                        new_status=order_data['status'],
                        changed_by=admin_user,
                        comment=f'Status set to {order_data["status"]} (seed)',
                    )
                self.stdout.write(f'  Order created: {order}')

        # Seed vehicles
        self.stdout.write('Seeding vehicles...')
        demo_vehicles = [
            {'name': 'Mercedes Actros Tow Truck', 'category': 'Tow Truck', 'plate_number': 'TW-101', 'year': 2022, 'capacity': '10 tons', 'price_per_hour': 85, 'price_per_km': 3.50, 'description': 'Heavy-duty tow truck with hydraulic lift and winch', 'status': 'available'},
            {'name': 'Ford F-650 Flatbed', 'category': 'Flatbed Truck', 'plate_number': 'FB-201', 'year': 2023, 'capacity': '12 tons', 'price_per_hour': 95, 'price_per_km': 4.00, 'description': 'Extended flatbed with container locks', 'status': 'available'},
            {'name': 'Liebherr LTM 1060', 'category': 'Crane Truck', 'plate_number': 'CR-301', 'year': 2021, 'capacity': '60 tons lift', 'price_per_hour': 250, 'price_per_km': 8.00, 'description': '60-ton mobile crane, 48m boom reach', 'status': 'available'},
            {'name': 'CAT 320 Excavator', 'category': 'Excavator', 'plate_number': 'EX-401', 'year': 2022, 'capacity': '20 tons', 'price_per_hour': 120, 'description': 'Medium excavator with standard bucket', 'status': 'in_use'},
            {'name': 'Komatsu D65 Bulldozer', 'category': 'Bulldozer', 'plate_number': 'BD-501', 'year': 2020, 'capacity': '20 tons', 'price_per_hour': 150, 'description': 'Crawler bulldozer for grading and clearing', 'status': 'available'},
            {'name': 'MAN TGS Concrete Mixer', 'category': 'Concrete Mixer', 'plate_number': 'CM-601', 'year': 2023, 'capacity': '9 cubic meters', 'price_per_hour': 110, 'price_per_km': 5.00, 'description': '9m3 drum mixer truck', 'status': 'available'},
            {'name': 'Volvo FMX 8x4 Dump', 'category': 'Dump Truck', 'plate_number': 'DT-701', 'year': 2022, 'capacity': '25 tons', 'price_per_hour': 90, 'price_per_km': 3.50, 'description': 'Heavy-duty tipper truck', 'status': 'available'},
            {'name': 'John Deere 6195M', 'category': 'Tractor', 'plate_number': 'TR-801', 'year': 2023, 'capacity': '195 HP', 'price_per_hour': 75, 'description': 'Utility tractor with front loader attachment', 'status': 'available'},
            {'name': 'Toyota 8FGU30 Forklift', 'category': 'Forklift', 'plate_number': 'FL-901', 'year': 2022, 'capacity': '3 tons', 'price_per_hour': 55, 'description': 'Pneumatic tire forklift, 4.5m lift height', 'status': 'available'},
            {'name': 'DAF XF Tanker', 'category': 'Tanker Truck', 'plate_number': 'TK-1001', 'year': 2021, 'capacity': '25,000 liters', 'price_per_hour': 130, 'price_per_km': 5.50, 'description': 'Stainless steel potable water tanker', 'status': 'in_use'},
            {'name': 'Scania R450 Reefer', 'category': 'Refrigerated Truck', 'plate_number': 'RF-1101', 'year': 2023, 'capacity': '22 pallets', 'price_per_hour': 100, 'price_per_km': 4.50, 'description': 'Refrigerated trailer, -25C to +25C range', 'status': 'available'},
            {'name': 'Lohr Eurolohr Car Carrier', 'category': 'Car Carrier', 'plate_number': 'CC-1201', 'year': 2022, 'capacity': '8 cars', 'price_per_hour': 140, 'price_per_km': 6.00, 'description': 'Hydraulic car carrier, 8-car capacity', 'status': 'available'},
            {'name': 'JLG 600S Boom Lift', 'category': 'Boom Lift / Cherry Picker', 'plate_number': 'BL-1301', 'year': 2023, 'capacity': '18m reach', 'price_per_hour': 95, 'description': 'Telescopic boom lift, 18m platform height', 'status': 'available'},
            {'name': 'Hamm HD+ 90 Roller', 'category': 'Road Roller / Compactor', 'plate_number': 'RR-1401', 'year': 2021, 'capacity': '9 tons', 'price_per_hour': 85, 'description': 'Tandem vibratory roller for asphalt and soil', 'status': 'maintenance'},
            {'name': 'Cummins C500 Generator', 'category': 'Generator Truck', 'plate_number': 'GN-1501', 'year': 2022, 'capacity': '500 kW', 'price_per_hour': 65, 'description': 'Diesel generator set on trailer, automatic transfer switch', 'status': 'available'},
            {'name': 'Trail King TK110 Lowboy', 'category': 'Lowboy Trailer', 'plate_number': 'LB-1601', 'year': 2020, 'capacity': '50 tons', 'price_per_hour': 160, 'price_per_km': 7.00, 'description': 'Detachable gooseneck lowboy trailer', 'status': 'available'},
            {'name': 'Isuzu NQR Tow Truck', 'category': 'Tow Truck', 'plate_number': 'TW-102', 'year': 2023, 'capacity': '5 tons', 'price_per_hour': 65, 'price_per_km': 2.50, 'description': 'Light-duty wheel-lift tow truck for sedans and small SUVs', 'status': 'available'},
            {'name': 'Kenworth T880 Dump', 'category': 'Dump Truck', 'plate_number': 'DT-702', 'year': 2021, 'capacity': '18 tons', 'price_per_hour': 80, 'price_per_km': 3.00, 'description': 'Standard dump truck for sand and gravel', 'status': 'available'},
        ]

        for v_data in demo_vehicles:
            cat_name = v_data.pop('category')
            cat = cats.get(cat_name)
            if not cat:
                continue
            vehicle, created = Vehicle.objects.update_or_create(
                plate_number=v_data['plate_number'],
                defaults={k: v for k, v in v_data.items() if v is not None},
            )
            vehicle.categories.set([cat])
            status_msg = 'created' if created else 'updated'
            self.stdout.write(f'  {vehicle.name} [{vehicle.plate_number}] - {status_msg}')

        self.stdout.write(self.style.SUCCESS(
            f'Seed data loaded! {TransportCategory.objects.count()} categories, '
            f'{Vehicle.objects.count()} vehicles, {Order.objects.count()} orders'
        ))
