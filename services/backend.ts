// Service pour tester la connexion avec le backend
const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

export const BackendAPI = {
  getHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.json();
    } catch (error) {
      console.error('Backend connection failed:', error);
      throw error;
    }
  },

  // Students API
  students: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/students/`);
      return response.json();
    },
    create: async (student: any) => {
      const response = await fetch(`${API_BASE_URL}/students/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      return response.json();
    },
  },

  // Attendance API
  attendance: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/attendance/`);
      return response.json();
    },
    create: async (attendance: any) => {
      const response = await fetch(`${API_BASE_URL}/attendance/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendance),
      });
      return response.json();
    },
  },

  // Grades API
  grades: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/grades/`);
      return response.json();
    },
    create: async (grade: any) => {
      const response = await fetch(`${API_BASE_URL}/grades/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grade),
      });
      return response.json();
    },
  },

  // Quizzes API
  quizzes: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/quizzes/`);
      return response.json();
    },
    create: async (quiz: any) => {
      const response = await fetch(`${API_BASE_URL}/quizzes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz),
      });
      return response.json();
    },
  },

  // Auth API (useful for tests)
  auth: {
    register: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    login: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    }
  },

  // Users API (minimal)
  users: {
    create: async (user: any) => {
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      return response.json();
    },
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/users/`);
      return response.json();
    }
  }
};
