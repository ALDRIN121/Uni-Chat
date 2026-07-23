'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Deep-linked chat session — redirects to root (which handles session loading)
// until the extracted ChatWindow with session loading is complete (Task 3.2).
export default function ChatSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    if (id) localStorage.setItem('pending_session_id', id);
    router.replace('/');
  }, [id, router]);
  return null;
}
