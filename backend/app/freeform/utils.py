def clamp_score(value, min_value=0, max_value=20):
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        return min_value

    return max(min(score, max_value), min_value)


def compute_total_score(scores):
    return sum(clamp_score(score) for score in scores)
