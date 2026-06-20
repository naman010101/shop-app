'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-indigo-400">
      <div className="flex flex-col items-center gap-4">
        <TrendingUp className="w-12 h-12 animate-pulse text-indigo-500" />
        <h1 className="text-xl font-bold tracking-wider animate-pulse">CASHFLOW</h1>
        <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden">
          <div className="w-full h-full bg-indigo-500 rounded animate-[slide_1.5s_infinite_linear]"></div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
