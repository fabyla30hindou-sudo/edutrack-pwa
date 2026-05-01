import React, { useEffect, useMemo, useState } from 'react';
import { StudentProfile, User, UserRole } from '../types';
import { API } from '../services/api';

interface ResultsProps {
  role: UserRole;
  user: User;
  activeChild: StudentProfile | null;
}

interface QuizAnalytics {
  student_id: number;
  overall_average: number;
  total_quizzes: number;
  quizzes: {
    quiz_id: number;
    quiz_title: string;
    score: number;
    correct_answers: number;
    total_questions: number;
    attempt_date: string;
  }[];
  evolution: { date: string; score: number; quiz_title: string }[];
  distribution: Record<string, number>;
}

const Results: React.FC<ResultsProps> = ({ role, user, activeChild }) => {
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [gradeAnalytics, setGradeAnalytics] = useState<any>(null);
  const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let studentId = null;
        
        if (role === UserRole.PARENT && activeChild?.id) {
          studentId = activeChild.id;
          const progress = await API.parents.getChildProgress(activeChild.id);
          setGrades(progress.grades || []);
          setAttendance(progress.attendance || []);
          setQuizResults(progress.quiz_results || []);
        } else if (role === UserRole.STUDENT) {
          const studentProfile = await API.students.getByUserId(user.id).catch(() => null);
          if (studentProfile?.id) {
            studentId = studentProfile.id;
          }
        }
        
        if (studentId) {
          // Load grade analytics
          const gradeAnalyticsData = await API.grades.getStudentAnalytics(studentId).catch(() => null);
          setGradeAnalytics(gradeAnalyticsData);
          
          // Load quiz analytics
          const quizAnalyticsData = await API.quizzes.getStudentAnalytics(studentId).catch(() => null);
          setQuizAnalytics(quizAnalyticsData);
        }

        const [gradeData, attendanceSessions] = await Promise.all([
          API.grades.list().catch(() => []),
          API.attendance.listSessions().catch(() => []),
        ]);
        setGrades(gradeData);
        setAttendance(attendanceSessions.flatMap((session: any) => session.records || []));
        const quizzes = await API.quizzes.list().catch(() => []);
        setQuizResults(quizzes.filter((quiz: any) => quiz.status === 'completed' || quiz.averageScore !== undefined));
      } catch {
        setGrades([]);
        setAttendance([]);
        setQuizResults([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, activeChild?.id, user.id]);

  const title = role === UserRole.PARENT
    ? activeChild ? `Évolution de ${activeChild.name}` : 'Sélectionne un enfant'
    : `Résultats de ${user.name}`;

  const subjectAverages = useMemo(() => {
    const bySubject = new Map<string, number[]>();
    grades.forEach((grade) => {
      const subject = grade.subject || 'Matière';
      const values = bySubject.get(subject) || [];
      values.push(Number(grade.grade || 0));
      bySubject.set(subject, values);
    });
    return Array.from(bySubject.entries()).map(([subject, values]) => ({
      subject,
      average: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
    }));
  }, [grades]);

  // Chart rendering helpers
  const renderDistributionChart = (distribution: Record<string, number>, isQuiz: boolean = false) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return <p className="text-slate-400 text-sm">Aucune donnée</p>;

    return (
      <div className="flex items-end gap-1 h-24">
        {Object.entries(distribution).map(([range, count]) => {
          const percentage = (count / total) * 100;
          const color = isQuiz ? 'bg-emerald-500' : 'bg-indigo-500';
          return (
            <div key={range} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full ${color} rounded-t transition-all`}
                style={{ height: `${percentage}%`, minHeight: percentage > 0 ? '4px' : '0' }}
              />
              <span className="text-[8px] mt-1 text-slate-500">{range}</span>
              <span className="text-[10px] font-bold">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEvolutionChart = (evolution: { date: string; grade?: number; score?: number; subject?: string; quiz_title?: string }[], isQuiz: boolean = false) => {
    if (!evolution || evolution.length === 0) return <p className="text-slate-400 text-sm">Aucune évolution</p>;

    const maxGrade = 20;
    const points = evolution.map(e => ({ 
      x: e.date, 
      y: e.grade || e.score || 0 
    }));

    return (
      <div className="relative h-40">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 5, 10, 15, 20].map(y => (
            <line key={y} x1="0" y1={100 - y * 5} x2="100" y2={100 - y * 5} stroke="#e2e8f0" strokeWidth="0.5" />
          ))}
          {/* Line chart */}
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke={isQuiz ? '#10b981' : '#4f46e5'}
              strokeWidth="2"
              points={points.map((p, i) => `${(i / (points.length - 1)) * 100},${100 - (p.y / maxGrade) * 100}`).join(' ')}
            />
          )}
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={(i / (points.length - 1 || 1)) * 100}
              cy={100 - (p.y / maxGrade) * 100}
              r="3"
              fill={isQuiz ? '#10b981' : '#4f46e5'}
            />
          ))}
        </svg>
        <div className="flex justify-between mt-1">
          {points.slice(0, 5).map((p, i) => (
            <span key={i} className="text-[8px] text-slate-400">{p.x?.slice(5, 10)}</span>
          ))}
        </div>
      </div>
    );
  };

  if (role === UserRole.PARENT && !activeChild) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center">
        <h2 className="text-2xl font-black text-slate-800">Aucun enfant sélectionné</h2>
        <p className="text-slate-400 font-medium mt-2">Associe ou sélectionne un enfant depuis le tableau de bord parent.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
      </header>

      {loading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100">Chargement...</div>
      ) : (
        <>
          {/* Grade Analytics Summary */}
          {gradeAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moyenne Notes</p>
                <p className="text-3xl font-black text-indigo-600 mt-2">{gradeAnalytics.overall_average || '-'}/20</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Notes</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{gradeAnalytics.total_grades || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moyenne Quiz</p>
                <p className="text-3xl font-black text-emerald-600 mt-2">{quizAnalytics?.overall_average ? Math.round(quizAnalytics.overall_average / 5) : '-'}/20</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quiz Complétés</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{quizAnalytics?.total_quizzes || 0}</p>
              </div>
            </div>
          )}

          {/* Grade Distribution */}
          {gradeAnalytics?.distribution && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-4">Distribution des Notes</h3>
              {renderDistributionChart(gradeAnalytics.distribution, false)}
            </div>
          )}

          {/* Quiz Distribution */}
          {quizAnalytics?.distribution && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-4">Distribution des Quiz</h3>
              {renderDistributionChart(quizAnalytics.distribution, true)}
            </div>
          )}

          {/* Subject Averages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subjectAverages.map(item => (
              <div key={item.subject} className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.subject}</p>
                <p className="text-3xl font-black text-slate-800 mt-2">{item.average}/20</p>
              </div>
            ))}
            {subjectAverages.length === 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 text-slate-400 font-bold">
                Aucune moyenne disponible.
              </div>
            )}
          </div>

          {/* Grade Evolution */}
          {gradeAnalytics?.evolution && gradeAnalytics.evolution.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-4">Évolution des Notes</h3>
              {renderEvolutionChart(gradeAnalytics.evolution, false)}
            </div>
          )}

          {/* Quiz Evolution */}
          {quizAnalytics?.evolution && quizAnalytics.evolution.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-4">Évolution des Quiz</h3>
              {renderEvolutionChart(quizAnalytics.evolution, true)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-3">Notes</h3>
              <div className="space-y-2">
                {grades.map((grade) => (
                  <div key={grade.id} className="flex justify-between gap-4 text-sm border-b border-slate-100 pb-2">
                    <span>{grade.subject}</span>
                    <span className="font-black">{grade.grade}/20</span>
                  </div>
                ))}
                {grades.length === 0 && <p className="text-slate-400 text-sm">Aucune note.</p>}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-3">Quiz</h3>
              <div className="space-y-2">
                {quizResults.map((quiz) => (
                  <div key={quiz.id} className="flex justify-between gap-4 text-sm border-b border-slate-100 pb-2">
                    <span>{quiz.title}</span>
                    <span className="font-black">
                      {quiz.score ?? quiz.averageScore ?? 0}% ({quiz.correctAnswers || 0}/{quiz.totalQuestions || quiz.answeredQuestions || quiz.questionCount || 0})
                    </span>
                  </div>
                ))}
                {quizResults.length === 0 && <p className="text-slate-400 text-sm">Aucun quiz terminé.</p>}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100">
            <h3 className="font-black mb-3">Assiduité</h3>
            <div className="space-y-2">
              {attendance.map((item, index) => (
                <div key={`${item.id || item.studentId}-${index}`} className="flex justify-between gap-4 text-sm border-b border-slate-100 pb-2">
                  <span>{item.attendance_date || item.date || item.studentName || 'Présence'}</span>
                  <span className="font-black uppercase">{item.status}</span>
                </div>
              ))}
              {attendance.length === 0 && <p className="text-slate-400 text-sm">Aucune donnée de présence.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Results;
