import { Storage } from './storage';
import { UserRole, Quiz, QuizSubmissionResult, AttendanceSession, Message, User, School } from '../types';

// Utiliser l'IP du réseau local si disponible, sinon localhost
const getApiBaseUrl = (): string => {
  // Priorité à la variable d'environnement
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Sinon utiliser localhost pour développement local
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

const backendToRole = (rawRole: string): UserRole => {
  const role = (rawRole || '').toLowerCase();
  if (role === 'teacher') return UserRole.TEACHER;
  if (role === 'parent') return UserRole.PARENT;
  if (role === 'admin') return UserRole.ADMIN;
  if (role === 'superadmin') return UserRole.SUPERADMIN;
  return UserRole.STUDENT;
};

const roleToBackend = (role: UserRole): string => {
  if (role === UserRole.TEACHER) return 'TEACHER';
  if (role === UserRole.PARENT) return 'PARENT';
  if (role === UserRole.ADMIN) return 'ADMIN';
  if (role === UserRole.SUPERADMIN) return 'SUPERADMIN';
  return 'STUDENT';
};

const parseQuestionOptions = (options: unknown): string[] => {
  if (Array.isArray(options)) return options.map(String);
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeQuiz = (q: any): Quiz => ({
  id: String(q.id),
  title: q.title || 'Quiz sans titre',
  chapter: q.description || q.chapter || '',
  duration: q.duration || q.duration_minutes || 30,
  questionCount: q.questionCount || q.total_questions || (q.questions?.length ?? 0),
  status: q.status || 'published',
  averageScore: q.averageScore,
  correctAnswers: q.correctAnswers || 0,
  answeredQuestions: q.answeredQuestions || 0,
  attemptsCount: q.attemptsCount || 0,
  correction: q.correction || [],
  questions: (q.questions || []).map((qq: any) => ({
    id: String(qq.id),
    text: qq.question_text || qq.text || '',
    options: parseQuestionOptions(qq.options),
    correctOption: qq.correct_answer || qq.correctOption || '',
  })),
});

const quizToBackend = (quiz: Quiz) => ({
  title: quiz.title,
  description: quiz.chapter || '',
  duration_minutes: quiz.duration || 30,
  questions: (quiz.questions || []).map((q) => ({
    question_text: q.text,
    question_type: 'multiple_choice',
    options: q.options || [],
    correct_answer: q.correctOption || '',
    points: 1.0,
  })),
});

const getLocalQuizResults = (): Record<string, QuizSubmissionResult> => {
  const userId = Storage.getCurrentUser()?.id || 'anonymous';
  const rows = Storage.getData<any>('edutrack_quiz_results');
  return rows
    .filter((row: any) => row.userId === userId)
    .reduce((acc: Record<string, QuizSubmissionResult>, row: any) => {
      acc[String(row.quizId)] = row.result;
      return acc;
    }, {});
};

const saveLocalQuizResult = (quizId: string, result: QuizSubmissionResult) => {
  const userId = Storage.getCurrentUser()?.id || 'anonymous';
  const rows = Storage.getData<any>('edutrack_quiz_results')
    .filter((row: any) => !(row.userId === userId && String(row.quizId) === String(quizId)));
  Storage.saveData('edutrack_quiz_results', [...rows, { userId, quizId, result, submittedAt: new Date().toISOString() }]);
};

const applyLocalQuizResults = (quizzes: Quiz[]): Quiz[] => {
  const results = getLocalQuizResults();
  return quizzes.map((quiz) => {
    const result = results[quiz.id];
    if (!result) return quiz;
    return {
      ...quiz,
      status: 'completed',
      averageScore: result.score,
      correctAnswers: result.correctAnswers,
      answeredQuestions: result.totalQuestions,
      correction: result.correction,
    };
  });
};

const normalizeSubmissionResult = (
  raw: any,
  quiz: Quiz | undefined,
  score: number,
  answers?: Record<string, string>
): QuizSubmissionResult => {
  const questions = quiz?.questions || [];
  const correction = Array.isArray(raw?.correction)
    ? raw.correction
    : questions.map(question => ({
      questionId: question.id,
      isCorrect: (answers?.[question.id] || '').trim().toLowerCase() === question.correctOption.trim().toLowerCase(),
      yourAnswer: answers?.[question.id] || '',
      correctAnswer: question.correctOption,
    }));
  const correctAnswers = raw?.correctAnswers ?? correction.filter(item => item.isCorrect).length;
  const totalQuestions = raw?.totalQuestions ?? questions.length;

  return {
    success: Boolean(raw?.success ?? true),
    score: Number(raw?.score ?? score),
    correctAnswers,
    totalQuestions,
    correction,
  };
};

const normalizeStudent = (student: any): any => ({
  id: String(student.id),
  userId: student.user_id ? String(student.user_id) : undefined,
  name: student.full_name || student.name || `Élève #${student.id}`,
  matricule: student.matricule || '',
  schoolId: student.school_id ? String(student.school_id) : '',
  className: student.class_name || student.class || '',
  avatar: student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.full_name || student.name || student.id}`,
});

const normalizeGrade = (grade: any): any => ({
  id: String(grade.id),
  studentId: grade.student_id ? String(grade.student_id) : undefined,
  subject: grade.subject || 'Matière',
  grade: Number(grade.grade || 0),
  comment: grade.comment || '',
  date: grade.graded_date || grade.date || '',
});

const groupAttendanceRecords = (records: any[]): AttendanceSession[] => {
  const grouped = new Map<string, AttendanceSession>();

  records.forEach((record) => {
    if (record.records) {
      grouped.set(String(record.id), record);
      return;
    }

    const date = record.attendance_date || record.date || new Date().toISOString().slice(0, 10);
    const className = record.className || record.class_name || 'Classe';
    const key = `${date}-${className}`;
    const session = grouped.get(key) || {
      id: key,
      date,
      className,
      teacherName: record.teacherName || 'Enseignant',
      records: [],
    };

    session.records.push({
      studentId: String(record.student_id || record.studentId || record.id),
      studentName: record.student_name || record.studentName || `Élève #${record.student_id || record.studentId || record.id}`,
      status: record.status || 'present',
      behavior: record.behavior || 'good',
      observation: record.notes || record.observation || '',
    });
    grouped.set(key, session);
  });

  return Array.from(grouped.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
};

const normalizeNotification = (notification: any): any => ({
  id: String(notification.id),
  title: notification.title || 'Notification',
  message: notification.message || notification.description || '',
  description: notification.description || notification.message || '',
  type: notification.type || 'system',
  timestamp: notification.timestamp || notification.time || '',
  time: notification.time || notification.timestamp || '',
  is_read: Boolean(notification.is_read ?? notification.read ?? false),
  read: Boolean(notification.read ?? notification.is_read ?? false),
});

// Small helper: fetch with timeout and consistent error handling
async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { signal: controller.signal, ...init });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Helper for API calls with authentication and better network/error handling
const apiCall = async <T,>(endpoint: string, options?: RequestInit, retries = 1): Promise<T> => {
  const token = Storage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, { ...options, headers }, 10000);

    if (!response.ok) {
      // Try to parse error body if any
      const errBody = await response.text().catch(() => response.statusText);
      let detail = response.statusText;
      try { detail = JSON.parse(errBody).detail ?? detail; } catch { detail = errBody; }
      throw new Error(detail || `API error: ${response.status}`);
    }

    // Parse JSON safely
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      // If empty or non-json, return as-is
      return (text as unknown) as T;
    }
  } catch (err: any) {
    // Network error / timeout
    if (retries > 0 && (!options || (options.method || 'GET').toUpperCase() === 'GET')) {
      // Retry once for GET
      return apiCall<T>(endpoint, options, retries - 1);
    }
    console.error('[API] Network/error calling', url, err.message || err);
    throw new Error(err.message || 'Network error');
  }
};

export const API = {
  auth: {
    login: async (email: string, password: string, school_id?: string): Promise<any> => {
      try {
        const response = await apiCall<any>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            ...(school_id ? { school_id } : {}),
          }),
        });

        // Stocker le token JWT
        Storage.setToken(response.access_token);

        // Convertir la réponse du backend au format frontend
        let teacherClasses: string[] | undefined = undefined;
        if (response.user.classes) {
          try { teacherClasses = JSON.parse(response.user.classes || '[]'); } catch { teacherClasses = []; }
        }

        const user: User = {
          id: String(response.user.id),
          name: response.user.full_name,
          email: response.user.email,
          role: backendToRole(response.user.role),
          avatar: response.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.user.full_name}`,
          schoolId: response.user.school_id,
          classes: teacherClasses,
          subject: response.user.subject,
          matricule: response.user.matricule,
        };

        Storage.setCurrentUser(user);
        return response;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    register: async (data: any): Promise<any> => {
      try {
        const response = await apiCall<any>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        Storage.setToken(response.access_token);

        const user: User = {
          id: String(response.user.id),
          name: response.user.full_name,
          email: response.user.email,
          role: backendToRole(response.user.role),
          avatar: response.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.user.full_name}`,
          schoolId: response.user.school_id,
        };

        Storage.setCurrentUser(user);
        return response;
      } catch (error) {
        console.error('Register error:', error);
        throw error;
      }
    },

    logout: async () => {
      Storage.setToken(null);
      Storage.setCurrentUser(null);
    },

    getCurrentSession: async (): Promise<User | null> => {
      try {
        const user = Storage.getCurrentUser();
        const token = Storage.getToken();

        if (user && token) {
          // Vérifier que le token est toujours valide
          const response = await apiCall<any>('/auth/me');
          return {
            ...user,
            id: String(response.id),
            name: response.full_name,
            email: response.email,
            schoolId: response.school_id,
            role: backendToRole(response.role),
          };
        }

        return null;
      } catch (error) {
        Storage.setToken(null);
        Storage.setCurrentUser(null);
        return null;
      }
    },
  },

  profile: {
    update: async (userData: User): Promise<User> => {
      try {
        const response = await apiCall<any>('/auth/me', {
          method: 'PUT',
          body: JSON.stringify(userData),
        });

        const updated: User = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
          schoolId: userData.schoolId,
        };

        Storage.updateCurrentUser(updated);
        return updated;
      } catch (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    },
  },

  

  users: {
    list: async (): Promise<User[]> => {
      try {
        const response = await apiCall<any[]>('/users/');
        return response.map((u: any) => ({
          id: String(u.id),
          name: u.full_name,
          email: u.email,
          role: backendToRole(u.role),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name}`,
          schoolId: u.school_id ? String(u.school_id) : 'sch-1',
}));
      } catch (error) {
        console.warn('Users list error, using local storage:', error);
        return Storage.getUsers();
      }
    },

    create: async (user: Omit<User, 'id'>): Promise<User> => {
      try {
        const response = await apiCall<any>('/users/', {
          method: 'POST',
          body: JSON.stringify({
            email: user.email,
            username: user.name || user.email.split('@')[0],
            password: 'TempPassword123!',
            full_name: user.name,
            role: roleToBackend(user.role),
            school_id: user.schoolId,
          }),
        });

        const newUser: User = {
          id: String(response.id),
          name: response.full_name,
          email: response.email,
          role: user.role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.full_name}`,
          schoolId: user.schoolId || 'sch-1',
        };

        Storage.addUser(newUser);
        return newUser;
      } catch (error) {
        console.error('User creation error:', error);
        const newUser = { ...user, id: 'u-' + Date.now() } as User;
        Storage.addUser(newUser);
        return newUser;
      }
    },

    update: async (user: User): Promise<User> => {
      try {
        await apiCall(`/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(user),
        });
        Storage.updateUser(user);
        return user;
      } catch (error) {
        Storage.updateUser(user);
        return user;
      }
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await apiCall(`/users/${id}`, { method: 'DELETE' });
        Storage.deleteUser(id);
        return { success: true };
      } catch (error) {
        Storage.deleteUser(id);
        return { success: true };
      }
    },
  },

  students: {
    list: async (): Promise<any[]> => {
      try {
        const response = await apiCall<any[]>('/students/');
        return response.map(normalizeStudent);
      } catch (error) {
        console.warn('Students list error, using local users:', error);
        return Storage.getUsers()
          .filter((u: any) => u.role === UserRole.STUDENT || u.role === 'ELEVE')
          .map((u: any) => normalizeStudent({
            id: u.id,
            full_name: u.name,
            class_name: u.class,
            school_id: u.schoolId,
            matricule: u.matricule,
            avatar: u.avatar,
          }));
      }
    },

    getByUserId: async (userId: string): Promise<any> => {
      try {
        const response = await apiCall<any[]>(`/students/`);
        const student = response.find((s: any) => s.user_id === Number(userId) || s.user_id === userId);
        return student ? normalizeStudent(student) : null;
      } catch (error) {
        console.warn('Student by user ID error:', error);
        return null;
      }
    },

    getGrades: async (studentId: string): Promise<any[]> => {
      try {
        const response = await apiCall<any[]>(`/students/${studentId}/grades`);
        return response.map(normalizeGrade);
      } catch (error) {
        console.warn('Student grades error:', error);
        return [];
      }
    },

    getAttendance: async (studentId: string): Promise<any[]> => {
      try {
        return await apiCall<any[]>(`/students/${studentId}/attendance`);
      } catch (error) {
        console.warn('Student attendance error:', error);
        return [];
      }
    },
  },

  grades: {
    list: async (): Promise<any[]> => {
      try {
        const response = await apiCall<any[]>('/grades/');
        return response.map(normalizeGrade);
      } catch (error) {
        console.warn('Grades list error:', error);
        return [];
      }
    },

    create: async (grade: { studentId: string; subject: string; grade: number; comment?: string }): Promise<any> => {
      return normalizeGrade(await apiCall<any>('/grades/', {
        method: 'POST',
        body: JSON.stringify({
          student_id: Number(grade.studentId),
          subject: grade.subject,
          grade: grade.grade,
          comment: grade.comment || '',
        }),
      }));
    },

    // Grade analytics
    getStudentAnalytics: async (studentId: string): Promise<any> => {
      try {
        return await apiCall<any>(`/grades/analytics/student/${studentId}`);
      } catch (error) {
        console.warn('Grade analytics error:', error);
        return null;
      }
    },

    getClassAnalytics: async (className: string): Promise<any> => {
      try {
        return await apiCall<any>(`/grades/analytics/class/${className}`);
      } catch (error) {
        console.warn('Class grade analytics error:', error);
        return null;
      }
    },

    update: async (gradeId: string, grade: { subject?: string; grade?: number; comment?: string }): Promise<any> => {
      return normalizeGrade(await apiCall<any>(`/grades/${gradeId}`, {
        method: 'PUT',
        body: JSON.stringify(grade),
      }));
    },

    delete: async (gradeId: string): Promise<any> => {
      return await apiCall<any>(`/grades/${gradeId}`, {
        method: 'DELETE',
      });
    },
  },

  quizzes: {
    list: async (): Promise<Quiz[]> => {
      try {
        const response = await apiCall<any[]>('/quizzes/');
        return applyLocalQuizResults(response.map(normalizeQuiz));
      } catch (error) {
        console.warn('Quizzes list error, using local storage:', error);
        return applyLocalQuizResults(Storage.getQuizzes());
      }
    },

    get: async (id: string): Promise<Quiz> => {
      try {
        const response = await apiCall<any>(`/quizzes/${id}`);
        return applyLocalQuizResults([normalizeQuiz(response)])[0];
      } catch (error) {
        const localQuiz = Storage.getQuizzes().find(q => q.id === id);
        if (localQuiz) return applyLocalQuizResults([localQuiz])[0];
        throw error;
      }
    },

    create: async (quiz: Quiz): Promise<Quiz> => {
      try {
        const response = await apiCall<any>('/quizzes/', {
          method: 'POST',
          body: JSON.stringify(quizToBackend(quiz)),
        });

        const createdQuiz = normalizeQuiz(response);
        Storage.addQuiz(createdQuiz);
        return createdQuiz;
      } catch (error) {
        console.error('Quiz creation error:', error);
        Storage.addQuiz(quiz);
        return quiz;
      }
    },

    update: async (quiz: Quiz): Promise<Quiz> => {
      try {
        const response = await apiCall<any>(`/quizzes/${quiz.id}`, {
          method: 'PUT',
          body: JSON.stringify(quizToBackend(quiz)),
        });

        const updatedQuiz = normalizeQuiz(response);
        Storage.updateQuiz(updatedQuiz);
        return updatedQuiz;
      } catch (error) {
        console.error('Quiz update error:', error);
        Storage.updateQuiz(quiz);
        return quiz;
      }
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
        Storage.deleteQuiz(id);
        return { success: true };
      } catch (error) {
        Storage.deleteQuiz(id);
        return { success: true };
      }
    },

    submitResult: async (quizId: string, score: number, answers?: Record<string, string>): Promise<QuizSubmissionResult> => {
      try {
        const rawResult = await apiCall<any>(`/quizzes/${quizId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ score, answers }),
        });
        const quiz = Storage.getQuizzes().find(q => q.id === quizId);
        const result = normalizeSubmissionResult(rawResult, quiz, score, answers);
        saveLocalQuizResult(quizId, result);

        const quizzes = Storage.getQuizzes();
        const updated = quizzes.map(q =>
          q.id === quizId ? { ...q, status: 'completed' as const, averageScore: result.score, correctAnswers: result.correctAnswers, answeredQuestions: result.totalQuestions, correction: result.correction } : q
        );
        Storage.saveData('edutrack_quizzes', updated);
        return result;
      } catch (error) {
        const quiz = Storage.getQuizzes().find(q => q.id === quizId);
        const questions = quiz?.questions || [];
        const correctAnswers = questions.filter((question) => {
          const answer = answers?.[question.id] || '';
          return answer.trim().toLowerCase() === question.correctOption.trim().toLowerCase();
        }).length;
        const fallbackResult: QuizSubmissionResult = {
          success: true,
          score,
          correctAnswers,
          totalQuestions: questions.length,
          correction: questions.map(question => ({
            questionId: question.id,
            isCorrect: (answers?.[question.id] || '').trim().toLowerCase() === question.correctOption.trim().toLowerCase(),
            yourAnswer: answers?.[question.id] || '',
            correctAnswer: question.correctOption,
          })),
        };
        saveLocalQuizResult(quizId, fallbackResult);
        const quizzes = Storage.getQuizzes();
        const updated = quizzes.map(q =>
          q.id === quizId ? { ...q, status: 'completed' as const, averageScore: score, correctAnswers, answeredQuestions: questions.length, correction: fallbackResult.correction } : q
        );
        Storage.saveData('edutrack_quizzes', updated);
        return fallbackResult;
      }
    },

    // Quiz analytics
    getStudentAnalytics: async (studentId: string): Promise<any> => {
      try {
        return await apiCall<any>(`/quizzes/analytics/student/${studentId}`);
      } catch (error) {
        console.warn('Quiz analytics error:', error);
        return null;
      }
    },

    getClassAnalytics: async (className: string): Promise<any> => {
      try {
        return await apiCall<any>(`/quizzes/analytics/class/${className}`);
      } catch (error) {
        console.warn('Class quiz analytics error:', error);
        return null;
      }
    },
  },

  attendance: {
    listSessions: async (): Promise<AttendanceSession[]> => {
      try {
        const response = await apiCall<any[]>('/attendance/');
        return groupAttendanceRecords(response);
      } catch (error) {
        console.warn('Attendance list error, using local storage:', error);
        return Storage.getAttendanceSessions();
      }
    },

    saveSession: async (session: AttendanceSession): Promise<{ success: boolean }> => {
      try {
        await Promise.all(session.records.map(record => apiCall('/attendance/', {
          method: 'POST',
          body: JSON.stringify({
            student_id: Number(record.studentId),
            status: record.status,
            notes: record.observation || record.behavior,
          }),
        })));
        Storage.addAttendanceSession(session);
        return { success: true };
      } catch (error) {
        Storage.addAttendanceSession(session);
        return { success: true };
      }
    },

    getStudentHistory: async (studentId: string): Promise<any[]> => {
      try {
        return await apiCall<any[]>(`/attendance/student/${studentId}`);
      } catch (error) {
        console.warn('Student attendance history error:', error);
        return [];
      }
    },
  },

  messaging: {
    getHistory: async (): Promise<Message[]> => {
      try {
        const messages = await apiCall<any[]>('/messages/');
        return messages.map((m: any) => ({
          id: String(m.id),
          senderId: String(m.sender_id),
          senderName: m.sender_name,
          text: m.text,
          timestamp: m.timestamp,
          isMe: m.sender_id === Storage.getCurrentUser()?.id,
        }));
      } catch (error) {
        console.warn('Messages history error, using local storage:', error);
        return Storage.getData<Message>('edutrack_messages');
      }
    },

    getPrivateHistory: async (recipientId: string): Promise<Message[]> => {
      try {
        const messages = await apiCall<any[]>(`/messages/${recipientId}`);
        return messages.map((m: any) => ({
          id: String(m.id),
          senderId: String(m.sender_id),
          senderName: m.sender_name,
          text: m.text,
          timestamp: m.timestamp,
          isMe: Boolean(m.is_me),
          category: 'general',
        }));
      } catch (error) {
        console.warn('Private messages history error:', error);
        return Storage.getData<Message>('edutrack_messages').filter(m => m.category === 'academic' || m.category === 'general');
      }
    },

    getSupportTickets: async (): Promise<Message[]> => {
      try {
        const messages = await apiCall<any[]>('/messages/?category=support');
        return messages.map((m: any) => ({
          id: String(m.id),
          senderId: String(m.sender_id),
          senderName: m.sender_name,
          text: m.text,
          timestamp: m.timestamp,
          isMe: m.sender_id === Storage.getCurrentUser()?.id,
        }));
      } catch (error) {
        return Storage.getData<Message>('edutrack_messages').filter(m => m.category === 'support');
      }
    },

    send: async (text: string, user: User, recipientId?: string, category: string = 'general'): Promise<Message> => {
      try {
        const response = await apiCall<any>('/messages/', {
          method: 'POST',
          body: JSON.stringify({ text, recipient_id: recipientId ? Number(recipientId) : undefined, category }),
        });

        const msg: Message = {
          id: String(response.id),
          senderId: user.id,
          senderName: user.name,
          text,
          timestamp: new Date().toISOString(),
          isMe: true,
        };
        Storage.addMessage(msg);
        return msg;
      } catch (error) {
        const msg: Message = {
          id: 'm-' + Date.now(),
          senderId: user.id,
          senderName: user.name,
          text,
          timestamp: new Date().toISOString(),
          isMe: true,
        };
        Storage.addMessage(msg);
        return msg;
      }
    },
  },

  notifications: {
    list: async (): Promise<any[]> => {
      try {
        const response = await apiCall<any[]>('/notifications/');
        return response.map(normalizeNotification);
      } catch (error) {
        console.warn('Notifications list error, using local storage:', error);
        return Storage.getData('edutrack_notifications').map(normalizeNotification);
      }
    },

    getAll: async (): Promise<any[]> => {
      try {
        const response = await apiCall<any[]>('/notifications/');
        return response.map(normalizeNotification);
      } catch (error) {
        console.warn('Notifications getAll error, using local storage:', error);
        return (Storage.getData('edutrack_notifications') || []).map(normalizeNotification);
      }
    },

    markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
      try {
        await apiCall(`/notifications/${notificationId}/read`, { method: 'PUT' });
        return { success: true };
      } catch (error) {
        return { success: true };
      }
    },

    delete: async (notificationId: string): Promise<{ success: boolean }> => {
      try {
        await apiCall(`/notifications/${notificationId}`, { method: 'DELETE' });
        return { success: true };
      } catch (error) {
        return { success: true };
      }
    },
  },

  parents: {
    findChild: async (schoolId: string, matricule: string): Promise<any> => {
      try {
        return await apiCall<any>('/parents/find-child', {
          method: 'POST',
          body: JSON.stringify({ school_id: schoolId, matricule }),
        });
      } catch (error) {
        console.error('Find child error:', error);
        throw error;
      }
    },

    getMyChildren: async (): Promise<any[]> => {
      try {
        const response = await apiCall<any>('/parents/my-children');
        return response.children || [];
      } catch (error) {
        console.warn('Get children error:', error);
        return [];
      }
    },

    linkChild: async (schoolId: string, matricule: string): Promise<any> => {
      try {
        return await apiCall<any>('/parents/link-child', {
          method: 'POST',
          body: JSON.stringify({ school_id: schoolId, matricule }),
        });
      } catch (error) {
        console.error('Link child error:', error);
        throw error;
      }
    },

    getChildProgress: async (studentId: string): Promise<any> => {
      return await apiCall<any>(`/parents/children/${studentId}/progress`);
    },

    getChildTeachers: async (studentId: string): Promise<any[]> => {
      return await apiCall<any[]>(`/parents/children/${studentId}/teachers`);
    },
  },

  schools: {
    list: async (): Promise<any[]> => {
      return await API.schools.getAll();
    },

    create: async (school: { name: string }): Promise<any> => {
      return await apiCall<any>('/schools/', {
        method: 'POST',
        body: JSON.stringify({ name: school.name }),
      });
    },

    update: async (school: any): Promise<any> => {
      return await apiCall<any>(`/schools/${school.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: school.name }),
      });
    },

    delete: async (schoolId: string): Promise<any> => {
      return await apiCall<any>(`/schools/${schoolId}`, {
        method: 'DELETE',
      });
    },

    search: async (query: string = ""): Promise<any[]> => {
      try {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        
        const response = await apiCall<any[]>(`/schools/search?${params.toString()}`);
        return response || [];
      } catch (error) {
        console.warn('Schools search error:', error);
        return [];
      }
    },

    getAll: async (): Promise<any[]> => {
      try {
        const response = await apiCall<any[]>('/schools/');
        return (response || []).map((s: any) => ({
          id: String(s.id),
          name: s.name,
          address: s.address || '',
          city: s.city || '',
          studentCount: s.studentCount || 0,
          teacherCount: s.teacherCount || 0,
          status: s.status || 'active',
          logo: s.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${s.name}`,
        }));
      } catch (error) {
        console.warn('Get schools error:', error);
        return [];
      }
    },

    get: async (schoolId: number): Promise<any> => {
      try {
        return await apiCall<any>(`/schools/${schoolId}`);
      } catch (error) {
        console.error('Get school error:', error);
        throw error;
      }
    },
  },};
