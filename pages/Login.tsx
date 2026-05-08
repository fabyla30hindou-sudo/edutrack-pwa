import React, { useEffect, useState } from 'react';
import { UserRole } from '../types';
import { API } from '../services/api';

interface LoginProps {
  onLogin: (role: UserRole) => void;
  onShowRegister?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onShowRegister }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '', school_id: '' });
  const [schools, setSchools] = useState<any[]>([]);
  const [showSchools, setShowSchools] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setSchools(await API.schools.getAll());
      } catch {
        setSchools([]);
      }
    };
    loadSchools();
  }, []);

  const selectSchool = (school: any) => {
    setCredentials((prev) => ({ ...prev, school_id: String(school.id) }));
    setSchoolSearch(school.name || '');
    setShowSchools(false);
  };

  const clearSchool = () => {
    setCredentials((prev) => ({ ...prev, school_id: '' }));
    setSchoolSearch('');
    setShowSchools(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError('Veuillez remplir email et mot de passe');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await API.auth.login(
        credentials.email,
        credentials.password,
        credentials.school_id || undefined
      );
      const role = (response?.user?.role || '').toLowerCase();
      const mapped = role === 'teacher'
        ? UserRole.TEACHER
        : role === 'parent'
          ? UserRole.PARENT
          : role === 'admin'
            ? UserRole.ADMIN
            : role === 'superadmin'
              ? UserRole.SUPERADMIN
              : UserRole.STUDENT;
      onLogin(mapped);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] flex flex-col items-center justify-center p-6 md:bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white md:p-12 md:rounded-[48px] md:shadow-2xl md:shadow-indigo-100/50">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-indigo-600 rounded-[28px] mx-auto flex items-center justify-center shadow-2xl shadow-indigo-200 mb-6 transform -rotate-6">
            <span className="text-4xl text-white font-black">E</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">EduGo</h1>
          <p className="text-sm text-slate-500">Connexion</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
          />

          <input
            type="password"
            required
            placeholder="Mot de passe"
            className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          />

          <div className="relative">
            <input
              type="text"
              placeholder="Etablissement (optionnel si email unique)"
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none"
              value={schoolSearch}
              onChange={(e) => {
                setSchoolSearch(e.target.value);
                setShowSchools(true);
                setCredentials((prev) => ({ ...prev, school_id: '' }));
              }}
              onFocus={() => setShowSchools(true)}
            />
            {!!credentials.school_id && (
              <button
                type="button"
                onClick={clearSchool}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-200 px-2 py-1 rounded"
              >
                Effacer
              </button>
            )}
            {showSchools && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto">
                {schools
                  .filter((s) => !schoolSearch || (s.name || '').toLowerCase().includes(schoolSearch.toLowerCase()))
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={() => selectSchool(s)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50"
                    >
                      {s.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-slate-600">
            Pas encore de compte ?{' '}
            <button onClick={onShowRegister} className="text-indigo-600 font-black">S'inscrire</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
