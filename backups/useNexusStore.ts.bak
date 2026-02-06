import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Agent,
  AgentStatus,
  AgentType,
  BackendStatus,
  ChatMessage,
  ConnectionStatus,
  FileNode,
  FileTreeNode,
  GitStatus,
  MemoryStats,
  MessageRole,
  Project,
  SearchResult,
  SwarmTask,
  Task,
  ToolExecution,
  ToolStatus,
  UserSettings,
  WatcherStatus,
} from '../types';

// ============================================================================
// Tauri Command Types
// ============================================================================

interface NexusStatus {
  daemonRunning: boolean;
  daemonPort?: number;
  version: string;
  platform: string;
  nexusInstalled: boolean;
  currentProject?: string;
  provider?: string;
  model?: string;
}

interface ProjectContext {
  path: string;
  name: string;
  filesScanned: number;
  totalSize: number;
  fileTree: FileNode[];
  gitBranch?: string;
  gitStatus?: GitStatus;
}

interface TerminalOutput {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
}

// ============================================================================
// Tauri Service
// ============================================================================

class NexusService {
  // Event unlisteners
  private unlisteners: (() => void)[] = [];

  // Status
  async getStatus(): Promise<NexusStatus> {
    return invoke('get_nexus_status');
  }

  // Project
  async scanProject(path: string): Promise<ProjectContext> {
    return invoke('scan_project', { path });
  }

  async setCurrentProject(path: string): Promise<void> {
    return invoke('set_current_project', { path });
  }

  async getCurrentProject(): Promise<string | null> {
    return invoke('get_current_project');
  }

  // Swarm
  async startSwarmTask(description: string): Promise<string> {
    return invoke('start_swarm_task', { taskDescription: description });
  }

  async getSwarmStatus(taskId: string): Promise<SwarmTask> {
    return invoke('get_swarm_status', { taskId });
  }

  async getAllSwarms(): Promise<SwarmTask[]> {
    return invoke('get_all_swarms');
  }

  // Chat
  async sendChatMessage(message: string): Promise<string> {
    return invoke('send_chat_message', { message });
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    return invoke('get_chat_history');
  }

  async clearChatHistory(): Promise<void> {
    return invoke('clear_chat_history');
  }

  // Memory
  async getMemoryStats(): Promise<MemoryStats> {
    return invoke('get_memory_stats');
  }

  async memoryInit(): Promise<void> {
    return invoke('memory_init');
  }

  async memoryConsolidate(): Promise<void> {
    return invoke('memory_consolidate');
  }

  // Watcher
  async getWatcherStatus(): Promise<WatcherStatus> {
    return invoke('get_watcher_status');
  }

  async watchStart(): Promise<void> {
    return invoke('watch_start');
  }

  async watchStop(): Promise<void> {
    return invoke('watch_stop');
  }

  // Terminal
  async executeTerminalCommand(
    command: string,
    workingDir?: string
  ): Promise<string> {
    return invoke('execute_terminal_command', { command, workingDir });
  }

  // Event listeners
  async listenToSwarmEvents(
    onProgress: (event: { taskId: string; progress: number; status: string }) => void,
    onComplete: (event: { taskId: string; status: string }) => void
  ): Promise<void> {
    const unlistenProgress = await listen('swarm:progress', (event) => {
      onProgress(event.payload as { taskId: string; progress: number; status: string });
    });

    const unlistenComplete = await listen('swarm:completed', (event) => {
      onComplete(event.payload as { taskId: string; status: string });
    });

    this.unlisteners.push(unlistenProgress, unlistenComplete);
  }

  async listenToChatEvents(
    onMessage: (message: ChatMessage) => void,
    onStream: (event: { messageId: string; chunk: string }) => void,
    onComplete: (event: { messageId: string }) => void
  ): Promise<void> {
    const unlistenMessage = await listen('chat:message', (event) => {
      onMessage(event.payload as ChatMessage);
    });

    const unlistenStream = await listen('chat:stream', (event) => {
      onStream(event.payload as { messageId: string; chunk: string });
    });

    const unlistenComplete = await listen('chat:complete', (event) => {
      onComplete(event.payload as { messageId: string });
    });

    this.unlisteners.push(unlistenMessage, unlistenStream, unlistenComplete);
  }

  async listenToTerminalEvents(
    onOutput: (output: TerminalOutput) => void
  ): Promise<void> {
    const unlisten = await listen('terminal:output', (event) => {
      onOutput(event.payload as TerminalOutput);
    });

    this.unlisteners.push(unlisten);
  }

  async listenToWatcherEvents(
    onStatus: (status: WatcherStatus) => void
  ): Promise<void> {
    const unlisten = await listen('watcher:status', (event) => {
      onStatus(event.payload as WatcherStatus);
    });

    this.unlisteners.push(unlisten);
  }

  async listenToProjectEvents(
    onChange: (event: { path: string; name: string }) => void
  ): Promise<void> {
    const unlisten = await listen('project:changed', (event) => {
      onChange(event.payload as { path: string; name: string });
    });

    this.unlisteners.push(unlisten);
  }

  cleanup(): void {
    this.unlisteners.forEach((unlisten) => unlisten());
    this.unlisteners = [];
  }
}

// Export singleton instance
export const nexusService = new NexusService();

// ============================================================================
// Store State Interface
// ============================================================================

interface NexusState {
  // Connection
  backend: BackendStatus;
  nexusStatus?: NexusStatus;

  // Agents
  agents: Agent[];

  // Chat
  messages: ChatMessage[];
  currentConversationId?: string;
  conversations: { id: string; title: string; updatedAt: string }[];

  // Swarm
  currentSwarmTask?: SwarmTask;
  swarmTasks: SwarmTask[];

  // Tasks & Projects
  currentProject?: Project;
  currentTask?: Task;
  tasks: Task[];
  projects: Project[];

  // Tools
  toolExecutions: ToolExecution[];
  pendingToolExecutions: string[];

  // Context
  context: {
    currentFile?: string;
    selectedFiles: string[];
    openFiles: string[];
    fileTree: FileTreeNode[];
    recentFiles: string[];
    searchResults?: SearchResult[];
    gitStatus?: GitStatus;
  };

  // Memory
  memoryStats?: MemoryStats;

  // Watcher
  watcherStatus?: WatcherStatus;

  // Terminal
  terminalHistory: TerminalOutput[];

  // Settings
  settings: UserSettings;

  // UI State
  ui: {
    activePanel: 'chat' | 'swarm' | 'context' | 'terminal' | 'settings';
    sidebarCollapsed: boolean;
    isLoading: boolean;
    error?: string;
  };
}

// ============================================================================
// Actions Interface
// ============================================================================

interface NexusActions {
  // Connection actions
  setStatus: (status: ConnectionStatus, error?: string) => void;
  setBackendVersion: (version: string) => void;
  updateLatency: (latency: number) => void;
  checkNexusStatus: () => Promise<void>;
  initializeTauriListeners: () => Promise<void>;

  // Agent actions
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setAgentStatus: (id: string, status: AgentStatus) => void;
  setAgentProgress: (id: string, progress: number) => void;
  setAgentTask: (id: string, task: string) => void;
  completeAgentTask: (id: string, task: string) => void;

  // Swarm actions
  startSwarmTask: (description: string) => Promise<string>;
  updateSwarmProgress: (taskId: string, progress: number, status: string) => void;
  completeSwarmTask: (taskId: string) => void;
  loadSwarmTasks: () => Promise<void>;

  // Message actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<string>;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setStreaming: (id: string, isStreaming: boolean) => void;
  appendToMessage: (id: string, content: string) => void;
  loadChatHistory: () => Promise<void>;
  streamMessageChunk: (messageId: string, chunk: string) => void;
  completeMessage: (messageId: string) => void;

  // Conversation actions
  setCurrentConversation: (id: string) => void;
  createConversation: (title: string) => string;
  deleteConversation: (id: string) => void;

  // Task actions
  setCurrentTask: (task: Task | undefined) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string) => void;
  failTask: (id: string, error?: string) => void;

  // Project actions
  setCurrentProject: (project: Project | undefined) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'tasks'>) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  scanCurrentProject: () => Promise<void>;
  setProjectFromPath: (path: string) => Promise<void>;

  // Tool execution actions
  addToolExecution: (execution: Omit<ToolExecution, 'id' | 'startedAt'>) => string;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  completeToolExecution: (id: string, output: unknown) => void;
  failToolExecution: (id: string, error: string) => void;
  cancelToolExecution: (id: string) => void;
  clearToolExecutions: () => void;

  // Context actions
  setContext: (context: Partial<NexusState['context']>) => void;
  setCurrentFile: (path: string | undefined) => void;
  selectFile: (path: string) => void;
  deselectFile: (path: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  expandNode: (path: string) => void;
  collapseNode: (path: string) => void;
  toggleNode: (path: string) => void;
  setGitStatus: (status: GitStatus) => void;
  setSearchResults: (results: SearchResult[]) => void;
  clearSearchResults: () => void;

  // Memory actions
  loadMemoryStats: () => Promise<void>;
  initMemory: () => Promise<void>;
  consolidateMemory: () => Promise<void>;
  setMemoryStats: (stats: MemoryStats) => void;

  // Watcher actions
  loadWatcherStatus: () => Promise<void>;
  startWatcher: () => Promise<void>;
  stopWatcher: () => Promise<void>;
  setWatcherStatus: (status: WatcherStatus) => void;

  // Terminal actions
  executeCommand: (command: string, workingDir?: string) => Promise<string>;
  addTerminalOutput: (output: TerminalOutput) => void;
  clearTerminalHistory: () => void;

  // Settings actions
  setSettings: (settings: Partial<UserSettings>) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;

  // UI actions
  setActivePanel: (panel: NexusState['ui']['activePanel']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  clearError: () => void;
}

// ============================================================================
// Selectors Interface
// ============================================================================

interface NexusSelectors {
  getActiveAgents: () => Agent[];
  getAgentById: (id: string) => Agent | undefined;
  getAgentsByType: (type: AgentType) => Agent[];
  getWorkingAgentsCount: () => number;
  getCompletedTasksCount: () => number;
  getErrorAgentsCount: () => number;
  getMessagesByRole: (role: MessageRole) => ChatMessage[];
  getLastMessage: () => ChatMessage | undefined;
  getMessagesByAgent: (agentId: string) => ChatMessage[];
  getTasksByStatus: (status: Task['status']) => Task[];
  getTasksByPriority: (priority: Task['priority']) => Task[];
  getPendingTasks: () => Task[];
  getInProgressTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getToolExecutionsByStatus: (status: ToolStatus) => ToolExecution[];
  getRecentToolExecutions: (count?: number) => ToolExecution[];
  getSelectedNode: () => FileTreeNode | undefined;
  getExpandedNodes: () => FileTreeNode[];
  getModifiedFiles: () => string[];
  isConnected: () => boolean;
}

// ============================================================================
// Combined Store Type
// ============================================================================

type NexusStore = NexusState & NexusActions & NexusSelectors;

// ============================================================================
// Default Values
// ============================================================================

const defaultSettings: UserSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  sidebarVisible: true,
  terminalVisible: true,
  autoSave: true,
  autoSaveInterval: 30000,
  enableNotifications: true,
  soundEffects: false,
  telemetryEnabled: false,
  editorSettings: {
    tabSize: 2,
    useSpaces: true,
    wordWrap: true,
    minimap: true,
    lineNumbers: true,
  },
};

const defaultContext: NexusState['context'] = {
  selectedFiles: [],
  openFiles: [],
  fileTree: [],
  recentFiles: [],
};

const defaultUI = {
  activePanel: 'chat' as const,
  sidebarCollapsed: false,
  isLoading: false,
};

// ============================================================================
// Store Creation
// ============================================================================

export const useNexusStore = create<NexusStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ============================================================================
        // INITIAL STATE
        // ============================================================================

        backend: {
          status: 'disconnected',
        },
        agents: [],
        messages: [],
        conversations: [],
        swarmTasks: [],
        tasks: [],
        projects: [],
        toolExecutions: [],
        pendingToolExecutions: [],
        context: defaultContext,
        terminalHistory: [],
        settings: defaultSettings,
        ui: defaultUI,

        // ============================================================================
        // CONNECTION ACTIONS
        // ============================================================================

        setStatus: (status, error) => {
          set((state) => ({
            backend: {
              ...state.backend,
              status,
              error,
              lastPing: new Date().toISOString(),
            },
          }));
        },

        setBackendVersion: (version) => {
          set((state) => ({
            backend: { ...state.backend, version },
          }));
        },

        updateLatency: (latency) => {
          set((state) => ({
            backend: { ...state.backend, latency },
          }));
        },

        checkNexusStatus: async () => {
          try {
            set((state) => ({ ui: { ...state.ui, isLoading: true } }));
            const status = await nexusService.getStatus();
            set((state) => ({
              nexusStatus: status,
              backend: {
                ...state.backend,
                status: status.nexusInstalled ? 'connected' : 'disconnected',
                version: status.version,
              },
            }));
          } catch (error) {
            set((state) => ({
              backend: {
                ...state.backend,
                status: 'error',
                error: String(error),
              },
            }));
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        initializeTauriListeners: async () => {
          // Listen to swarm events
          await nexusService.listenToSwarmEvents(
            (event) => {
              get().updateSwarmProgress(event.taskId, event.progress, event.status);
            },
            (event) => {
              get().completeSwarmTask(event.taskId);
            }
          );

          // Listen to chat events
          await nexusService.listenToChatEvents(
            (message) => {
              set((state) => ({
                messages: [...state.messages, message],
              }));
            },
            (event) => {
              get().streamMessageChunk(event.messageId, event.chunk);
            },
            (event) => {
              get().completeMessage(event.messageId);
            }
          );

          // Listen to terminal events
          await nexusService.listenToTerminalEvents((output) => {
            get().addTerminalOutput(output);
          });

          // Listen to watcher events
          await nexusService.listenToWatcherEvents((status) => {
            get().setWatcherStatus(status);
          });

          // Listen to project events
          await nexusService.listenToProjectEvents(() => {
            // Auto-scan new project
            get().scanCurrentProject();
          });

          // Check initial status
          await get().checkNexusStatus();
        },

        // ============================================================================
        // AGENT ACTIONS
        // ============================================================================

        setAgents: (agents) => set({ agents }),

        addAgent: (agent) => {
          set((state) => ({ agents: [...state.agents, agent] }));
        },

        updateAgent: (id, updates) => {
          set((state) => ({
            agents: state.agents.map((agent) =>
              agent.id === id ? { ...agent, ...updates } : agent
            ),
          }));
        },

        removeAgent: (id) => {
          set((state) => ({
            agents: state.agents.filter((agent) => agent.id !== id),
          }));
        },

        setAgentStatus: (id, status) => {
          set((state) => ({
            agents: state.agents.map((agent) =>
              agent.id === id ? { ...agent, status } : agent
            ),
          }));
        },

        setAgentProgress: (id, progress) => {
          set((state) => ({
            agents: state.agents.map((agent) =>
              agent.id === id
                ? { ...agent, progress: Math.max(0, Math.min(100, progress)) }
                : agent
            ),
          }));
        },

        setAgentTask: (id, task) => {
          set((state) => ({
            agents: state.agents.map((agent) =>
              agent.id === id
                ? { ...agent, currentTask: task, status: 'working', progress: 0 }
                : agent
            ),
          }));
        },

        completeAgentTask: (id, task) => {
          const completedAt = new Date().toISOString();
          set((state) => ({
            agents: state.agents.map((agent) =>
              agent.id === id
                ? {
                    ...agent,
                    lastCompletedTask: task,
                    completedAt,
                    status: 'completed',
                    progress: 100,
                    currentTask: undefined,
                  }
                : agent
            ),
          }));
        },

        // ============================================================================
        // SWARM ACTIONS
        // ============================================================================

        startSwarmTask: async (description) => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            const taskId = await nexusService.startSwarmTask(description);
            const newTask: SwarmTask = {
              id: taskId,
              description,
              status: 'in_progress',
              subtasks: [],
              progress: 0,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({
              swarmTasks: [...state.swarmTasks, newTask],
              currentSwarmTask: newTask,
            }));
            return taskId;
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        updateSwarmProgress: (taskId, progress, status) => {
          set((state) => ({
            swarmTasks: state.swarmTasks.map((task) =>
              task.id === taskId ? { ...task, progress, status: status as SwarmTask['status'] } : task
            ),
            currentSwarmTask:
              state.currentSwarmTask?.id === taskId
                ? { ...state.currentSwarmTask, progress, status: status as SwarmTask['status'] }
                : state.currentSwarmTask,
          }));
        },

        completeSwarmTask: (taskId) => {
          set((state) => ({
            swarmTasks: state.swarmTasks.map((task) =>
              task.id === taskId
                ? { ...task, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
                : task
            ),
            currentSwarmTask:
              state.currentSwarmTask?.id === taskId
                ? { ...state.currentSwarmTask, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
                : state.currentSwarmTask,
          }));
        },

        loadSwarmTasks: async () => {
          try {
            const tasks = await nexusService.getAllSwarms();
            set({ swarmTasks: tasks });
          } catch (error) {
            console.error('Failed to load swarm tasks:', error);
          }
        },

        // ============================================================================
        // MESSAGE ACTIONS
        // ============================================================================

        setMessages: (messages) => set({ messages }),

        addMessage: async (message) => {
          const id = crypto.randomUUID();
          const timestamp = new Date().toISOString();
          const newMessage = { ...message, id, timestamp } as ChatMessage;

          if (message.role === 'user') {
            // Send to backend for processing
            const assistantId = await nexusService.sendChatMessage(message.content);
            return assistantId;
          } else {
            set((state) => ({ messages: [...state.messages, newMessage] }));
            return id;
          }
        },

        updateMessage: (id, updates) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, ...updates } : msg
            ),
          }));
        },

        removeMessage: (id) => {
          set((state) => ({
            messages: state.messages.filter((msg) => msg.id !== id),
          }));
        },

        clearMessages: () => {
          set({ messages: [] });
          nexusService.clearChatHistory();
        },

        setStreaming: (id, isStreaming) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, isStreaming } : msg
            ),
          }));
        },

        appendToMessage: (id, content) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, content: msg.content + content } : msg
            ),
          }));
        },

        streamMessageChunk: (messageId, chunk) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, content: msg.content + chunk } : msg
            ),
          }));
        },

        completeMessage: (messageId) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, isStreaming: false } : msg
            ),
          }));
        },

        loadChatHistory: async () => {
          try {
            const history = await nexusService.getChatHistory();
            set({ messages: history });
          } catch (error) {
            console.error('Failed to load chat history:', error);
          }
        },

        // ============================================================================
        // CONVERSATION ACTIONS
        // ============================================================================

        setCurrentConversation: (id) => set({ currentConversationId: id }),

        createConversation: (title) => {
          const id = crypto.randomUUID();
          const updatedAt = new Date().toISOString();
          set((state) => ({
            conversations: [...state.conversations, { id, title, updatedAt }],
            currentConversationId: id,
          }));
          return id;
        },

        deleteConversation: (id) => {
          set((state) => ({
            conversations: state.conversations.filter((c) => c.id !== id),
            currentConversationId:
              state.currentConversationId === id ? undefined : state.currentConversationId,
          }));
        },

        // ============================================================================
        // TASK ACTIONS
        // ============================================================================

        setCurrentTask: (task) => set({ currentTask: task }),
        setTasks: (tasks) => set({ tasks }),

        addTask: (task) => {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newTask: Task = { ...task, id, createdAt: now, updatedAt: now };
          set((state) => ({
            tasks: [...state.tasks, newTask],
            currentTask: state.currentTask ?? newTask,
          }));
          return id;
        },

        updateTask: (id, updates) => {
          const updatedAt = new Date().toISOString();
          set((state) => {
            const updatedTasks = state.tasks.map((task) =>
              task.id === id ? { ...task, ...updates, updatedAt } : task
            );
            const updatedCurrentTask =
              state.currentTask?.id === id
                ? { ...state.currentTask, ...updates, updatedAt }
                : state.currentTask;
            return { tasks: updatedTasks, currentTask: updatedCurrentTask };
          });
        },

        removeTask: (id) => {
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
            currentTask: state.currentTask?.id === id ? undefined : state.currentTask,
          }));
        },

        completeTask: (id) => {
          const now = new Date().toISOString();
          set((state) => {
            const updatedTasks = state.tasks.map((task) =>
              task.id === id
                ? { ...task, status: 'completed' as const, completedAt: now, updatedAt: now }
                : task
            );
            const updatedCurrentTask =
              state.currentTask?.id === id
                ? { ...state.currentTask, status: 'completed' as const, completedAt: now, updatedAt: now }
                : state.currentTask;
            return { tasks: updatedTasks, currentTask: updatedCurrentTask };
          });
        },

        failTask: (id, error) => {
          const now = new Date().toISOString();
          set((state) => {
            const updatedTasks = state.tasks.map((task) =>
              task.id === id
                ? { ...task, status: 'failed' as const, updatedAt: now, metadata: { ...task.metadata, error } }
                : task
            );
            const updatedCurrentTask =
              state.currentTask?.id === id
                ? { ...state.currentTask, status: 'failed' as const, updatedAt: now, metadata: { ...state.currentTask?.metadata, error } }
                : state.currentTask;
            return { tasks: updatedTasks, currentTask: updatedCurrentTask };
          });
        },

        // ============================================================================
        // PROJECT ACTIONS
        // ============================================================================

        setCurrentProject: (project) => set({ currentProject: project }),
        setProjects: (projects) => set({ projects }),

        addProject: async (project) => {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const newProject: Project = { ...project, id, createdAt: now, updatedAt: now, tasks: [] };

          // Set as current project in backend
          if (project.path) {
            await nexusService.setCurrentProject(project.path);
          }

          set((state) => ({
            projects: [...state.projects, newProject],
            currentProject: state.currentProject ?? newProject,
          }));
          return id;
        },

        updateProject: (id, updates) => {
          const updatedAt = new Date().toISOString();
          set((state) => {
            const updatedProjects = state.projects.map((project) =>
              project.id === id ? { ...project, ...updates, updatedAt } : project
            );
            const updatedCurrentProject =
              state.currentProject?.id === id
                ? { ...state.currentProject, ...updates, updatedAt }
                : state.currentProject;
            return { projects: updatedProjects, currentProject: updatedCurrentProject };
          });
        },

        removeProject: (id) => {
          set((state) => ({
            projects: state.projects.filter((project) => project.id !== id),
            currentProject: state.currentProject?.id === id ? undefined : state.currentProject,
          }));
        },

        scanCurrentProject: async () => {
          const currentProject = get().currentProject;
          if (!currentProject?.path) return;

          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            const context = await nexusService.scanProject(currentProject.path);
            set((state) => ({
              context: {
                ...state.context,
                fileTree: context.fileTree,
                gitStatus: context.gitStatus,
              },
              currentProject: {
                ...state.currentProject!,
                name: context.name,
              },
            }));
          } catch (error) {
            console.error('Failed to scan project:', error);
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        setProjectFromPath: async (path) => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            await nexusService.setCurrentProject(path);
            const context = await nexusService.scanProject(path);

            const newProject: Project = {
              id: crypto.randomUUID(),
              name: context.name,
              path,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tasks: [],
            };

            set((state) => ({
              currentProject: newProject,
              projects: [...state.projects.filter((p) => p.path !== path), newProject],
              context: {
                ...state.context,
                fileTree: context.fileTree,
                gitStatus: context.gitStatus,
              },
            }));
          } catch (error) {
            console.error('Failed to set project:', error);
            set((state) => ({
              ui: { ...state.ui, error: String(error) },
            }));
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        // ============================================================================
        // TOOL EXECUTION ACTIONS
        // ============================================================================

        addToolExecution: (execution) => {
          const id = crypto.randomUUID();
          const startedAt = new Date().toISOString();
          const newExecution = { ...execution, id, startedAt } as ToolExecution;
          set((state) => ({
            toolExecutions: [...state.toolExecutions, newExecution],
            pendingToolExecutions:
              execution.status === 'pending' || execution.status === 'running'
                ? [...state.pendingToolExecutions, id]
                : state.pendingToolExecutions,
          }));
          return id;
        },

        updateToolExecution: (id, updates) => {
          set((state) => ({
            toolExecutions: state.toolExecutions.map((exec) =>
              exec.id === id ? { ...exec, ...updates } : exec
            ),
          }));
        },

        completeToolExecution: (id, output) => {
          const completedAt = new Date().toISOString();
          set((state) => {
            const updatedExecutions = state.toolExecutions.map((exec) => {
              if (exec.id !== id) return exec;
              const duration = new Date(completedAt).getTime() - new Date(exec.startedAt).getTime();
              return { ...exec, status: 'completed' as const, output, completedAt, duration };
            });
            return {
              toolExecutions: updatedExecutions,
              pendingToolExecutions: state.pendingToolExecutions.filter((pid) => pid !== id),
            };
          });
        },

        failToolExecution: (id, error) => {
          const completedAt = new Date().toISOString();
          set((state) => {
            const updatedExecutions = state.toolExecutions.map((exec) => {
              if (exec.id !== id) return exec;
              const duration = new Date(completedAt).getTime() - new Date(exec.startedAt).getTime();
              return { ...exec, status: 'failed' as const, error, completedAt, duration };
            });
            return {
              toolExecutions: updatedExecutions,
              pendingToolExecutions: state.pendingToolExecutions.filter((pid) => pid !== id),
            };
          });
        },

        cancelToolExecution: (id) => {
          set((state) => ({
            toolExecutions: state.toolExecutions.map((exec) =>
              exec.id === id ? { ...exec, status: 'cancelled' as const } : exec
            ),
            pendingToolExecutions: state.pendingToolExecutions.filter((pid) => pid !== id),
          }));
        },

        clearToolExecutions: () => set({ toolExecutions: [], pendingToolExecutions: [] }),

        // ============================================================================
        // CONTEXT ACTIONS
        // ============================================================================

        setContext: (context) => {
          set((state) => ({ context: { ...state.context, ...context } }));
        },

        setCurrentFile: (path) => {
          set((state) => {
            const recentFiles = path
              ? [path, ...state.context.recentFiles.filter((f) => f !== path)].slice(0, 20)
              : state.context.recentFiles;
            return {
              context: { ...state.context, currentFile: path, recentFiles },
            };
          });
        },

        selectFile: (path) => {
          set((state) => ({
            context: {
              ...state.context,
              selectedFiles: state.context.selectedFiles.includes(path)
                ? state.context.selectedFiles
                : [...state.context.selectedFiles, path],
            },
          }));
        },

        deselectFile: (path) => {
          set((state) => ({
            context: {
              ...state.context,
              selectedFiles: state.context.selectedFiles.filter((p) => p !== path),
            },
          }));
        },

        openFile: (path) => {
          set((state) => ({
            context: {
              ...state.context,
              openFiles: state.context.openFiles.includes(path)
                ? state.context.openFiles
                : [...state.context.openFiles, path],
            },
          }));
        },

        closeFile: (path) => {
          set((state) => {
            const openFiles = state.context.openFiles.filter((p) => p !== path);
            const currentFile =
              state.context.currentFile === path
                ? openFiles[openFiles.length - 1]
                : state.context.currentFile;
            return { context: { ...state.context, openFiles, currentFile } };
          });
        },

        setFileTree: (tree) => {
          set((state) => ({ context: { ...state.context, fileTree: tree } }));
        },

        expandNode: (path) => {
          set((state) => {
            const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] =>
              nodes.map((node) => {
                if (node.path === path) return { ...node, isExpanded: true };
                if (node.children) return { ...node, children: updateNode(node.children) };
                return node;
              });
            return { context: { ...state.context, fileTree: updateNode(state.context.fileTree) } };
          });
        },

        collapseNode: (path) => {
          set((state) => {
            const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] =>
              nodes.map((node) => {
                if (node.path === path) return { ...node, isExpanded: false };
                if (node.children) return { ...node, children: updateNode(node.children) };
                return node;
              });
            return { context: { ...state.context, fileTree: updateNode(state.context.fileTree) } };
          });
        },

        toggleNode: (path) => {
          set((state) => {
            const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] =>
              nodes.map((node) => {
                if (node.path === path) return { ...node, isExpanded: !node.isExpanded };
                if (node.children) return { ...node, children: updateNode(node.children) };
                return node;
              });
            return { context: { ...state.context, fileTree: updateNode(state.context.fileTree) } };
          });
        },

        setGitStatus: (status) => {
          set((state) => ({ context: { ...state.context, gitStatus: status } }));
        },

        setSearchResults: (results) => {
          set((state) => ({ context: { ...state.context, searchResults: results } }));
        },

        clearSearchResults: () => {
          set((state) => ({ context: { ...state.context, searchResults: undefined } }));
        },

        // ============================================================================
        // MEMORY ACTIONS
        // ============================================================================

        loadMemoryStats: async () => {
          try {
            const stats = await nexusService.getMemoryStats();
            get().setMemoryStats(stats);
          } catch (error) {
            console.error('Failed to load memory stats:', error);
          }
        },

        initMemory: async () => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            await nexusService.memoryInit();
            await get().loadMemoryStats();
          } catch (error) {
            console.error('Failed to init memory:', error);
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        consolidateMemory: async () => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            await nexusService.memoryConsolidate();
            await get().loadMemoryStats();
          } catch (error) {
            console.error('Failed to consolidate memory:', error);
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        setMemoryStats: (stats) => {
          set({ memoryStats: stats });
        },

        // ============================================================================
        // WATCHER ACTIONS
        // ============================================================================

        loadWatcherStatus: async () => {
          try {
            const status = await nexusService.getWatcherStatus();
            get().setWatcherStatus(status);
          } catch (error) {
            console.error('Failed to load watcher status:', error);
          }
        },

        startWatcher: async () => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            await nexusService.watchStart();
            await get().loadWatcherStatus();
          } catch (error) {
            console.error('Failed to start watcher:', error);
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        stopWatcher: async () => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            await nexusService.watchStop();
            await get().loadWatcherStatus();
          } catch (error) {
            console.error('Failed to stop watcher:', error);
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        setWatcherStatus: (status) => {
          set({ watcherStatus: status });
        },

        // ============================================================================
        // TERMINAL ACTIONS
        // ============================================================================

        executeCommand: async (command, workingDir) => {
          set((state) => ({ ui: { ...state.ui, isLoading: true } }));
          try {
            const output = await nexusService.executeTerminalCommand(command, workingDir);
            return output;
          } catch (error) {
            console.error('Failed to execute command:', error);
            throw error;
          } finally {
            set((state) => ({ ui: { ...state.ui, isLoading: false } }));
          }
        },

        addTerminalOutput: (output) => {
          set((state) => ({
            terminalHistory: [...state.terminalHistory, output],
          }));
        },

        clearTerminalHistory: () => {
          set({ terminalHistory: [] });
        },

        // ============================================================================
        // SETTINGS ACTIONS
        // ============================================================================

        setSettings: (settings) => {
          set((state) => ({ settings: { ...state.settings, ...settings } }));
        },

        updateSetting: (key, value) => {
          set((state) => ({ settings: { ...state.settings, [key]: value } }));
        },

        resetSettings: () => set({ settings: defaultSettings }),

        // ============================================================================
        // UI ACTIONS
        // ============================================================================

        setActivePanel: (panel) => {
          set((state) => ({ ui: { ...state.ui, activePanel: panel } }));
        },

        toggleSidebar: () => {
          set((state) => ({
            ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
          }));
        },

        setSidebarCollapsed: (collapsed) => {
          set((state) => ({ ui: { ...state.ui, sidebarCollapsed: collapsed } }));
        },

        setLoading: (loading) => {
          set((state) => ({ ui: { ...state.ui, isLoading: loading } }));
        },

        setError: (error) => {
          set((state) => ({ ui: { ...state.ui, error } }));
        },

        clearError: () => {
          set((state) => ({ ui: { ...state.ui, error: undefined } }));
        },

        // ============================================================================
        // SELECTORS (COMPUTED VALUES)
        // ============================================================================

        getActiveAgents: () => {
          return get().agents.filter((a) => a.status === 'working');
        },

        getAgentById: (id) => {
          return get().agents.find((a) => a.id === id);
        },

        getAgentsByType: (type) => {
          return get().agents.filter((a) => a.type === type);
        },

        getWorkingAgentsCount: () => {
          return get().agents.filter((a) => a.status === 'working').length;
        },

        getCompletedTasksCount: () => {
          return get().agents.filter((a) => a.lastCompletedTask).length;
        },

        getErrorAgentsCount: () => {
          return get().agents.filter((a) => a.status === 'error').length;
        },

        getMessagesByRole: (role) => {
          return get().messages.filter((m) => m.role === role);
        },

        getLastMessage: () => {
          const messages = get().messages;
          return messages[messages.length - 1];
        },

        getMessagesByAgent: (agentId) => {
          return get().messages.filter((m) => m.agentId === agentId);
        },

        getTasksByStatus: (status) => {
          return get().tasks.filter((t) => t.status === status);
        },

        getTasksByPriority: (priority) => {
          return get().tasks.filter((t) => t.priority === priority);
        },

        getPendingTasks: () => {
          return get().tasks.filter((t) => t.status === 'pending');
        },

        getInProgressTasks: () => {
          return get().tasks.filter((t) => t.status === 'in_progress');
        },

        getCompletedTasks: () => {
          return get().tasks.filter((t) => t.status === 'completed');
        },

        getToolExecutionsByStatus: (status) => {
          return get().toolExecutions.filter((e) => e.status === status);
        },

        getRecentToolExecutions: (count = 10) => {
          return get().toolExecutions.slice(-count).reverse();
        },

        getSelectedNode: () => {
          const findSelected = (nodes: FileTreeNode[]): FileTreeNode | undefined => {
            for (const node of nodes) {
              if (node.isSelected) return node;
              if (node.children) {
                const found = findSelected(node.children);
                if (found) return found;
              }
            }
            return undefined;
          };
          return findSelected(get().context.fileTree);
        },

        getExpandedNodes: () => {
          const expanded: FileTreeNode[] = [];
          const findExpanded = (nodes: FileTreeNode[]) => {
            for (const node of nodes) {
              if (node.isExpanded) expanded.push(node);
              if (node.children) findExpanded(node.children);
            }
          };
          findExpanded(get().context.fileTree);
          return expanded;
        },

        getModifiedFiles: () => {
          const modified: string[] = [];
          const findModified = (nodes: FileTreeNode[]) => {
            for (const node of nodes) {
              if (node.metadata?.isModified) modified.push(node.path);
              if (node.children) findModified(node.children);
            }
          };
          findModified(get().context.fileTree);
          return modified;
        },

        isConnected: () => {
          return get().backend.status === 'connected';
        },
      }),
      {
        name: 'nexus-store',
        partialize: (state) => ({
          settings: state.settings,
          conversations: state.conversations,
          projects: state.projects,
          ui: {
            sidebarCollapsed: state.ui.sidebarCollapsed,
          },
        }),
      }
    ),
    {
      name: 'NexusStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================================
// HOOK EXPORTS (for better tree-shaking and typed selectors)
// ============================================================================

export const useBackend = () => useNexusStore((state) => state.backend);
export const useNexusStatus = () => useNexusStore((state) => state.nexusStatus);
export const useAgents = () => useNexusStore((state) => state.agents);
export const useMessages = () => useNexusStore((state) => state.messages);
export const useSwarmTasks = () => useNexusStore((state) => state.swarmTasks);
export const useCurrentTask = () => useNexusStore((state) => state.currentTask);
export const useCurrentProject = () => useNexusStore((state) => state.currentProject);
export const useToolExecutions = () => useNexusStore((state) => state.toolExecutions);
export const useContext = () => useNexusStore((state) => state.context);
export const useSettings = () => useNexusStore((state) => state.settings);
export const useUI = () => useNexusStore((state) => state.ui);
export const useMemoryStats = () => useNexusStore((state) => state.memoryStats);
export const useWatcherStatus = () => useNexusStore((state) => state.watcherStatus);
export const useTerminalHistory = () => useNexusStore((state) => state.terminalHistory);

// Selector hooks for computed values
export const useActiveAgents = () =>
  useNexusStore((state) => state.agents.filter((a) => a.status === 'working'));
export const useWorkingAgentsCount = () =>
  useNexusStore((state) => state.agents.filter((a) => a.status === 'working').length);
export const useIsConnected = () =>
  useNexusStore((state) => state.backend.status === 'connected');

export default useNexusStore;
