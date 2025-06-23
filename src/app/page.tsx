"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Send, Settings, User, Loader, Sparkles, Star, FileImage, Sun, Moon, Paperclip, Mic, MoreHorizontal, ChevronDown, MessageSquare, Headphones, Zap, Puzzle, Package, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { configureLlm } from '@/ai/flows/configure-llm-flow';
import { generateAiResponse } from '@/ai/flows/generate-ai-response';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ChatLayout = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: 'What are the best open opportunities by company size?',
    },
    {
      id: '2',
      role: 'assistant',
      content: `table`, // Special content type to render the table from the image
    },
  ]);
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

  useEffect(() => {
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

  const opportunityData = [
    { size: 'Startup (1-50 Employees)', opportunities: 'Flexible roles across various functions (Marketing, Sales, Product).\nEquity or stock ownership\nRapid career growth opportunities' },
    { size: 'Small Business (51-200 Employees)', opportunities: 'Roles with greater responsibility compared to larger companies\nOpportunity to shape business strategies\nFaster career advancement potential' },
    { size: 'Mid-Sized Company (201-1000 Employees)', opportunities: 'More stable structure with room for innovation\nAccess to better resources and mentorship\nHigher job security' },
  ];
  
  const iconSidebarItems = [
    { id: 'chat', icon: MessageSquare, tooltip: 'Chat' },
    { id: 'headphones', icon: Headphones, tooltip: 'Headphones' },
    { id: 'zap', icon: Zap, tooltip: 'Zap' },
    { id: 'puzzle', icon: Puzzle, tooltip: 'Puzzle' },
    { id: 'settings', icon: Settings, tooltip: 'Settings' },
    { id: 'package', icon: Package, tooltip: 'Package' },
    { id: 'users', icon: Users, tooltip: 'Users', badge: 'New' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Icon Sidebar */}
      <div className="flex flex-col items-center justify-between w-16 p-2 bg-muted/30 border-r">
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
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={toggleTheme}>
                {isDarkTheme ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Avatar>
                <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="profile picture" alt="User" />
                <AvatarFallback>S</AvatarFallback>
            </Avatar>
        </div>
      </div>
      
      {/* Chat List Sidebar */}
      {activeIcon === 'chat' && (
        <div className="w-80 flex flex-col border-r bg-background">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Chat</h2>
                    <Button variant="ghost" size="icon"><Search className="h-5 w-5" /></Button>
                </div>
                <Button className="w-full mt-4 bg-black text-white hover:bg-black/90" onClick={handleNewChat}>
                    <Plus className="mr-2 h-4 w-4" /> New Chat <Sparkles className="ml-auto h-4 w-4" />
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><Star className="h-4 w-4" /> Saved</h3>
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start gap-2">
                                <Avatar className="w-6 h-6 text-xs bg-blue-200 text-blue-800">C</Avatar>
                                <span>ChatrAI</span>
                                <MoreHorizontal className="h-4 w-4 ml-auto" />
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-2">
                                <FileImage className="h-4 w-4 text-muted-foreground" />
                                <span>Image of sun</span>
                                <MoreHorizontal className="h-4 w-4 ml-auto" />
                            </Button>
                            <Button variant="ghost" className="w-full justify-start gap-2">
                                <Avatar className="w-6 h-6 text-xs bg-purple-200 text-purple-800">D</Avatar>
                                <span>Data Analyst</span>
                                <MoreHorizontal className="h-4 w-4 ml-auto" />
                            </Button>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                            Today <ChevronDown className="h-4 w-4" />
                        </h3>
                        <div className="space-y-1">
                           <Button variant="ghost" className="w-full justify-start truncate">How can I improve my time managemen...</Button>
                           <Button variant="ghost" className="w-full justify-start truncate">What's the best way to learn a new skill...</Button>
                           <Button variant="ghost" className="w-full justify-start truncate">How do I start investing in stocks as a be...</Button>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                            Yesterday <ChevronDown className="h-4 w-4" />
                        </h3>
                        <div className="space-y-1">
                           <Button variant="ghost" className="w-full justify-start truncate">What are the benefits of daily exercise fo...</Button>
                           <Button variant="ghost" className="w-full justify-start truncate">What's the difference between a UI desi...</Button>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-col flex-1 h-screen overflow-hidden">
        <header className="flex items-center justify-between p-2 border-b z-10 bg-background">
            <div className="flex items-center gap-2">
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
                        <DropdownMenuItem onSelect={() => setIsConfigDialogOpen(true)}>
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
                                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                )}
                            >
                            {message.content === 'table' ? (
                                <>
                                    <p className="text-sm mb-4">Here's a detailed breakdown of the best opportunities by company size:</p>
                                    <Card>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                    <TableHead className="font-bold">Company Size</TableHead>
                                                    <TableHead className="font-bold">Best Opportunities</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {opportunityData.map((d, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">{d.size}</TableCell>
                                                            <TableCell className="whitespace-pre-line text-muted-foreground">{d.opportunities}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </>
                            ) : (
                                <p className="text-sm">{message.content}</p>
                            )}
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
              <div className="bg-card p-4 rounded-lg shadow-sm">
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
    </div>
  );
}


export default function Home() {
  return (
    <ChatLayout />
  );
}
