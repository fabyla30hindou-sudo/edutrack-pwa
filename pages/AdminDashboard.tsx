import React, { useState, useEffect } from 'react';
import { School, User, UserRole, Message } from '../types';
import { API } from '../services/api';

interface AdminDashboardProps {
  role: UserRole;
  currentPage?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ role, currentPage = 'dashboard' }) => {
  const isSuperAdmin = role === UserRole.SUPERADMIN;
  const [view, setView] = useState<'stats' | 'schools' | 'users' | 'support'>('stats');
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Message[]>([]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentPage === 'schools' && isSuperAdmin) setView('schools');
    else if (currentPage === 'users') setView('users');
    else if (currentPage === 'messaging') setView('support');
    else setView('stats');
  }, [currentPage, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sch, usr, tkt] = await Promise.all([
        API.schools.list(),
        API.users.list(),
        API.messaging.getSupportTickets()
      ]);
      setSchools(sch);
      setUsers(usr);
      setTickets(tkt);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const createSchool = async () => {
    if (!newSchoolName.trim()) return;
    await API.schools.create({ name: newSchoolName.trim() });
    setNewSchoolName('');
    await loadData();
  };

  const deleteSchool = async (id: string) => {
    await API.schools.delete(id);
    await loadData();
  };

  const deleteUser = async (id: string) => {
    await API.users.delete(id);
    await loadData();
  };

  if (loading) return <div className="p-8 font-black text-indigo-600">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800">{isSuperAdmin ? 'Console Superadmin' : 'Console Administrateur'}</h2>
        <p className="text-slate-500 text-sm">{isSuperAdmin ? 'Gestion des écoles, utilisateurs et support' : 'Gestion des membres et du support de votre école'}</p>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100">
        <button onClick={() => setView('stats')} className={`px-4 py-2 rounded-xl font-black text-xs ${view === 'stats' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Dashboard</button>
        {isSuperAdmin && <button onClick={() => setView('schools')} className={`px-4 py-2 rounded-xl font-black text-xs ${view === 'schools' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Écoles</button>}
        <button onClick={() => setView('users')} className={`px-4 py-2 rounded-xl font-black text-xs ${view === 'users' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Membres</button>
        <button onClick={() => setView('support')} className={`px-4 py-2 rounded-xl font-black text-xs ${view === 'support' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Support</button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {view === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs uppercase">Écoles</p>
            <p className="text-3xl font-black">{schools.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs uppercase">Membres</p>
            <p className="text-3xl font-black">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs uppercase">Tickets</p>
            <p className="text-3xl font-black">{tickets.length}</p>
          </div>
        </div>
      )}

      {view === 'schools' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-2">
            <input value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} placeholder="Nom de l'école" className="flex-1 px-4 py-3 bg-slate-50 rounded-xl outline-none" />
            <button onClick={createSchool} className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs">Créer</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {schools.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0">
                <div>
                  <p className="font-black">{s.name}</p>
                  <p className="text-xs text-slate-400">ID: {s.id}</p>
                </div>
                <button onClick={() => deleteSchool(s.id)} className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">Supprimer</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0">
              <div>
                <p className="font-black">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email} | {u.role} | école {u.schoolId}</p>
              </div>
              <button onClick={() => deleteUser(u.id)} className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">Supprimer</button>
            </div>
          ))}
        </div>
      )}

      {view === 'support' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-6 text-slate-400 text-sm">Aucun ticket.</div>
          ) : (
            tickets.map(t => (
              <div key={t.id} className="px-4 py-3 border-b border-slate-100 last:border-b-0">
                <p className="font-black">{t.senderName}</p>
                <p className="text-sm text-slate-600">{t.text}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
