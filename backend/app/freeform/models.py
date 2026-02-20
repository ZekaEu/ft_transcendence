from datetime import datetime, timezone

from app.core.extensions import db


class FreeFormSession(db.Model):
    __tablename__ = 'freeform_sessions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(32), nullable=False, default='in_progress')
    topic = db.Column(db.String(120), nullable=True)
    total_score = db.Column(db.Integer, nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    questions = db.relationship(
        'FreeFormQuestion', backref='session', lazy='dynamic', cascade='all, delete-orphan'
    )

    def to_dict(
        self,
        include_questions=False,
        include_expected=False,
        include_answers=False,
        include_feedback=False,
    ):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'status': self.status,
            'topic': self.topic,
            'total_score': self.total_score,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_questions:
            data['questions'] = [
                question.to_dict(
                    include_expected=include_expected,
                    include_answer=include_answers,
                    include_feedback=include_feedback,
                )
                for question in self.questions.order_by(FreeFormQuestion.order_index.asc()).all()
            ]

        return data

    def __repr__(self):
        return f'<FreeFormSession {self.id}>'


class FreeFormQuestion(db.Model):
    __tablename__ = 'freeform_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.Integer, db.ForeignKey('freeform_sessions.id'), nullable=False)
    order_index = db.Column(db.Integer, nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    expected_answer = db.Column(db.Text, nullable=False)
    user_answer = db.Column(db.Text, nullable=True)
    score = db.Column(db.Integer, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime, nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, include_expected=False, include_answer=False, include_feedback=False):
        data = {
            'id': self.id,
            'order_index': self.order_index,
            'question': self.question_text,
        }

        if include_expected:
            data['expected_answer'] = self.expected_answer
        if include_answer:
            data['user_answer'] = self.user_answer
            data['score'] = self.score
        if include_feedback:
            data['feedback'] = self.feedback

        return data

    def __repr__(self):
        return f'<FreeFormQuestion {self.id}>'
