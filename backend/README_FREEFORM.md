### FreeForm Mode — Backend Notes

#### Overview
`FreeForm` is a game mode where the player answers open-ended questions instead of choosing alternatives. The AI generates 5 questions with expected answers, and at the end of the match each user answer is scored from `0` to `20`, totaling `0` to `100`.

#### What was implemented
- **AI layer isolated from core backend**
  - `app/ai/providers.py` contains `OpenAIProvider` (real calls) and `MockAIProvider` (offline).
  - `app/ai/factory.py` selects the provider based on config.
- **FreeForm domain**
  - `app/freeform/models.py`: `FreeFormSession` + `FreeFormQuestion` persistence.
  - `app/freeform/service.py`: orchestration, score normalization.
  - `app/freeform/routes.py`: REST endpoints for session lifecycle.
- **App integration**
  - Blueprint registered in `app/__init__.py`.
  - Config keys added in `app/core/config.py` and `.env.example`.

#### Inferences / design rationale
- **Separation of concerns**: AI code stays in `app/ai` so the core API does not depend on a specific provider.
- **Resilient evaluation**: scores are clamped to `0-20` to avoid invalid AI output.
- **Persisted questions**: storing the AI-generated expected answer allows consistent scoring and audit.
- **Mock provider**: enables local testing without an API key or external calls.

#### Endpoints
Base path: `/api/freeform`

##### Create session
`POST /sessions`

Request body:
```json
{
  "topic": "tecnologia",
  "language": "pt-BR"
}
```

Response (201):
```json
{
  "id": 12,
  "user_id": 3,
  "status": "in_progress",
  "topic": "tecnologia",
  "total_score": null,
  "created_at": "2026-02-20T19:01:22.111Z",
  "updated_at": "2026-02-20T19:01:22.111Z",
  "questions": [
    {"id": 100, "order_index": 1, "question": "..."}
  ]
}
```

##### Get session
`GET /sessions/<session_id>`

Response (200): same as create, without answers.

##### Submit answers
`POST /sessions/<session_id>/submit`

Request body:
```json
{
  "answers": [
    {"question_id": 100, "answer": "Minha resposta..."}
  ]
}
```

Response (200): includes expected answers, scores and feedback per question.

#### Configuration
Add these to `.env` (see `.env.example`):

- `FREEFORM_AI_PROVIDER`: `openai` or `mock`
- `FREEFORM_AI_MODEL`: default `gpt-5-mini`
- `OPENAI_API_KEY`: required for `openai`
- `OPENAI_BASE_URL`: default `https://api.openai.com/v1`

#### Testing via terminal
Use the provided script:
```bash
python test_freeform.py
```

Environment variables used by the script:

- `API_BASE_URL` (default: `https://localhost:8443/api`)
- `TEST_EMAIL`
- `TEST_PASSWORD`
- `VERIFY_SSL` (`true`/`false`, default `false` for local https)
