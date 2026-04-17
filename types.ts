
export enum UserRole {
  STUDENT = 'ELEVE',
  TEACHER = 'ENSEIGNANT',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN'
}

export interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  studentCount: number;
  teacherCount: number;
  status: 'active' | 'inactive';
  logo: string;
  description?: string;
  phone?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  class: string;
  avatar: string;
  averages: { chapter: string; score: number; trend: 'up' | 'down' | 'stable' }[];
  lastBehavior?: 'excellent' | 'good' | 'average' | 'warning';
  absencesCount?: number;
  retardCount?: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  class?: string;
  classes?: string[];
  children?: StudentProfile[];
  email: string;
  phone?: string;
  schoolId?: string;
  status?: 'active' | 'pending' | 'suspended';
  // Pour les élèves
  matricule?: string;
  // Pour les enseignants
  subject?: string;
}

export interface Quiz {
  id: string;
  title: string;
  chapter: string;
  duration: number;
  questionCount: number;
  status: 'pending' | 'completed' | 'published' | 'draft';
  averageScore?: number;
  questions: Question[];
  correction?: { questionId: string; isCorrect: boolean; yourAnswer: string; correctAnswer: string }[];
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  className: string;
  teacherName: string;
  records: AttendanceRecord[];
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late';
  behavior: 'excellent' | 'good' | 'average' | 'warning';
  observation?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  targetRole?: UserRole;
  category?: 'support' | 'academic' | 'general';
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'message' | 'system' | 'alert' | 'homework';
  read: boolean;
  time: string;
  childId?: string;
}
