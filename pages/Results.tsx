import React, { useEffect, useMemo, useState } from 'react';
import { StudentProfile, User, UserRole } from '../types';
import { API } from '../services/api';

interface ResultsProps {
  role: UserRole;
  user: User;
  activeChild: StudentProfile | null;
}

const Results: React.FC<ResultsProps> = ({ role, user, activeChild }) => {
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (role === UserRole.PARENT && activeChild?.id) {
          const progress = await API.parents.getChildProgress(activeChild.id);
          setGrades(progress.grades || []);
          setAttendance(progress.attendance || []);
          setQuizResults(progress.quiz_results || []);
        } else {
          const [gradeData, attendanceSessions] = await Promise.all([
            API.grades.list().catch(() => []),
            API.attendance.listSessions().catch(() => []),
          ]);
          setGrades(gradeData);
          setAttendance(attendanceSessions.flatMap((session: any) => session.records || []));
          const quizzes = await API.quizzes.list().catch(() => []);
          setQuizResults(quizzes.filter((quiz: any) => quiz.status === 'completed' || quiz.averageScore !== undefined));
        }
      } catch {
        setGrades([]);
        setAttendance([]);
        setQuizResults([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, activeChild?.id]);

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
        </>
      )}
    </div>
  );
};

export default Results;
