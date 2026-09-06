'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Check for redirect result on mount
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect sign in error:', error);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      // Set a flag to prevent multiple clicks if needed, but Firebase handles some of this
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.code === 'auth/popup-blocked') {
        // Fallback to redirect if popup is blocked
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          alert('Erro ao redirecionar para login: ' + redirectError.message);
        }
      } else if (error.code === 'auth/cancelled-popup-request') {
        // This usually means a previous popup was still pending.
        // We can ignore it or tell the user to wait.
        console.warn('Uma requisição de login já estava em andamento.');
      } else if (error.code === 'auth/unauthorized-domain') {
        alert('Este domínio não está autorizado no Firebase. Adicione o seu domínio atual em: Console do Firebase > Authentication > Settings > Authorized Domains.');
      } else {
        alert('Erro ao entrar com Google: ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
