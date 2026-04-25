from django.core.management.base import BaseCommand
from landing.models import LandingPageSettings


class Command(BaseCommand):
    help = 'Seed landing page with default content'

    def handle(self, *args, **options):
        obj = LandingPageSettings.get_instance()

        obj.hero_title = {
            'en': 'Best Price with DGD Logistics',
            'ka': 'საუკეთესო ფასი DGD Logistics-ისგან',
            'ru': 'Лучшая цена с DGD Logistics',
        }
        obj.hero_description = {
            'en': 'Order specialized transport for any job — from towing to construction. Compare offers and choose the best.',
            'ka': 'შეუკვეთეთ სპეციალიზებული ტრანსპორტი ნებისმიერი სამუშაოსთვის — ევაკუატორიდან მშენებლობამდე. შეადარეთ შეთავაზებები.',
            'ru': 'Закажите специализированный транспорт для любой задачи — от эвакуации до строительства. Сравните предложения и выберите лучшее.',
        }

        obj.stats = [
            {'number': '500+', 'label': {'en': 'Orders Placed', 'ka': 'შეკვეთები', 'ru': 'Заказов'}},
            {'number': '50+', 'label': {'en': 'Vehicles', 'ka': 'ტრანსპორტი', 'ru': 'Транспорт'}},
            {'number': '98%', 'label': {'en': 'Satisfaction', 'ka': 'კმაყოფილება', 'ru': 'Удовлетворённость'}},
        ]

        obj.steps_title = {
            'en': 'How It Works',
            'ka': 'როგორ მუშაობს',
            'ru': 'Как это работает',
        }
        obj.steps = [
            {
                'icon': 'build',
                'title': {'en': 'Specify Your Need', 'ka': 'მიუთითეთ საჭიროება', 'ru': 'Укажите потребность'},
                'description': {'en': 'Tell us what you need transported and where', 'ka': 'გვითხარით რა და სად უნდა გადაიტანოთ', 'ru': 'Расскажите, что и куда нужно перевезти'},
            },
            {
                'icon': 'tool',
                'title': {'en': 'Compare Offers', 'ka': 'შეადარეთ შეთავაზებები', 'ru': 'Сравните предложения'},
                'description': {'en': 'Review matched vehicles and pricing', 'ka': 'განიხილეთ შერჩეული ტრანსპორტი და ფასები', 'ru': 'Просмотрите подобранный транспорт и цены'},
            },
            {
                'icon': 'car',
                'title': {'en': 'Book & Track', 'ka': 'დაჯავშნეთ და თვალყური ადევნეთ', 'ru': 'Закажите и отслеживайте'},
                'description': {'en': 'Confirm your order and track in real-time', 'ka': 'დაადასტურეთ შეკვეთა და თვალყური ადევნეთ რეალურ დროში', 'ru': 'Подтвердите заказ и отслеживайте в реальном времени'},
            },
        ]

        obj.benefits_title = {
            'en': 'Why Choose Us',
            'ka': 'რატომ ჩვენ',
            'ru': 'Почему мы',
        }
        obj.benefits = [
            {
                'icon': 'rocket',
                'title': {'en': 'Fast Ordering', 'ka': 'სწრაფი შეკვეთა', 'ru': 'Быстрый заказ'},
                'description': {'en': 'Submit a request in under 2 minutes from any device.', 'ka': 'გაგზავნეთ მოთხოვნა 2 წუთში ნებისმიერი მოწყობილობიდან.', 'ru': 'Оформите заявку за 2 минуты с любого устройства.'},
                'color': '#00B856',
            },
            {
                'icon': 'build',
                'title': {'en': 'Verified Operators', 'ka': 'გადამოწმებული ოპერატორები', 'ru': 'Проверенные операторы'},
                'description': {'en': 'All transport operators are verified and professional.', 'ka': 'ყველა სატრანსპორტო ოპერატორი გადამოწმებული და პროფესიონალია.', 'ru': 'Все операторы транспорта проверены и профессиональны.'},
                'color': '#10b981',
            },
            {
                'icon': 'thunderbolt',
                'title': {'en': 'Real-Time Tracking', 'ka': 'რეალურ დროში თვალყურის დევნება', 'ru': 'Отслеживание в реальном времени'},
                'description': {'en': 'Monitor your order status from submission to completion.', 'ka': 'თვალყური ადევნეთ შეკვეთის სტატუსს გაგზავნიდან დასრულებამდე.', 'ru': 'Следите за статусом заказа от оформления до завершения.'},
                'color': '#f59e0b',
            },
            {
                'icon': 'database',
                'title': {'en': 'Best Prices', 'ka': 'საუკეთესო ფასები', 'ru': 'Лучшие цены'},
                'description': {'en': 'Compare offers and choose the best price for your transport.', 'ka': 'შეადარეთ შეთავაზებები და აირჩიეთ საუკეთესო ფასი.', 'ru': 'Сравните предложения и выберите лучшую цену на транспорт.'},
                'color': '#3b82f6',
            },
        ]

        obj.search_scope = 'georgia'
        obj.search_countries = []

        obj.cta_title = {
            'en': 'Ready to Get Started?',
            'ka': 'მზად ხართ დასაწყებად?',
            'ru': 'Готовы начать?',
        }
        obj.cta_description = {
            'en': 'Create your free account and place your first transport order today.',
            'ka': 'შექმენით უფასო ანგარიში და განათავსეთ პირველი სატრანსპორტო შეკვეთა დღეს.',
            'ru': 'Создайте бесплатный аккаунт и оформите первый заказ сегодня.',
        }
        obj.cta_button_text = {
            'en': 'Create Free Account',
            'ka': 'უფასო რეგისტრაცია',
            'ru': 'Создать бесплатный аккаунт',
        }

        obj.save()
        self.stdout.write(self.style.SUCCESS('Landing page content seeded successfully!'))
