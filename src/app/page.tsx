"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, PlusCircle, Send, Settings, User, Loader, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { configureLlm } from '@/ai/flows/configure-llm-flow';
import { generateAiResponse } from '@/ai/flows/generate-ai-response';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedApiKey = localStorage.getItem('uni-chat-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setApiKeyInput(storedApiKey);
    }
  }, []);

  useEffect(() => {
    scrollAreaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleConfigureLlm = async () => {
    if (!apiKeyInput) {
      toast({
        variant: 'destructive',
        title: 'API Key is required',
        description: 'Please enter your API key to continue.',
      });
      return;
    }

    const result = await configureLlm({ apiKey: apiKeyInput });
    if (result.success) {
      setApiKey(apiKeyInput);
      localStorage.setItem('uni-chat-api-key', apiKeyInput);
      toast({
        title: 'Success',
        description: result.message,
      });
      setIsConfigDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Configuration Failed',
        description: result.message,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const result = await generateAiResponse({ message: currentInput });
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const userMessages = messages.filter(m => m.id !== userMessage.id);
      setMessages(userMessages);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get a response from the AI.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  const ChatInterface = () => (
    <div className="flex flex-col h-full bg-card shadow-lg rounded-xl overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold font-headline">Uni Chat</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleNewChat} aria-label="New Chat">
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsConfigDialogOpen(true)} aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground pt-16 flex flex-col items-center gap-4">
               <Bot size={48} className="text-primary/50" />
              <p>Hello! How can I help you today?</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-4',
                  message.role === 'user' && 'justify-end'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/20">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl p-4',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted rounded-bl-none'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-start gap-4">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-none p-4 flex items-center space-x-2">
                <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
           <div ref={scrollAreaEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            autoComplete="off"
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" aria-label="Send Message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  const WelcomeScreen = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Card className="max-w-md p-8 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <Sparkles className="h-16 w-16 text-primary" />
          <h1 className="text-3xl font-bold font-headline">Welcome to Uni Chat</h1>
          <p className="text-muted-foreground">
            A minimal, universal chat interface for any LLM.
          </p>
          <Button className="mt-6" onClick={() => setIsConfigDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Configure API Key
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <main className="h-full p-4 md:p-6 lg:p-8 bg-background text-foreground flex items-center justify-center">
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure LLM</DialogTitle>
            <DialogDescription>
              Enter your API key to connect to your Large Language Model. Your key is stored only in your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="apiKey"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Your API Key"
              type="password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfigureLlm}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="w-full h-full max-w-4xl mx-auto">
        {apiKey ? <ChatInterface /> : <WelcomeScreen />}
      </div>
    </main>
  );
}
