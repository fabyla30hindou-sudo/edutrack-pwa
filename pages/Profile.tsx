
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { API } from '../services/api';
import { ICONS } from '../constants';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<User>(user);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await API.profile.update(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
      // Note: In a real app with global state like Redux/Context, 
      // we'd dispatch an action here. For this demo, App.tsx 
      // would need to be notified or refresh its session state.
      // But Storage already handled the persistence.
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = () => {
    const seeds = ['Felix', 'Aria', 'Leo', 'Mia', 'Max', 'Luna', 'Oscar', 'Ruby'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    setFormData({ ...formData, avatar: newAvatar });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-10">
          <div className="relative group">
              <div className="w-40 h-40 rounded-[48px] bg-indigo-100 flex items-center justify-center overflow-hidden border-8 border-white shadow-2xl transform rotate-3 transition-transform group-hover:rotate-0">
                  <img src={isEditing ? formData.avatar : user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
              {isEditing && (
                <button 
                  onClick={handleAvatarChange}
                  className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all z-10"
                  title="Changer d'avatar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                </button>
              )}
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] bg-indigo-50 px-4 py-1.5 rounded-full w-fit mx-auto md:mx-0">
                    {isEditing ? 'Édition en cours' : 'Membre Actif'}
                  </span>
                  {saveSuccess && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-bounce">
                      Profil mis à jour !
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <input 
                    type="text" 
                    className="text-4xl font-black text-slate-900 tracking-tight bg-slate-50 border-b-4 border-indigo-600 outline-none w-full max-w-md text-center md:text-left py-2"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Votre nom"
                  />
                ) : (
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">{user.name}</h2>
                )}
              </div>
              
              <div className="flex flex-col space-y-1">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{user.role} • {user.class || 'Responsable Académique'}</p>
                {isEditing ? (
                  <input 
                    type="email" 
                    className="text-slate-500 font-medium bg-slate-50 border-b-2 border-indigo-200 outline-none w-full max-w-xs text-center md:text-left"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                ) : (
                  <p className="text-slate-500 font-medium">{user.email}</p>
                )}
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-4">
                  {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Éditer le profil
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={handleUpdate}
                        disabled={isSaving}
                        className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
                      >
                        {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                      <button 
                        onClick={() => { setIsEditing(false); setFormData(user); }}
                        className="bg-slate-200 text-slate-600 px-8 py-3 rounded-2xl text-xs font-black hover:bg-slate-300 transition-all uppercase tracking-widest"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  <span className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl text-xs font-black shadow-sm uppercase tracking-widest">Classe : {user.class || 'Multi-niveaux'}</span>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white rounded-[40px] border border-slate-100 p-10 space-y-8 shadow-xl">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Coordonnées Détaillées</h3>
              <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</label>
                    {isEditing ? (
                      <input 
                        type="tel"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-bold"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+33 6 00 00 00 00"
                      />
                    ) : (
                      <p className="font-bold text-slate-700">{user.phone || 'Non renseigné'}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matricule</label>
                    {user.matricule ? (
                      <p className="font-bold text-slate-700">{user.matricule}</p>
                    ) : (
                      <p className="font-bold text-slate-400">Non disponible</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Établissement</label>
                    <p className="font-bold text-slate-700">{user.schoolId || 'sch-primary-01'}</p>
                  </div>
              </div>
          </section>

          <section className="bg-white rounded-[40px] border border-slate-100 p-10 space-y-8 shadow-xl flex flex-col justify-between">
              <div className="space-y-6">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Options du compte</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <button className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[24px] group hover:bg-indigo-50 transition-all border-2 border-transparent hover:border-indigo-100">
                        <div className="flex items-center space-x-4">
                            <div className="text-slate-400 group-hover:text-indigo-600 scale-110 transition-transform"><ICONS.Sparkles /></div>
                            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Guide Utilisateur</span>
                        </div>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                    </button>
                    <button className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[24px] group hover:bg-rose-50 transition-all border-2 border-transparent hover:border-rose-100">
                        <div className="flex items-center space-x-4">
                            <div className="text-slate-400 group-hover:text-rose-600 scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg></div>
                            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Sécurité & Confidentialité</span>
                        </div>
                        <svg className="w-5 h-5 text-slate-300 group-hover:text-rose-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full py-5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] transition-all mt-6 shadow-sm"
              >
                  Quitter ma session
              </button>
          </section>
      </div>
    </div>
  );
};

export default Profile;
