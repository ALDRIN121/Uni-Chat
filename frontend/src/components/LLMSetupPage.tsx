'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader, Bot, CheckCircle2, XCircle } from 'lucide-react';
import { apiService } from '@/lib/api';

interface LLMSetupProps {
  onConfigured: () => void;
}

export const LLMSetupPage: React.FC<LLMSetupProps> = ({ onConfigured }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  
  const { toast } = useToast();

  // Debug: log when component mounts
  useEffect(() => {
    console.log('LLMSetupPage mounted - user does not have LLM config');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your GROQ API key',
      });
      return;
    }

    setIsLoading(true);
    setValidationStatus('validating');
    
    try {
      const result = await apiService.setupDefaultGroqConfig(apiKey);

      setValidationStatus('success');
      toast({
        title: 'Success',
        description: 'API key validated successfully! GROQ configuration saved.',
      });
      
      setTimeout(() => {
        onConfigured();
      }, 1000);
    } catch (error) {
      setValidationStatus('error');
      console.error('Setup error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('already has groq configuration') || error.message.includes('already configured')) {
          // User already has configuration - just trigger the config check
          toast({
            title: 'Already Configured',
            description: 'You already have a GROQ configuration. Redirecting to chat...',
          });
          setTimeout(() => {
            onConfigured();
          }, 1000);
          return;
        }
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
      case 'validating':
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    switch (validationStatus) {
      case 'validating':
        return <span className="text-blue-600">Validating API key with AI model...</span>;
      case 'success':
        return <span className="text-green-600">API key validated successfully!</span>;
      case 'error':
        return <span className="text-red-600">Validation failed. Please check your API key.</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Bot className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Setup Your AI Assistant</CardTitle>
          <CardDescription>
            Configure your GROQ API to start chatting with deepseek-r1-distill-llama-70b
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Debug info */}
            <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-700 border border-yellow-200">
              Debug: Showing setup because hasLLMConfig=false. Check browser console for details.
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">GROQ API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your GROQ API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  className={validationStatus === 'error' ? 'border-red-500' : ''}
                />
                <div className="absolute right-3 top-3">
                  {getValidationIcon()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your free API key from{' '}
                <a 
                  href="https://groq.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  groq.com
                </a>
              </p>
              {validationStatus !== 'idle' && (
                <div className="flex items-center gap-2 text-sm">
                  {getValidationMessage()}
                </div>
              )}
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Default Configuration:</p>
              <p className="text-xs text-muted-foreground mt-1">
                • Provider: GROQ<br/>
                • Model: deepseek-r1-distill-llama-70b<br/>
                • Temperature: 0 (Focused responses)
              </p>
            </div>
            {validationStatus === 'validating' && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  Testing your API key by sending a message to the AI model...
                </p>
              </div>
            )}
          </CardContent>
          <div className="px-6 pb-6 space-y-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {validationStatus === 'validating' 
                ? 'Validating API Key...' 
                : validationStatus === 'success'
                ? 'Configuration Saved!'
                : 'Validate & Save Configuration'
              }
            </Button>
            
            {/* Skip button for users who might already have config */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={onConfigured}
              disabled={isLoading}
            >
              Skip - I already have a configuration
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
