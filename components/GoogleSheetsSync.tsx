'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { FileSpreadsheet, Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function GoogleSheetsSync({ user }: { user: any }) {
  const { accessToken } = useAuth();
  const [sheetUrl, setSheetUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const extractSheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSync = async () => {
    if (!accessToken) {
      setStatus({ type: 'error', message: 'Faça login novamente para autorizar o acesso ao Google Sheets.' });
      return;
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      setStatus({ type: 'error', message: 'URL da planilha inválida. Use o link completo da barra de endereços.' });
      return;
    }

    setSyncing(true);
    setStatus({ type: null, message: '' });

    try {
      // 1. Buscar metadados da planilha para pegar o nome da primeira aba
      const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!metadataRes.ok) throw new Error('Não foi possível acessar a planilha. Verifique as permissões.');
      
      const metadata = await metadataRes.json();
      const firstSheetName = metadata.sheets[0].properties.title;

      // 2. Buscar valores da planilha (A1:E1000)
      // Esperado: Data | Descrição | Valor | Tipo (Receita/Despesa) | Status (Pago/Pendente)
      const dataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${firstSheetName}!A2:E1000`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!dataRes.ok) throw new Error('Erro ao ler os dados da planilha.');
      
      const { values } = await dataRes.json();

      if (!values || values.length === 0) {
        setStatus({ type: 'error', message: 'Nenhuma transação encontrada na planilha (começando na linha 2).' });
        return;
      }

      let count = 0;
      for (const row of values) {
        const [dateStr, description, valueStr, type, statusStr] = row;
        
        if (!dateStr || !description || !valueStr) continue;

        const value = parseFloat(valueStr.replace(/[^\d,-]/g, '').replace(',', '.'));
        if (isNaN(value)) continue;

        // Converter data (esperado DD/MM/AAAA)
        const [day, month, year] = dateStr.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          description,
          value: Math.abs(value),
          type: type || 'Despesa',
          status: statusStr || 'Pendente',
          date: Timestamp.fromDate(date),
          dueDate: Timestamp.fromDate(date),
          createdAt: Timestamp.now(),
          category: 'Planilha'
        });
        count++;
      }

      setStatus({ type: 'success', message: `Sincronização concluída! ${count} transações importadas.` });
      setSheetUrl('');
    } catch (error: any) {
      console.error('Sync error:', error);
      setStatus({ type: 'error', message: error.message || 'Erro inesperado na sincronização.' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-card-bg p-6 rounded border border-border-dark shadow-xl mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#107c41]/20 rounded flex items-center justify-center">
          <FileSpreadsheet className="text-[#107c41] w-6 h-6" />
        </div>
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white">Sincronizar Google Sheets</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Alimente seu CRM automaticamente</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Cole a URL da sua planilha aqui..." 
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="w-full bg-[#080809] border border-border-dark rounded-xl px-4 py-3 text-xs focus:border-gold outline-none transition-all pr-12"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] space-y-1">
            <p>Coluna A: Data (DD/MM/AAAA)</p>
            <p>Coluna B: Descrição | Coluna C: Valor</p>
            <p>Coluna D: Tipo (Receita/Despesa)</p>
          </div>
          
          <button 
            onClick={handleSync}
            disabled={syncing || !sheetUrl}
            className={`
              px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all
              ${syncing || !sheetUrl 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-[#107c41] hover:bg-white hover:text-[#107c41] text-white shadow-lg shadow-[#107c41]/10'}
            `}
          >
            {syncing ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sincronizando...
              </div>
            ) : 'Sincronizar Agora'}
          </button>
        </div>

        <AnimatePresence>
          {status.type && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3 mt-4 ${
                status.type === 'success' ? 'bg-[#107c41]/10 border border-[#107c41]/20 text-[#a3e635]' : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="text-[11px] font-medium">{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
