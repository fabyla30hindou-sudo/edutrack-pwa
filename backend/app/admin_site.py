from __future__ import annotations

import sqlmodel._compat as sqlmodel_compat
from fastapi import FastAPI


if not hasattr(sqlmodel_compat, "post_init_field_info"):
    # Compatibility shim for current sqlmodel releases.
    def post_init_field_info(field_info):
        return field_info

    sqlmodel_compat.post_init_field_info = post_init_field_info

from fastapi_amis_admin.admin import admin
from fastapi_amis_admin.admin.settings import Settings
from fastapi_amis_admin.admin.site import AdminSite

from app.models.admin import Admin
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.message import Message, Notification
from app.models.parent import Parent
from app.models.quiz import Quiz, QuizAnswer, QuizQuestion
from app.models.school import School
from app.models.student import Student
from app.models.superadmin import SuperAdmin
from app.models.teacher import Teacher
from app.models.user import User


ADMIN_DB_URL = "sqlite+aiosqlite:///./edutrack.db"


site = AdminSite(
    settings=Settings(
        site_title="EduTrack Admin",
        site_path="/admin",
        database_url_async=ADMIN_DB_URL,
        debug=True,
    )
)


@site.register_admin
class UserAdmin(admin.ModelAdmin):
    page_schema = "Utilisateurs"
    model = User
    list_display = [User.id, User.full_name, User.email, User.role, User.school_id, User.is_active]
    search_fields = [User.full_name, User.email, User.role]
    list_filter = [User.role, User.school_id, User.is_active]


@site.register_admin
class SchoolAdmin(admin.ModelAdmin):
    page_schema = "Ecoles"
    model = School
    list_display = [School.id, School.name, School.is_active, School.created_at]
    search_fields = [School.name]
    list_filter = [School.is_active]


@site.register_admin
class StudentAdmin(admin.ModelAdmin):
    page_schema = "Eleves"
    model = Student
    list_display = [Student.id, Student.user_id, Student.matricule, Student.school_id, Student.class_name]
    search_fields = [Student.matricule, Student.class_name]
    list_filter = [Student.school_id, Student.class_name]


@site.register_admin
class TeacherAdmin(admin.ModelAdmin):
    page_schema = "Enseignants"
    model = Teacher
    list_display = [Teacher.id, Teacher.user_id, Teacher.school_id, Teacher.subject, Teacher.classes]
    search_fields = [Teacher.subject, Teacher.school_id]
    list_filter = [Teacher.school_id, Teacher.subject]


@site.register_admin
class ParentAdmin(admin.ModelAdmin):
    page_schema = "Parents"
    model = Parent
    list_display = [Parent.id, Parent.user_id, Parent.created_at]


@site.register_admin
class AdminAdmin(admin.ModelAdmin):
    page_schema = "Administrateurs"
    model = Admin
    list_display = [Admin.id, Admin.user_id, Admin.school_id, Admin.created_at]
    list_filter = [Admin.school_id]


@site.register_admin
class SuperAdminAdmin(admin.ModelAdmin):
    page_schema = "Super Administrateurs"
    model = SuperAdmin
    list_display = [SuperAdmin.id, SuperAdmin.user_id, SuperAdmin.created_at]


@site.register_admin
class GradeAdmin(admin.ModelAdmin):
    page_schema = "Notes"
    model = Grade
    list_display = [Grade.id, Grade.student_id, Grade.subject, Grade.grade, Grade.teacher_id, Grade.graded_date]
    search_fields = [Grade.subject]
    list_filter = [Grade.subject, Grade.teacher_id]


@site.register_admin
class AttendanceAdmin(admin.ModelAdmin):
    page_schema = "Presences"
    model = Attendance
    list_display = [Attendance.id, Attendance.student_id, Attendance.attendance_date, Attendance.status, Attendance.notes]
    search_fields = [Attendance.status, Attendance.notes]
    list_filter = [Attendance.status, Attendance.attendance_date]


@site.register_admin
class QuizAdmin(admin.ModelAdmin):
    page_schema = "Quiz"
    model = Quiz
    list_display = [Quiz.id, Quiz.title, Quiz.created_by, Quiz.total_questions, Quiz.duration_minutes, Quiz.created_at]
    search_fields = [Quiz.title, Quiz.description]


@site.register_admin
class QuizQuestionAdmin(admin.ModelAdmin):
    page_schema = "Questions de Quiz"
    model = QuizQuestion
    list_display = [QuizQuestion.id, QuizQuestion.quiz_id, QuizQuestion.question_text, QuizQuestion.question_type, QuizQuestion.points]
    search_fields = [QuizQuestion.question_text, QuizQuestion.question_type]
    list_filter = [QuizQuestion.quiz_id, QuizQuestion.question_type]


@site.register_admin
class QuizAnswerAdmin(admin.ModelAdmin):
    page_schema = "Reponses Quiz"
    model = QuizAnswer
    list_display = [QuizAnswer.id, QuizAnswer.quiz_id, QuizAnswer.student_id, QuizAnswer.question_id, QuizAnswer.is_correct, QuizAnswer.points_earned]
    list_filter = [QuizAnswer.quiz_id, QuizAnswer.student_id, QuizAnswer.is_correct]


@site.register_admin
class MessageAdmin(admin.ModelAdmin):
    page_schema = "Messages"
    model = Message
    list_display = [Message.id, Message.sender_name, Message.sender_id, Message.recipient_id, Message.category, Message.timestamp, Message.is_read]
    search_fields = [Message.sender_name, Message.text, Message.category]
    list_filter = [Message.category, Message.is_read]


@site.register_admin
class NotificationAdmin(admin.ModelAdmin):
    page_schema = "Notifications"
    model = Notification
    list_display = [Notification.id, Notification.user_id, Notification.title, Notification.type, Notification.timestamp, Notification.is_read]
    search_fields = [Notification.title, Notification.message, Notification.type]
    list_filter = [Notification.type, Notification.is_read]


def mount_admin(app: FastAPI) -> None:
    site.mount_app(app)
