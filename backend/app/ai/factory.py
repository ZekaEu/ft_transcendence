from flask import current_app

from app.ai.providers import OpenAIProvider, MockAIProvider


def get_freeform_provider():
    provider_name = (current_app.config.get('FREEFORM_AI_PROVIDER') or 'openai').lower()
    model = current_app.config.get('FREEFORM_AI_MODEL', 'gpt-5-mini')

    if provider_name == 'mock':
        return MockAIProvider()

    api_key = current_app.config.get('OPENAI_API_KEY')
    base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    return OpenAIProvider(api_key=api_key, model=model, base_url=base_url)
