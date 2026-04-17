import React, { useState, useEffect, useRef } from 'react';
import { Message, User, UserRole, StudentProfile } from '../types';
import { API } from '../services/api';

interface MessagingProps {
  role: UserRole;
  user: User;
  activeChild?: StudentProfile | null;
}

const Messaging: React.FC<MessagingProps> = ({ role, user, activeChild }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [recipientId, setRecipientId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (role === UserRole.PARENT && activeChild?.id) {
      API.parents.getChildTeachers(activeChild.id).then((t) => {
        setTeachers(t || []);
        if (t?.length) setRecipientId(String(t[0].id));
      }).catch(() => setTeachers([]));
    }
  }, [role, activeChild?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    const data = await API.messaging.getHistory();
    setMessages(data);
    setIsLoading(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    if (role === UserRole.PARENT && !recipientId) return;

    const sentMsg = await API.messaging.send(
      input,
      user,
      role === UserRole.PARENT ? recipientId : undefined,
      role === UserRole.PARENT ? 'private' : 'general'
    );
    setMessages(prev => [...prev, sentMsg]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] md:h-[calc(100vh-140px)] bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
        <h3 className="font-black text-slate-800 tracking-tight">Messagerie</h3>
        {role === UserRole.PARENT && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Contacter un enseignant:</span>
            <select value={recipientId} onChange={e => setRecipientId(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm">
              {teachers.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.full_name} - {t.subject}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full opacity-50 font-black text-xs uppercase tracking-widest">Chargement...</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center space-x-2 mb-1 px-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{msg.senderName}</span>
                <span className="text-[8px] font-bold text-slate-300">{msg.timestamp}</span>
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${msg.senderId === user.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-50">
        <div className="flex items-center space-x-3 bg-slate-100 p-2 rounded-3xl border border-slate-200">
          <input
            type="text"
            placeholder={role === UserRole.PARENT ? "Message à l'enseignant..." : 'Tapez votre message...'}
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-medium"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-2xl font-black text-xs" disabled={!input.trim()}>
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
};

export default Messaging;
