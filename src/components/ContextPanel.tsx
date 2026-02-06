import React, { useState, useCallback } from 'react';
import {
  FolderTree,
  FileText,
  ChevronRight,
  ChevronDown,
  Clock,
  HardDrive,
  X,
  Search,
  RefreshCw,
  Database,
  Settings,
  CheckCircle2,
  Cpu,
  GitBranch,
  Plus,
} from 'lucide-react';
import { useNexusStore, useContext, useMemoryStats, useIsConnected } from '../store/useNexusStore';
import type { FileNode, GitStatus } from '../types';

const FileIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'typescript':
      return <span className="text-blue-400 text-xs font-medium">TS</span>;
    case 'javascript':
      return <span className="text-yellow-400 text-xs font-medium">JS</span>;
    case 'css':
      return <span className="text-cyan-400 text-xs font-medium">CSS</span>;
    case 'json':
      return <span className="text-green-400 text-xs font-medium">{}</span>;
    case 'html':
      return <span className="text-orange-400 text-xs font-medium">HTML</span>;
    case 'rust':
      return <span className="text-orange-500 text-xs font-medium">RS</span>;
    case 'python':
      return <span className="text-blue-500 text-xs font-medium">PY</span>;
    default:
      return <FileText className="w-4 h-4 text-zinc-500" />;
  }
};

const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    css: 'css',
    scss: 'css',
    json: 'json',
    html: 'html',
    rs: 'rust',
    py: 'python',
    md: 'markdown',
  };
  return typeMap[ext] || 'file';
};

const FileTreeNode: React.FC<{ 
  node: any; 
  depth?: number;
  onToggle: (path: string) => void;
}> = ({ node, depth = 0, onToggle }) => {
  const hasChildren = node.type === 'directory' && node.children && node.children.length > 0;
  const isExpanded = node.isExpanded ?? depth < 2;

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 w-full py-1 px-2 hover:bg-zinc-800/50 rounded text-left transition-colors group"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )
        ) : (
          <span className="w-3.5" />
        )}

        {node.type === 'directory' ? (
          <FolderTree className="w-4 h-4 text-yellow-500/80" />
        ) : (
          <FileIcon type={getFileType(node.name)} />
        )}

        <span
          className={`text-xs ${
            node.type === 'directory' ? 'text-zinc-300 font-medium' : 'text-zinc-400'
          } group-hover:text-zinc-200`}
        >
          {node.name}
        </span>

        {node.size !== undefined && node.size > 0 && (
          <span className="text-[10px] text-zinc-600 ml-auto">
            {(node.size / 1024).toFixed(1)}KB
          </span>
        )}
      </button>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child: any) => (
            <FileTreeNode key={child.id} node={child} depth={depth + 1} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
};

const GitStatusDisplay: React.FC<{ status: GitStatus }> = ({ status }) => {
  const hasChanges = status.modified.length > 0 || status.staged.length > 0 || status.untracked.length > 0;
  
  return (
    <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium text-zinc-300">{status.branch}</span>
        </div>
        {(status.ahead > 0 || status.behind > 0) && (
          <span className="text-[10px] text-zinc-500">
            {status.ahead > 0 && `↑${status.ahead} `}
            {status.behind > 0 && `↓${status.behind}`}
          </span>
        )}
      </div>
      
      {hasChanges ? (
        <div className="space-y-1">
          {status.modified.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-zinc-400">{status.modified.length} modified</span>
            </div>
          )}
          {status.staged.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-zinc-400">{status.staged.length} staged</span>
            </div>
          )}
          {status.untracked.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span className="text-zinc-400">{status.untracked.length} untracked</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CheckCircle2 className="w-3 h-3" />
          <span>Working tree clean</span>
        </div>
      )}
    </div>
  );
};

interface ContextPanelProps {
  onClose?: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'memory' | 'git'>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  const context = useContext();
  const memoryStats = useMemoryStats();
  
  const fileTree = context?.fileTree || [];
  const recentFiles = context?.recentFiles || [];
  const gitStatus = context?.gitStatus;

  const { 
    toggleNode, 
    scanCurrentProject, 
    setProjectFromPath,
    currentProject,
    loadMemoryStats,
    initMemory,
    consolidateMemory,
    ui,
  } = useNexusStore();
  const isConnected = useIsConnected();

  const formatTime = useCallback((date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, []);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const filteredFiles = (recentFiles as string[]).filter(
    (file) =>
      file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    if (activeTab === 'files') {
      await scanCurrentProject();
    } else if (activeTab === 'memory') {
      await loadMemoryStats();
    }
  };

  const handleProjectSelect = async (path: string) => {
    await setProjectFromPath(path);
    setShowProjectSelector(false);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 border-l border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg border border-green-500/30">
            <Database className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Context</h2>
            <span className="text-xs text-zinc-500">
              {currentProject?.name || 'No project selected'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={ui.isLoading}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${ui.isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors group"
          >
            <X className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
          </button>
        </div>
      </div>

      {/* Project Selector Button */}
      <div className="px-4 py-2 border-b border-zinc-800">
        <button
          onClick={() => setShowProjectSelector(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-300 truncate max-w-[180px]">
              {currentProject?.path || 'Select a project...'}
            </span>
          </div>
          <Plus className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {[
          { id: 'files', icon: FolderTree, label: 'Files' },
          { id: 'memory', icon: HardDrive, label: 'Memory' },
          { id: 'git', icon: GitBranch, label: 'Git' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === id
                ? 'text-zinc-200 border-blue-500 bg-zinc-900/50'
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/30'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' && (
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto py-2">
              {fileTree.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files scanned</p>
                  <p className="text-xs mt-1 opacity-70">Select a project to view files</p>
                </div>
              ) : (
                fileTree.map((node: any) => (
                  <FileTreeNode key={node.id} node={node} onToggle={toggleNode} />
                ))
              )}
            </div>

            {/* Recent Files */}
            {filteredFiles.length > 0 && (
              <div className="border-t border-zinc-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
                    Recent
                  </span>
                  <Clock className="w-3 h-3 text-zinc-600" />
                </div>
                <div className="space-y-1">
                  {filteredFiles.slice(0, 5).map((file: any, index: number) => (
                    <button
                      key={index}
                      className="flex items-center gap-2 w-full p-1.5 hover:bg-zinc-800/50 rounded text-left transition-colors group"
                    >
                      <FileIcon type={getFileType(file)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 truncate group-hover:text-zinc-300">
                          {file.split('/').pop()}
                        </p>
                        <p className="text-[10px] text-zinc-600">{file}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {!memoryStats ? (
              <div className="text-center py-8 text-zinc-500">
                <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Memory not initialized</p>
                {isConnected && (
                  <button
                    onClick={initMemory}
                    disabled={ui.isLoading}
                    className="mt-3 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs transition-colors"
                  >
                    Initialize Memory
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Memory Usage */}
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-medium text-zinc-300">Memory Usage</span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatBytes(memoryStats.sizeBytes)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-zinc-200">{memoryStats.eventsCount}</p>
                      <p className="text-[10px] text-zinc-500">Events</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-zinc-200">{memoryStats.graphEntities}</p>
                      <p className="text-[10px] text-zinc-500">Entities</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-zinc-200">{memoryStats.vectorDocuments}</p>
                      <p className="text-[10px] text-zinc-500">Vectors</p>
                    </div>
                  </div>
                </div>

                {/* Memory Actions */}
                <div className="space-y-1">
                  <button
                    onClick={loadMemoryStats}
                    className="flex items-center gap-2 w-full p-2 hover:bg-zinc-900/50 rounded-lg text-left transition-colors group"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Refresh Stats</span>
                  </button>
                  <button
                    onClick={consolidateMemory}
                    disabled={ui.isLoading}
                    className="flex items-center gap-2 w-full p-2 hover:bg-zinc-900/50 rounded-lg text-left transition-colors group disabled:opacity-50"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">
                      Consolidate Memory
                    </span>
                  </button>
                </div>

                {/* Last Updated */}
                <p className="text-[10px] text-zinc-600 text-center">
                  Last updated: {formatTime(memoryStats.lastUpdated)}
                </p>
              </>
            )}
          </div>
        )}

        {activeTab === 'git' && (
          <div className="h-full overflow-y-auto p-4">
            {!gitStatus ? (
              <div className="text-center py-8 text-zinc-500">
                <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No git repository</p>
                <p className="text-xs mt-1 opacity-70">Select a project with git initialized</p>
              </div>
            ) : (
              <GitStatusDisplay status={gitStatus} />
            )}
          </div>
        )}
      </div>

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-96 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Select Project</h3>
            <input
              type="text"
              placeholder="Enter project path..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 mb-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleProjectSelect(e.currentTarget.value);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowProjectSelector(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  if (input?.value) handleProjectSelect(input.value);
                }}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
              >
                Open Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextPanel;
