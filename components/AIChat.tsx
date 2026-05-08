
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserRole, Message } from '../types';
import { ICONS } from '../constants';
import { testGeminiAPI } from '../services/geminiTest';

interface AIChatProps {
  role: UserRole;
  userName: string;
}

const AIChat: React.FC<AIChatProps> = ({ role, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'ai-1', 
      senderId: 'ai', 
      senderName: 'EduAI', 
      text: `Bonjour ${userName}. Je suis votre assistant intelligent. Comment puis-je vous aider dans votre rôle de ${role} aujourd'hui ?`, 
      timestamp: 'Maintenant', 
      isMe: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      senderId: 'user',
      senderName: userName,
      text: input,
      timestamp: 'Maintenant',
      isMe: true
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'votre_cle_api_gemini_ici') {
        throw new Error('API_KEY_MISSING');
      }

      console.log('🔑 Clé API présente:', apiKey.substring(0, 10) + '...');

      const systemPrompt = `Tu es EduAI, un assistant pédagogique expert pour une application de suivi scolaire.
      L'utilisateur actuel est un ${role}.
      - Si c'est un ÉLÈVE: Aide-le à comprendre ses cours, donne des astuces de révision.
      - Si c'est un ENSEIGNANT: Aide-le à concevoir des questions de quiz, à gérer le comportement ou à rédiger des messages aux parents.
      - Si c'est un PARENT: Aide-le à interpréter les résultats de son enfant et donne des conseils pour l'accompagnement à la maison.
      Reste professionnel, encourageant et concis. Ne sors jamais de ton rôle d'assistant éducatif.`;

      console.log('🤖 Initialisation Gemini...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });

      const fullPrompt = `${systemPrompt}\n\nUser: ${input}`;
      console.log('📤 Envoi de la requête à Gemini:', input.substring(0, 50) + '...');
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      console.log('✅ Réponse reçue de Gemini');
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'ai',
        senderName: 'EduAI',
        text: text || "Désolé, je n'ai pas pu générer de réponse.",
        timestamp: 'Maintenant',
        isMe: false
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("❌ Erreur AI détaillée:", error);

      let errorMessage = "Désolé, une erreur s'est produite.";

      if (error.message === 'API_KEY_MISSING') {
        errorMessage = "Clé API Gemini manquante. Veuillez configurer VITE_GEMINI_API_KEY dans votre fichier .env";
      } else if (error.message?.includes('API_KEY_INVALID')) {
        errorMessage = "Clé API Gemini invalide. Vérifiez votre clé API sur https://makersuite.google.com/app/apikey";
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = "Permission refusée. Votre clé API n'a pas les permissions nécessaires.";
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage = "Quota dépassé. Vous avez atteint la limite d'utilisation de l'API Gemini.";
      } else if (error.message?.includes('NETWORK_ERROR') || error.message?.includes('fetch')) {
        errorMessage = "Erreur de connexion. Vérifiez votre connexion internet.";
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = "Impossible de contacter les serveurs Gemini. Vérifiez votre connexion internet.";
      } else {
        errorMessage = `Erreur API Gemini: ${error.message || 'Erreur inconnue'}. Vérifiez votre clé API et votre connexion.`;
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'ai',
        senderName: 'EduAI',
        text: errorMessage,
        timestamp: 'Maintenant',
        isMe: false
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60]"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <ICONS.Sparkles />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 md:bottom-24 md:right-8 w-[calc(100vw-48px)] md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-[60] animate-in slide-in-from-bottom-8 duration-300">
          <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <ICONS.Sparkles />
              </div>
              <div>
                <h4 className="font-bold text-sm">EduAI Assistant</h4>
                <p className="text-[10px] text-indigo-100">En ligne • Spécialiste {role}</p>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex items-center space-x-2 bg-slate-100 rounded-xl px-3 py-1">
              <input 
                type="text" 
                placeholder="Posez votre question..." 
                className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={() => testGeminiAPI()}
                className="text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all p-1"
                title="Tester l'API Gemini"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </button>
              <button 
                onClick={handleSend}
                className="text-indigo-600 hover:scale-110 transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;
