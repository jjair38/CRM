'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export function FinanceBot({ user }: { user: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Olá! Sou o **FinanceBot**. Como posso ajudar com suas finanças hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Fetch data context for the AI - optimized to only fetch what exists
      const transactionsSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', user.uid)));
      
      const dataContext = {
        transactions: transactionsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(), 
          dueDate: doc.data().dueDate?.toDate() 
        })),
        currentDate: new Date().toISOString()
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.concat({ role: 'user', content: userMessage }).map(m => ({
            role: m.role,
            content: m.content
          })),
          dataContext
        })
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      let botContent = data.text;

      // Parse actions from bot response
      const actionMatch = botContent.match(/\[TRANSACTION_ACTION: (.*?)\]/);
      if (actionMatch) {
        try {
          const actionData = JSON.parse(actionMatch[1]);
          
          // Robust date parsing
          let dateObj = new Date();
          if (actionData.dueDate) {
            const dateParts = actionData.dueDate.split('-');
            if (dateParts.length === 3) {
              const [y, m, d] = dateParts.map(Number);
              dateObj = new Date(y, m - 1, d);
            } else {
              dateObj = new Date(actionData.dueDate);
            }
          }

          if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
          }

          await addDoc(collection(db, 'transactions'), {
            description: actionData.description || 'Nova Transação',
            value: Number(actionData.value) || 0,
            type: actionData.type || 'Despesa',
            dueDate: Timestamp.fromDate(dateObj),
            category: actionData.category || 'Geral',
            status: actionData.status || 'Pendente',
            userId: user.uid,
            createdAt: Timestamp.now()
          });
          botContent = botContent.replace(/\[TRANSACTION_ACTION: .*?\]/, '\n\n✅ *Lançamento registrado com sucesso!*');
        } catch (err) {
          console.error('Action parsing error:', err);
          botContent = botContent.replace(/\[TRANSACTION_ACTION: .*?\]/, '\n\n❌ *Erro ao registrar lançamento automático.*');
        }
      }

      setMessages(prev => [...prev, { role: 'bot', content: botContent }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'bot', content: 'Desculpe, tive um problema ao processar isso. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-card-bg rounded border border-border-dark shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-border-dark flex items-center justify-between bg-[#161618]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gold rounded flex items-center justify-center">
            <Sparkles size={16} className="text-black" />
          </div>
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">FinanceBot Assistant</h3>
            <p className="text-[9px] text-[#a3e635] uppercase font-bold tracking-widest opacity-80">Online & Grounded</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([{ role: 'bot', content: 'Conversa reiniciada. Como posso ajudar?' }])}
          className="p-2 text-zinc-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-dark-bg/30">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[85%] p-4 rounded text-[13px] leading-relaxed shadow-lg
              ${m.role === 'user' 
                ? 'bg-gold text-black border-l-4 border-black/20' 
                : 'bg-[#1a1a1c] text-[#d1d1d1] border-l-4 border-gold/40'}
            `}>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1c] p-4 rounded border-l-4 border-gold/20 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-gold" />
              <span className="text-[10px] uppercase tracking-widest opacity-40">FinanceBot está processando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-border-dark bg-[#161618]">
        <div className="relative flex items-center bg-[#1a1a1c] border border-[#2a2a2e] rounded-full px-4 py-1">
          <span className="text-gold text-lg mr-2">✨</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Cadastrar conta de luz R$ 250 vencimento 15/10..."
            className="w-full bg-transparent border-none outline-none py-3 text-[13px] text-white placeholder:opacity-30"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="ml-2 bg-gold text-black text-[10px] font-bold uppercase px-4 py-2 rounded-full hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Enviar
          </button>
        </div>
        <p className="text-[9px] text-zinc-600 mt-3 text-center uppercase tracking-[0.2em]">
          O FinanceBot utiliza o contexto atual do seu CRM para respostas precisas.
        </p>
      </div>
    </div>
  );
}
