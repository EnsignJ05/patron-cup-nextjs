'use client';
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import { fetchAuthProfileByUserId } from '@/lib/repositories/auth';
import type { PlayerRole } from '@/types/database';

type UserRole = PlayerRole | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  mustChangePassword: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      if (!user) {
        if (isMounted) setRole(null);
        if (isMounted) setMustChangePassword(false);
        return;
      }

      const { data, error } = await fetchAuthProfileByUserId(supabase, user.id);

      if (!isMounted) return;
      if (error) {
        setRole(null);
        setMustChangePassword(false);
        return;
      }

      setRole(data?.role ?? null);
      setMustChangePassword(data?.mustChangePassword ?? false);
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [supabase, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, mustChangePassword, loading, signOut }}>
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