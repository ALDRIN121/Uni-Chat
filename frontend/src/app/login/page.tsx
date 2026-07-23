'use client';

import { AuthPage } from '@/components/AuthPage';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated, hasLLMConfig, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(hasLLMConfig ? '/chat' : '/settings?setup=1');
    }
  }, [isLoading, isAuthenticated, hasLLMConfig, router]);

  if (isLoading || isAuthenticated) return null;

  return <AuthPage />;
}
