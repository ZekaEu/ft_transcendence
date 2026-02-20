from app.freeform.utils import clamp_score


class FreeFormService:
    def __init__(self, provider):
        self.provider = provider

    def generate_questions(self, count=5, topic=None, language='pt-BR'):
        return self.provider.generate_questions(count=count, topic=topic, language=language)

    def evaluate_answer(self, question, expected_answer, user_answer, language='pt-BR'):
        result = self.provider.evaluate_answer(
            question=question,
            expected_answer=expected_answer,
            user_answer=user_answer,
            language=language,
        )
        score = clamp_score(result.get('score'))
        feedback = (result.get('feedback') or '').strip()
        return {'score': score, 'feedback': feedback}
