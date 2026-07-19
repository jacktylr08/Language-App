'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  messageType?: string;
}

interface TutorChatProps {
  lessonId: string;
  lessonTitle: string;
}

export function TutorChat({ lessonId, lessonTitle }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Send initial greeting
  const sendInitialGreeting = async (convId: string) => {
    try {
      setSending(true);
      const response = await api.post(`/lessons/${lessonId}/tutor/message`, {
        conversationId: convId,
        message: 'Hello, let\'s start learning!',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'user',
          content: 'Hello, let\'s start learning!',
        },
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: response.data.tutorResponse,
          messageType: 'feedback',
        },
      ]);
    } catch (err: any) {
      console.error('Error sending initial greeting:', err);
    } finally {
      setSending(false);
    }
  };

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/lessons/${lessonId}/tutor/conversation`);
        setConversationId(response.data.conversationId);
        setMessages(response.data.messages || []);
        setPerformanceScore(response.data.performanceScore || 0);

        // If this is a new conversation with no messages, send initial tutor greeting
        if (!response.data.messages || response.data.messages.length === 0) {
          setTimeout(() => {
            sendInitialGreeting(response.data.conversationId);
          }, 500);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load conversation');
        console.error('Error initializing conversation:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeConversation();
  }, [lessonId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to tutor
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversationId || sending) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to UI immediately
    const userMessageId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: userMessage,
      },
    ]);

    try {
      setSending(true);
      const response = await api.post(`/lessons/${lessonId}/tutor/message`, {
        conversationId,
        message: userMessage,
      });

      // Add tutor response
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: response.data.tutorResponse,
          messageType: 'feedback',
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
      console.error('Error sending message:', err);
      // Remove the user message if there was an error
      setMessages((prev) => prev.filter((m) => m.id !== userMessageId));
    } finally {
      setSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading tutor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {lessonTitle}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                AI Language Tutor • Performance: {performanceScore}%
              </p>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full"
      >
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none'
                }`}
              >
                <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg rounded-bl-none">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 w-full">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              placeholder="Type your response or question..."
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || sending}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            💡 Tip: Ask questions, respond to the tutor, or practice what you've learned.
          </p>
        </div>
      </div>
    </div>
  );
}
