
import React from 'react';
import { UserRole, Quiz, Notification, StudentProfile, School } from './types';

export const COLORS = {
  primary: '#4f46e5',
  secondary: '#64748b',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

export const MOCK_SCHOOLS: School[] = [
  { id: 'sch-1', name: 'Lycée Excellence', address: '12 Rue de la Paix', city: 'Paris', studentCount: 1200, teacherCount: 85, status: 'active', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Excellence' },
  { id: 'sch-2', name: 'Collège Horizon', address: '45 Ave des Champs', city: 'Lyon', studentCount: 850, teacherCount: 45, status: 'active', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Horizon' },
  { id: 'sch-3', name: 'École du Futur', address: '8 Impasse Tech', city: 'Nantes', studentCount: 450, teacherCount: 20, status: 'inactive', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=Futur' },
];

export const MOCK_CHILDREN: StudentProfile[] = [
  { 
    id: 'child-1', 
    name: 'Léo Martin', 
    class: '3ème A', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    lastBehavior: 'good',
    averages: [
      { chapter: 'Maths', score: 16, trend: 'up' },
      { chapter: 'Histoire', score: 14, trend: 'stable' },
      { chapter: 'SVT', score: 12, trend: 'down' }
    ]
  },
  { 
    id: 'child-2', 
    name: 'Emma Martin', 
    class: '6ème C', 
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    lastBehavior: 'excellent',
    averages: [
      { chapter: 'Français', score: 18, trend: 'up' },
      { chapter: 'Géographie', score: 15, trend: 'up' }
    ]
  }
];

export const MOCK_QUIZZES: Quiz[] = [
  // Added missing questions property
  { id: '1', title: 'Calcul Intégral', chapter: 'Mathématiques', duration: 15, questionCount: 10, status: 'pending', averageScore: 75, questions: [] },
  { id: '2', title: 'La Révolution Française', chapter: 'Histoire', duration: 10, questionCount: 5, status: 'completed', averageScore: 82, 
    correction: [
      { questionId: 'q1', isCorrect: true, yourAnswer: 'Paris', correctAnswer: 'Paris' },
      { questionId: 'q2', isCorrect: false, yourAnswer: '54', correctAnswer: '56' }
    ],
    questions: []
  },
  { id: '3', title: 'Photosynthèse', chapter: 'SVT', duration: 20, questionCount: 15, status: 'published', averageScore: 68, questions: [] },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Alerte Absence', description: 'Léo a été marqué absent ce matin.', type: 'alert', read: false, time: '10m', childId: 'child-1' },
  { id: '2', title: 'Nouveau Devoir', description: 'Exercices de géométrie pour demain.', type: 'homework', read: false, time: '45m' },
  { id: '3', title: 'Nouveau Quiz', description: 'Le quiz "Photosynthèse" est disponible.', type: 'quiz', read: false, time: '1h' },
];

export const ICONS = {
  Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Quiz: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="m9 12 2 2 4-4"/></svg>,
  Chat: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Presence: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Notifications: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Stats: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
  Switch: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>,
  Homework: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>,
  School: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10"/><path d="m22 10-10-8-10 8"/><path d="M6 12v4"/><path d="M10 12v4"/><path d="M14 12v4"/><path d="M18 12v4"/></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
};
