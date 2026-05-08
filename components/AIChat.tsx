
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { UserRole, Message } from '../types';
import { ICONS } from '../constants';

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
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const systemPrompt = `Tu es EduAI, un assistant pédagogique expert pour une application de suivi scolaire. 
      L'utilisateur actuel est un ${role}. 
      - Si c'est un ÉLÈVE: Aide-le à comprendre ses cours, donne des astuces de révision.
      - Si c'est un ENSEIGNANT: Aide-le à concevoir des questions de quiz, à gérer le comportement ou à rédiger des messages aux parents.
      - Si c'est un PARENT: Aide-le à interpréter les résultats de son enfant et donne des conseils pour l'accompagnement à la maison.
      Reste professionnel, encourageant et concis. Ne sors jamais de ton rôle d'assistant éducatif.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: { systemInstruction: systemPrompt }
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'ai',
        senderName: 'EduAI',
        text: response.text || "Désolé, je n'ai pas pu générer de réponse.",
        timestamp: 'Maintenant',
        isMe: false
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'ai',
        senderName: 'EduAI',
        text: "Désolé, une erreur s'est produite. Vérifiez votre connexion internet ou la clé API.",
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
