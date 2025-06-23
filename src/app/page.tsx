
"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Inter } from 'next/font/google';
import { Bot, Plus, Send, Settings, User, Loader, Sun, Moon, Paperclip, Mic, ChevronDown, MessageSquare, Headphones, Zap, Puzzle, Package, Users, Trash2, Menu, Search } from 'lucide-react';
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
import { generateAiResponse } from '@/ai/flows/generate-ai-response';
import type { Message, ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const ConfigDialog = dynamic(() => import('@/components/config-dialog').then((mod) => mod.ConfigDialog));

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-body',
});

const sampleSessions: ChatSession[] = [
  {
    id: 'session-1',
    title: 'How can I improve my time management skills?',
    messages: [
      { id: '1a', role: 'user', content: 'How can I improve my time management skills?' },
      { id: '1b', role: 'assistant', content: 'You can start by using techniques like the Pomodoro Technique, creating a prioritized to-do list, and setting clear goals.' },
    ],
  },
  {
    id: 'session-2',
    title: "What's the best way to learn a new skill?",
    messages: [
      { id: '2a', role: 'user', content: "What's the best way to learn a new skill?" },
      { id: '2b', role: 'assistant', content: 'To learn a new skill effectively, try breaking it down into smaller parts, practicing consistently, and seeking feedback from experts.' },
    ],
  },
  {
    id: 'session-3',
    title: 'How do I start investing in stocks as a beginner?',
    messages: [
        { id: '3a', role: 'user', content: 'How do I start investing in stocks as a beginner?' },
        { id: '3b', role: 'assistant', content: 'As a beginner, you can start by opening a brokerage account, researching index funds or ETFs, and starting with a small investment to learn the ropes.' },
    ],
  },
  {
    id: 'session-4',
    title: 'What are the benefits of daily exercise for mental health?',
    messages: [
      { id: '4a', role: 'user', content: 'What are the benefits of daily exercise for mental health?' },
      { id: '4b', role: 'assistant', content: 'Daily exercise can reduce symptoms of depression and anxiety, improve mood, boost self-esteem, and enhance cognitive function.' },
    ]
  },
  {
    id: 'session-5',
    title: "What's the difference between a UI designer and a UX designer?",
    messages: [
      { id: '5a', role: 'user', content: "What's the difference between a UI designer and a UX designer?" },
      { id: '5b', role: 'assistant', content: 'A UI (User Interface) designer focuses on the visual aspects of a product, like colors and layouts. A UX (User Experience) designer focuses on the overall feel of the product, including usability and user research.' },
    ]
  }
];

const ChatLayout = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('Orbita GPT');
  const scrollAreaEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [activeIcon, setActiveIcon] = useState('chat');
  const isMobile = useIsMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setChatSessions(sampleSessions);
    const storedApiKey = localStorage.getItem('uni-chat-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setApiKeyInput(storedApiKey);
    }
    
    const root = window.document.documentElement;
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      setIsDarkTheme(true);
    } else {
      root.classList.remove('dark');
      setIsDarkTheme(false);
    }
  }, []);

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

  const handleConfigureLlm = async () => {
    if (!apiKeyInput) {
      toast({
        variant: 'destructive',
        title: 'API Key is required',
        description: 'Please enter your API key to continue.',
      });
      return;
    }

    setApiKey(apiKeyInput);
    localStorage.setItem('uni-chat-api-key', apiKeyInput);
    toast({
      title: 'Success',
      description: 'API Key saved successfully.',
    });
    setIsConfigDialogOpen(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      toast({
        variant: 'destructive',
        title: 'API Key not configured',
        description: 'Please configure your API key in the settings.',
      });
      setIsConfigDialogOpen(true);
      return;
    }

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    let sessionToUpdateId = activeSessionId;
    let isNewSession = false;

    if (!sessionToUpdateId) {
        isNewSession = true;
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: currentInput,
            messages: [userMessage],
        };
        setChatSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        sessionToUpdateId = newSession.id;
    } else {
        setChatSessions(prev => prev.map(s => s.id === sessionToUpdateId ? { ...s, messages: newMessages } : s));
    }

    try {
      const result = await generateAiResponse({ message: currentInput });
      const aiMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: result.response };
      
      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);

      setChatSessions(prev => prev.map(s => s.id === sessionToUpdateId ? { ...s, messages: finalMessages } : s));

    } catch (error) {
      console.error(error);
      setMessages(messages);
      if (isNewSession) {
          setChatSessions(prev => prev.filter(s => s.id !== sessionToUpdateId));
          setActiveSessionId(null);
      } else {
          setChatSessions(prev => prev.map(s => s.id === sessionToUpdateId ? { ...s, messages } : s));
      }
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
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleSessionSelect = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
    }
  };
  
  const iconSidebarItems = [
    { id: 'chat', icon: MessageSquare, tooltip: 'Chat' },
    { id: 'headphones', icon: Headphones, tooltip: 'Headphones' },
    { id: 'zap', icon: Zap, tooltip: 'Zap' },
    { id: 'puzzle', icon: Puzzle, tooltip: 'Puzzle' },
    { id: 'settings', icon: Settings, tooltip: 'Settings' },
    { id: 'package', icon: Package, tooltip: 'Package' },
    { id: 'users', icon: Users, tooltip: 'Users', badge: 'New' },
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
                onClick={() => setActiveIcon(item.id)}
                >
                <item.icon className="h-5 w-5" />
                {item.badge && (
                    <span className="absolute -top-1 -right-2 block h-4 w-auto min-w-[1rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] text-white">
                        {item.badge}
                    </span>
                )}
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
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDarkTheme ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{isDarkTheme ? "Light Mode" : "Dark Mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleNewChat}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Clear conversations</span>
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
                            <Button
                              key={session.id}
                              variant={activeSessionId === session.id ? "secondary" : "ghost"}
                              className="w-full justify-start"
                              onClick={() => handleSessionSelect(session.id)}
                            >
                              <span className="flex-1 text-left min-w-0 truncate">{session.title}</span>
                            </Button>
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
                                {model}
                                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Select Model</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setModel('Orbita GPT')}>Orbita GPT</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setModel('GPT-4')}>GPT-4</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setModel('Gemini Pro')}>Gemini Pro</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsConfigDialogOpen(true)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Configuration
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="space-y-8 max-w-4xl mx-auto p-6">
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
                                'flex items-start gap-4',
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
                                        'max-w-2xl rounded-2xl p-4',
                                        message.role === 'user' && 'bg-primary text-primary-foreground',
                                        message.role === 'assistant' && 'bg-card text-card-foreground'
                                    )}
                                >
                                <p className="text-sm">{message.content}</p>
                                </div>
                                {message.role === 'user' && (
                                    <Avatar>
                                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))
                    )}
                    {isLoading && (
                      <div className="flex items-start gap-4">
                        <Avatar>
                            <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl p-4 flex items-center space-x-2">
                          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
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
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Ask me anything..."
                              disabled={isLoading}
                              autoComplete="off"
                              className="pl-4 pr-32 h-12 rounded-full bg-background"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <Button type="button" variant="ghost" size="icon"><Paperclip className="h-5 w-5" /></Button>
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

      {isConfigDialogOpen && (
        <ConfigDialog
            open={isConfigDialogOpen}
            onOpenChange={setIsConfigDialogOpen}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            handleConfigureLlm={handleConfigureLlm}
        />
      )}
    </div>
  );
}


export default function Home() {
  return (
    <ChatLayout />
  );
}

    
    
