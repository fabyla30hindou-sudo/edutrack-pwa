import React, { useEffect, useState } from 'react';
import { API } from '../services/api';
import QuizPlayer from '../components/QuizPlayer';
import { UserRole, StudentProfile, Quiz, Question } from '../types';

const emptyQuestion = (): Question => ({
  id: `question-${Date.now()}`,
  text: '',
  options: ['', '', '', ''],
  correctOption: '',
});

const normalizeEditableQuiz = (quiz: Partial<Quiz>): Partial<Quiz> => ({
  ...quiz,
  duration: quiz.duration || 15,
  questions: quiz.questions || [],
});

const Quizzes: React.FC<{ role: UserRole; activeChild?: StudentProfile | null; activeClass?: string }> = ({ role, activeChild, activeClass }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]); 
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null); 
  const [editingQuiz, setEditingQuiz] = useState<Partial<Quiz> | null>(null); 
  const [statsQuiz, setStatsQuiz] = useState<Quiz | null>(null); 
  const [isLoading, setIsLoading] = useState(true); 
  const [isOpeningQuiz, setIsOpeningQuiz] = useState(false); 
  const [error, setError] = useState<string | null>(null); 

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await API.quizzes.list();
      setQuizzes(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  const openQuiz = async (quiz: Quiz) => {
    if (quiz.status === 'completed') {
      alert('Correction indisponible pour le moment.');
      return;
    }

    setIsOpeningQuiz(true);
    setError(null);
    try {
      const fullQuiz = await API.quizzes.get(quiz.id);
      setActiveQuiz(fullQuiz);
    } catch (err: any) {
      setError(err.message || "Impossible d'ouvrir ce quiz.");
    } finally {
      setIsOpeningQuiz(false);
    }
  };

  const editQuiz = async (quiz: Quiz) => {
    setIsOpeningQuiz(true);
    setError(null);
    try {
      const fullQuiz = await API.quizzes.get(quiz.id);
      setEditingQuiz(normalizeEditableQuiz(fullQuiz));
    } catch {
      setEditingQuiz(normalizeEditableQuiz(quiz));
    } finally {
      setIsOpeningQuiz(false);
    }
  };

  const validateQuiz = (quiz: Partial<Quiz>) => {
    if (!quiz.title?.trim() || !quiz.chapter?.trim()) {
      return 'Renseigne un titre et un chapitre.';
    }

    if (!quiz.questions?.length) {
      return 'Ajoute au moins une question.';
    }

    for (const [index, question] of quiz.questions.entries()) {
      const options = question.options.map(option => option.trim()).filter(Boolean);
      if (!question.text.trim()) return `La question ${index + 1} est vide.`;
      if (options.length < 2) return `La question ${index + 1} doit avoir au moins deux options.`;
      if (!question.correctOption.trim()) return `Choisis la bonne réponse pour la question ${index + 1}.`;
      if (!options.includes(question.correctOption.trim())) return `La bonne réponse de la question ${index + 1} doit être une option existante.`;
    }

    return null;
  };

  const saveQuiz = async () => {
    if (!editingQuiz) return;

    const validationError = validateQuiz(editingQuiz);
    if (validationError) {
      alert(validationError);
      return;
    }

    const questions = (editingQuiz.questions || []).map((question) => ({
      ...question,
      text: question.text.trim(),
      options: question.options.map(option => option.trim()).filter(Boolean),
      correctOption: question.correctOption.trim(),
    }));

    const finalQuiz: Quiz = {
      id: editingQuiz.id || `q-${Date.now()}`,
      title: editingQuiz.title!.trim(),
      chapter: editingQuiz.chapter!.trim(),
      duration: editingQuiz.duration || 15,
      questionCount: questions.length,
      status: 'published',
      questions,
    };

    if (editingQuiz.id) await API.quizzes.update(finalQuiz);
    else await API.quizzes.create(finalQuiz);

    setEditingQuiz(null);
    loadQuizzes();
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Supprimer ce quiz ?')) return;
    await API.quizzes.delete(id);
    loadQuizzes();
  };

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    if (!editingQuiz?.questions) return;
    const questions = [...editingQuiz.questions];
    questions[index] = { ...questions[index], ...patch };
    setEditingQuiz({ ...editingQuiz, questions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!editingQuiz?.questions) return;
    const question = editingQuiz.questions[questionIndex];
    const options = [...question.options];
    options[optionIndex] = value;
    updateQuestion(questionIndex, { options });
  };

  const removeQuestion = (index: number) => {
    if (!editingQuiz?.questions) return;
    setEditingQuiz({
      ...editingQuiz,
      questions: editingQuiz.questions.filter((_, questionIndex) => questionIndex !== index),
    });
  };

  if (activeQuiz) {
    return (
      <QuizPlayer
        quiz={activeQuiz}
        questions={activeQuiz.questions}
        onFinish={async (score, answers) => {
          const result = await API.quizzes.submitResult(activeQuiz.id, score, answers);
          loadQuizzes();
          return result;
        }}
        onCancel={() => setActiveQuiz(null)}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Espace Quiz</h2>
          <p className="text-slate-500 text-sm font-medium">
            {role === UserRole.TEACHER ? activeClass : activeChild ? `Quiz de ${activeChild.name}` : 'Tes évaluations'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadQuizzes}
            className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest"
          >
            Actualiser
          </button>
          {role === UserRole.TEACHER && (
            <button
              onClick={() => setEditingQuiz({ title: '', chapter: '', questions: [emptyQuestion()], duration: 15 })}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg uppercase tracking-widest"
            >
              + Créer Quiz
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
          {error}
        </div>
      )}

      {(isLoading || isOpeningQuiz) ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl">
          <p className="text-slate-400 font-medium">Aucun quiz disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const hasQuestions = quiz.questionCount > 0 || quiz.questions.length > 0;
            return (
              <div key={quiz.id} className="bg-white rounded-3xl border border-slate-100 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all group">
                <div className="space-y-4">
                  <div className="flex justify-between gap-3">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${quiz.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {quiz.status}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 tracking-widest">{quiz.duration} MIN</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{quiz.title}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{quiz.chapter}</p>
                  </div>
                  <p className={`text-xs font-black ${hasQuestions ? 'text-slate-400' : 'text-rose-500'}`}>
                    {hasQuestions ? `${quiz.questionCount || quiz.questions.length} question(s)` : 'Aucune question'}
                  </p>
                </div>
                <div className="flex flex-col space-y-2 mt-8">
                  {role === UserRole.TEACHER ? (
                    <div className="flex space-x-2">
                      <button onClick={() => editQuiz(quiz)} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Éditer</button>
                      <button onClick={() => setStatsQuiz(quiz)} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest">Stats</button>
                      <button onClick={() => deleteQuiz(quiz.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl" aria-label="Supprimer le quiz">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openQuiz(quiz)}
                      disabled={!hasQuestions}
                      className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        hasQuestions ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {quiz.status === 'completed' ? 'Correction' : 'Démarrer'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingQuiz && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingQuiz.id ? 'Éditer' : 'Nouveau'} Quiz</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input type="text" placeholder="Titre" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" value={editingQuiz.title || ''} onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })} />
              <input type="text" placeholder="Chapitre" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" value={editingQuiz.chapter || ''} onChange={e => setEditingQuiz({ ...editingQuiz, chapter: e.target.value })} />
              <input type="number" min={1} placeholder="Durée" className="p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" value={editingQuiz.duration || 15} onChange={e => setEditingQuiz({ ...editingQuiz, duration: Number(e.target.value) })} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions ({editingQuiz.questions?.length || 0})</p>
                <button
                  onClick={() => setEditingQuiz({ ...editingQuiz, questions: [...(editingQuiz.questions || []), emptyQuestion()] })}
                  className="px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all"
                >
                  + Ajouter
                </button>
              </div>

              {editingQuiz.questions?.map((question, questionIndex) => (
                <div key={question.id || questionIndex} className="p-4 bg-slate-50 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="text"
                      placeholder="Texte de la question"
                      className="w-full bg-white p-3 rounded-xl border border-slate-100 font-medium"
                      value={question.text}
                      onChange={e => updateQuestion(questionIndex, { text: e.target.value })}
                    />
                    <button onClick={() => removeQuestion(questionIndex)} className="px-3 py-3 bg-white text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      Supprimer
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {question.options.map((option, optionIndex) => (
                      <input
                        key={optionIndex}
                        type="text"
                        placeholder={`Option ${optionIndex + 1}`}
                        className="p-3 text-xs bg-white rounded-lg border border-slate-100"
                        value={option}
                        onChange={e => updateOption(questionIndex, optionIndex, e.target.value)}
                      />
                    ))}
                  </div>

                  <select
                    className="w-full p-3 text-xs bg-white rounded-xl border border-slate-100 font-black text-slate-600 outline-none"
                    value={question.correctOption}
                    onChange={e => updateQuestion(questionIndex, { correctOption: e.target.value })}
                  >
                    <option value="">Choisir la bonne réponse</option>
                    {question.options.filter(Boolean).map((option, optionIndex) => (
                      <option key={`${option}-${optionIndex}`} value={option}>{option}</option>
                    ))}
                  </select>
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
          <div className="bg-white w-full max-w-lg rounded-3xl p-10 shadow-2xl space-y-8">
            <div className="flex justify-between items-center gap-4">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Stats : {statsQuiz.title}</h3>
              <button onClick={() => setStatsQuiz(null)} className="text-slate-400" aria-label="Fermer">x</button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl text-center">
                <p className="text-3xl font-black text-indigo-600">{statsQuiz.averageScore ?? 0}%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moyenne Classe</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl text-center">
                <p className="text-3xl font-black text-emerald-500">{statsQuiz.questionCount || statsQuiz.questions.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions</p>
              </div>
            </div>
            <button onClick={() => setStatsQuiz(null)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quizzes;
