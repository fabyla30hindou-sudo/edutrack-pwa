import React from 'react';
import { UserRole } from '../types';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, currentPage, onNavigate, onLogout }) => {
  const menuItems = React.useMemo(() => {
    const base = [
      { id: 'dashboard', label: (role === UserRole.ADMIN || role === UserRole.SUPERADMIN) ? 'Panneau' : 'Dashboard', icon: ICONS.Dashboard },
      { id: 'messaging', label: 'Messages', icon: ICONS.Chat },
      { id: 'notifications', label: 'Notifs', icon: ICONS.Notifications },
    ];

    let items = [...base];

    if (role === UserRole.STUDENT) {
      items.splice(1, 0, { id: 'quizzes', label: 'Quiz', icon: ICONS.Quiz });
      items.splice(2, 0, { id: 'grades', label: 'Notes', icon: ICONS.Stats });
      items.splice(3, 0, { id: 'results', label: 'Résultats', icon: ICONS.Stats });
    } else if (role === UserRole.TEACHER) {
      items.splice(1, 0, { id: 'attendance', label: 'Présence', icon: ICONS.Presence });
      items.splice(2, 0, { id: 'grades', label: 'Notes', icon: ICONS.Stats });
      items.splice(3, 0, { id: 'quizzes', label: 'Quiz', icon: ICONS.Quiz });
    } else if (role === UserRole.PARENT) {
      items.splice(1, 0, { id: 'grades', label: 'Notes', icon: ICONS.Stats });
      items.splice(2, 0, { id: 'results', label: 'Résultats', icon: ICONS.Stats });
    } else if (role === UserRole.SUPERADMIN) {
      items = [
        { id: 'dashboard', label: 'Vue globale', icon: ICONS.Dashboard },
        { id: 'schools', label: 'Écoles', icon: ICONS.School },
        { id: 'users', label: 'Membres', icon: ICONS.Presence },
        { id: 'messaging', label: 'Support', icon: ICONS.Chat },
      ];
    } else if (role === UserRole.ADMIN) {
      items = [
        { id: 'dashboard', label: 'Mon école', icon: ICONS.Dashboard },
        { id: 'users', label: 'Membres', icon: ICONS.Presence },
        { id: 'messaging', label: 'Support', icon: ICONS.Chat },
      ];
    }

    items.push({ id: 'profile', label: 'Profil', icon: ICONS.User });
    return items;
  }, [role]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 h-screen sticky top-0 z-[100]">
        <div className="p-8 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">E</div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">EduTrack Pro</h1>
            <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest leading-none">{role}</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto">
          {menuItems.filter(i => i.id !== 'profile').map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                currentPage === item.id ? 'bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon />
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-2">
          <button
            onClick={() => onNavigate('profile')}
            className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all ${
              currentPage === 'profile' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ICONS.User />
            <span className="text-sm tracking-wide">Mon Profil</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-4 px-5 py-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <span className="text-sm tracking-wide">Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto pb-24 md:pb-0">
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">E</div>
            <h1 className="text-lg font-black text-slate-800">EduTrack</h1>
          </div>
          <button onClick={() => onNavigate('profile')} className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
            <ICONS.User />
          </button>
        </header>

        <div className="p-6 md:p-12 max-w-7xl mx-auto w-full">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-3 flex justify-around items-center z-[100] safe-bottom">
        {menuItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' : 'text-slate-400'
            }`}
          >
            <div className="scale-90"><item.icon /></div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
