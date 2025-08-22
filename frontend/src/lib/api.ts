import { AuthTokens, LoginRequest, RegisterRequest, User, LLMProvider, LLMConfig, ChatSession } from './types';

const API_BASE_URL = 'http://localhost:8000';

class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const tokens = await response.json();
    localStorage.setItem('access_token', tokens.access_token);
    return tokens;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    
    return response.json();
  }

  logout() {
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // LLM Providers
  async getLLMProviders(): Promise<LLMProvider[]> {
    const response = await fetch(`${API_BASE_URL}/users/llm-providers`);
    if (!response.ok) throw new Error('Failed to fetch LLM providers');
    return response.json();
  }

  // LLM Configurations
  async getLLMConfigs(): Promise<LLMConfig[]> {
    const response = await fetch(`${API_BASE_URL}/users/me/llm-configs`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch LLM configurations');
    return response.json();
  }

  async createLLMConfig(config: {
    provider_id: number;
    model_name: string;
    api_key?: string;
    config_params?: Record<string, any>;
    is_default?: boolean;
  }): Promise<LLMConfig> {
    const response = await fetch(`${API_BASE_URL}/users/me/llm-configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to create LLM configuration');
    return response.json();
  }

  // Check if user has LLM configuration
  async checkUserHasLLMConfig(): Promise<{ has_config: boolean; default_config?: LLMConfig }> {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }
    
    const response = await fetch(`${API_BASE_URL}/users/me/has-llm-config`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('access_token');
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to check LLM configuration');
    }
    return response.json();
  }

  // Setup default GROQ configuration
  async setupDefaultGroqConfig(apiKey: string): Promise<LLMConfig> {
    const response = await fetch(`${API_BASE_URL}/users/me/setup-default-groq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!response.ok) {
      const error = await response.json();
      // Handle validation errors with more specific messages
      if (error.detail && typeof error.detail === 'object' && error.detail.message) {
        throw new Error(error.detail.message);
      }
      throw new Error(error.detail || 'Failed to setup GROQ configuration');
    }
    return response.json();
  }

  // Chat Sessions
  async getChatSessions(): Promise<ChatSession[]> {
    const response = await fetch(`${API_BASE_URL}/users/me/chat-sessions`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chat sessions');
    return response.json();
  }

  async createChatSession(session: {
    llm_config_id: number;
    title?: string;
  }): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(session),
    });
    if (!response.ok) throw new Error('Failed to create chat session');
    return response.json();
  }

  async getSessionMessages(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch session messages');
    return response.json();
  }

  // WebSocket connection for chat
  createChatWebSocket(sessionId: string | number): WebSocket {
    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://localhost:8000/ws/chat/${sessionId}`;
    return new WebSocket(wsUrl);
  }
}

export const apiService = new ApiService();
