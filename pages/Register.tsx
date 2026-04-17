import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { ICONS } from '../constants';
import { API } from '../services/api';

interface Props {
  onRegistered: () => void;
  onCancel?: () => void;
}

const Register: React.FC<Props> = ({ onRegistered, onCancel }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    school_id: null as number | null
  });
  const [schools, setSchools] = useState<any[]>([]);
  const [roleSpecificData, setRoleSpecificData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const allSchools = await API.schools.getAll();
        setSchools(allSchools);
      } catch (err) {
        console.warn('Failed to load schools:', err);
      }
    };
    loadSchools();
  }, []);

  const roles = [
    { id: UserRole.TEACHER, label: 'Enseignant', icon: <ICONS.Presence /> },
    { id: UserRole.STUDENT, label: 'Elève', icon: <ICONS.User /> },
    { id: UserRole.PARENT, label: 'Parent', icon: <ICONS.Stats /> },
  ];

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleNextToRoleData = (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = form.full_name && form.email && form.password && form.school_id;
    if (isValid) setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedRole) return;

    setLoading(true);
    setError('');

    try {
      const registerData: any = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        school_id: form.school_id,
        role: selectedRole === UserRole.TEACHER ? 'teacher' : selectedRole === UserRole.PARENT ? 'parent' : 'student',
      };

      if (selectedRole === UserRole.STUDENT) {
        if (!roleSpecificData.class_name) {
          setError('Veuillez entrer la classe');
          setLoading(false);
          return;
        }
        registerData.matricule = roleSpecificData.matricule;
        registerData.class_name = roleSpecificData.class_name;
      } else if (selectedRole === UserRole.TEACHER) {
        if (!roleSpecificData.subject || !roleSpecificData.classes) {
          setError('Veuillez entrer la matière et les classes');
          setLoading(false);
          return;
        }
        registerData.subject = roleSpecificData.subject;
        registerData.classes = roleSpecificData.classes.split(',').map((c: string) => c.trim()).filter(Boolean);
      }

      await API.auth.register(registerData);
      onRegistered();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] flex flex-col items-center justify-center p-6 md:bg-slate-50">
      <div className="max-w-md w-full space-y-10 bg-white md:p-12 md:rounded-[48px] md:shadow-2xl md:shadow-indigo-100/50">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-indigo-600 rounded-[28px] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-200 mb-6 transform -rotate-6">
            <span className="text-4xl text-white font-black">E</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inscription</h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Comptes enseignant, élève ou parent</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-slate-800">Quelle est votre fonction ?</h2>
            <div className="grid grid-cols-1 gap-3">
              {roles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r.id)}
                  className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 bg-white transition-all flex items-center space-x-3 text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400">
                    {r.icon}
                  </div>
                  <span className="font-black text-sm text-slate-700">{r.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={onCancel} className="text-xs font-black text-indigo-600 uppercase tracking-widest">Annuler</button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleNextToRoleData} className="space-y-4">
            <input type="text" required placeholder="Nom complet" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            <input type="email" required placeholder="Email" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input type="password" required placeholder="Mot de passe" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select required className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={form.school_id || ''} onChange={e => setForm({ ...form, school_id: parseInt(e.target.value) })}>
              <option value="">-- Sélectionnez une école --</option>
              {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl bg-slate-100 font-black">Retour</button>
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black">Suivant</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {selectedRole === UserRole.STUDENT && (
              <>
                <input type="text" placeholder="Matricule (optionnel)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={roleSpecificData.matricule || ''} onChange={e => setRoleSpecificData({ ...roleSpecificData, matricule: e.target.value })} />
                <input type="text" required placeholder="Classe (ex: 6eme A)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={roleSpecificData.class_name || ''} onChange={e => setRoleSpecificData({ ...roleSpecificData, class_name: e.target.value })} />
              </>
            )}
            {selectedRole === UserRole.TEACHER && (
              <>
                <input type="text" required placeholder="Matière" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={roleSpecificData.subject || ''} onChange={e => setRoleSpecificData({ ...roleSpecificData, subject: e.target.value })} />
                <input type="text" required placeholder="Classes (ex: 6eme A, 5eme B)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none" value={roleSpecificData.classes || ''} onChange={e => setRoleSpecificData({ ...roleSpecificData, classes: e.target.value })} />
              </>
            )}
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl bg-slate-100 font-black">Retour</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black disabled:opacity-60">{loading ? 'Inscription...' : "S'inscrire"}</button>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Déjà un compte ? <button onClick={onRegistered} className="text-indigo-600 font-black">Connexion</button>
        </p>
      </div>
    </div>
  );
};

export default Register;
