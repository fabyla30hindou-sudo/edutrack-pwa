import React, { useEffect, useMemo, useState } from 'react';
import { UserRole, User, StudentProfile } from '../types';
import { ICONS } from '../constants';
import ParentChildSearch from '../components/ParentChildSearch';
import { API } from '../services/api';

interface DashboardProps {
  role: UserRole;
  user: User;
  activeChild: StudentProfile | null;
  setActiveChild: (c: StudentProfile) => void;
  activeClass: string;
  setActiveClass: (s: string) => void;
}

const average = (values: number[]) => values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;

const Dashboard: React.FC<DashboardProps> = ({ role, user, activeChild, setActiveChild, activeClass, setActiveClass }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentContextName = role === UserRole.PARENT ? activeChild?.name || 'Aucun enfant sélectionné' : role === UserRole.TEACHER ? activeClass : user.name;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [studentData, gradeData, attendanceData, quizData, messageData, notificationData] = await Promise.all([
        API.students.list().catch(() => []),
        API.grades.list().catch(() => []),
        API.attendance.listSessions().catch(() => []),
        API.quizzes.list().catch(() => []),
        API.messaging.getHistory().catch(() => []),
        API.notifications.getAll().catch(() => []),
      ]);
      let nextGrades = gradeData;
      let nextAttendance = attendanceData.flatMap((session: any) => session.records || []);
      let nextQuizzes = quizData;

      if (role === UserRole.PARENT && activeChild?.id) {
        const progress = await API.parents.getChildProgress(activeChild.id).catch(() => null);
        if (progress) {
          nextGrades = progress.grades || [];
          nextAttendance = progress.attendance || [];
          nextQuizzes = (progress.quiz_results || []).map((quiz: any) => ({
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
      }
      setStudents(studentData);
      setGrades(nextGrades);
      setAttendance(nextAttendance);
      setQuizzes(nextQuizzes);
      setMessages(messageData);
      setNotifications(notificationData);
      setLoading(false);
    };

    load();
  }, [role, activeChild?.id, activeClass]);

  const filteredStudents = useMemo(() => {
    if (role !== UserRole.TEACHER) return students;
    return students.filter(student => !activeClass || student.className === activeClass);
  }, [students, role, activeClass]);

  const childGrades = useMemo(() => {
    if (role === UserRole.PARENT && activeChild) {
      return grades.filter(grade => String(grade.studentId) === String(activeChild.id));
    }
    return grades;
  }, [grades, role, activeChild]);

  const classGrades = useMemo(() => {
    if (role !== UserRole.TEACHER) return grades;
    const studentIds = new Set(filteredStudents.map(student => String(student.id)));
    return grades.filter(grade => studentIds.has(String(grade.studentId)));
  }, [grades, role, filteredStudents]);

  const gradeSource = role === UserRole.TEACHER ? classGrades : childGrades;
  const attendancePresent = attendance.filter(record => record.status === 'present').length;
  const attendanceRate = attendance.length ? Math.round((attendancePresent / attendance.length) * 100) : 0;
  const unreadMessages = messages.filter(message => !message.isMe && String(message.senderId) !== String(user.id)).length;
  const unreadNotifications = notifications.filter(notification => !(notification.is_read ?? notification.read)).length;
  const completedQuizzes = quizzes.filter(quiz => quiz.status === 'completed' || quiz.averageScore !== undefined);
  const pendingQuizzes = quizzes.filter(quiz => quiz.status !== 'completed' && quiz.questionCount > 0);
  const quizAverage = average(completedQuizzes.map(quiz => Number(quiz.averageScore || 0)));
  const quizCorrectAnswers = completedQuizzes.reduce((sum, quiz) => sum + Number(quiz.correctAnswers || 0), 0);
  const quizAnsweredQuestions = completedQuizzes.reduce((sum, quiz) => sum + Number(quiz.answeredQuestions || quiz.questionCount || 0), 0);

  const subjectAverages = useMemo(() => {
    const bySubject = new Map<string, number[]>();
    gradeSource.forEach((grade) => {
      const values = bySubject.get(grade.subject) || [];
      values.push(Number(grade.grade || 0));
      bySubject.set(grade.subject, values);
    });
    return Array.from(bySubject.entries()).map(([subject, values]) => ({
      subject,
      average: average(values),
    }));
  }, [gradeSource]);

  const stats = [
    { label: 'Moyenne', value: `${average(gradeSource.map(g => Number(g.grade || 0))) || '-'}/20`, icon: <ICONS.Stats /> },
    { label: 'Présence', value: attendance.length ? `${attendanceRate}%` : '-', icon: <ICONS.Presence /> },
    { label: 'Quiz faits', value: `${completedQuizzes.length}/${quizzes.length}`, icon: <ICONS.Quiz /> },
    { label: 'Messages', value: String(unreadMessages), icon: <ICONS.Chat /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {(role === UserRole.PARENT || role === UserRole.TEACHER) && (
        <div className="flex items-center space-x-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
          <div className="shrink-0 flex items-center space-x-2 text-indigo-600">
            <ICONS.Switch />
            <span className="text-[10px] font-black uppercase tracking-widest">{role === UserRole.PARENT ? 'Enfant' : 'Classe'} :</span>
          </div>
          <div className="flex items-center space-x-2">
            {role === UserRole.PARENT && user.children?.map(child => (
              <button
                key={child.id}
                onClick={() => setActiveChild(child)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeChild?.id === child.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                {child.name}
              </button>
            ))}
            {role === UserRole.TEACHER && (user.classes?.length ? user.classes : [activeClass]).map(cls => (
              <button
                key={cls}
                onClick={() => setActiveClass(cls)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeClass === cls ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      )}

      {role === UserRole.PARENT && <ParentChildSearch onChildSelected={setActiveChild} />}

      <section className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">
              {loading ? 'Synchronisation...' : 'Aperçu en temps réel'}
            </span>
            <h2 className="text-4xl font-black tracking-tight">{currentContextName}</h2>
            <p className="text-indigo-100 max-w-xl opacity-90 text-sm leading-relaxed">
              {role === UserRole.STUDENT && `Tu as ${pendingQuizzes.length} quiz à faire, ${completedQuizzes.length} quiz terminé(s), une moyenne quiz de ${quizAverage || '-'}% et ${unreadNotifications} notification(s) à lire.`}
              {role === UserRole.TEACHER && `${filteredStudents.length} élève(s) dans ${activeClass}. Moyenne de classe: ${average(classGrades.map(g => Number(g.grade || 0))) || '-'} /20.`}
              {role === UserRole.PARENT && (activeChild ? `Suivi de ${activeChild.name}: ${childGrades.length} note(s), ${attendance.length} point(s) de présence, ${unreadMessages} message(s) à traiter.` : 'Associe ou sélectionne un enfant pour afficher son suivi complet.')}
            </p>
          </div>
          <button className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs shadow-lg">
            {role === UserRole.TEACHER ? 'Classe active' : 'Rapport complet'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center group hover:border-indigo-200 transition-all">
            <div className="text-indigo-600 mb-2 flex justify-center scale-90 opacity-60 group-hover:opacity-100 transition-opacity">
              {stat.icon}
            </div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {(role === UserRole.STUDENT || role === UserRole.PARENT) && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Moyennes par matière</h3>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Données API</span>
          </div>
          {subjectAverages.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-100 text-slate-400 font-bold text-center">
              Aucune note disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {subjectAverages.map(item => (
                <div key={item.subject} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.subject}</p>
                    <p className="text-3xl font-black text-slate-800">{item.average}/20</p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${item.average >= 15 ? 'bg-emerald-50 text-emerald-600' : item.average >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    {item.average >= 15 ? 'A' : item.average >= 10 ? 'B' : 'C'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {role === UserRole.STUDENT && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Progression quiz</h3>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              {quizAnsweredQuestions ? `${quizCorrectAnswers}/${quizAnsweredQuestions} réponses justes` : 'Aucun résultat'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quiz terminés</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{completedQuizzes.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Score moyen</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{quizAverage || 0}%</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">À faire</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{pendingQuizzes.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {completedQuizzes.length === 0 ? (
              <p className="p-6 text-sm font-bold text-slate-400">Aucun quiz terminé pour le moment.</p>
            ) : completedQuizzes.slice(0, 5).map(quiz => (
              <div key={quiz.id} className="flex items-center justify-between gap-4 p-5 border-b border-slate-100 last:border-b-0">
                <div>
                  <p className="font-black text-slate-800">{quiz.title}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{quiz.chapter}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-indigo-600">{quiz.averageScore ?? 0}%</p>
                  <p className="text-[10px] font-bold text-slate-400">{quiz.correctAnswers || 0}/{quiz.answeredQuestions || quiz.questionCount} correctes</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {role === UserRole.TEACHER && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Élèves de la classe</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-sm font-bold text-slate-400">Aucun élève trouvé pour cette classe.</p>
              ) : filteredStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                  <div>
                    <p className="font-black text-slate-700">{student.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{student.matricule || student.className}</p>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600">{student.className || activeClass}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Derniers quiz</h3>
            <div className="space-y-3">
              {quizzes.slice(0, 4).map(quiz => (
                <div key={quiz.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-3">
                  <span className="font-bold text-slate-600">{quiz.title}</span>
                  <span className="text-indigo-600 font-black">
                    {quiz.averageScore !== undefined && quiz.averageScore !== null ? `${quiz.averageScore}%` : `${quiz.questionCount || quiz.questions.length} q.`}
                  </span>
                </div>
              ))}
              {quizzes.length === 0 && <p className="text-sm font-bold text-slate-400">Aucun quiz publié.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
