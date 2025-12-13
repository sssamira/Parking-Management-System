import React, { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const ensureAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      window.location.href = '/login';
    }
  };

  const fetchThread = async () => {
    try {
      const res = await api.get('/chat/thread');
      setMessages(res.data?.messages || []);
    } catch {}
  };

  const markRead = async () => {
    try {
      await api.patch('/chat/read');
    } catch {}
  };

  useEffect(() => {
    ensureAuth();
    fetchThread();
    markRead();
    const i = setInterval(fetchThread, 5000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      await api.post('/chat/message', { message: text.trim() });
      setText('');
      await fetchThread();
    } finally {
      setLoading(false);
    }
  };

  const userObj = (() => {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef3ff] to-[#dfe8ff]">
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-indigo-800">Chat with Admin</div>
            <div className="text-sm text-gray-500">{userObj?.email || ''}</div>
          </div>
          <div className="h-[60vh] overflow-y-auto border rounded p-3 bg-indigo-50">
            {messages.map(m => (
              <div key={m._id + m.createdAt} className={`mb-2 flex ${m.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3 py-2 rounded ${m.senderRole === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
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
              disabled={loading}
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

export default Chat;