
import React, { useState, useEffect } from 'react';
import { API } from '../services/api';
import QuizPlayer from '../components/QuizPlayer';
import { UserRole, StudentProfile, Quiz, Question } from '../types';

const Quizzes: React.FC<{ role: UserRole; activeChild?: StudentProfile | null; activeClass?: string }> = ({ role, activeChild, activeClass }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz> | null>(null);
  const [statsQuiz, setStatsQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    const data = await API.quizzes.list();
    setQuizzes(data);
    setIsLoading(false);
  };

  const saveQuiz = async () => {
    if (!editingQuiz?.title || !editingQuiz?.chapter) return;
    const finalQuiz: Quiz = {
        id: editingQuiz.id || 'q-' + Date.now(),
        title: editingQuiz.title,
        chapter: editingQuiz.chapter,
        duration: editingQuiz.duration || 15,
        questionCount: editingQuiz.questions?.length || 0,
        status: 'published',
        questions: editingQuiz.questions || []
    };
    if (editingQuiz.id) await API.quizzes.update(finalQuiz);
    else await API.quizzes.create(finalQuiz);
    setEditingQuiz(null);
    loadQuizzes();
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Supprimer ce quiz ?")) return;
    await API.quizzes.delete(id);
    loadQuizzes();
  };

  if (activeQuiz) {
    return (
      <QuizPlayer 
        quiz={activeQuiz} 
        questions={activeQuiz.questions} 
        onFinish={(score) => { API.quizzes.submitResult(activeQuiz.id, score); setActiveQuiz(null); loadQuizzes(); }}
        onCancel={() => setActiveQuiz(null)}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Espace Quiz</h2>
            <p className="text-slate-500 text-sm font-medium">{role === UserRole.TEACHER ? activeClass : 'Tes évaluations'}</p>
        </div>
        {role === UserRole.TEACHER && (
            <button 
              onClick={() => setEditingQuiz({ title: '', chapter: '', questions: [], duration: 15 })}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg uppercase tracking-widest"
            >
                + Créer Quiz
            </button>
        )}
      </div>

      {editingQuiz && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingQuiz.id ? 'Éditer' : 'Nouveau'} Quiz</h3>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Titre" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" value={editingQuiz.title} onChange={e => setEditingQuiz({...editingQuiz, title: e.target.value})} />
                    <input type="text" placeholder="Chapitre" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" value={editingQuiz.chapter} onChange={e => setEditingQuiz({...editingQuiz, chapter: e.target.value})} />
                </div>
                
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions ({editingQuiz.questions?.length || 0})</p>
                    <button 
                        onClick={() => setEditingQuiz({...editingQuiz, questions: [...(editingQuiz.questions || []), { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctOption: '' }]})}
                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all"
                    >
                        + Ajouter une question
                    </button>
                    {editingQuiz.questions?.map((q, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                            <input type="text" placeholder="Texte de la question" className="w-full bg-white p-3 rounded-xl border border-slate-100 font-medium" value={q.text} onChange={e => {
                                const qs = [...editingQuiz.questions!]; qs[idx].text = e.target.value; setEditingQuiz({...editingQuiz, questions: qs});
                            }} />
                            <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, oIdx) => (
                                    <input key={oIdx} type="text" placeholder={`Option ${oIdx+1}`} className="p-2 text-xs bg-white rounded-lg border border-slate-100" value={opt} onChange={e => {
                                        const qs = [...editingQuiz.questions!]; qs[idx].options[oIdx] = e.target.value; setEditingQuiz({...editingQuiz, questions: qs});
                                    }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex space-x-4 pt-6">
                    <button onClick={() => setEditingQuiz(null)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs">Annuler</button>
                    <button onClick={saveQuiz} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs">Enregistrer</button>
                </div>
            </div>
        </div>
      )}

      {statsQuiz && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Stats : {statsQuiz.title}</h3>
                    <button onClick={() => setStatsQuiz(null)} className="text-slate-400">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-3xl text-center">
                        <p className="text-3xl font-black text-indigo-600">{statsQuiz.averageScore}%</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moyenne Classe</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl text-center">
                        <p className="text-3xl font-black text-emerald-500">85%</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taux de Réussite</p>
                    </div>
                </div>
                <button onClick={() => setStatsQuiz(null)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Fermer</button>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-[40px] border border-slate-100 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all group">
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${quiz.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>{quiz.status}</span>
                        <span className="text-[10px] font-black text-slate-300 tracking-widest">{quiz.duration} MIN</span>
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{quiz.title}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{quiz.chapter}</p>
                    </div>
                </div>
                <div className="flex flex-col space-y-2 mt-8">
                  {role === UserRole.TEACHER ? (
                    <div className="flex space-x-2">
                       <button onClick={() => setEditingQuiz(quiz)} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Éditer</button>
                       <button onClick={() => setStatsQuiz(quiz)} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Stats</button>
                       <button onClick={() => deleteQuiz(quiz.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  ) : (
                    <button 
                        onClick={() => quiz.status === 'completed' ? alert('Correction indisponible pour cette démo') : setActiveQuiz(quiz)}
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${quiz.status === 'completed' ? 'bg-slate-50 text-slate-400' : 'bg-indigo-600 text-white shadow-lg'}`}
                    >
                        {quiz.status === 'completed' ? 'Correction' : 'Démarrer'}
                    </button>
                  )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Quizzes;
