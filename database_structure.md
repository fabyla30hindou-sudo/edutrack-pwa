# Base de données - Structure des tables

## Vue d'ensemble

Ce document décrit la structure complète de la base de données EduTrack.

---

## Tables principales

| Table | Description |
|-------|-------------|
| `users` | Table centrale des utilisateurs (authentification) |
| `schools` | Établissements scolaires |
| `students` | Élèves |
| `teachers` | Enseignants |
| `parents` | Parents d'élèves |
| `admins` | Administrateurs d'établissement |
| `superadmins` | Super administrateurs système |

## Tables fonctionnelles

| Table | Description |
|-------|-------------|
| `attendance` | Gestion des présences |
| `grades` | Notes et évaluations |
| `quizzes` | Quiz et questionnaires |
| `quiz_questions` | Questions de quiz |
| `quiz_answers` | Réponses aux quiz |
| `messages` | Messages entre utilisateurs |
| `notifications` | Notifications |

## Tables d'association

| Table | Description |
|-------|-------------|
| `parent_student` | Relation many-to-many parents-élèves |

---

## Détail des tables

### users

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `email` | String | Index | Email de l'utilisateur |
| `hashed_password` | String | - | Mot de passe haché |
| `full_name` | String | - | Nom complet |
| `school_id` | String | Index | ID de l'établissement |
| `role` | String | Index | Rôle: student, teacher, admin, parent |
| `is_active` | Boolean | Default: True | Statut actif |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

**Contrainte**: Unique(school_id, email)

---

### schools

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `name` | String | Unique, Index | Nom de l'école |
| `is_active` | Boolean | Default: True | Statut actif |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### students

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `user_id` | Integer | FK → users.id, Unique | Lien vers utilisateur |
| `matricule` | String | Unique, Index | Numéro matricule élève |
| `school_id` | String | Index | ID de l'établissement |
| `class_name` | String | Index | Classe (6eme, 5eme, etc.) |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### teachers

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `user_id` | Integer | FK → users.id, Unique | Lien vers utilisateur |
| `school_id` | String | Index | ID de l'établissement |
| `subject` | String | Index | Matière enseignée |
| `classes` | Text | - | Classes enseignées (JSON) |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### parents

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `user_id` | Integer | FK → users.id, Unique | Lien vers utilisateur |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### admins

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `user_id` | Integer | FK → users.id, Unique | Lien vers utilisateur |
| `school_id` | String | Index | ID de l'établissement |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### superadmins

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `user_id` | Integer | FK → users.id, Unique | Lien vers utilisateur |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### attendance

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `student_id` | Integer | FK → students.id | Élève |
| `attendance_date` | Date | Default: today | Date de présence |
| `status` | String | - | present, absent, late, justified |
| `notes` | String | Nullable | Notes supplémentaires |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### grades

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `student_id` | Integer | FK → students.id | Élève |
| `subject` | String | - | Matière |
| `grade` | Float | - | Note |
| `teacher_id` | Integer | FK → users.id | Enseignant |
| `comment` | String | Nullable | Commentaire |
| `graded_date` | DateTime | Default: now | Date de l'évaluation |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### quizzes

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `title` | String | Index | Titre du quiz |
| `description` | Text | - | Description |
| `created_by` | Integer | FK → users.id | Créateur |
| `total_questions` | Integer | Default: 0 | Nombre de questions |
| `duration_minutes` | Integer | Default: 30 | Durée (minutes) |
| `created_at` | DateTime | Default: now | Date de création |
| `updated_at` | DateTime | Auto | Date de mise à jour |

---

### quiz_questions

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `quiz_id` | Integer | FK → quizzes.id | Quiz parent |
| `question_text` | Text | - | Texte de la question |
| `question_type` | String | - | multiple_choice, true_false, short_answer |
| `options` | String | - | Options (JSON) |
| `correct_answer` | String | - | Réponse correcte |
| `points` | Float | Default: 1.0 | Points |
| `created_at` | DateTime | Default: now | Date de création |

---

### quiz_answers

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `quiz_id` | Integer | FK → quizzes.id | Quiz |
| `student_id` | Integer | FK → students.id | Élève |
| `question_id` | Integer | FK → quiz_questions.id | Question |
| `student_answer` | String | - | Réponse de l'élève |
| `is_correct` | Integer | - | 0, 1, ou null |
| `points_earned` | Float | Default: 0.0 | Points gagnés |
| `submitted_at` | DateTime | Default: now | Date de soumission |

---

### messages

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `sender_id` | Integer | FK → users.id | Expéditeur |
| `sender_name` | String | - | Nom de l'expéditeur |
| `recipient_id` | Integer | FK → users.id, Nullable | Destinataire |
| `text` | Text | - | Contenu du message |
| `category` | String | Default: general | general, support, private |
| `timestamp` | DateTime | Default: now | Horodatage |
| `is_read` | Boolean | Default: False | Lu/Non lu |

---

### notifications

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `id` | Integer | PK, AI | Identifiant unique |
| `user_id` | Integer | FK → users.id | Utilisateur cible |
| `title` | String | - | Titre |
| `message` | Text | - | Contenu |
| `type` | String | Default: INFO | INFO, WARNING, ERROR, SUCCESS |
| `timestamp` | DateTime | Default: now | Horodatage |
| `is_read` | Boolean | Default: False | Lu/Non lu |

---

### parent_student (Association)

| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| `parent_id` | Integer | FK → parents.id | Parent |
| `student_id` | Integer | FK → students.id | Élève |

---

## Relations entre tables

```
users
├── 1:1 → students
├── 1:1 → teachers
├── 1:1 → parents
├── 1:1 → admins
├── 1:1 → superadmins
├── 1:N → grades (teacher_id)
├── 1:N → quizzes (created_by)
├── 1:N → messages (sender_id, recipient_id)
├── 1:N → notifications (user_id)
│
students
├── N:1 → schools
├── N:1 → users
├── 1:N → attendance
├── 1:N → grades
├── 1:N → quiz_answers
├── N:M → parents (via parent_student)
│
teachers
├── N:1 → schools
├── N:1 → users
│
parents
├── N:1 → users
├── N:M → students (via parent_student)
│
admins
├── N:1 → schools
├── N:1 → users
│
superadmins
└── N:1 → users

quizzes
├── 1:N → quiz_questions
└── 1:N → quiz_answers

quiz_questions
└── 1:N → quiz_answers

quiz_answers
├── N:1 → quizzes
├── N:1 → students
└── N:1 → quiz_questions
```

---

*Document généré le 1 mai 2026*