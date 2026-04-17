import React, { useState, useEffect } from 'react';
import { API } from '../services/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: string;
  is_read: boolean;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await API.notifications.getAll();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await API.notifications.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => API.notifications.markAsRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-400 font-bold">Chargement...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-indigo-600 text-sm font-semibold hover:text-indigo-700"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl">
          <p className="text-slate-500 font-medium">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={`p-5 rounded-3xl border transition-all flex items-start space-x-4 cursor-pointer hover:shadow-md ${
                notif.is_read ? 'bg-white border-slate-100' : 'bg-indigo-50 border-indigo-100 shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-100 text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold ${notif.is_read ? 'text-slate-800' : 'text-indigo-900'}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] font-medium text-slate-400">{notif.timestamp}</span>
                </div>
                <p className={`text-sm ${notif.is_read ? 'text-slate-500' : 'text-indigo-700/80'}`}>
                  {notif.message}
                </p>
              </div>
              {!notif.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
