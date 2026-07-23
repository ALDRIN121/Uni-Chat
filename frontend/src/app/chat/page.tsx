'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Temporarily redirects to root (which has the full ChatLayout) until
// the extracted ChatWindow component is complete (Task 3.2).
export default function ChatPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}
