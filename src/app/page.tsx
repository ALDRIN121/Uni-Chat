"use client";

import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, Send, Settings, User, Loader, Sparkles, Search, Star, FileImage, Sun, Moon, Share2, Paperclip, Mic, MoreHorizontal } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { configureLlm } from '@/ai/flows/configure-llm-flow';
import { generateAiResponse } from '@/ai/flows/generate-ai-response';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarSeparator } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Home() {
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
  const scrollAreaEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isDarkTheme, setIsDarkTheme] = useState(true);

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
  
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar className="w-80 border-r bg-sidebar text-sidebar-foreground p-2" collapsible="icon">
          <SidebarHeader className="p-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    C
                </Avatar>
                <span className="font-semibold text-lg">Chat</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-0">
             <SidebarMenu className="p-2">
                <SidebarMenuItem>
                    <SidebarMenuButton className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" onClick={handleNewChat}>
                        <Plus className="h-4 w-4" />
                        New Chat
                        <Sparkles className="h-4 w-4 ml-auto" />
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
            <SidebarGroup className="p-2">
              <SidebarGroupLabel className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                <Star className="h-3 w-3" /> Saved
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>
                       <Avatar className="w-6 h-6 text-xs bg-blue-200 text-blue-800">C</Avatar>
                       <span>ChatrAI</span>
                       <MoreHorizontal className="h-4 w-4 ml-auto" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                       <span>Image of sun</span>
                       <MoreHorizontal className="h-4 w-4 ml-auto" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton>
                       <Avatar className="w-6 h-6 text-xs bg-purple-200 text-purple-800">D</Avatar>
                       <span>Data Analyst</span>
                       <MoreHorizontal className="h-4 w-4 ml-auto" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

             <SidebarGroup className="p-2">
              <SidebarGroupLabel className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                Today
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                       <span className="truncate">How can I improve my time managemen...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton>
                       <span className="truncate">What's the best way to learn a new skill...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                       <span className="truncate">How do I start investing in stocks as a be...</span>
                       <MoreHorizontal className="h-4 w-4 ml-auto" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="p-2">
              <SidebarGroupLabel className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                Yesterday
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                       <span className="truncate">What are the benefits of daily exercise fo...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton>
                       <span className="truncate">What's the difference between a UI desi...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2 mt-auto">
            <SidebarSeparator />
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={toggleTheme}>
                        {isDarkTheme ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        <span>{isDarkTheme ? 'Dark Mode' : 'Light Mode'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Button variant="outline" className="w-full justify-start h-auto py-2">
                      <div className="flex flex-col items-start">
                        <span>Upgrade to Pro</span>
                        <span className="text-xs text-muted-foreground">Get more features</span>
                      </div>
                    </Button>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton>
                        <Avatar className="w-8 h-8">
                            <AvatarImage data-ai-hint="profile picture" src="https://placehold.co/40x40.png" alt="@shadcn" />
                            <AvatarFallback>S</AvatarFallback>
                        </Avatar>
                        <span>My Profile</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Orbita GPT</h2>
              <Badge variant="outline">Plus</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <div className="space-y-8 max-w-4xl mx-auto p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-start gap-4',
                    message.role === 'user' && 'justify-end'
                  )}
                >
                  {message.role === 'user' && (
                    <div className="flex flex-col items-end">
                      <div
                        className={cn(
                          'max-w-2xl rounded-2xl p-4 bg-muted'
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  )}
                  {message.role === 'assistant' && (
                     <div className="flex flex-col gap-2 w-full">
                       {message.content !== 'table' && <p className="text-sm text-muted-foreground">{message.content}</p>}
                       {message.content === 'table' && (
                        <>
                          <p className="text-sm">Here's a detailed breakdown of the best opportunities by company size:</p>
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
                       )}
                     </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-4">
                  <div className="bg-muted rounded-2xl rounded-bl-none p-4 flex items-center space-x-2">
                    <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
               <div ref={scrollAreaEndRef} />
            </div>
          </ScrollArea>

          <footer className="p-4 border-t w-full max-w-4xl mx-auto">
            <div className="bg-card p-4 rounded-lg shadow-sm">
                <form onSubmit={handleSendMessage} className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything..."
                        disabled={isLoading}
                        autoComplete="off"
                        className="pl-10 pr-40 h-12 rounded-full bg-background"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon"><Paperclip className="h-5 w-5" /></Button>
                        <Button type="button" variant="ghost" size="icon"><Mic className="h-5 w-5" /></Button>
                        <Button type="submit" disabled={isLoading || !input.trim()} size="icon" aria-label="Send Message" className="bg-primary rounded-full h-8 w-8">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
                <div className="flex justify-between items-center mt-2 px-4">
                    <Button variant="outline" size="sm">Select Source</Button>
                    <p className="text-xs text-muted-foreground">Centra may display inaccurate info, so please double check the response. <a href="#" className="underline">Your Privacy & Orbita GPT</a></p>
                </div>
            </div>
          </footer>
        </div>
      </div>

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
    </SidebarProvider>
  );
}
