import React, { useState } from 'react';
import { Quiz, Question } from '../types';

interface QuizPlayerProps {
  quiz: Quiz;
  questions: Question[];
  onFinish: (score: number, answers: Record<string, string>) => void;
  onCancel: () => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, questions, onFinish, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const hasQuestions = questions.length > 0;
  const currentQuestion = questions[currentIndex];
  const progress = hasQuestions ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelect = (option: string) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }));
  };

  const calculateScore = () => {
    if (!hasQuestions) return 0;

    const correctAnswers = questions.filter((question) => {
      const selected = answers[question.id] || '';
      return selected.trim().toLowerCase() === question.correctOption.trim().toLowerCase();
    }).length;

    return Math.round((correctAnswers / questions.length) * 100);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }

    onFinish(calculateScore(), answers);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <button onClick={onCancel} className="text-slate-400" aria-label="Fermer le quiz">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{quiz.title}</h2>
          <p className="text-xs text-slate-400">
            {hasQuestions ? `Question ${currentIndex + 1} sur ${questions.length}` : 'Aucune question'}
          </p>
        </div>
        <div className="w-6" />
      </div>

      <div className="h-1 bg-slate-100 w-full">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!hasQuestions ? (
        <div className="flex-1 px-6 py-12 flex items-center justify-center">
          <div className="max-w-md text-center space-y-4">
            <h3 className="text-xl font-black text-slate-800">Quiz indisponible</h3>
            <p className="text-sm font-medium text-slate-500">
              Ce quiz ne contient pas encore de questions. Ajoute au moins une question avant de le publier.
            </p>
            <button
              onClick={onCancel}
              className="px-8 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest"
            >
              Retour
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 px-6 py-12 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-tight">
                {currentQuestion.text}
              </h3>

              <div className="space-y-4">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(option)}
                    className={`w-full p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                      answers[currentQuestion.id] === option
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                        : 'border-slate-100 hover:border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>{option}</span>
                    {answers[currentQuestion.id] === option && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-500">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between safe-bottom">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                currentIndex === 0 ? 'text-slate-300' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Précédent
            </button>

            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id]}
              className={`px-10 py-3 rounded-xl font-bold transition-all ${
                !answers[currentQuestion.id]
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'
              }`}
            >
              {currentIndex === questions.length - 1 ? 'Terminer' : 'Suivant'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizPlayer;
