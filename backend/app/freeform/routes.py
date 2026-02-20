from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.freeform import freeform_bp
from app.core.extensions import db
from app.auth.models import User
from app.freeform.models import FreeFormSession, FreeFormQuestion
from app.freeform.service import FreeFormService
from app.freeform.utils import compute_total_score
from app.ai import get_freeform_provider
from app.ai.providers import AIProviderError


@freeform_bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_freeform_session():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json() or {}
    topic = (data.get('topic') or '').strip() or None
    language = (data.get('language') or 'pt-BR').strip() or 'pt-BR'

    provider = get_freeform_provider()
    service = FreeFormService(provider)

    try:
        questions = service.generate_questions(count=5, topic=topic, language=language)
    except AIProviderError as exc:
        return jsonify({'message': 'AI provider error', 'details': str(exc)}), 502
    except Exception as exc:
        return jsonify({'message': 'Failed to generate questions', 'details': str(exc)}), 500

    session = FreeFormSession(user_id=user_id, topic=topic)
    db.session.add(session)
    db.session.flush()

    for index, question in enumerate(questions, start=1):
        db.session.add(
            FreeFormQuestion(
                session_id=session.id,
                order_index=index,
                question_text=question['question'],
                expected_answer=question['expected_answer'],
            )
        )

    db.session.commit()

    return jsonify(session.to_dict(include_questions=True)), 201


@freeform_bp.route('/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_freeform_session(session_id):
    user_id = int(get_jwt_identity())
    session = FreeFormSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'message': 'Session not found'}), 404

    return jsonify(session.to_dict(include_questions=True)), 200


@freeform_bp.route('/sessions/<int:session_id>/submit', methods=['POST'])
@jwt_required()
def submit_freeform_answers(session_id):
    user_id = int(get_jwt_identity())
    session = FreeFormSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'message': 'Session not found'}), 404

    if session.status == 'finished':
        return jsonify({'message': 'Session already finished'}), 409

    data = request.get_json() or {}
    answers = data.get('answers')
    if not isinstance(answers, list):
        return jsonify({'message': 'answers must be a list'}), 400

    questions = session.questions.order_by(FreeFormQuestion.order_index.asc()).all()
    if len(answers) != len(questions):
        return jsonify({'message': 'All questions must be answered'}), 400

    answers_map = {}
    for item in answers:
        question_id = item.get('question_id')
        answer_text = (item.get('answer') or '').strip()
        if not question_id or not answer_text:
            return jsonify({'message': 'Each answer requires question_id and answer'}), 400
        answers_map[int(question_id)] = answer_text

    provider = get_freeform_provider()
    service = FreeFormService(provider)
    scores = []

    try:
        for question in questions:
            user_answer = answers_map.get(question.id)
            if not user_answer:
                return jsonify({'message': 'All questions must be answered'}), 400

            evaluation = service.evaluate_answer(
                question=question.question_text,
                expected_answer=question.expected_answer,
                user_answer=user_answer,
            )
            question.user_answer = user_answer
            question.score = evaluation['score']
            question.feedback = evaluation['feedback']
            scores.append(evaluation['score'])

    except AIProviderError as exc:
        return jsonify({'message': 'AI provider error', 'details': str(exc)}), 502
    except Exception as exc:
        return jsonify({'message': 'Failed to evaluate answers', 'details': str(exc)}), 500

    session.status = 'finished'
    session.total_score = compute_total_score(scores)
    db.session.commit()

    return jsonify(
        session.to_dict(
            include_questions=True,
            include_expected=True,
            include_answers=True,
            include_feedback=True,
        )
    ), 200
