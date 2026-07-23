'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/lib/api';
import { Loader, ArrowLeft } from 'lucide-react';
import type { LLMConfig } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

type Column = { config_id: number; model_name: string; tokens: string; done: boolean; error: string | null };

function CompareContent() {
  const router = useRouter();
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [prompt, setPrompt] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [busy, setBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => { apiService.getLLMConfigs().then(setConfigs).catch(() => {}); }, []);
  useEffect(() => () => { wsRef.current?.close(); }, []);

  const toggle = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const run = () => {
    if (!prompt.trim() || selectedIds.size === 0) return;
    setBusy(true);
    const ids = [...selectedIds];
    const cols: Column[] = ids.map(id => {
      const cfg = configs.find(c => c.id === id);
      return { config_id: id, model_name: cfg?.model_name ?? String(id), tokens: '', done: false, error: null };
    });
    setColumns(cols);

    const token = localStorage.getItem('access_token') ?? '';
    const base = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://localhost:8000';
    const ws = new WebSocket(`${base}/ws/compare?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ message: prompt, config_ids: ids }));
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setColumns(prev => prev.map(c => {
        if (c.config_id !== d.config_id) return c;
        if (d.token !== undefined) return { ...c, tokens: c.tokens + d.token };
        if (d.end) return { ...c, done: true };
        if (d.error) return { ...c, error: d.error, done: true };
        return c;
      }));
      if (d.end || d.error) {
        const stillRunning = ids.filter(id => {
          const col = columns.find(c => c.config_id === id);
          return col && !col.done && !col.error;
        });
        if (stillRunning.length - 1 === 0) setBusy(false);
      }
    };
    ws.onerror = () => setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Model Compare</h1>
      </header>
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Config selector */}
        <Card>
          <CardHeader><CardTitle>Select Models (2–4)</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {configs.map(c => (
              <Button
                key={c.id}
                variant={selectedIds.has(c.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggle(c.id)}
              >
                {c.model_name}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Prompt */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter a prompt to compare across models..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
          />
          <Button onClick={run} disabled={busy || selectedIds.size < 2}>
            {busy ? <Loader className="h-4 w-4 animate-spin" /> : 'Compare'}
          </Button>
        </div>

        {/* Results */}
        {columns.length > 0 && (
          <div className={`grid gap-4 grid-cols-1 ${columns.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {columns.map(col => (
              <Card key={col.config_id} className={col.error ? 'border-red-200' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {col.model_name}
                    {col.done && !col.error && <span className="text-xs text-green-500">✓</span>}
                    {col.error && <span className="text-xs text-red-500">✗</span>}
                    {!col.done && !col.error && <Loader className="h-3 w-3 animate-spin" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {col.error ? (
                    <p className="text-sm text-red-500">{col.error}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{col.tokens || 'Waiting...'}</ReactMarkdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return <AuthGuard><CompareContent /></AuthGuard>;
}
