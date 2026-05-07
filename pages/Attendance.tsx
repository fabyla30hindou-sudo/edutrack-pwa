import React, { useEffect, useMemo, useState } from 'react';
import { AttendanceRecord, AttendanceSession } from '../types';
import { API } from '../services/api';

const FALLBACK_STUDENTS = [
  { id: '1', name: 'Alice Dupont', className: '6eme A' },
  { id: '2', name: 'Benoît Lambert', className: '6eme A' },
  { id: '3', name: 'Clara Martin', className: '6eme A' },
  { id: '4', name: 'David Durand', className: '6eme A' },
  { id: '5', name: 'Élodie Leroy', className: '6eme A' },
];

interface AttendanceProps {
  activeClass: string;
}

const statusLabels: Record<AttendanceRecord['status'], string> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'Retard',
};

const behaviorLabels: Record<AttendanceRecord['behavior'], string> = {
  excellent: 'Excellent',
  good: 'Bien',
  average: 'Moyen',
  warning: 'Alerte',
};

const Attendance: React.FC<AttendanceProps> = ({ activeClass }) => {
  const [view, setView] = useState<'today' | 'history'>('today');
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [history, setHistory] = useState<AttendanceSession[]>([]);
  const [currentRecords, setCurrentRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeClass]);

  const visibleStudents = useMemo(() => {
    const source = students.length ? students : FALLBACK_STUDENTS;
    const filtered = source.filter(student => !activeClass || !student.className || student.className === activeClass);
    return activeClass ? filtered : (filtered.length ? filtered : source);
  }, [students, activeClass]);

  const visibleHistory = useMemo(() => {
    return history.filter(session => !activeClass || !session.className || session.className === activeClass);
  }, [history, activeClass]);

  useEffect(() => {
    const records = visibleStudents.reduce<Record<string, AttendanceRecord>>((acc, student) => {
      acc[student.id] = currentRecords[student.id] || {
        studentId: student.id,
        studentName: student.name,
        status: 'present',
        behavior: 'good',
        observation: '',
      };
      return acc;
    }, {});
    setCurrentRecords(records);
  }, [visibleStudents.map(student => student.id).join('|')]);

  const loadData = async () => {
    setIsLoading(true);
    const [studentData, sessions] = await Promise.all([
      API.students.list().catch(() => []),
      API.attendance.listSessions().catch(() => []),
    ]);
    setStudents(studentData);
    setHistory(sessions);
    setIsLoading(false);
  };

  const updateRecord = (id: string, patch: Partial<AttendanceRecord>) => {
    setCurrentRecords(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const newSession: AttendanceSession = {
      id: `sess-${Date.now()}`,
      date: new Date().toLocaleString('fr-FR'),
      className: activeClass,
      teacherName: 'Enseignant',
      records: Object.values(currentRecords),
    };
    await API.attendance.saveSession(newSession);
    await loadData();
    setView('history');
    setIsSubmitting(false);
  };

  if (selectedSession) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button onClick={() => setSelectedSession(null)} className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest">
          Retour à l'historique
        </button>
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Détail du {selectedSession.date}</h2>
          <p className="text-slate-400 font-bold mb-8 uppercase text-[10px] tracking-widest">{selectedSession.className} - {selectedSession.teacherName}</p>
          <div className="space-y-3">
            {selectedSession.records.map(record => (
              <div key={`${record.studentId}-${record.studentName}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div>
                  <span className="font-black text-slate-700">{record.studentName}</span>
                  {record.observation && <p className="text-xs text-slate-400 mt-1">{record.observation}</p>}
                </div>
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                  record.status === 'present' ? 'bg-emerald-100 text-emerald-600' :
                  record.status === 'absent' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {statusLabels[record.status] || record.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registre d'appel</h2>
          <p className="text-slate-500 text-sm font-medium">{activeClass} - Session {view === 'today' ? 'actuelle' : 'historique'}</p>
        </div>
        <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setView('today')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Aujourd'hui</button>
          <button onClick={() => setView('history')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Historique</button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-10 rounded-3xl text-center text-slate-400 font-black">Chargement...</div>
      ) : view === 'today' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Comportement</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-800">{student.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{student.matricule || student.className}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1">
                        {(['present', 'absent', 'late'] as AttendanceRecord['status'][]).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateRecord(student.id, { status })}
                            className={`px-3 h-9 rounded-lg text-[9px] font-black transition-all border-2 ${currentRecords[student.id]?.status === status ? 'bg-indigo-600 text-white border-transparent' : 'bg-white border-slate-100 text-slate-400'}`}
                          >
                            {statusLabels[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select
                        className="bg-slate-50 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                        value={currentRecords[student.id]?.behavior || 'good'}
                        onChange={e => updateRecord(student.id, { behavior: e.target.value as AttendanceRecord['behavior'] })}
                      >
                        {Object.entries(behaviorLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-6">
                      <input
                        type="text"
                        placeholder="Observation"
                        className="w-40 bg-slate-50 border-none rounded-lg px-3 py-2 text-xs outline-none"
                        value={currentRecords[student.id]?.observation || ''}
                        onChange={e => updateRecord(student.id, { observation: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || visibleStudents.length === 0}
              className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi...' : "Soumettre l'appel"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleHistory.length === 0 ? (
            <p className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Aucune séance enregistrée.</p>
          ) : visibleHistory.map(session => (
            <div key={session.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all group">
              <div>
                <p className="text-sm font-black text-slate-800">{session.date}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {session.className} - {session.records.filter(record => record.status === 'present').length} présent(s)
                </p>
              </div>
              <button onClick={() => setSelectedSession(session)} className="bg-slate-50 text-indigo-600 p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">
                Voir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Attendance;
