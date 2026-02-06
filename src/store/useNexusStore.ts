// Nexus Desktop Store - Aligned with CLI state management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import {
  NexusStatus, SwarmTask, ChatMessage, Agent,
  MemoryStats, WatcherStatus, UserSettings,
  ConnectionStatus
} from '../types';

interface NexusState {
  // Connection & Status
  backend: {
    status: ConnectionStatus;
    error: string | null;
  };
  nexusStatus: NexusStatus | null;
  isConnected: boolean;
  
  // Projects
  currentProjectPath: string | null;
  currentProject: any;
  
  // UI State
  ui: {
    isChatLoading: boolean;
    isSwarmLoading: boolean;
    isMemoryLoading: boolean;
    isLoading: boolean;
  };
  
  // Agents & Swarms
  agents: Agent[];
  swarmTasks: SwarmTask[];
  currentSwarmTask: SwarmTask | null;
  
  // Chat
  messages: ChatMessage[];
  chatHistory: ChatMessage[];
  isStreaming: boolean;
  
  // Memory & Monitoring
  memoryStats: MemoryStats | null;
  watcherStatus: WatcherStatus | null;
  terminalHistory: any[];
  
  // Settings
  settings: UserSettings;
  
  // Actions
  setBackendStatus: (status: ConnectionStatus, error?: string | null) => void;
  setNexusStatus: (status: NexusStatus) => void;
  setCurrentProject: (path: string | null) => void;
  setProjectFromPath: (path: string) => void;
  setAgents: (agents: Agent[]) => void;
  setSwarmTasks: (tasks: SwarmTask[]) => void;
  addMessage: (message: any) => void;
  addChatMessage: (message: ChatMessage) => void;
  updateChatStream: (messageId: string, chunk: string) => void;
  completeChatStream: (messageId: string) => void;
  clearChat: () => void;
  clearChatHistory: () => void;
  setMemoryStats: (stats: MemoryStats) => void;
  setWatcherStatus: (status: WatcherStatus) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
  
  // Business Logic Methods (Stubs used by UI)
  initializeTauriListeners: () => void;
  loadChatHistory: () => Promise<void>;
  loadSwarmTasks: () => Promise<void>;
  loadMemoryStats: () => Promise<void>;
  loadWatcherStatus: () => Promise<void>;
  checkNexusStatus: () => Promise<void>;
  startSwarmTask: (description: string) => Promise<void>;
  executeCommand: (command: string, dir?: string) => Promise<string>;
  addTerminalOutput: (output: any) => void;
  initMemory: () => Promise<void>;
  consolidateMemory: () => Promise<void>;
  toggleNode: (id: string) => void;
  scanCurrentProject: (path?: string) => Promise<void>;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  fontSize: 13,
  fontFamily: 'JetBrains Mono',
  sidebarVisible: true,
  terminalVisible: true,
  autoSave: true,
  autoSaveInterval: 30,
  enableNotifications: true,
  soundEffects: false,
  telemetryEnabled: false,
  preferredModel: 'kimi-k2.5',
  sshSettings: {
    host: '89.167.14.222',
    port: 22,
    username: 'root',
    password: '',
    privateKey: '',
    publicKey: ''
  },
  editorSettings: {
    tabSize: 2,
    useSpaces: true,
    wordWrap: true,
    minimap: false,
    lineNumbers: true,
  },
};

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      // Initial State
      backend: {
        status: 'disconnected',
        error: null,
      },
      isConnected: false,
      nexusStatus: null,
      currentProjectPath: null,
      currentProject: null,
      ui: {
        isChatLoading: false,
        isSwarmLoading: false,
        isMemoryLoading: false,
        isLoading: false
      },
      agents: [],
      swarmTasks: [],
      currentSwarmTask: null,
      messages: [],
      chatHistory: [],
      isStreaming: false,
      memoryStats: null,
      watcherStatus: null,
      terminalHistory: [],
      settings: defaultSettings,

      // Setters
      setBackendStatus: (status, error = null) => 
        set((state) => ({ 
          backend: { ...state.backend, status, error },
          isConnected: status === 'connected'
        })),
      
      setNexusStatus: (nexusStatus) => set({ nexusStatus }),
      
      setCurrentProject: (path) => set({ 
        currentProjectPath: path,
        currentProject: path ? { 
          name: path.split('/').pop() || 'Unknown', 
          path, 
          fileTree: [], 
          recentFiles: [], 
          gitStatus: null 
        } : null
      }),

      setProjectFromPath: (path) => get().setCurrentProject(path),
      
      setAgents: (agents) => set({ agents }),
      
      setSwarmTasks: (swarmTasks) => set({ swarmTasks }),
      
      addMessage: (message) => 
        set((state) => ({ 
          messages: [...state.messages, message],
          chatHistory: [...state.chatHistory, message] 
        })),

      addChatMessage: (message) => get().addMessage(message),
      
      updateChatStream: (messageId, chunk) => 
        set((state) => ({
          isStreaming: true,
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, content: msg.content + chunk } : msg
          )
        })),
        
      completeChatStream: (messageId) =>
        set((state) => ({
          isStreaming: false,
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, isStreaming: false } : msg
          )
        })),
        
      clearChat: () => set({ messages: [], chatHistory: [] }),
      clearChatHistory: () => get().clearChat(),
      
      setMemoryStats: (memoryStats) => set({ memoryStats }),
      
      setWatcherStatus: (status) => set({ watcherStatus: status }),
      
      setSettings: (newSettings) => 
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
        
      updateSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),
        
      resetSettings: () => set({ settings: defaultSettings }),

      addTerminalOutput: (output) => set((state) => ({ terminalHistory: [...state.terminalHistory, output] })),

      // Business Logic Methods
      initializeTauriListeners: () => {
        // Event listeners for streaming etc. can be set up here
        // For now, polling-based updates are used
      },

      loadChatHistory: async () => {
        try {
          const raw: string[] = await invoke('get_chat_history');
          const messages: ChatMessage[] = raw.map((s) => {
            try {
              const parsed = JSON.parse(s);
              return {
                id: parsed.id,
                role: parsed.role as ChatMessage['role'],
                content: parsed.content,
                timestamp: parsed.timestamp,
                isStreaming: parsed.is_streaming || false,
              };
            } catch {
              return null;
            }
          }).filter(Boolean) as ChatMessage[];
          set({ chatHistory: messages });
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      },

      loadSwarmTasks: async () => {
        try {
          const swarmIds: string[] = await invoke('get_all_swarms');
          const tasks: SwarmTask[] = swarmIds.map((id) => ({
            id,
            description: '',
            status: 'completed' as const,
            subtasks: [],
            progress: 100,
            createdAt: new Date().toISOString(),
          }));
          set({ swarmTasks: tasks });
        } catch (e) {
          console.error('Failed to load swarm tasks:', e);
        }
      },

      loadMemoryStats: async () => {
        try {
          set((state) => ({ ui: { ...state.ui, isMemoryLoading: true } }));
          const raw: string = await invoke('get_memory_stats');
          const json = JSON.parse(raw);
          if (json.success && json.data) {
            const d = json.data;
            set({
              memoryStats: {
                totalMemories: d.total_memories ?? 0,
                eventsCount: d.events_count ?? 0,
                graphEntities: d.graph_entities ?? 0,
                vectorDocuments: d.vector_documents ?? 0,
                sizeBytes: d.size_bytes ?? 0,
                lastUpdated: new Date().toISOString(),
              },
            });
          }
        } catch (e) {
          console.error('Failed to load memory stats:', e);
        } finally {
          set((state) => ({ ui: { ...state.ui, isMemoryLoading: false } }));
        }
      },

      loadWatcherStatus: async () => {
        try {
          const raw: string = await invoke('get_watcher_status');
          const json = JSON.parse(raw);
          if (json.success && json.data) {
            const d = json.data;
            set({
              watcherStatus: {
                isRunning: d.is_running ?? false,
                watchedProjects: d.watched_projects ?? 0,
                activeLogSources: d.active_log_sources ?? 0,
                errorsDetected: d.errors_detected ?? 0,
                errorsFixed: d.errors_fixed ?? 0,
                healingSessionsTotal: d.healing_sessions_total ?? 0,
                healingSessionsActive: d.healing_sessions_active ?? 0,
                startTime: d.start_time,
              },
            });
          }
        } catch (e) {
          console.error('Failed to load watcher status:', e);
        }
      },

      checkNexusStatus: async () => {
        try {
          set((state) => ({ backend: { ...state.backend, status: 'connecting' } }));
          const status: NexusStatus = await invoke('get_nexus_status');
          set({
            nexusStatus: status,
            isConnected: status.nexusInstalled || status.version !== 'Unknown',
            backend: {
              status: (status.nexusInstalled || status.version !== 'Unknown') ? 'connected' : 'disconnected',
              error: null,
            },
          });
        } catch (e) {
          const errMsg = String(e);
          set({
            isConnected: false,
            backend: { status: 'error', error: errMsg },
          });
        }
      },

      startSwarmTask: async (description: string) => {
        try {
          set((state) => ({ ui: { ...state.ui, isSwarmLoading: true } }));
          const result: string = await invoke('start_swarm_task', { task: description });
          const parsed = JSON.parse(result);
          const newTask: SwarmTask = {
            id: parsed.task_id || crypto.randomUUID(),
            description,
            status: 'completed',
            subtasks: [],
            progress: 100,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ swarmTasks: [...state.swarmTasks, newTask] }));
        } catch (e) {
          console.error('Failed to start swarm task:', e);
        } finally {
          set((state) => ({ ui: { ...state.ui, isSwarmLoading: false } }));
        }
      },

      executeCommand: async (command: string, dir?: string) => {
        try {
          const output: string = await invoke('execute_terminal_command', { command, dir });
          return output;
        } catch (e) {
          const errMsg = String(e);
          console.error('Command execution failed:', errMsg);
          throw e;
        }
      },

      initMemory: async () => {
        try {
          await invoke('memory_init');
        } catch (e) {
          console.error('Failed to init memory:', e);
        }
      },

      consolidateMemory: async () => {
        try {
          await invoke('memory_consolidate');
        } catch (e) {
          console.error('Failed to consolidate memory:', e);
        }
      },

      toggleNode: (id: string) => {
        // Toggle a file tree node expand/collapse (local state only)
        set((state) => {
          const project = state.currentProject;
          if (!project?.fileTree) return {};
          const toggleInTree = (nodes: any[]): any[] =>
            nodes.map((n) => {
              if (n.id === id) return { ...n, isExpanded: !n.isExpanded };
              if (n.children) return { ...n, children: toggleInTree(n.children) };
              return n;
            });
          return {
            currentProject: {
              ...project,
              fileTree: toggleInTree(project.fileTree),
            },
          };
        });
      },

      scanCurrentProject: async (path?: string) => {
        try {
          const scanPath = path || get().currentProjectPath || '.';
          const raw: string = await invoke('scan_project', { path: scanPath });
          const json = JSON.parse(raw);
          if (json.success && json.data) {
            console.log('Project scanned:', json.data);
          }
        } catch (e) {
          console.error('Failed to scan project:', e);
        }
      },
    }),
    {
      name: 'nexus-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }), // Only persist settings
    }
  )
);

// Selection hooks for performance/compatibility
export const useNexusStatus = () => useNexusStore((state) => state.nexusStatus);
export const useWatcherStatus = () => useNexusStore((state) => state.watcherStatus);
export const useCurrentProject = () => useNexusStore((state) => state.currentProject);
export const useAgents = () => useNexusStore((state) => state.agents);
export const useSwarmTasks = () => useNexusStore((state) => state.swarmTasks);
export const useIsConnected = () => useNexusStore((state) => state.isConnected);
export const useMemoryStats = () => useNexusStore((state) => state.memoryStats);
export const useContext = () => useNexusStore((state) => state.currentProject);
export const useTerminalHistory = () => useNexusStore((state) => state.terminalHistory);
export const useSettings = () => useNexusStore((state) => state.settings);
export const useIsStreaming = () => useNexusStore((state) => state.isStreaming);
