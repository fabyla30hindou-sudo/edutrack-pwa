import React, { useState, useEffect } from 'react';
import { UserRole, User, StudentProfile } from './types';
import { Storage } from './services/storage';
import { API } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Quizzes from './pages/Quizzes';
import Attendance from './pages/Attendance';
import Messaging from './pages/Messaging';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Results from './pages/Results';
import AIChat from './components/AIChat';

const mapChildToProfile = (c: any): StudentProfile => ({
  id: String(c.id),
  name: c.name || c.full_name || 'Enfant',
  class: c.class_name || '',
  avatar: c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name || c.id}`,
  averages: [],
  absencesCount: 0,
  retardCount: 0,
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeChild, setActiveChild] = useState<StudentProfile | null>(null);
  const [activeClass, setActiveClass] = useState<string>('6eme A');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshSession = async () => {
    const session = await API.auth.getCurrentSession();
    if (!session) {
      setUser(null);
      setActiveChild(null);
      return;
    }

    if (session.role === UserRole.PARENT) {
      const children = await API.parents.getMyChildren();
      const mappedChildren = children.map(mapChildToProfile);
      const updated = { ...session, children: mappedChildren };
      setUser(updated);
      setActiveChild(mappedChildren[0] || null);
    } else {
      setUser(session);
      setActiveChild(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      Storage.init();
      await refreshSession();
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleLogin = async (_role?: UserRole) => {
    await refreshSession();
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await API.auth.logout();
    setUser(null);
    setActiveChild(null);
    setCurrentPage('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-600">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-white font-black uppercase tracking-widest text-[9px]">EduTrack Pro</p>
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <Login onLogin={handleLogin} onShowRegister={() => setAuthView('register')} />
    ) : (
      <Register onRegistered={() => setAuthView('login')} onCancel={() => setAuthView('login')} />
    );
  }

  const isAdminLike = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (isAdminLike) return <AdminDashboard role={user.role} currentPage={currentPage} />;
        return <Dashboard role={user.role} user={user} activeChild={activeChild} setActiveChild={setActiveChild} activeClass={activeClass} setActiveClass={setActiveClass} />;
      case 'schools':
        return user.role === UserRole.SUPERADMIN ? <AdminDashboard role={user.role} currentPage={currentPage} /> : null;
      case 'users':
        return isAdminLike ? <AdminDashboard role={user.role} currentPage={currentPage} /> : null;
      case 'quizzes':
        return <Quizzes role={user.role} activeChild={activeChild} activeClass={activeClass} />;
      case 'results':
        return <Results activeChild={activeChild} />;
      case 'attendance':
        return user.role === UserRole.TEACHER ? <Attendance activeClass={activeClass} /> : <Dashboard role={user.role} user={user} activeChild={activeChild} setActiveChild={setActiveChild} activeClass={activeClass} setActiveClass={setActiveClass} />;
      case 'messaging':
        return <Messaging role={user.role} user={user} activeChild={activeChild} />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile user={user} onLogout={handleLogout} />;
      default:
        if (isAdminLike) return <AdminDashboard role={user.role} currentPage={currentPage} />;
        return <Dashboard role={user.role} user={user} activeChild={activeChild} setActiveChild={setActiveChild} activeClass={activeClass} setActiveClass={setActiveClass} />;
    }
  };

  return (
    <>
      <Layout
        role={user.role}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
      <AIChat role={user.role} userName={user.name} />
    </>
  );
};

export default App;
