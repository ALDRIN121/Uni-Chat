export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: string | number;
  title: string | null;
  messages?: Message[];
  created_at?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface LLMProvider {
  id: number;
  name: string;
  display_name: string;
  supported_models: string[];
  is_active: boolean;
}

export interface LLMConfig {
  id: number;
  user_id: number;
  provider_id: number;
  model_name: string;
  config_params: Record<string, any>;
  is_default: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

    