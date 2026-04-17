
import React, { useState, useEffect } from 'react';
import { AttendanceSession, AttendanceRecord } from '../types';
import { API } from '../services/api';

const MOCK_STUDENTS = [
    { id: '1', name: 'Alice Dupont' },
    { id: '2', name: 'Benoît Lambert' },
    { id: '3', name: 'Clara Martin' },
    { id: '4', name: 'David Durand' },
    { id: '5', name: 'Élodie Leroy' },
];

interface AttendanceProps {
  activeClass: string;
}

const Attendance: React.FC<AttendanceProps> = ({ activeClass }) => {
    const [view, setView] = useState<'today' | 'history'>('today');
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    const [history, setHistory] = useState<AttendanceSession[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [currentRecords, setCurrentRecords] = useState<Record<string, AttendanceRecord>>(
        MOCK_STUDENTS.reduce((acc, student) => ({
            ...acc,
            [student.id]: { studentId: student.id, studentName: student.name, status: 'present', behavior: 'good' }
        }), {})
    );

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const data = await API.attendance.listSessions();
        setHistory(data);
    };

    const updateStatus = (id: string, status: AttendanceRecord['status']) => {
        setCurrentRecords(prev => ({ ...prev, [id]: { ...prev[id], status } }));
    };

    const updateBehavior = (id: string, behavior: AttendanceRecord['behavior']) => {
        setCurrentRecords(prev => ({ ...prev, [id]: { ...prev[id], behavior } }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const newSession: AttendanceSession = {
            id: 'sess-' + Date.now(),
            date: new Date().toLocaleString('fr-FR'),
            className: activeClass,
            teacherName: 'Mme Valérie',
            records: Object.values(currentRecords)
        };
        await API.attendance.saveSession(newSession);
        alert("Appel enregistré !");
        loadHistory();
        setView('history');
        setIsSubmitting(false);
    };

    if (selectedSession) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <button onClick={() => setSelectedSession(null)} className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest">
                    ← Retour à l'historique
                </button>
                <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Détail du {selectedSession.date}</h2>
                    <p className="text-slate-400 font-bold mb-8 uppercase text-[10px] tracking-widest">{selectedSession.className} • {selectedSession.teacherName}</p>
                    
                    <div className="space-y-3">
                        {selectedSession.records.map(r => (
                            <div key={r.studentId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <span className="font-black text-slate-700">{r.studentName}</span>
                                <div className="flex items-center space-x-3">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                        r.status === 'present' ? 'bg-emerald-100 text-emerald-600' : 
                                        r.status === 'absent' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                    }`}>{r.status}</span>
                                    <span className="text-xl">{r.behavior === 'good' ? '👍' : r.behavior === 'excellent' ? '🌟' : '😐'}</span>
                                </div>
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
                    <p className="text-slate-500 text-sm font-medium">{activeClass} • Session {view === 'today' ? 'actuelle' : 'historique'}</p>
                </div>
                <div className="flex space-x-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button onClick={() => setView('today')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Aujourd'hui</button>
                    <button onClick={() => setView('history')} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Historique</button>
                </div>
            </div>

            {view === 'today' ? (
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-100">
                              <tr>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Humeur</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obs.</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {MOCK_STUDENTS.map((student) => (
                                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-8 py-6 font-black text-slate-800">{student.name}</td>
                                      <td className="px-8 py-6">
                                          <div className="flex space-x-1">
                                              {['present', 'absent', 'late'].map((s) => (
                                                <button 
                                                  key={s}
                                                  onClick={() => updateStatus(student.id, s as any)}
                                                  className={`w-8 h-8 rounded-lg text-[9px] font-black transition-all border-2 ${currentRecords[student.id].status === s ? `bg-indigo-600 text-white border-transparent` : 'bg-white border-slate-100 text-slate-400'}`}
                                                >
                                                  {s[0].toUpperCase()}
                                                </button>
                                              ))}
                                          </div>
                                      </td>
                                      <td className="px-8 py-6">
                                          <div className="flex space-x-1">
                                            {['excellent', 'good', 'average', 'warning'].map((b) => (
                                              <button 
                                                key={b}
                                                onClick={() => updateBehavior(student.id, b as any)}
                                                className={`w-8 h-8 rounded-lg transition-all border-2 flex items-center justify-center ${currentRecords[student.id].behavior === b ? 'bg-amber-100 border-amber-200' : 'bg-white border-slate-100 opacity-40'}`}
                                              >
                                                <span>{b === 'excellent' ? '🌟' : b === 'good' ? '👍' : b === 'average' ? '😐' : '⚠️'}</span>
                                              </button>
                                            ))}
                                          </div>
                                      </td>
                                      <td className="px-8 py-6">
                                          <input type="text" placeholder="..." className="w-16 bg-slate-50 border-none rounded-lg px-2 py-1 text-[10px] outline-none" />
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                    >
                        {isSubmitting ? 'ENVOI...' : 'Soumettre l\'appel'}
                    </button>
                  </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {history.length === 0 ? (
                     <p className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Aucune séance enregistrée.</p>
                 ) : history.map(sess => (
                    <div key={sess.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all group">
                        <div>
                            <p className="text-sm font-black text-slate-800">{sess.date}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sess.className} • {sess.records.filter(r => r.status === 'present').length} Présents</p>
                        </div>
                        <button 
                            onClick={() => setSelectedSession(sess)}
                            className="bg-slate-50 text-indigo-600 p-3 rounded-2xl font-black text-[10px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all"
                        >
                            VOIR
                        </button>
                    </div>
                 ))}
              </div>
            )}
        </div>
    );
};

export default Attendance;
