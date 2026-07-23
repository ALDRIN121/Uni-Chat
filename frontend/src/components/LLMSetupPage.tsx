'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, Bot, CheckCircle2, XCircle } from 'lucide-react';
import { apiService } from '@/lib/api';
import type { LLMProvider } from '@/lib/types';

interface LLMSetupProps {
  onConfigured: () => void;
}

export const LLMSetupPage: React.FC<LLMSetupProps> = ({ onConfigured }) => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');

  const { toast } = useToast();

  useEffect(() => {
    apiService.getLLMProviders().then(setProviders).catch(() => {});
  }, []);

  const currentProvider = providers.find(p => p.id === selectedProviderId);
  const models = currentProvider?.supported_models ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId || !selectedModel.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a provider and model',
      });
      return;
    }
    if (!apiKey.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your API key',
      });
      return;
    }

    setIsLoading(true);
    setValidationStatus('validating');

    try {
      await apiService.createLLMConfig({
        provider_id: selectedProviderId,
        model_name: selectedModel,
        api_key: apiKey,
        is_default: true,
      });

      setValidationStatus('success');
      toast({ title: 'Success', description: 'API key validated and saved!' });
      setTimeout(() => onConfigured(), 1000);
    } catch (error) {
      setValidationStatus('error');
      if (error instanceof Error && error.message.includes('already configured')) {
        toast({ title: 'Already Configured', description: 'Redirecting to chat...' });
        setTimeout(() => onConfigured(), 1000);
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: error instanceof Error ? error.message : 'Failed to validate API key',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating': return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Bot className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configure Your AI Provider</CardTitle>
          <CardDescription>
            Add an API key for any supported LLM provider
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Provider select */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedProviderId ?? ''}
                onChange={(e) => {
                  setSelectedProviderId(Number(e.target.value) || null);
                  setSelectedModel('');
                }}
                disabled={isLoading}
              >
                <option value="">Select a provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>

            {/* Model select */}
            {models.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <select
                  id="model"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Select a model...</option>
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={`Enter your ${currentProvider?.display_name ?? 'provider'} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  className={validationStatus === 'error' ? 'border-red-500' : ''}
                />
                <div className="absolute right-3 top-3">{getValidationIcon()}</div>
              </div>
            </div>

            {validationStatus === 'validating' && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Testing your API key by sending a message to the model...
                </p>
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {validationStatus === 'validating'
                ? 'Validating API Key...'
                : validationStatus === 'success'
                ? 'Configuration Saved!'
                : 'Validate & Save Configuration'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
