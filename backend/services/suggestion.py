from .models import Service


def suggest_service(description: str) -> Service | None:
    """Keyword-based best-match service for a free-text description.

    Mirrors categories.suggestion.suggest_category but pivots on Service —
    customers now pick a service, not a car category, when creating an order.
    """
    if not description:
        return None

    description_lower = description.lower()
    best_service = None
    best_score = 0

    for service in Service.objects.filter(is_active=True):
        keywords = service.get_keywords_list()
        score = sum(1 for kw in keywords if kw in description_lower)
        if score > best_score:
            best_score = score
            best_service = service

    return best_service
