import React, { useEffect, useState } from 'react';
import { StudentProfile } from '../types';
import { API } from '../services/api';

const Results: React.FC<{ activeChild: StudentProfile | null }> = ({ activeChild }) => {
  const [progress, setProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!activeChild?.id) return;
      setLoading(true);
      try {
        const p = await API.parents.getChildProgress(activeChild.id);
        setProgress(p);
      } catch {
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeChild?.id]);

  if (!activeChild) return null;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Évolution de {activeChild.name}</h2>
      </header>

      {loading && <div className="bg-white p-6 rounded-2xl border border-slate-100">Chargement...</div>}

      {!loading && progress && (
        <>
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="font-black mb-3">Notes</h3>
            <div className="space-y-2">
              {(progress.grades || []).map((g: any) => (
                <div key={g.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span>{g.subject}</span>
                  <span className="font-black">{g.grade}/20</span>
                </div>
              ))}
              {(!progress.grades || progress.grades.length === 0) && <p className="text-slate-400 text-sm">Aucune note.</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <h3 className="font-black mb-3">Assiduité</h3>
            <div className="space-y-2">
              {(progress.attendance || []).map((a: any) => (
                <div key={a.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span>{a.attendance_date}</span>
                  <span className="font-black uppercase">{a.status}</span>
                </div>
              ))}
              {(!progress.attendance || progress.attendance.length === 0) && <p className="text-slate-400 text-sm">Aucune donnée de présence.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Results;
