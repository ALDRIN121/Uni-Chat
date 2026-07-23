'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import type { LLMProvider, LLMConfig } from '@/lib/types';
import { Loader, Check } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logout } = useAuth();
  const { toast } = useToast();
  const isSetup = searchParams.get('setup') === '1';

  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentProvider = providers.find(p => p.id === selectedProviderId);
  const models = currentProvider?.supported_models ?? [];

  useEffect(() => {
    apiService.getLLMProviders().then(setProviders).catch(() => {});
    apiService.getLLMConfigs().then(setConfigs).catch(() => {});
  }, []);

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !selectedModel || !apiKey.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Fill all fields' });
      return;
    }
    setIsLoading(true);
    try {
      await apiService.createLLMConfig({
        provider_id: selectedProviderId,
        model_name: selectedModel,
        api_key: apiKey,
        is_default: configs.length === 0,
      });
      toast({ title: 'Success', description: 'Provider configured' });
      setApiKey('');
      setSelectedModel('');
      const updated = await apiService.getLLMConfigs();
      setConfigs(updated);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>Back to Chat</Button>
          <Button variant="ghost" onClick={logout}>Logout</Button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6 space-y-8">
        {isSetup && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-sm">Add an API key for a supported LLM provider to start chatting.</p>
            </CardContent>
          </Card>
        )}

        {/* Add provider form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Provider Configuration</CardTitle>
            <CardDescription>API keys are encrypted at rest</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddConfig} className="space-y-4">
              <div>
                <Label htmlFor="s-provider">Provider</Label>
                <select id="s-provider" className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedProviderId ?? ''}
                  onChange={(e) => { setSelectedProviderId(Number(e.target.value) || null); setSelectedModel(''); }}
                  disabled={isLoading}>
                  <option value="">Select...</option>
                  {providers.map(p => (<option key={p.id} value={p.id}>{p.display_name}</option>))}
                </select>
              </div>
              {models.length > 0 && (
                <div>
                  <Label htmlFor="s-model">Model</Label>
                  <select id="s-model" className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} disabled={isLoading}>
                    <option value="">Select...</option>
                    {models.map(m => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              )}
              <div>
                <Label htmlFor="s-apikey">API Key</Label>
                <Input id="s-apikey" type="password" placeholder="sk-..." value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)} disabled={isLoading} />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                Validate & Save
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing configs */}
        <Card>
          <CardHeader>
            <CardTitle>Your Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            {configs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No configurations yet.</p>
            ) : (
              <ul className="space-y-2">
                {configs.map(c => (
                  <li key={c.id} className="flex items-center justify-between p-2 rounded-md border">
                    <span className="text-sm">
                      {c.model_name}
                      {c.is_default && <Check className="inline h-3 w-3 ml-1 text-green-500" />}
                    </span>
                    <span className="text-xs text-muted-foreground">provider #{c.provider_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return <AuthGuard><SettingsContent /></AuthGuard>;
}
