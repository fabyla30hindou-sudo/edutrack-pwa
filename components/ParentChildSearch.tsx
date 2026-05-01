import React, { useState } from 'react';
import { ICONS } from '../constants';
import { API } from '../services/api';

interface ParentChildSearchProps {
  onChildSelected: (childData: any) => void;
}

const toStudentProfile = (child: any) => ({
  id: String(child.id),
  name: child.full_name || child.name || 'Enfant',
  class: child.class_name || '',
  avatar: child.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${child.full_name || child.name || child.id}`,
  averages: [],
  absencesCount: 0,
  retardCount: 0,
});

const ParentChildSearch: React.FC<ParentChildSearchProps> = ({ onChildSelected }) => {
  const [schoolId, setSchoolId] = useState('');
  const [matricule, setMatricule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolId || !matricule) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const linked = await API.parents.linkChild(schoolId, matricule);
      const childData = linked.child || await API.parents.findChild(schoolId, matricule);
      setSelectedChild(childData);
      onChildSelected(toStudentProfile(childData));
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'association");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-100 p-8 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <ICONS.User />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900">Associer un enfant</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Consultez son profil et ses performances</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Établissement</label>
            <input
              type="text"
              required
              placeholder="Code, ID ou nom de l'établissement"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matricule de l'enfant</label>
            <input
              type="text"
              required
              placeholder="Ex: MAT20240001"
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl outline-none transition-all font-medium"
              value={matricule}
              onChange={e => setMatricule(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <p className="text-red-600 font-medium text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Association en cours...' : "Associer l'enfant"}
        </button>
      </form>

      {selectedChild && (
        <div className="mt-8 p-6 bg-indigo-50 border-2 border-indigo-200 rounded-2xl">
          <h3 className="text-lg font-black text-slate-900 mb-4">Enfant associé</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Nom</p>
              <p className="font-black text-slate-900">{selectedChild.full_name || selectedChild.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Matricule</p>
              <p className="font-black text-slate-900">{selectedChild.matricule}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Classe</p>
              <p className="font-black text-slate-900">{selectedChild.class_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Établissement</p>
              <p className="font-black text-slate-900">{selectedChild.school_id}</p>
            </div>
          </div>
          <button className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-black">
            Profil sélectionné
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentChildSearch;
