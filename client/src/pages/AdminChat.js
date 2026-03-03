import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const AdminChat = () => {
  const [searchParams] = useSearchParams();
  const userIdFromUrl = searchParams.get('userId');
  const nameFromUrl = searchParams.get('name');
  const emailFromUrl = searchParams.get('email');
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  const isSingleThreadFromBookings = Boolean(userIdFromUrl?.trim());
  const threadsToShow = isSingleThreadFromBookings
    ? (() => {
        const existing = threads.find(t => String(t.userId) === String(userIdFromUrl));
        if (existing) return [existing];
        return [{
          userId: userIdFromUrl,
          user: {
            name: nameFromUrl ? decodeURIComponent(nameFromUrl) : 'User',
            email: emailFromUrl ? decodeURIComponent(emailFromUrl) : ''
          },
          lastMessage: '',
          lastAt: null,
          unreadForAdmin: 0
        }];
      })()
    : threads;

  const ensureAdmin = () => {
    try {
      const s = localStorage.getItem('user');
      const u = s ? JSON.parse(s) : null;
      if (!u || u.role !== 'admin') {
        window.location.href = '/';
      }
    } catch {
      window.location.href = '/';
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await api.get('/chat/threads');
      setThreads(res.data?.threads || []);
    } catch {}
  };

  const fetchThread = async (userId) => {
    if (!userId) return;
    try {
      const res = await api.get('/chat/thread', { params: { userId } });
      setMessages(res.data?.messages || []);
    } catch {}
  };

  useEffect(() => {
    ensureAdmin();
    fetchThreads();
    const i = setInterval(fetchThreads, 7000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (userIdFromUrl) {
      const id = userIdFromUrl.trim();
      if (id) {
        setSelected(id);
        fetchThread(id);
      }
    }
  }, [userIdFromUrl]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    await api.post('/chat/message', { toUserId: selected, message: text.trim() });
    setText('');
    await fetchThread(selected);
    await fetchThreads();
  };

  const markReadAdmin = async () => {
    if (!selected) return;
    try {
      await api.patch(`/chat/${selected}/read`);
    } catch {}
  };

  useEffect(() => {
    if (selected) {
      markReadAdmin();
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff]">
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-3">
          <div className="font-semibold text-indigo-800 mb-2">
            {isSingleThreadFromBookings ? 'Chat with' : 'User Threads'}
          </div>
          <div className="space-y-2">
            {threadsToShow.map(t => (
              <button
                key={String(t.userId)}
                onClick={() => { setSelected(String(t.userId)); fetchThread(String(t.userId)); }}
                className={`w-full text-left border rounded p-2 hover:bg-indigo-50 ${selected === String(t.userId) ? 'bg-indigo-100' : 'bg-white'}`}
              >
                <div className="text-sm font-medium">{t.user?.name || 'Unknown User'}</div>
                <div className="text-xs text-gray-500">{t.user?.email || ''}</div>
                <div className="text-xs mt-1 text-gray-700 truncate">{t.lastMessage || ''}</div>
                <div className="text-[10px] text-gray-400 mt-1">{new Date(t.lastAt).toLocaleString()}</div>
                <div className="text-[10px] text-red-600 mt-1">{t.unreadForAdmin > 0 ? `Unread: ${t.unreadForAdmin}` : ''}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 bg-white rounded-xl shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-indigo-800">Chat</div>
            <div className="text-sm text-gray-500">{selected ? (threads.find(x => String(x.userId) === String(selected))?.user?.email ?? threadsToShow.find(x => String(x.userId) === String(selected))?.user?.email) : ''}</div>
          </div>
          <div className="h-[60vh] overflow-y-auto border rounded p-3 bg-indigo-50">
            {messages.map(m => (
              <div key={m._id + m.createdAt} className={`mb-2 flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded ${m.senderRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
                  <div className="text-sm">{m.message}</div>
                  <div className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message"
            />
            <button
              onClick={sendMessage}
              disabled={!selected}
              className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChat;