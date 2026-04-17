
import React from 'react';
import { UserRole, User, StudentProfile } from '../types';
import { ICONS } from '../constants';
import ParentChildSearch from '../components/ParentChildSearch';

interface DashboardProps {
    role: UserRole;
    user: User;
    activeChild: StudentProfile | null;
    setActiveChild: (c: StudentProfile) => void;
    activeClass: string;
    setActiveClass: (s: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, user, activeChild, setActiveChild, activeClass, setActiveClass }) => {
  const currentContextName = role === UserRole.PARENT ? activeChild?.name : role === UserRole.TEACHER ? activeClass : user.name;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Context Selector */}
      {(role === UserRole.PARENT || role === UserRole.TEACHER) && (
        <div className="flex items-center space-x-4 bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
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
            {role === UserRole.TEACHER && user.classes?.map(cls => (
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

      {/* Parent Child Search */}
      {role === UserRole.PARENT && (
        <ParentChildSearch onChildSelected={setActiveChild} />
      )}

      {/* Hero Analytics */}
      <section className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Aperçu Hebdomadaire</span>
                <h2 className="text-4xl font-black tracking-tight">{currentContextName}</h2>
                <p className="text-indigo-100 max-w-sm opacity-90 text-sm leading-relaxed">
                    {role === UserRole.STUDENT && "Tes moyennes par chapitre sont en hausse de 5% ce mois-ci. Continue tes efforts !"}
                    {role === UserRole.TEACHER && `La ${activeClass} maintient un taux d'assiduité de 98%. 2 élèves nécessitent une attention particulière en Mathématiques.`}
                    {role === UserRole.PARENT && `Progression de ${activeChild?.name} : Une nette amélioration en Français (+2.5 pts).`}
                </p>
            </div>
            <div className="flex gap-3">
              <button className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs shadow-lg hover:scale-105 transition-transform">Rapport Complet</button>
            </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      {/* Chapter Performance with Trends */}
      {(role === UserRole.STUDENT || role === UserRole.PARENT) && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Moyennes par Chapitre</h3>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Actualisé il y a 2h</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(role === UserRole.PARENT ? activeChild?.averages : [
              { chapter: 'Maths', score: 14, trend: 'up' },
              { chapter: 'SVT', score: 16, trend: 'stable' },
              { chapter: 'Anglais', score: 15, trend: 'up' }
            ])?.map((avg, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{avg.chapter}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-3xl font-black text-slate-800">{avg.score}/20</p>
                    {avg.trend === 'up' && <span className="text-emerald-500">↑</span>}
                    {avg.trend === 'down' && <span className="text-rose-500">↓</span>}
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${avg.score >= 15 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {avg.score >= 15 ? 'A' : 'B'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teacher Specific Insights */}
      {role === UserRole.TEACHER && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Comportement Global</h3>
              <div className="flex items-center justify-between">
                <div className="text-center p-4 bg-emerald-50 rounded-2xl flex-1 mr-2">
                  <p className="text-2xl font-black text-emerald-600">22</p>
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Excellents</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-2xl flex-1 mx-2">
                  <p className="text-2xl font-black text-amber-600">4</p>
                  <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Passables</p>
                </div>
                <div className="text-center p-4 bg-rose-50 rounded-2xl flex-1 ml-2">
                  <p className="text-2xl font-black text-rose-600">2</p>
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Alertes</p>
                </div>
              </div>
           </div>
           <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Derniers Quiz</h3>
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600">Algèbre II</span>
                    <span className="text-indigo-600 font-black">14.5/20</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full w-[72.5%]"></div>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600">Géométrie</span>
                    <span className="text-indigo-600 font-black">12.8/20</span>
                 </div>
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full w-[64%]"></div>
                 </div>
              </div>
           </div>
        </section>
      )}

      {/* Grid Stats Actionables */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
              { label: 'Présence', value: '98%', icon: <ICONS.Presence /> },
              { label: 'Devoirs', value: '3 en cours', icon: <ICONS.Homework /> },
              { label: 'Humeur', value: role === UserRole.STUDENT ? 'Serein' : 'Positive', icon: <ICONS.Sparkles /> },
              { label: 'Messages', value: '2 non-lus', icon: <ICONS.Chat /> },
          ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-center group hover:border-indigo-200 transition-all">
                  <div className="text-indigo-600 mb-2 flex justify-center scale-90 opacity-60 group-hover:opacity-100 transition-opacity">
                    {stat.icon}
                  </div>
                  <h4 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;
