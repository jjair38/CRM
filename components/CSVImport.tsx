'use client';

import React, { useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  doc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import Papa from 'papaparse';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Loader2, 
  ChevronRight,
  History,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface CSVRow {
  ID_IMPORTACAO: string;
  DESCRICAO: string;
  VALOR: string;
  TIPO: string;
  CATEGORIA: string;
  DATA_VENCIMENTO: string;
  STATUS: string;
  PARCELA_ATUAL?: string;
  TOTAL_PARCELAS?: string;
}

interface ImportSummary {
  total: number;
  new: number;
  existing: number;
  errors: number;
  errorDetails: string[];
  validRows: any[];
}

export function CSVImport({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(
      collection(db, 'import_history'), 
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side to avoid needing a composite index in Firestore
      const sortedHistory = history.sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      
      setImportHistory(sortedHistory);
    });

    return () => unsubscribe();
  }, [user]);

  const downloadTemplate = () => {
    const headers = ['ID_IMPORTACAO', 'DESCRICAO', 'VALOR', 'TIPO', 'CATEGORIA', 'DATA_VENCIMENTO', 'STATUS', 'PARCELA_ATUAL', 'TOTAL_PARCELAS'];
    const example1 = ['TRX001', 'Venda de Produto A', '1500.00', 'Receita', 'Vendas', '2026-09-05', 'Pago', '1', '1'];
    const example2 = ['TRX002', 'Aluguel Mensal', '2500.00', 'Despesa', 'Aluguel', '2026-09-10', 'Pendente', '1', '12'];
    
    // Using semicolon (;) as delimiter for better Excel compatibility in Portuguese/European regions
    // Also adding BOM (\uFEFF) to force UTF-8 recognition in Excel
    const delimiter = ';';
    const csvContent = '\uFEFF' + [headers, example1, example2].map(e => e.join(delimiter)).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_crm.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSummary(null);
    }
  };

  const validateCSV = async () => {
    if (!file) return;
    setValidating(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "", // Auto-detect delimiter
      complete: async (results) => {
        const rows = results.data as CSVRow[];
        const errors: string[] = [];
        const validRows: any[] = [];
        let existingCount = 0;

        // Basic Header Validation
        const requiredHeaders = ['ID_IMPORTACAO', 'DESCRICAO', 'VALOR', 'TIPO', 'CATEGORIA', 'DATA_VENCIMENTO'];
        const headers = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setSummary({
            total: rows.length,
            new: 0,
            existing: 0,
            errors: rows.length,
            errorDetails: [`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`],
            validRows: []
          });
          setValidating(false);
          return;
        }

        // Get existing import IDs for this user to check for duplicates
        const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const existingImportIds = new Set();
        querySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.importId) existingImportIds.add(data.importId);
        });

        const seenInFile = new Set();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const lineNum = i + 2; // +1 for header, +1 for 0-index

          if (!row.ID_IMPORTACAO) {
            errors.push(`Linha ${lineNum}: ID_IMPORTACAO não preenchido.`);
            continue;
          }

          if (seenInFile.has(row.ID_IMPORTACAO)) {
            errors.push(`Linha ${lineNum}: ID_IMPORTACAO duplicado dentro do arquivo (${row.ID_IMPORTACAO}).`);
            continue;
          }
          seenInFile.add(row.ID_IMPORTACAO);

          if (existingImportIds.has(row.ID_IMPORTACAO)) {
            existingCount++;
            continue;
          }

          if (!row.DESCRICAO || !row.VALOR || !row.TIPO || !row.DATA_VENCIMENTO) {
            errors.push(`Linha ${lineNum}: Campos obrigatórios ausentes.`);
            continue;
          }

          const valorStr = row.VALOR.replace(',', '.');
          const valor = parseFloat(valorStr);
          if (isNaN(valor)) {
            errors.push(`Linha ${lineNum}: Valor inválido (${row.VALOR}).`);
            continue;
          }

          if (!['Receita', 'Despesa'].includes(row.TIPO)) {
            errors.push(`Linha ${lineNum}: Tipo deve ser 'Receita' ou 'Despesa' (encontrado: ${row.TIPO}).`);
            continue;
          }

          // Date parsing
          let dateObj: Date;
          if (row.DATA_VENCIMENTO.includes('-')) {
            const [y, m, d] = row.DATA_VENCIMENTO.split('-').map(Number);
            dateObj = new Date(y, m - 1, d);
          } else if (row.DATA_VENCIMENTO.includes('/')) {
            const [d, m, y] = row.DATA_VENCIMENTO.split('/').map(Number);
            dateObj = new Date(y, m - 1, d);
          } else {
            errors.push(`Linha ${lineNum}: Formato de data inválido. Use AAAA-MM-DD ou DD/MM/AAAA.`);
            continue;
          }

          if (isNaN(dateObj.getTime())) {
            errors.push(`Linha ${lineNum}: Data inválida (${row.DATA_VENCIMENTO}).`);
            continue;
          }

          validRows.push({
            importId: row.ID_IMPORTACAO,
            description: row.DESCRICAO,
            value: valor,
            type: row.TIPO,
            category: row.CATEGORIA || 'Geral',
            dueDate: Timestamp.fromDate(dateObj),
            status: row.STATUS || 'Pendente',
            installmentsTotal: Number(row.TOTAL_PARCELAS) || 1,
            installmentCurrent: Number(row.PARCELA_ATUAL) || 1,
            userId: user.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }

        setSummary({
          total: rows.length,
          new: validRows.length,
          existing: existingCount,
          errors: errors.length,
          errorDetails: errors,
          validRows
        });
        setValidating(false);
      }
    });
  };

  const processImport = async () => {
    if (!summary || summary.new === 0) return;
    setLoading(true);

    try {
      // Firebase Batch has a limit of 500 operations. 
      // We'll process in chunks of 400 to be safe and leave room for history.
      const CHUNK_SIZE = 400;
      const rows = summary.validRows;
      
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(row => {
          const newDocRef = doc(collection(db, 'transactions'));
          batch.set(newDocRef, row);
        });
        
        await batch.commit();
      }

      // Save to history (separate from batch to avoid complexity)
      const historyRef = collection(db, 'import_history');
      await addDoc(historyRef, {
        userId: user.uid,
        timestamp: Timestamp.now(),
        fileName: file?.name || 'arquivo.csv',
        totalAnalyzed: summary.total,
        newImported: summary.new,
        ignoredExisting: summary.existing,
        withErrors: summary.errors
      });

      alert(`Sucesso! ${summary.new} novos lançamentos importados.`);
      setSummary(null);
      setFile(null);
    } catch (error: any) {
      console.error('Erro na importação:', error);
      alert(`Erro ao processar a importação: ${error.message || 'Verifique sua conexão e os dados do arquivo.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-dark pb-6">
        <div>
          <h2 className="text-2xl font-light text-white font-serif tracking-widest uppercase">Importar CSV</h2>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">Alimentação em massa via planilha</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          <FileDown size={14} className="text-gold" />
          Baixar Modelo CSV
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
              ${file ? 'border-gold bg-gold/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={handleFileChange}
            />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${file ? 'bg-gold text-black' : 'bg-zinc-800 text-zinc-500'}`}>
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">{file ? file.name : 'Selecionar Arquivo CSV'}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">Arraste ou clique para selecionar</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              disabled={!file || validating || loading || summary !== null}
              onClick={validateCSV}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white font-bold py-4 px-6 rounded-full transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              {validating ? <Loader2 className="animate-spin" size={16} /> : 'Validar Arquivo'}
            </button>
            <button
              disabled={!summary || summary.new === 0 || loading}
              onClick={processImport}
              className="flex-1 bg-gold hover:bg-white disabled:opacity-30 text-black font-bold py-4 px-6 rounded-full transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-gold/10"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Importação'}
            </button>
          </div>

          {summary && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111113] border border-border-dark rounded-2xl p-6 space-y-6"
            >
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Resumo da Análise</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                  <p className="text-[9px] uppercase text-zinc-500 mb-1">Total</p>
                  <p className="text-xl font-serif text-white">{summary.total}</p>
                </div>
                <div className="p-3 bg-gold/5 rounded-xl border border-gold/20">
                  <p className="text-[9px] uppercase text-gold mb-1">Novos</p>
                  <p className="text-xl font-serif text-gold">{summary.new}</p>
                </div>
                <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                  <p className="text-[9px] uppercase text-zinc-500 mb-1">Existentes</p>
                  <p className="text-xl font-serif text-white">{summary.existing}</p>
                </div>
                <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                  <p className="text-[9px] uppercase text-red-500 mb-1">Erros</p>
                  <p className="text-xl font-serif text-red-500">{summary.errors}</p>
                </div>
              </div>

              {summary.errorDetails.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-bold text-red-500 uppercase mb-2 flex items-center gap-2">
                    <AlertTriangle size={12} />
                    Detalhes dos Erros
                  </p>
                  <ul className="space-y-1">
                    {summary.errorDetails.map((err, i) => (
                      <li key={i} className="text-[11px] text-zinc-400">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Instructions & Format */}
        <div className="space-y-6">
          <div className="bg-[#111113] border border-border-dark rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-gold" />
              Regras do Arquivo
            </h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                <div className="text-[11px] leading-relaxed text-zinc-400">
                  <strong className="text-white">ID_IMPORTACAO:</strong> Um código único para cada linha. O sistema usa isso para evitar duplicatas, mesmo se você enviar o mesmo arquivo várias vezes.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                <div className="text-[11px] leading-relaxed text-zinc-400">
                  <strong className="text-white">TIPO:</strong> Deve ser preenchido exatamente como <code className="text-gold">Receita</code> ou <code className="text-gold">Despesa</code>.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                <div className="text-[11px] leading-relaxed text-zinc-400">
                  <strong className="text-white">DATA_VENCIMENTO:</strong> Aceita os formatos <code className="text-zinc-300">AAAA-MM-DD</code> ou <code className="text-zinc-300">DD/MM/AAAA</code>.
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0">4</div>
                <div className="text-[11px] leading-relaxed text-zinc-400">
                  <strong className="text-white">VALOR:</strong> Use números decimais. O Excel usará o padrão do seu sistema (ex: <code className="text-zinc-300">1250,50</code>).
                </div>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-gold/10 text-gold flex items-center justify-center text-[10px] font-bold shrink-0">5</div>
                <div className="text-[11px] leading-relaxed text-zinc-400">
                  <strong className="text-white">PARCELAS:</strong> Use <code className="text-zinc-300">PARCELA_ATUAL</code> e <code className="text-zinc-300">TOTAL_PARCELAS</code> para lançamentos parcelados.
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-[#111113] border border-border-dark rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <History size={16} className="text-zinc-500" />
              Histórico Recente
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {importHistory.length === 0 ? (
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Nenhuma importação realizada ainda.</p>
              ) : (
                importHistory.map((item) => (
                  <div key={item.id} className="p-3 bg-zinc-900 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">{item.timestamp?.toDate ? format(item.timestamp.toDate(), "dd/MM/yyyy HH:mm") : '---'}</span>
                      <span className="text-[10px] text-gold font-bold">{item.newImported} novos</span>
                    </div>
                    <p className="text-[11px] text-white font-medium truncate">{item.fileName}</p>
                    <div className="flex gap-3 opacity-50 text-[9px] uppercase tracking-tighter">
                      <span>Total: {item.totalAnalyzed}</span>
                      <span>Ignorados: {item.ignoredExisting}</span>
                      <span className="text-red-400">Erros: {item.withErrors}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
