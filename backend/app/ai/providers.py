import json
import re

import requests


class AIProviderError(RuntimeError):
    pass


class OpenAIProvider:
    def __init__(self, api_key, model, base_url):
        if not api_key:
            raise AIProviderError('OPENAI_API_KEY is required for OpenAI provider')

        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip('/')

    def generate_questions(self, count=5, topic=None, language='pt-BR'):
        topic_hint = f"Tema: {topic}." if topic else ""
        system_message = (
            "Você é um gerador de perguntas de campo aberto para um jogo. "
            "Responda APENAS com JSON válido."
        )
        user_message = (
            f"Gere {count} perguntas abertas em {language}. {topic_hint} "
            "Para cada pergunta, inclua uma resposta esperada curta e objetiva. "
            "Formato: {\"questions\": [{\"question\": \"...\", "
            "\"expected_answer\": \"...\"}]}"
        )

        content = self._post_chat(system_message, user_message)
        data = self._parse_json(content)
        questions = data.get('questions', []) if isinstance(data, dict) else []

        normalized = []
        for item in questions:
            question = (item.get('question') or '').strip()
            expected = (item.get('expected_answer') or '').strip()
            if question and expected:
                normalized.append({'question': question, 'expected_answer': expected})

        if len(normalized) < count:
            raise AIProviderError('AI returned insufficient questions')

        return normalized[:count]

    def evaluate_answer(self, question, expected_answer, user_answer, language='pt-BR'):
        system_message = (
            "Você é um avaliador de respostas de campo aberto. "
            "Avalie o conteúdo, não foque em ortografia. "
            "Responda APENAS com JSON válido."
        )
        user_message = (
            f"Pergunta: {question}\n"
            f"Resposta esperada: {expected_answer}\n"
            f"Resposta do usuário: {user_answer}\n"
            "Retorne JSON no formato: "
            "{\"score\": 0-20, \"feedback\": \"dica de melhoria\"}."
        )

        content = self._post_chat(system_message, user_message)
        data = self._parse_json(content)
        if not isinstance(data, dict):
            raise AIProviderError('AI response is not a JSON object')

        score = data.get('score')
        feedback = (data.get('feedback') or '').strip()
        return {'score': score, 'feedback': feedback}

    def _post_chat(self, system_message, user_message):
        url = f"{self.base_url}/chat/completions"
        payload = {
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': system_message},
                {'role': 'user', 'content': user_message},
            ],
            'temperature': 0.2,
        }
        headers = {
            'Authorization': f"Bearer {self.api_key}",
            'Content-Type': 'application/json',
        }

        response = requests.post(url, json=payload, headers=headers, timeout=30)
        if not response.ok:
            raise AIProviderError(
                f"OpenAI request failed ({response.status_code}): {response.text}"
            )

        data = response.json()
        return self._extract_text(data)

    @staticmethod
    def _extract_text(data):
        choices = data.get('choices')
        if choices:
            message = choices[0].get('message') or {}
            content = message.get('content')
            if content:
                return content

        output = data.get('output')
        if isinstance(output, list):
            for item in output:
                for part in item.get('content', []):
                    if part.get('type') == 'output_text' and part.get('text'):
                        return part['text']

        return ''

    @staticmethod
    def _parse_json(content):
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find('{')
            end = content.rfind('}')
            if start != -1 and end != -1 and end > start:
                return json.loads(content[start:end + 1])
            raise


class MockAIProvider:
    _QUESTIONS = [
        {
            'question': 'Explique o que é computação em nuvem e cite um benefício.',
            'expected_answer': 'Uso de recursos computacionais via internet, com escalabilidade e redução de custos.'
        },
        {
            'question': 'Descreva o objetivo principal do protocolo HTTP.',
            'expected_answer': 'Permitir comunicação cliente-servidor para troca de recursos na web.'
        },
        {
            'question': 'O que significa API e para que ela serve?',
            'expected_answer': 'Interface de programação que permite integração entre sistemas e serviços.'
        },
        {
            'question': 'Explique o conceito de autenticação e cite um exemplo.',
            'expected_answer': 'Processo de verificar identidade, como login com senha ou token.'
        },
        {
            'question': 'O que é um banco de dados relacional?',
            'expected_answer': 'Banco baseado em tabelas com relações entre elas, usando SQL.'
        },
    ]

    def generate_questions(self, count=5, topic=None, language='pt-BR'):
        questions = self._QUESTIONS[:count]
        if topic:
            return [
                {
                    'question': f"[{topic}] {item['question']}",
                    'expected_answer': item['expected_answer'],
                }
                for item in questions
            ]
        return questions

    def evaluate_answer(self, question, expected_answer, user_answer, language='pt-BR'):
        expected_tokens = self._tokenize(expected_answer)
        user_tokens = self._tokenize(user_answer)

        if not expected_tokens:
            return {'score': 0, 'feedback': 'Não foi possível avaliar a resposta esperada.'}

        overlap = expected_tokens.intersection(user_tokens)
        ratio = len(overlap) / max(len(expected_tokens), 1)
        score = int(round(ratio * 20))

        if score >= 16:
            feedback = 'Boa resposta! Você capturou os pontos principais.'
        elif score >= 10:
            feedback = 'Resposta parcial. Tente incluir mais detalhes essenciais.'
        elif score >= 5:
            feedback = 'Faltaram pontos-chave. Releia a pergunta e complemente.'
        else:
            feedback = 'Resposta muito distante do esperado. Foque nos conceitos básicos.'

        return {'score': score, 'feedback': feedback}

    @staticmethod
    def _tokenize(text):
        tokens = re.findall(r'\w+', text.lower())
        return set(tokens)
