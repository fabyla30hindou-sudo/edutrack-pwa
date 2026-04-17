
import { Quiz, AttendanceSession, Message, Notification, User, School } from '../types';
import { MOCK_QUIZZES, MOCK_NOTIFICATIONS, MOCK_SCHOOLS, MOCK_CHILDREN } from '../constants';

const KEYS = {
  QUIZZES: 'edutrack_quizzes',
  ATTENDANCE_SESSIONS: 'edutrack_attendance_sessions',
  MESSAGES: 'edutrack_messages',
  NOTIFICATIONS: 'edutrack_notifications',
  USER: 'edutrack_current_user',
  SCHOOLS: 'edutrack_schools',
  USERS_LIST: 'edutrack_all_users',
  JWT_TOKEN: 'edutrack_jwt_token'
};

export const Storage = {
  init: () => {
    if (!localStorage.getItem(KEYS.QUIZZES)) {
      localStorage.setItem(KEYS.QUIZZES, JSON.stringify(MOCK_QUIZZES));
    }
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(MOCK_NOTIFICATIONS));
    }
    if (!localStorage.getItem(KEYS.SCHOOLS)) {
      localStorage.setItem(KEYS.SCHOOLS, JSON.stringify(MOCK_SCHOOLS));
    }
    if (!localStorage.getItem(KEYS.ATTENDANCE_SESSIONS)) {
      localStorage.setItem(KEYS.ATTENDANCE_SESSIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.MESSAGES)) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([
        { id: 'm1', senderId: 'ai', senderName: 'Système', text: 'Bienvenue sur EduTrack !', timestamp: '08:00', isMe: false, category: 'general' }
      ]));
    }
    if (!localStorage.getItem(KEYS.USERS_LIST)) {
      localStorage.setItem(KEYS.USERS_LIST, JSON.stringify([
        { id: 'u1', name: 'Mme Valérie', role: 'ENSEIGNANT', email: 'v.valerie@ecole.fr', schoolId: 'sch-1', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Valerie' },
        { id: 'u2', name: 'Jean Martin', role: 'PARENT', email: 'j.martin@mail.com', schoolId: 'sch-1', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean', children: MOCK_CHILDREN },
        { id: 'u3', name: 'Léo Martin', role: 'ELEVE', email: 'leo@ecole.fr', schoolId: 'sch-1', status: 'active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo', class: '3ème A' }
      ]));
    }
  },

  getData: <T>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  saveData: <T>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Auth
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem(KEYS.USER, JSON.stringify(user));
    else localStorage.removeItem(KEYS.USER);
  },
  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  updateCurrentUser: (updatedUser: User) => {
    // 1. Mettre à jour la session courante
    Storage.setCurrentUser(updatedUser);
    
    // 2. Mettre à jour dans la liste globale de tous les utilisateurs
    const allUsers = Storage.getUsers();
    const updatedUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    Storage.saveData(KEYS.USERS_LIST, updatedUsers);
  },

  // Schools CRUD
  getSchools: () => Storage.getData<School>(KEYS.SCHOOLS),
  addSchool: (school: School) => {
    const schools = Storage.getSchools();
    Storage.saveData(KEYS.SCHOOLS, [school, ...schools]);
  },
  updateSchool: (school: School) => {
    const schools = Storage.getSchools();
    Storage.saveData(KEYS.SCHOOLS, schools.map(s => s.id === school.id ? school : s));
  },
  deleteSchool: (id: string) => {
    const schools = Storage.getSchools();
    Storage.saveData(KEYS.SCHOOLS, schools.filter(s => s.id !== id));
  },

  // Users CRUD
  getUsers: () => Storage.getData<User>(KEYS.USERS_LIST),
  addUser: (user: User) => {
    const users = Storage.getUsers();
    Storage.saveData(KEYS.USERS_LIST, [user, ...users]);
  },
  updateUser: (user: User) => {
    const users = Storage.getUsers();
    Storage.saveData(KEYS.USERS_LIST, users.map(u => u.id === user.id ? user : u));
  },
  deleteUser: (id: string) => {
    const users = Storage.getUsers();
    Storage.saveData(KEYS.USERS_LIST, users.filter(u => u.id !== id));
  },

  // Quizzes CRUD
  getQuizzes: () => Storage.getData<Quiz>(KEYS.QUIZZES),
  addQuiz: (quiz: Quiz) => {
    const quizzes = Storage.getQuizzes();
    Storage.saveData(KEYS.QUIZZES, [quiz, ...quizzes]);
  },
  updateQuiz: (quiz: Quiz) => {
    const quizzes = Storage.getQuizzes();
    Storage.saveData(KEYS.QUIZZES, quizzes.map(q => q.id === quiz.id ? quiz : q));
  },
  deleteQuiz: (id: string) => {
    const quizzes = Storage.getQuizzes();
    Storage.saveData(KEYS.QUIZZES, quizzes.filter(q => q.id !== id));
  },

  // Attendance CRUD
  getAttendanceSessions: () => Storage.getData<AttendanceSession>(KEYS.ATTENDANCE_SESSIONS),
  addAttendanceSession: (session: AttendanceSession) => {
    const sessions = Storage.getAttendanceSessions();
    Storage.saveData(KEYS.ATTENDANCE_SESSIONS, [session, ...sessions]);
  },

  // Messages CRUD
  addMessage: (message: Message) => {
    const messages = Storage.getData<Message>(KEYS.MESSAGES);
    Storage.saveData(KEYS.MESSAGES, [...messages, message]);
  },

  // JWT Token management
  setToken: (token: string | null) => {
    if (token) localStorage.setItem(KEYS.JWT_TOKEN, token);
    else localStorage.removeItem(KEYS.JWT_TOKEN);
  },

  getToken: (): string | null => {
    return localStorage.getItem(KEYS.JWT_TOKEN);
  }
};
