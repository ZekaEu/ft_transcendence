import json
import os
import sys
import urllib3

import requests


def _bool_env(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'y'}


def _require_env(name):
    value = os.getenv(name)
    if not value:
        print(f"Missing required env: {name}")
        sys.exit(1)
    return value


def main():
    base_url = os.getenv('API_BASE_URL', 'https://localhost:8443/api').rstrip('/')
    email = _require_env('TEST_EMAIL')
    password = _require_env('TEST_PASSWORD')
    verify_ssl = _bool_env('VERIFY_SSL', False)

    if not verify_ssl:
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    print("Logging in...")
    login_resp = requests.post(
        f"{base_url}/auth/login",
        json={'email': email, 'password': password},
        timeout=15,
        verify=verify_ssl,
    )
    if not login_resp.ok:
        print(f"Login failed ({login_resp.status_code}): {login_resp.text}")
        sys.exit(1)

    token = login_resp.json().get('token')
    if not token:
        print("Login response missing token")
        sys.exit(1)

    headers = {'Authorization': f"Bearer {token}"}

    print("Creating FreeForm session...")
    create_resp = requests.post(
        f"{base_url}/freeform/sessions",
        json={'topic': 'tecnologia', 'language': 'pt-BR'},
        headers=headers,
        timeout=30,
        verify=verify_ssl,
    )
    if not create_resp.ok:
        print(f"Create session failed ({create_resp.status_code}): {create_resp.text}")
        sys.exit(1)

    session_data = create_resp.json()
    session_id = session_data.get('id')
    questions = session_data.get('questions') or []
    if not session_id or not questions:
        print("Invalid session response")
        sys.exit(1)

    print(f"Session created: {session_id}")
    answers = []
    for q in questions:
        question_id = q.get('id')
        question_text = q.get('question')
        if not question_id:
            continue
        answers.append({
            'question_id': question_id,
            'answer': f"Resposta automática para: {question_text}",
        })

    print("Submitting answers...")
    submit_resp = requests.post(
        f"{base_url}/freeform/sessions/{session_id}/submit",
        json={'answers': answers},
        headers=headers,
        timeout=60,
        verify=verify_ssl,
    )
    if not submit_resp.ok:
        print(f"Submit failed ({submit_resp.status_code}): {submit_resp.text}")
        sys.exit(1)

    result = submit_resp.json()
    print("Result:")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
