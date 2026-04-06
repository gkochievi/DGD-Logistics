from .models import TransportCategory


def suggest_category(description: str) -> TransportCategory | None:
    """
    Simple keyword-based suggestion engine.
    Scores each active category by counting keyword matches in the description.
    Returns the best match or None if no keywords match.
    """
    if not description:
        return None

    description_lower = description.lower()
    best_category = None
    best_score = 0

    for category in TransportCategory.objects.filter(is_active=True):
        keywords = category.get_keywords_list()
        score = sum(1 for kw in keywords if kw in description_lower)
        if score > best_score:
            best_score = score
            best_category = category

    return best_category
