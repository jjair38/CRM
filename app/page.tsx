'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  MessageSquare, 
  LogOut, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  AlertCircle,
  Menu,
  X,
  Wallet,
  Eye,
  EyeOff,
  RefreshCcw,
  FileUp,
  Fingerprint,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { format, isAfter, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Components
import { FinanceBot } from '@/components/FinanceBot';
import { TransactionsList } from '@/components/TransactionsList';
import { SummaryCards } from '@/components/SummaryCards';
import { TransactionModal } from '@/components/TransactionModal';
import { UpcomingAlerts } from '@/components/UpcomingAlerts';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { CSVImport } from '@/components/CSVImport';
import { FutureProjection } from '@/components/FutureProjection';
import { SecurityLock } from '@/components/SecurityLock';
import { Toast, ToastType } from '@/components/Toast';
import { addDays, startOfDay, isBefore } from 'date-fns';
import { getDocs } from 'firebase/firestore';

export default function Home() {
  const { user, loading, signIn, logout } = useAuth();
  
  // Teste de conexão obrigatório com a nuvem
  useEffect(() => {
    async function testConnection() {
      if (!user) return;
      try {
        // Tenta buscar um documento fictício diretamente do servidor
        await getDocFromServer(doc(db, '_connection_test', 'status'));
        console.log('✅ Conectado com sucesso ao banco de dados na nuvem.');
      } catch (error: any) {
        if (error?.message?.includes('offline')) {
          alert('ATENÇÃO: Você está offline ou o banco de dados não está acessível. As informações podem não ser salvas na internet.');
        }
      }
    }
    testConnection();
  }, [user]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'import'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showValues, setShowValues] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('biometric_security_enabled') === 'true';
    }
    return false;
  });
  const [securityEnabled, setSecurityEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('biometric_security_enabled') === 'true';
    }
    return false;
  });
  const [isDeviceAuthSupported, setIsDeviceAuthSupported] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'info'
  });
  const hasCheckedUpcoming = React.useRef(false);

  // Check for upcoming bills on login
  useEffect(() => {
    if (user && !hasCheckedUpcoming.current) {
      const checkUpcomingBills = async () => {
        try {
          const today = startOfDay(new Date());
          const threeDaysFromNow = addDays(today, 3);
          
          const q = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            where('status', '==', 'Pendente'),
            where('type', '==', 'Despesa')
          );
          
          const snapshot = await getDocs(q);
          const upcomingCount = snapshot.docs.filter((doc) => {
            const data = doc.data();
            if (!data.dueDate?.toDate) return false;
            const dueDate = startOfDay(data.dueDate.toDate());
            return isBefore(dueDate, addDays(threeDaysFromNow, 1));
          }).length;

          if (upcomingCount > 0) {
            setToastConfig({
              isVisible: true,
              message: `Atenção: Você tem ${upcomingCount} ${upcomingCount === 1 ? 'conta' : 'contas'} vencendo nos próximos 3 dias (ou já vencidas).`,
              type: 'warning'
            });
          }
          hasCheckedUpcoming.current = true;
        } catch (error) {
          console.error('Erro ao verificar contas próximas:', error);
        }
      };

      checkUpcomingBills();
    }
  }, [user]);

  // Check for device authentication support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setIsDeviceAuthSupported(available));
    }
  }, []);

  const toggleSecurity = async () => {
    const newValue = !securityEnabled;
    
    if (newValue) {
      // Se estiver ativando, precisamos "registrar" o dispositivo
      try {
        if (!window.PublicKeyCredential) {
          alert('Seu navegador não suporta biometria.');
          return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const options: any = {
          publicKey: {
            challenge,
            rp: { name: "CRM Financeiro" },
            user: {
              id: Uint8Array.from(user?.uid || 'user', c => c.charCodeAt(0)),
              name: user?.email || 'user',
              displayName: user?.displayName || 'Usuário'
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
            timeout: 60000,
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            }
          }
        };

        const credential: any = await navigator.credentials.create(options);
        if (credential) {
          // Salva o ID da credencial para uso futuro
          const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          localStorage.setItem('device_auth_credential_id', credentialId);
          setSecurityEnabled(true);
          localStorage.setItem('biometric_security_enabled', 'true');
        }
      } catch (err: any) {
        console.error('Erro ao configurar biometria:', err);
        if (err.name !== 'NotAllowedError') {
          alert('Não foi possível configurar o bloqueio: ' + err.message);
        }
      }
    } else {
      // Desativando
      setSecurityEnabled(false);
      localStorage.setItem('biometric_security_enabled', 'false');
      localStorage.removeItem('device_auth_credential_id');
    }
  };

  const handleOpenNewModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (transaction: any) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#080809] relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gold/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Animated Logo Container */}
          <div className="relative w-24 h-24 mb-12">
            {/* Outer Rotating Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-[2rem] border-[0.5px] border-gold/20"
            />
            
            {/* Inner Glowing Orbit */}
            <motion.div 
              animate={{ 
                rotate: -360,
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute inset-2 rounded-[1.5rem] border border-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.15)]"
            />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  y: [0, -4, 0],
                  filter: ["drop-shadow(0 0 0px rgba(212,175,55,0))", "drop-shadow(0 0 8px rgba(212,175,55,0.4))", "drop-shadow(0 0 0px rgba(212,175,55,0))"]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <TrendingUp className="text-gold w-12 h-12" strokeWidth={1.5} />
              </motion.div>
            </div>
          </div>

          {/* Brand Text with Staggered Entrance */}
          <div className="text-center space-y-4">
            <div className="overflow-hidden">
              <motion.h1 
                initial={{ y: 40 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="text-3xl font-serif text-white tracking-[0.4em] uppercase"
              >
                CRM <span className="text-gold font-black">Financeiro</span>
              </motion.h1>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
              <p className="text-[10px] uppercase tracking-[0.6em] text-zinc-500 font-black">
                Designer <span className="text-zinc-200">Jair</span>
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Minimalist Progress Indicator */}
        <div className="absolute bottom-24 flex flex-col items-center gap-4">
          <div className="w-40 h-[1px] bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full bg-gradient-to-r from-transparent via-gold/60 to-transparent"
            />
          </div>
          <span className="text-[8px] uppercase tracking-[0.3em] text-zinc-700 font-bold animate-pulse">Sincronizando Dados</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080809] p-4 relative overflow-hidden">
        {/* Background Gradients for "Arrojado" look */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/5 rounded-full blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full bg-[#111113] rounded-3xl shadow-2xl p-10 text-center border border-white/5 relative z-10"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-gold/20">
            <Wallet className="text-gold w-10 h-10" />
          </div>
          
          <h1 className="text-4xl font-light tracking-[0.1em] uppercase text-white font-serif mb-12">
            CRM <span className="text-gold font-bold">Financeiro</span>
          </h1>

          <div className="space-y-4">
            <button 
              onClick={signIn}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 group shadow-xl shadow-white/5"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
              <span>Entrar com Google</span>
            </button>
            
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-medium pt-8">
              Acesso Restrito & Seguro
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isAppLocked) {
    return <SecurityLock onUnlock={() => setIsAppLocked(false)} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: Receipt },
    { id: 'import', label: 'Importar CSV', icon: FileUp },
  ];

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col md:flex-row text-[#d1d1d1]">
      <Toast 
        isVisible={toastConfig.isVisible} 
        message={toastConfig.message} 
        type={toastConfig.type} 
        onClose={() => setToastConfig(prev => ({ ...prev, isVisible: false }))} 
      />
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        user={user} 
        initialData={editingTransaction}
      />
      {/* Mobile Header */}
      <div className="md:hidden bg-card-bg border-b border-border-dark p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 font-light tracking-widest uppercase text-white font-serif">
          <div className="w-8 h-8 bg-gold rounded flex items-center justify-center">
            <Wallet className="text-black w-5 h-5" />
          </div>
          <span>CRM <span className="text-gold font-bold">Financeiro</span></span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2">
          <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gold/30" />
        </button>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0c0d]/80 backdrop-blur-xl border-t border-white/5 z-40 px-4 pb-8 pt-4 flex items-center justify-between">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${isActive ? 'text-gold' : 'text-zinc-600'}`}
            >
              <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-gold/10' : ''}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] uppercase tracking-widest font-black ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
        
        {/* Toggle Sidebar Button for Mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 transition-all active:scale-90 text-zinc-600"
        >
          <div className="p-2 rounded-2xl">
            <Menu size={22} />
          </div>
          <span className="text-[10px] uppercase tracking-widest font-black opacity-40">
            Mais
          </span>
        </button>
      </div>

      {/* Floating Action Button for Mobile - Moved higher to not block bottom nav if needed, but actually fixed bottom right is fine if padded */}
      <button 
        onClick={handleOpenNewModal}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-gold text-black rounded-full shadow-2xl flex items-center justify-center z-40 hover:scale-110 active:scale-95 transition-all"
        title="Novo Lançamento"
      >
        <Plus size={28} />
      </button>

      {/* Sidebar (Drawer on mobile) */}
      <aside className={`
        fixed inset-0 z-50 md:relative md:flex md:w-64 flex-col bg-card-bg border-r border-border-dark transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-6 md:hidden border-b border-white/5 bg-[#161618]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold rounded flex items-center justify-center">
              <Wallet className="text-black w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white">Menu Elite</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-full text-zinc-500 active:scale-90 transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 hidden md:flex flex-col mb-2 border-b border-border-dark">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gold rounded flex items-center justify-center">
              <Wallet className="text-black w-6 h-6" />
            </div>
            <span className="font-serif font-light tracking-widest uppercase text-xl text-white">
              CRM <span className="text-gold font-bold">Financeiro</span>
            </span>
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 ml-13">Desenvolvido por Jair</p>
        </div>

        {/* Perfil no Topo */}
        <div className="px-6 py-4 border-b border-border-dark mb-4">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-10 h-10 rounded-full border border-gold/30 p-0.5 shadow-lg shadow-gold/5" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              <button 
                onClick={logout}
                className="text-[9px] uppercase tracking-widest font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 mt-1"
              >
                <LogOut size={10} />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium transition-all
                  ${activeTab === item.id 
                    ? 'bg-zinc-800 text-gold border-r-2 border-gold' 
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}
                `}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
          
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'CRM Financeiro',
                  text: 'Gestão patrimonial consolidada e controle financeiro de elite.',
                  url: window.location.origin,
                });
              } else {
                navigator.clipboard.writeText(window.location.origin);
                alert('Link copiado para a área de transferência!');
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-all"
          >
            <FileUp size={16} />
            Compartilhar App
          </button>

          {isDeviceAuthSupported && (
            <button 
              onClick={toggleSecurity}
              className={`w-full flex items-center justify-between px-4 py-3 rounded text-[11px] uppercase tracking-wider font-medium transition-all ${securityEnabled ? 'text-gold' : 'text-zinc-500 hover:bg-zinc-900'}`}
            >
              <div className="flex items-center gap-3">
                <Shield size={16} />
                <span>Bloqueio do Celular</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${securityEnabled ? 'bg-gold' : 'bg-zinc-800'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-black rounded-full transition-all ${securityEnabled ? 'left-4.5' : 'left-0.5'}`} />
              </div>
            </button>
          )}
          
          <div className="pt-4 mt-4 border-t border-white/5 space-y-4 px-4">
            <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 font-bold px-4">Ações</span>
            <div className="space-y-2">
              <PWAInstallButton />
            </div>
          </div>
        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full pb-32 md:pb-16 bg-dark-bg">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                user={user} 
                onNewTransaction={handleOpenNewModal} 
                onEditTransaction={handleOpenEditModal} 
                showValues={showValues}
                setShowValues={setShowValues}
                onRefresh={handleRefresh}
                onSeeAll={() => setActiveTab('transactions')}
              />
            )}
            {activeTab === 'transactions' && (
              <div className="bg-card-bg p-8 rounded-3xl border border-border-dark shadow-2xl">
                <TransactionsList user={user} onEdit={handleOpenEditModal} showValues={showValues} />
              </div>
            )}
            {activeTab === 'import' && (
              <div className="bg-card-bg p-10 rounded-3xl border border-border-dark shadow-2xl">
                <CSVImport user={user} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-components are typically in separate files, but I'll define a basic Dashboard here first to get things running
function Dashboard({ 
  user, 
  onNewTransaction, 
  onEditTransaction,
  showValues,
  setShowValues,
  onRefresh,
  onSeeAll
}: { 
  user: any, 
  onNewTransaction: () => void,
  onEditTransaction: (t: any) => void,
  showValues: boolean,
  setShowValues: (v: boolean) => void,
  onRefresh: () => void,
  onSeeAll: () => void
}) {
  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
        <div className="space-y-2">
          <h2 className="text-4xl font-sans font-bold text-white tracking-tight">
            Excelência, <span className="text-gold">{user.displayName?.split(' ')[0]}</span>
          </h2>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Gestão Patrimonial Consolidada</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onRefresh}
            className="p-3 rounded-full border border-border-dark text-zinc-500 hover:bg-white/5 hover:text-white transition-all duration-300"
            title="Atualizar Página"
          >
            <RefreshCcw size={16} />
          </button>
          <button 
            onClick={() => setShowValues(!showValues)}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-border-dark text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/5 transition-all duration-300 text-zinc-400"
          >
            {showValues ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{showValues ? "Privacidade Ativa" : "Exibir Dados"}</span>
          </button>
          <button 
            onClick={onNewTransaction}
            className="bg-gold hover:bg-gold-light text-black px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl shadow-gold/10 transition-all duration-500 transform hover:-translate-y-0.5"
          >
            <Plus size={16} className="inline mr-2" />
            Lançamento
          </button>
        </div>
      </header>

      <section className="space-y-12">
        <UpcomingAlerts user={user} onEdit={onEditTransaction} showValues={showValues} />
        <SummaryCards user={user} showValues={showValues} />
        <FutureProjection user={user} showValues={showValues} />
      </section>
    </div>
  );
}
