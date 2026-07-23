"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import { Bot, Plus, Send, Settings, User, Loader, Sun, Moon, Paperclip, Mic, ChevronDown, MessageSquare, Zap, Trash2, Menu, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Message, ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ReactMarkdown from 'react-markdown';
import { useChatStream } from '@/hooks/use-chat-stream';
import { useRef as useReactRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/lib/api';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-body',
});

const ChatLayout = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState<Array<{id: number; model_name: string; provider_id: number; is_default: boolean}>>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  
  // Keep refs in sync with state
  useEffect(() => { streamingMessageIdRef.current = streamingMessageId; }, [streamingMessageId]);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  const scrollAreaEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, logout, defaultLLMConfig } = useAuth();
  const router = useRouter();
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [activeIcon, setActiveIcon] = useState('chat');
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const inputRef = useReactRef<HTMLInputElement>(null);

  // For robust streaming, accumulate the full message in a ref
  const fullMessageRef = useRef('');

  const { startStream, stopStream } = useChatStream({
    onToken: (token) => {
      fullMessageRef.current += token;
      setStreamingMessage((prev) => (prev ?? '') + token);
    },
    onEnd: () => {
      const msgId = streamingMessageIdRef.current;
      const sessionId = activeSessionIdRef.current;
      if (msgId && fullMessageRef.current && sessionId) {
        const aiMessage = {
          id: msgId,
          role: 'assistant' as const,
          content: fullMessageRef.current,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setChatSessions((prev) => prev.map(s =>
          s.id.toString() === sessionId
            ? { ...s, messages: [...(s.messages || []), aiMessage] }
            : s
        ));
      }
      setStreamingMessage(null);
      setStreamingMessageId(null);
      fullMessageRef.current = '';
      setIsLoading(false);
      inputRef.current?.focus();
    },
    onError: (err) => {
      setStreamingMessage(null);
      setStreamingMessageId(null);
      fullMessageRef.current = '';
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Streaming Error',
        description: String(err),
      });
    },
    onTitle: (title) => {
      const sid = activeSessionIdRef.current;
      if (sid) {
        setChatSessions(prev => prev.map(s =>
          s.id.toString() === sid ? { ...s, title } : s
        ));
      }
    },
  });

  // Optionally allow aborting a stream (e.g., on new user message or user action)
  const abortStream = () => {
    stopStream();
    setStreamingMessage(null);
    setStreamingMessageId(null);
    setIsLoading(false);
  };

  // Example: abort stream if user sends a new message while streaming
  useEffect(() => {
    if (!isLoading) return;
    return () => {
      abortStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  useEffect(() => {
    // Load user's LLM configs
    const loadConfigs = async () => {
      try {
        const cfgs = await apiService.getLLMConfigs();
        setConfigs(cfgs);
        if (!selectedConfigId) {
          const def = cfgs.find((c: { is_default: boolean }) => c.is_default) ?? cfgs[0];
          if (def) setSelectedConfigId(def.id);
        }
      } catch { /* ignore */ }
    };
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Load user's chat sessions from the API
    const loadChatSessions = async () => {
      try {
        const sessions = await apiService.getChatSessions();
        setChatSessions(sessions);
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load chat sessions',
        });
      }
    };

    loadChatSessions();
    
    const root = window.document.documentElement;
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      setIsDarkTheme(true);
    } else {
      root.classList.remove('dark');
      setIsDarkTheme(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isMobile) {
        setIsMobileSidebarOpen(false);
    }
  }, [isMobile, activeIcon]);

  useEffect(() => {
    scrollAreaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.toggle('dark');
    if (root.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
      setIsDarkTheme(true);
    } else {
      localStorage.setItem('theme', 'light');
      setIsDarkTheme(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');
    fullMessageRef.current = '';
    const aiMessageId = crypto.randomUUID();
    setStreamingMessageId(aiMessageId);
    streamingMessageIdRef.current = aiMessageId;

    let sessionToUpdateId = activeSessionId;

    try {
      if (!sessionToUpdateId) {
        // Create a new session using user's default LLM config
        if (!defaultLLMConfig) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No LLM configuration found',
          });
          setIsLoading(false);
          return;
        }

        const configId = selectedConfigId ?? defaultLLMConfig.id;
        const newSession = await apiService.createChatSession({
          llm_config_id: configId,
          title: currentInput.slice(0, 50) + (currentInput.length > 50 ? '...' : ''),
        });
        
        const sessionWithMessages: ChatSession = {
          ...newSession,
          messages: [userMessage],
        };
        
        setChatSessions(prev => [sessionWithMessages, ...prev]);
        setActiveSessionId(newSession.id.toString());
        activeSessionIdRef.current = newSession.id.toString();
        sessionToUpdateId = newSession.id.toString();
      } else {
        // Update existing session
        setChatSessions(prev => prev.map(s => 
          s.id.toString() === sessionToUpdateId 
            ? { ...s, messages: newMessages }
            : s
        ));
        activeSessionIdRef.current = sessionToUpdateId;
      }

      // Start streaming the response
      startStream(sessionToUpdateId, currentInput);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message',
      });
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await apiService.deleteChatSession(id);
      setChatSessions(prev => prev.filter(s => s.id.toString() !== id));
      if (activeSessionId === id) handleNewChat();
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' }); }
  };

  const handleRenameSession = async (id: string) => {
    const title = prompt('New name:');
    if (!title) return;
    try {
      await apiService.renameChatSession(id, title);
      setChatSessions(prev => prev.map(s => s.id.toString() === id ? { ...s, title } : s));
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'Failed to rename' }); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSessionId) return;
    const form = new FormData();
    form.append('file', file);
    form.append('session_id', activeSessionId);
    try {
      const token = localStorage.getItem('access_token') ?? '';
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
      const resp = await fetch(`${base}/documents/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      if (!resp.ok) throw new Error('Upload failed');
      await resp.json();
      toast({ title: 'Document uploaded', description: `${file.name} — processing...` });
    } catch { toast({ variant: 'destructive', title: 'Upload failed' }); }
    e.target.value = '';
  };

  const handleSessionSelect = async (sessionId: string | number) => {
    const sessionIdStr = sessionId.toString();
    const session = chatSessions.find(s => s.id.toString() === sessionIdStr);
    if (session) {
      setActiveSessionId(sessionIdStr);
      
      // If session doesn't have messages loaded, fetch them
      if (!session.messages || session.messages.length === 0) {
        try {
          const messages = await apiService.getSessionMessages(sessionIdStr);
          setMessages(messages);
          
          // Update the session in the list to include the loaded messages
          setChatSessions(prev => prev.map(s => 
            s.id.toString() === sessionIdStr
              ? { ...s, messages }
              : s
          ));
        } catch (error) {
          console.error('Failed to load messages:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load messages',
          });
        }
      } else {
        setMessages(session.messages);
      }
    }
  };
  
  const iconSidebarItems = [
    { id: 'chat', icon: MessageSquare, tooltip: 'Chat' },
    { id: 'compare', icon: Zap, tooltip: 'Compare' },
    { id: 'settings', icon: Settings, tooltip: 'Settings' },
  ];
  
  const sidebarContent = (
    <div className="flex h-full">
      {/* Icon Sidebar */}
      <div className="flex flex-col items-center justify-between w-16 p-2 bg-muted/30 border-r h-full">
        <div className="flex flex-col items-center gap-2">
            <Avatar className="h-10 w-10 mb-4 bg-gradient-to-br from-blue-400 to-indigo-600" />
            {iconSidebarItems.map((item) => (
                <Button
                key={item.id}
                variant="ghost"
                size="icon"
                className={cn(
                    'h-10 w-10 rounded-lg relative',
                    activeIcon === item.id && 'bg-black text-white hover:bg-black/90 hover:text-white'
                )}
                onClick={() => {
                  if (item.id === 'settings') { router.push('/settings'); return; }
                  if (item.id === 'compare') { router.push('/compare'); return; }
                  setActiveIcon(item.id);
                }}
                >
                <item.icon className="h-5 w-5" />
                </Button>
            ))}
        </div>
        <div className="flex flex-col items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="profile picture" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                <DropdownMenuLabel>
                  {user?.username || 'User'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDarkTheme ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{isDarkTheme ? "Light Mode" : "Dark Mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleNewChat}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Clear conversations</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      
      {/* Chat List Sidebar */}
      {activeIcon === 'chat' && (
        <div className="w-64 flex flex-col border-r bg-background h-full">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Uni Chat</h2>
                    <Button variant="ghost" size="icon" onClick={handleNewChat}><Plus className="h-5 w-5" /></Button>
                </div>
                <div className="relative mt-4">
                  <Input placeholder="Search..." className="pl-8" />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                     <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                            Recent <ChevronDown className="h-4 w-4" />
                        </h3>
                        <div className="space-y-1">
                          {chatSessions.map((session) => (
                            <div key={session.id} className="group flex items-center gap-0.5">
                              <Button
                                variant={activeSessionId === session.id.toString() ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => handleSessionSelect(session.id)}
                                onDoubleClick={() => handleRenameSession(session.id.toString())}
                              >
                                <span className="flex-1 text-left min-w-0 truncate">{session.title || 'New Chat'}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id.toString()); }}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
      )}
      </div>
  );

  return (
    <div className={`font-body antialiased h-full ${inter.variable}`}>
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <div className="flex h-screen bg-background text-foreground">
          <div className="hidden md:flex h-full">
            {sidebarContent}
          </div>

          <main className="flex flex-col flex-1 h-screen overflow-hidden">
            <header className="flex items-center justify-between p-2 border-b z-10 bg-background">
                <div className="flex items-center gap-2">
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="text-lg font-semibold">
                              {configs.find(c => c.id === selectedConfigId)?.model_name ?? defaultLLMConfig?.model_name ?? 'No Model'}
                                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Select Model</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {configs.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onSelect={() => setSelectedConfigId(c.id)}
                              >
                                {c.model_name}{c.is_default ? ' (default)' : ''}
                              </DropdownMenuItem>
                            ))}
                            {configs.length === 0 && (
                              <DropdownMenuItem disabled>
                                No configurations yet
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setSelectedConfigId(null)}>
                              Use default config
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="space-y-8 w-full mx-auto p-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
                            <Avatar className="h-16 w-16 mb-4 bg-gradient-to-br from-blue-400 to-indigo-600" />
                            <h2 className="text-2xl font-semibold text-foreground">How can I help you today?</h2>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                'flex items-start gap-4 w-full',
                                message.role === 'user' ? 'justify-end' : ''
                                )}
                            >
                                {message.role === 'assistant' && (
                                    <Avatar>
                                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={cn(
                                        'w-full rounded-2xl p-4',
                                        message.role === 'user' && 'bg-primary text-primary-foreground',
                                        message.role === 'assistant' && 'bg-card text-card-foreground'
                                    )}
                                >
                                    <div className="prose prose-sm dark:prose-invert">
                                      <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                </div>
                                {message.role === 'user' && (
                                    <Avatar>
                                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))
                    )}
                    {isLoading && streamingMessage !== null && (
                      <div className="flex items-start gap-4">
                        <Avatar>
                            <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl p-4 flex items-center space-x-2">
                          <div className="prose prose-sm dark:prose-invert">
                            <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                          </div>
                          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                          <Button size="sm" variant="ghost" onClick={abortStream} className="ml-2">Stop</Button>
                        </div>
                      </div>
                    )}
                      <div ref={scrollAreaEndRef} />
                  </div>
                </ScrollArea>

                <footer className="p-4 w-full max-w-4xl mx-auto">
                  <div className="bg-card p-4 rounded-3xl shadow-sm">
                      <form onSubmit={handleSendMessage} className="relative">
                          <Input
                              ref={inputRef}
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Ask me anything..."
                              disabled={isLoading}
                              autoComplete="off"
                              className="pl-4 pr-32 h-12 rounded-full bg-background"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => document.getElementById('file-upload')?.click()}>
                                <Paperclip className="h-5 w-5" />
                              </Button>
                              <input id="file-upload" type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} />
                          <Button type="button" variant="ghost" size="icon"><Mic className="h-5 w-5" /></Button>
                              <Button type="submit" disabled={isLoading || !input.trim()} size="icon" aria-label="Send Message" className="bg-primary rounded-full h-8 w-8">
                                  <Send className="h-4 w-4" />
                              </Button>
                          </div>
                      </form>
                      <div className="flex justify-center items-center mt-2 px-4">
                          <p className="text-xs text-muted-foreground">Uni Chat may display inaccurate info. Your Privacy & Orbita GPT</p>
                      </div>
                  </div>
                </footer>
            </div>
          </main>
        </div>

        <SheetContent side="left" className="p-0 flex gap-0 md:hidden w-[320px]">
            {sidebarContent}
        </SheetContent>
      </Sheet>
    </div>
  );
}


export default function Home() {
  const { isAuthenticated, isLoading, hasLLMConfig } = useAuth();
  const router = useRouter();

  // Route redirects: unauthenticated → /login, no config → /settings
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!hasLLMConfig) {
        router.replace('/settings?setup=1');
      }
    }
  }, [isLoading, isAuthenticated, hasLLMConfig, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !hasLLMConfig) {
    return null; // redirecting via useEffect
  }

  return <ChatLayout />;
}



