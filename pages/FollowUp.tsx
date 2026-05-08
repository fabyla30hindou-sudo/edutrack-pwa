import React, { useEffect, useMemo, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { User } from '../types';
import { API } from '../services/api';

interface FollowUpProps {
  user: User;
  activeClass: string;
}

interface StudentFollowSummary {
  id: string;
  name: string;
  matricule: string;
  className: string;
  grades: any[];
  attendance: any[];
  gradeAnalytics: any;
  quizAnalytics: any;
}

const FollowUp: React.FC<FollowUpProps> = ({ user, activeClass }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<StudentFollowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentFollowSummary | null>(null);
  const [recommendation, setRecommendation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const teacherSubject = user.subject?.trim() || 'Matiere';

  useEffect(() => {
    loadFollowUp();
  }, [user.id, activeClass]);

  const classStudents = useMemo(
    () => students.filter((student) => !activeClass || student.className === activeClass),
    [students, activeClass]
  );

  const loadFollowUp = async () => {
    setLoading(true);
    try {
      const studentData = await API.students.list().catch(() => []);
      const filtered = studentData.filter((student: any) => !activeClass || student.className === activeClass);
      setStudents(filtered);

      const rows = await Promise.all(
        filtered.map(async (student: any) => {
          const [grades, attendance, gradeAnalytics, quizAnalytics] = await Promise.all([
            API.students.getGrades(student.id).catch(() => []),
            API.attendance.getStudentHistory(student.id).catch(() => []),
            API.grades.getStudentAnalytics(student.id).catch(() => null),
            API.quizzes.getStudentAnalytics(student.id).catch(() => null),
          ]);

          return {
            id: String(student.id),
            name: student.name,
            matricule: student.matricule || '',
            className: student.className || activeClass,
            grades,
            attendance,
            gradeAnalytics,
            quizAnalytics,
          };
        })
      );
      setSummaries(rows);
    } catch (error) {
      console.error('Error loading follow-up:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = (attendance: any[]) => {
    return attendance.reduce(
      (acc, row) => {
        const status = row.status || 'present';
        if (status === 'late') acc.late += 1;
        else if (status === 'absent') acc.absent += 1;
        else acc.present += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0 }
    );
  };

  const generateRecommendation = async (student: StudentFollowSummary) => {
    setIsGenerating(true);
    setRecommendation('');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setRecommendation("Cle Gemini absente. Ajoute la cle dans .env (VITE_GEMINI_API_KEY) pour generer une recommandation IA.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const attendanceStats = getAttendanceStats(student.attendance);
      const subjectGrades = (student.grades || []).filter((grade) => grade.subject === teacherSubject);

      const prompt = `
Tu es un conseiller pedagogique expert pour un enseignant.
Contexte:
- Pays: Cameroun
- Classe: ${student.className}
- Matiere enseignee par le professeur: ${teacherSubject}
- Eleve: ${student.name}
- Matricule: ${student.matricule}

Analyse toutes les donnees ci-dessous et produis un suivi sur mesure.

Notes de l'eleve:
${JSON.stringify(subjectGrades, null, 2)}

Analyse globale des notes:
${JSON.stringify(student.gradeAnalytics, null, 2)}

Assiduite et retards:
${JSON.stringify(student.attendance, null, 2)}

Statistiques d'assiduite:
${JSON.stringify(attendanceStats, null, 2)}

Quiz et reponses:
${JSON.stringify(student.quizAnalytics, null, 2)}

Je veux une reponse en francais, claire, professionnelle et tres utile pour un enseignant.
Structure obligatoire:
1. Resume du niveau actuel
2. Forces de l'eleve
3. Difficultes detectees
4. Risques a surveiller
5. Recommandations pedagogiques concretes en classe pour la matiere ${teacherSubject}
6. Conseils de suivi a transmettre aux parents
7. Mini plan d'action sur 2 semaines

Sois specifique, personnalise, actionnable, et base uniquement sur les donnees fournies.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setRecommendation(response.text || "Aucune recommandation n'a ete generee.");
    } catch (error) {
      console.error('AI follow-up error:', error);
      setRecommendation("Impossible de generer la recommandation pour le moment.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center">
        <p className="text-slate-400 font-medium">Chargement du suivi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Suivi des eleves</h2>
        <div className="flex flex-wrap gap-3">
          <span className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest">
            Classe: {activeClass}
          </span>
          <span className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest">
            Matiere: {teacherSubject}
          </span>
        </div>
      </header>

      <div className="bg-white p-6 rounded-3xl border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-black uppercase text-slate-400">
                <th className="pb-3">Eleve</th>
                <th className="pb-3">Moyenne</th>
                <th className="pb-3">Quiz</th>
                <th className="pb-3">Retards</th>
                <th className="pb-3">Absences</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((student) => {
                const attendanceStats = getAttendanceStats(student.attendance);
                return (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="py-3">
                      <p className="font-bold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-400">{student.matricule || student.className}</p>
                    </td>
                    <td className="py-3 font-medium">{student.gradeAnalytics?.overall_average ?? '-'}/20</td>
                    <td className="py-3 font-medium">{student.quizAnalytics?.overall_average ?? '-'}%</td>
                    <td className="py-3 font-medium">{attendanceStats.late}</td>
                    <td className="py-3 font-medium">{attendanceStats.absent}</td>
                    <td className="py-3">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setRecommendation('');
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
              {summaries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Aucun eleve pour cette classe.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{selectedStudent.name}</h3>
                <p className="text-sm text-slate-500">{selectedStudent.className} • {teacherSubject}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600">x</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">Moyenne generale</p>
                <p className="text-3xl font-black">{selectedStudent.gradeAnalytics?.overall_average ?? '-'}/20</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">Moyenne quiz</p>
                <p className="text-3xl font-black">{selectedStudent.quizAnalytics?.overall_average ?? '-'}%</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">Retards</p>
                <p className="text-3xl font-black">{getAttendanceStats(selectedStudent.attendance).late}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">Absences</p>
                <p className="text-3xl font-black">{getAttendanceStats(selectedStudent.attendance).absent}</p>
              </div>
            </div>

            <section className="space-y-3">
              <h4 className="font-black text-slate-800">Notes</h4>
              <div className="space-y-2">
                {selectedStudent.grades.map((grade, index) => (
                  <div key={`${grade.id}-${index}`} className="flex justify-between items-center border border-slate-100 rounded-2xl px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-700">{grade.subject}</p>
                      <p className="text-xs text-slate-400">{(grade.graded_date || grade.date || '').slice(0, 10)}</p>
                    </div>
                    <span className="font-black text-indigo-600">{grade.grade}/20</span>
                  </div>
                ))}
                {selectedStudent.grades.length === 0 && <p className="text-sm text-slate-400">Aucune note.</p>}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-black text-slate-800">Quiz et reponses</h4>
              <div className="space-y-3">
                {(selectedStudent.quizAnalytics?.quizzes || []).map((quiz: any) => (
                  <div key={quiz.quiz_id} className="border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-800">{quiz.quiz_title}</p>
                        <p className="text-xs text-slate-400">{quiz.score}% • {quiz.correct_answers}/{quiz.total_questions}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(quiz.answers || []).map((answer: any, index: number) => (
                        <div key={`${quiz.quiz_id}-${index}`} className="bg-slate-50 rounded-xl p-3">
                          <p className="text-sm font-medium text-slate-700">{answer.question_text}</p>
                          <p className="text-xs text-slate-500">Reponse eleve: {answer.student_answer || '-'}</p>
                          <p className="text-xs text-slate-500">Bonne reponse: {answer.correct_answer || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(!selectedStudent.quizAnalytics?.quizzes || selectedStudent.quizAnalytics.quizzes.length === 0) && (
                  <p className="text-sm text-slate-400">Aucun resultat de quiz.</p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-black text-slate-800">Assiduite</h4>
              <div className="space-y-2">
                {selectedStudent.attendance.map((row, index) => (
                  <div key={`${row.id}-${index}`} className="flex justify-between items-center border border-slate-100 rounded-2xl px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-700">{(row.attendance_date || row.date || '').slice(0, 10)}</p>
                      <p className="text-xs text-slate-400">{row.notes || '-'}</p>
                    </div>
                    <span className="font-black text-slate-600 uppercase text-xs">{row.status}</span>
                  </div>
                ))}
                {selectedStudent.attendance.length === 0 && <p className="text-sm text-slate-400">Aucune donnee de presence.</p>}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-black text-slate-800">Recommendation IA sur mesure</h4>
                <button
                  onClick={() => generateRecommendation(selectedStudent)}
                  disabled={isGenerating}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-black disabled:opacity-50"
                >
                  {isGenerating ? 'Generation...' : 'Generer avec Gemini'}
                </button>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 min-h-32 whitespace-pre-wrap text-sm text-slate-700">
                {recommendation || "Clique sur 'Generer avec Gemini' pour obtenir un suivi pedagogique personnalise."}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUp;
