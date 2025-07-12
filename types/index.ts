// Core Types
export interface DemoSession {
  id: string;
  website: string;
  status: 'starting' | 'running' | 'paused' | 'ended';
  startTime: Date;
  endTime?: Date;
  transcript: TranscriptEntry[];
  actions: DemoAction[];
}

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  speaker: 'user' | 'ai';
  content: string;
  type: 'voice' | 'text' | 'action';
}

export interface DemoAction {
  id: string;
  timestamp: Date;
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'wait';
  selector?: string;
  text?: string;
  url?: string;
  coordinates?: { x: number; y: number };
  description: string;
  success: boolean;
}

export interface VoiceCommand {
  id: string;
  sessionId: string;
  command: string;
  timestamp: Date;
  processed: boolean;
  intent?: string;
  confidence?: number;
}

export interface AIResponse {
  id: string;
  sessionId: string;
  message: string;
  actions: DemoAction[];
  timestamp: Date;
  audioUrl?: string;
}

// Website Training Data
export interface WebsiteTrainingData {
  site: string;
  domain: string;
  category: string;
  description: string;
  commonActions: Record<string, ActionPattern>;
  uiPatterns: Record<string, string>;
  keyFeatures: string[];
  selectors: Record<string, string>;
  workflows: Workflow[];
}

export interface ActionPattern {
  selector: string;
  description: string;
  steps: string[];
  alternatives?: string[];
  waitFor?: string;
}

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  category: string;
}

export interface WorkflowStep {
  action: string;
  selector?: string;
  text?: string;
  description: string;
  waitFor?: string;
}

// UI Component Types
export interface VoiceInterfaceProps {
  onCommand: (command: string) => void;
  isListening: boolean;
  isProcessing: boolean;
  aiResponse?: string;
}

export interface ControlPanelProps {
  session: DemoSession | null;
  onStartDemo: (website: string) => void;
  onEndDemo: () => void;
  onPauseDemo: () => void;
}

// Server Types
export interface ServerConfig {
  port: number;
  corsOrigins: string[];
  openaiApiKey: string;
  browserConfig: BrowserConfig;
}

export interface BrowserConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  slowMo: number;
}

// Socket Events
export interface ClientToServerEvents {
  'start-demo': (data: { website: string; sessionId: string }) => void;
  'voice-command': (data: { command: string; sessionId: string }) => void;
  'pause-demo': (data: { sessionId: string }) => void;
  'end-demo': (data: { sessionId: string }) => void;
  'get-session': (data: { sessionId: string }) => void;
}

export interface ServerToClientEvents {
  'demo-started': (data: { sessionId: string; website: string }) => void;
  'ai-response': (data: AIResponse) => void;
  'browser-action': (data: DemoAction) => void;
  'demo-status': (data: { sessionId: string; status: DemoSession['status'] }) => void;
  'error': (data: { message: string; sessionId?: string }) => void;
  'session-data': (data: DemoSession) => void;
}

// Utility Types
export type DemoStatus = 'idle' | 'starting' | 'running' | 'paused' | 'ended' | 'error';

export interface PageElement {
  selector: string;
  text: string;
  type: string;
  visible: boolean;
  clickable: boolean;
  ariaLabel?: string;
  role?: string;
}

export interface SiteAnalysis {
  domain: string;
  title: string;
  description?: string;
  category: string;
  mainElements: PageElement[];
  navigationElements: PageElement[];
  actionableElements: PageElement[];
  keyFeatures: string[];
}

// This ensures the file is treated as a module
export {}; 