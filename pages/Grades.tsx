import React, { useEffect, useState } from 'react';
import { User, UserRole, StudentProfile } from '../types';
import { API } from '../services/api';

interface GradesPageProps {
  role: UserRole;
  user: User;
  activeChild: StudentProfile | null;
}

interface GradeEntry {
  id: number;
  student_id: number;
  student_name: string;
  subject: string;
  grade: number;
  comment: string;
  graded_date: string;
}

interface StudentAnalytics {
  student_id: number;
  overall_average: number;
  total_grades: number;
  subjects: {
    subject: string;
    average: number;
    count: number;
    latest_grade: number;
    evolution: { date: string; grade: number }[];
  }[];
  evolution: { date: string; grade: number; subject: string }[];
  distribution: Record<string, number>;
}

const Grades: React.FC<GradesPageProps> = ({ role, user, activeChild }) => {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [newGrade, setNewGrade] = useState({ studentId: '', subject: '', grade: '', comment: '' });
  const [subjects] = useState(['Mathématiques', 'Français', 'Anglais', 'Histoire-Géo', 'Sciences', 'Physique-Chimie', 'EPS', 'Art', 'Musique']);

  useEffect(() => {
    loadData();
  }, [role, activeChild]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (role === UserRole.TEACHER || role === UserRole.ADMIN || role === UserRole.SUPERADMIN) {
        const [gradesData, studentsData] = await Promise.all([
          API.grades.list().catch(() => []),
          API.students.list().catch(() => [])
        ]);
        setGrades(gradesData);
        setStudents(studentsData);
      } else if (role === UserRole.PARENT && activeChild?.id) {
        const analyticsData = await API.grades.getStudentAnalytics(activeChild.id);
        setAnalytics(analyticsData);
        const gradesData = await API.students.getGrades(activeChild.id).catch(() => []);
        setGrades(gradesData);
      } else if (role === UserRole.STUDENT) {
        const studentProfile = await API.students.getByUserId(user.id).catch(() => null);
        if (studentProfile?.id) {
          const analyticsData = await API.grades.getStudentAnalytics(studentProfile.id);
          setAnalytics(analyticsData);
          const gradesData = await API.students.getGrades(studentProfile.id).catch(() => []);
          setGrades(gradesData);
        }
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrade.studentId || !newGrade.subject || !newGrade.grade) return;

    try {
      await API.grades.create({
        studentId: newGrade.studentId,
        subject: newGrade.subject,
        grade: Number(newGrade.grade),
        comment: newGrade.comment
      });
      setNewGrade({ studentId: '', subject: '', grade: '', comment: '' });
      loadData();
    } catch (error) {
      console.error('Error creating grade:', error);
    }
  };

  const handleViewAnalytics = async (studentId: number) => {
    setSelectedStudent(studentId);
    try {
      const data = await API.grades.getStudentAnalytics(String(studentId));
      setAnalytics(data);
      setShowAnalytics(true);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 16) return 'text-green-600 bg-green-50';
    if (grade >= 14) return 'text-blue-600 bg-blue-50';
    if (grade >= 12) return 'text-yellow-600 bg-yellow-50';
    if (grade >= 10) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const renderDistributionChart = (distribution: Record<string, number>) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return <p className="text-slate-400 text-sm">Aucune donnée</p>;

    return (
      <div className="flex items-end gap-1 h-32">
        {Object.entries(distribution).map(([range, count]) => {
          const percentage = (count / total) * 100;
          return (
            <div key={range} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-indigo-500 rounded-t transition-all"
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

  const renderEvolutionChart = (evolution: { date: string; grade: number }[]) => {
    if (!evolution || evolution.length === 0) return <p className="text-slate-400 text-sm">Aucune évolution</p>;

    const maxGrade = 20;
    const points = evolution.map(e => ({ x: e.date, y: e.grade }));

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
              stroke="#4f46e5"
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
              fill="#4f46e5"
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

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center">
        <p className="text-slate-400 font-medium">Chargement des notes...</p>
      </div>
    );
  }

  // For students and parents - show analytics view
  if (role === UserRole.STUDENT || role === UserRole.PARENT) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {role === UserRole.PARENT && activeChild ? `Notes de ${activeChild.name}` : 'Mes Notes'}
          </h2>
        </header>

        {analytics && (
          <>
            {/* Overall average */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moyenne Générale</p>
                <p className="text-4xl font-black text-slate-800 mt-2">{analytics.overall_average || '-'}/20</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Notes</p>
                <p className="text-4xl font-black text-slate-800 mt-2">{analytics.total_grades || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribution</p>
                {renderDistributionChart(analytics.distribution || {})}
              </div>
            </div>

            {/* Subject averages */}
            {analytics.subjects && analytics.subjects.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <h3 className="font-black mb-4">Moyennes par Matière</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analytics.subjects.map((subj: any) => (
                    <div key={subj.subject} className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-slate-600">{subj.subject}</p>
                      <p className="text-2xl font-black text-slate-800">{subj.average}/20</p>
                      <p className="text-[10px] text-slate-400">{subj.count} notes</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evolution chart */}
            {analytics.evolution && analytics.evolution.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100">
                <h3 className="font-black mb-4">Évolution des Notes</h3>
                {renderEvolutionChart(analytics.evolution)}
              </div>
            )}

            {/* Recent grades */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-black mb-4">Notes Récentes</h3>
              <div className="space-y-2">
                {grades.slice(0, 10).map((grade) => (
                  <div key={grade.id} className="flex justify-between items-center gap-4 text-sm border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-medium">{grade.subject}</span>
                      <span className="text-slate-400 text-xs ml-2">{grade.graded_date?.slice(0, 10)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-black ${getGradeColor(grade.grade)}`}>
                      {grade.grade}/20
                    </span>
                  </div>
                ))}
                {grades.length === 0 && <p className="text-slate-400 text-sm">Aucune note.</p>}
              </div>
            </div>
          </>
        )}

        {!analytics && (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center">
            <p className="text-slate-400 font-medium">Aucune note disponible.</p>
          </div>
        )}
      </div>
    );
  }

  // For teachers - show management view
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestion des Notes</h2>
      </header>

      {/* Create new grade form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100">
        <h3 className="font-black mb-4">Ajouter une Note</h3>
        <form onSubmit={handleCreateGrade} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            className="p-3 border border-slate-200 rounded-xl font-medium"
            value={newGrade.studentId}
            onChange={(e) => setNewGrade({ ...newGrade, studentId: e.target.value })}
            required
          >
            <option value="">Sélectionner un élève</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} ({student.className})
              </option>
            ))}
          </select>
          <select
            className="p-3 border border-slate-200 rounded-xl font-medium"
            value={newGrade.subject}
            onChange={(e) => setNewGrade({ ...newGrade, subject: e.target.value })}
            required
          >
            <option value="">Matière</option>
            {subjects.map((subj) => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="20"
            step="0.5"
            placeholder="Note /20"
            className="p-3 border border-slate-200 rounded-xl font-medium"
            value={newGrade.grade}
            onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Commentaire (optionnel)"
            className="p-3 border border-slate-200 rounded-xl font-medium"
            value={newGrade.comment}
            onChange={(e) => setNewGrade({ ...newGrade, comment: e.target.value })}
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 transition-colors"
          >
            Ajouter
          </button>
        </form>
      </div>

      {/* Grades list */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100">
        <h3 className="font-black mb-4">Toutes les Notes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-black uppercase text-slate-400">
                <th className="pb-3">Élève</th>
                <th className="pb-3">Matière</th>
                <th className="pb-3">Note</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Commentaire</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => (
                <tr key={grade.id} className="border-t border-slate-100">
                  <td className="py-3 font-medium">{grade.student_name || `Élève #${grade.student_id}`}</td>
                  <td className="py-3">{grade.subject}</td>
                  <td className="py-3">
                    <span className={`px-3 py-1 rounded-full font-black ${getGradeColor(grade.grade)}`}>
                      {grade.grade}/20
                    </span>
                  </td>
                  <td className="py-3 text-slate-400 text-sm">{grade.graded_date?.slice(0, 10)}</td>
                  <td className="py-3 text-slate-500 text-sm">{grade.comment || '-'}</td>
                  <td className="py-3">
                    <button
                      onClick={() => handleViewAnalytics(grade.student_id)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Voir Analytics
                    </button>
                  </td>
                </tr>
              ))}
              {grades.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Aucune note</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics modal */}
      {showAnalytics && analytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black">Analytics Élève</h3>
              <button onClick={() => setShowAnalytics(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">Moyenne Générale</p>
                <p className="text-3xl font-black">{analytics.overall_average}/20</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500">Total Notes</p>
                <p className="text-3xl font-black">{analytics.total_grades}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-black uppercase text-slate-400 mb-2">Distribution</p>
              {renderDistributionChart(analytics.distribution || {})}
            </div>

            {analytics.evolution && analytics.evolution.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase text-slate-400 mb-2">Évolution</p>
                {renderEvolutionChart(analytics.evolution)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grades;