import React, { useState, useEffect } from 'react';
import { User, StudentProfile, Quiz, UserRole } from '../types';
import { API } from '../services/api';
import { ICONS } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface AIRecommendationsProps {
  user: User;
  activeChild?: StudentProfile | null;
}

interface StudentData {
  grades: any[];
  quizzes: Quiz[];
  attendance: any[];
  subjectAverages: { subject: string; average: number }[];
  evolution: { date: string; grade: number; subject: string }[];
}

const AIRecommendations: React.FC<AIRecommendationsProps> = ({ user, activeChild }) => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string>('');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [error, setError] = useState<string>('');

  const currentStudentId = activeChild?.id || user.id;

  useEffect(() => {
    if (currentStudentId) {
      loadStudentData();
    }
  }, [currentStudentId]);

  const loadStudentData = async () => {
    setLoading(true);
    setError('');
    
    try {
      let studentGrades: any[] = [];
      let studentAttendance: any[] = [];
      let studentQuizzes: Quiz[] = [];

      // If parent viewing child, get specific child data
      if (user.role === UserRole.PARENT && activeChild?.id) {
        const progress = await API.parents.getChildProgress(activeChild.id).catch(() => null);
        if (progress) {
          studentGrades = progress.grades || [];
          studentAttendance = progress.attendance || [];
          studentQuizzes = (progress.quiz_results || []).map((quiz: any) => ({
            id: String(quiz.id),
            title: quiz.title,
            chapter: quiz.chapter || '',
            duration: 0,
            questionCount: quiz.totalQuestions || 0,
            status: 'completed',
            averageScore: quiz.score,
            correctAnswers: quiz.correctAnswers,
            answeredQuestions: quiz.totalQuestions,
            questions: [],
          }));
        }
      } else if (user.role === UserRole.STUDENT) {
        // For students, we need to get their student record first to find their student_id
        // Then fetch their specific data
        try {
          const studentRecord = await API.students.getByUserId(user.id);
          if (studentRecord) {
            // Fetch student-specific data
            const [grades, attendance, quizAnalytics] = await Promise.all([
              API.students.getGrades(studentRecord.id).catch(() => []),
              API.attendance.getStudentHistory(studentRecord.id).catch(() => []),
              API.quizzes.getStudentAnalytics(studentRecord.id).catch(() => null),
            ]);
            studentGrades = grades;
            studentAttendance = attendance;
            
            // Get quizzes list and apply student analytics
            const quizzesList = await API.quizzes.list().catch(() => []);
            studentQuizzes = quizzesList;
            
            // If quiz analytics available, update quiz scores
            if (quizAnalytics && quizAnalytics.quizzes) {
              studentQuizzes = studentQuizzes.map(quiz => {
                const userQuiz = quizAnalytics.quizzes.find((q: any) => String(q.quiz_id) === String(quiz.id));
                if (userQuiz) {
                  return {
                    ...quiz,
                    status: 'completed' as const,
                    averageScore: userQuiz.score || 0,
                    correctAnswers: userQuiz.correct_answers || 0,
                    answeredQuestions: userQuiz.total_questions || 0,
                  };
                }
                return quiz;
              });
            }
          }
        } catch (err) {
          console.warn('Error fetching student data, falling back to filtered list:', err);
          // Fallback: try to filter from general lists
          const [gradesData, quizzesData, attendanceData] = await Promise.all([
            API.grades.list().catch(() => []),
            API.quizzes.list().catch(() => []),
            API.attendance.listSessions().catch(() => [])
          ]);
          studentGrades = gradesData;
          studentQuizzes = quizzesData;
          studentAttendance = attendanceData.flatMap((session: any) => session.records || []);
        }
      }

      // Calculate subject averages
      const subjectMap = new Map<string, number[]>();
      studentGrades.forEach((grade: any) => {
        const subject = grade.subject || 'Matière inconnue';
        const values = subjectMap.get(subject) || [];
        values.push(Number(grade.grade || 0));
        subjectMap.set(subject, values);
      });

      const subjectAverages = Array.from(subjectMap.entries()).map(([subject, values]) => ({
        subject,
        average: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10
      }));

      // Calculate evolution (sorted by date)
      const evolution = studentGrades
        .filter((g: any) => g.graded_date)
        .sort((a: any, b: any) => new Date(a.graded_date).getTime() - new Date(b.graded_date).getTime())
        .slice(-10)
        .map((g: any) => ({
          date: g.graded_date,
          grade: Number(g.grade || 0),
          subject: g.subject
        }));

      // Calculate attendance rate
      const attendancePresent = studentAttendance.filter((r: any) => r.status === 'present').length;
      const attendanceRate = studentAttendance.length ? Math.round((attendancePresent / studentAttendance.length) * 100) : 100;

      // Calculate quiz performance
      const completedQuizzes = studentQuizzes.filter(q => q.status === 'completed' || q.averageScore !== undefined);
      const quizAverage = completedQuizzes.length ? 
        Math.round(completedQuizzes.reduce((sum, q) => sum + Number(q.averageScore || 0), 0) / completedQuizzes.length) : 0;

      setStudentData({
        grades: studentGrades,
        quizzes: studentQuizzes,
        attendance: studentAttendance,
        subjectAverages,
        evolution
      });

      // Generate AI recommendation
      await generateRecommendation({
        subjectAverages,
        evolution,
        attendanceRate,
        quizAverage,
        completedQuizzesCount: completedQuizzes.length,
        totalGrades: studentGrades.length,
        studentName: activeChild?.name || user.name
      });

    } catch (err) {
      console.error('Error loading student data:', err);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendation = async (data: {
    subjectAverages: { subject: string; average: number }[];
    evolution: { date: string; grade: number; subject: string }[];
    attendanceRate: number;
    quizAverage: number;
    completedQuizzesCount: number;
    totalGrades: number;
    studentName: string;
  }) => {
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      
      // Prepare data summary for AI
      const weakSubjects = data.subjectAverages.filter(s => s.average < 12);
      const strongSubjects = data.subjectAverages.filter(s => s.average >= 15);
      const trend = data.evolution.length >= 3 ? 
        (data.evolution[data.evolution.length - 1].grade > data.evolution[0].grade ? 'en progression' : 
         data.evolution[data.evolution.length - 1].grade < data.evolution[0].grade ? 'en baisse' : 'stable') : 'insuffisante';

      const prompt = `Tu es un conseiller pédagogique expert. Analyse les données suivantes pour l'élève ${data.studentName} et fournis des recommandations personnalisées et actionnables pour son amélioration.

DONNÉES DE L'ÉLÈVE:
- Nombre total de notes: ${data.totalGrades}
- Moyenne des quiz: ${data.quizAverage}%
- Quiz complétés: ${data.completedQuizzesCount}
- Taux de présence: ${data.attendanceRate}%
- Évolution générale: ${trend}

MATIÈRES ET MOYENNES:
${data.subjectAverages.map(s => `- ${s.subject}: ${s.average}/20`).join('\n')}

POINTS FORTS (≥15/20): ${strongSubjects.length > 0 ? strongSubjects.map(s => `${s.subject} (${s.average}/20)`).join(', ') : 'Aucun'}
POINTS FAIBLES (<12/20): ${weakSubjects.length > 0 ? weakSubjects.map(s => `${s.subject} (${s.average}/20)`).join(', ') : 'Aucun'}

Fournis une analyse structurée avec:
1. 📊 **Bilan général** - Résumé de la situation
2. 🎯 **Priorités d'amélioration** - 3-4 actions concrètes pour les matières faibles
3. 💪 **Conseils de méthodologie** - Techniques de révision et d'organisation
4. 📈 **Objectifs réalistes** - Objectifs à court et moyen terme
5. 🌟 **Encouragements** - Message motivant personnalisé

Sois encourageant, précis et pédagogique. Utilise un ton bienveillant mais exigeant.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: 'Tu es un conseiller pédagogique expert qui aide les élèves à s\'améliorer. Tes recommandations doivent être pratiques, actionnables et encourageantes.' }
      });

      setRecommendation(response.text || "Désolé, je n'ai pas pu générer de recommandations pour le moment.");
    } catch (err) {
      console.error('AI Error:', err);
      setError('Erreur lors de la génération des recommandations. Vérifiez votre connexion ou réessayez plus tard.');
    }
  };

  const handleRefresh = () => {
    loadStudentData();
  };

  if (loading && !studentData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold text-sm">Analyse des données en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            🎯 Recommandations IA
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Analyse personnalisée basée sur tes performances
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
          {loading ? 'Analyse...' : 'Actualiser'}
        </button>
      </div>

      {/* Data Summary Cards */}
      {studentData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ICONS.Stats />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moyenne générale</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {(() => {
                if (studentData.subjectAverages.length === 0) return '-';
                const avg = studentData.subjectAverages.reduce((sum: number, s: { average: number }) => sum + s.average, 0) / studentData.subjectAverages.length;
                return avg.toFixed(1) + '/20';
              })()}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ICONS.Presence />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Présence</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {studentData.attendance.length > 0 
                ? Math.round((studentData.attendance.filter((r: any) => r.status === 'present').length / studentData.attendance.length) * 100) + '%'
                : '-'
              }
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ICONS.Quiz />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quiz</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {studentData.quizzes.filter(q => q.status === 'completed').length} / {studentData.quizzes.length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ICONS.Homework />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {studentData.grades.length}
            </p>
          </div>
        </div>
      )}

      {/* Subject Performance */}
      {studentData && studentData.subjectAverages.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-black text-slate-800 mb-4">📊 Performance par matière</h3>
          <div className="space-y-3">
            {studentData.subjectAverages
              .sort((a, b) => a.average - b.average)
              .map((item) => (
                <div key={item.subject} className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">{item.subject}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          item.average >= 15 ? 'bg-emerald-500' : 
                          item.average >= 12 ? 'bg-amber-500' : 
                          'bg-rose-500'
                        }`}
                        style={{ width: `${(item.average / 20) * 100}%` }}
                      />
                    </div>
                    <span className={`font-black text-sm ${
                      item.average >= 15 ? 'text-emerald-600' : 
                      item.average >= 12 ? 'text-amber-600' : 
                      'text-rose-600'
                    }`}>
                      {item.average}/20
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ICONS.Sparkles />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Recommandations personnalisées</h3>
            <p className="text-xs text-slate-500">Généré par EduAI • Basé sur tes données</p>
          </div>
        </div>

        {error ? (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-rose-700 text-sm">
            {error}
          </div>
        ) : recommendation ? (
          <div className="prose prose-slate max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {recommendation}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="font-bold">Clique sur "Actualiser" pour générer tes recommandations</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;