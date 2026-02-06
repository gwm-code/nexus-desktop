import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Terminal,
  Copy,
  Check,
  Command,
  Play,
  Square,
  Loader2,
} from 'lucide-react';
import { useNexusStore, useTerminalHistory, useIsConnected } from '../store/useNexusStore';

interface TerminalPanelProps {
  onClose?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'history'>('terminal');
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Refs to avoid stale closures in xterm.onData callback
  const currentCommandRef = useRef('');
  const isExecutingRef = useRef(false);
  const executeCommandRef = useRef<((cmd: string, dir?: string) => Promise<string>) | null>(null);
  const addTerminalOutputRef = useRef<((output: any) => void) | null>(null);
  const currentProjectRef = useRef<any>(null);

  const terminalHistory = useTerminalHistory();
  const { executeCommand, addTerminalOutput, currentProject } = useNexusStore();
  const isConnected = useIsConnected();

  // Sync refs with latest state/props
  useEffect(() => { currentCommandRef.current = currentCommand; }, [currentCommand]);
  useEffect(() => { isExecutingRef.current = isExecuting; }, [isExecuting]);
  useEffect(() => { executeCommandRef.current = executeCommand; }, [executeCommand]);
  useEffect(() => { addTerminalOutputRef.current = addTerminalOutput; }, [addTerminalOutput]);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  // Print prompt
  const printPrompt = useCallback((xterm: XTerm) => {
    const cwd = currentProjectRef.current?.path?.split('/').pop() || '~';
    xterm.write(`\x1b[1;32mnexus\x1b[0m:\x1b[1;34m${cwd}\x1b[0m$ `);
  }, []);

  // Print welcome message
  const printWelcomeMessage = useCallback((xterm: XTerm) => {
    xterm.writeln('\x1b[1;34m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
    xterm.writeln('\x1b[1;34m║\x1b[0m           \x1b[1;36mNexus Desktop Terminal\x1b[0m                       \x1b[1;34m║\x1b[0m');
    xterm.writeln('\x1b[1;34m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
    xterm.writeln('');
    xterm.writeln('\x1b[90mType commands to execute. Use "nexus <command>" for Nexus CLI.\x1b[0m');
    xterm.writeln('\x1b[90mPress Ctrl+C to cancel, Ctrl+L to clear.\x1b[0m');
    xterm.writeln('');
    printPrompt(xterm);
  }, [printPrompt]);

  // Execute command (reads from ref, not stale state)
  const doExecute = useCallback(async (xterm: XTerm, command: string) => {
    setCurrentCommand('');
    currentCommandRef.current = '';
    setIsExecuting(true);
    isExecutingRef.current = true;

    xterm.writeln('');
    xterm.writeln(`\x1b[1;36mExecuting: ${command}\x1b[0m`);
    xterm.writeln('');

    try {
      const output = await executeCommandRef.current!(command, currentProjectRef.current?.path);

      const lines = output.split('\n');
      lines.forEach((line) => {
        xterm.writeln(line || ' ');
      });

      addTerminalOutputRef.current!({
        id: crypto.randomUUID(),
        command,
        output,
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = String(error);
      xterm.writeln(`\x1b[1;31mError: ${errorMessage}\x1b[0m`);

      addTerminalOutputRef.current!({
        id: crypto.randomUUID(),
        command,
        output: errorMessage,
        status: 'error',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
      isExecutingRef.current = false;
      xterm.writeln('');
      printPrompt(xterm);
    }
  }, [printPrompt]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#18181b',
        foreground: '#a1a1aa',
        cursor: '#3b82f6',
        selectionBackground: '#3b82f6',
        selectionForeground: '#ffffff',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#a1a1aa',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f4f4f5',
      },
      scrollback: 10000,
      rows: 15,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    printWelcomeMessage(xterm);

    // Handle input — reads from refs to avoid stale closures
    xterm.onData((data) => {
      if (isExecutingRef.current) return;

      if (data === '\r') {
        const cmd = currentCommandRef.current.trim();
        if (cmd) {
          doExecute(xterm, cmd);
        }
      } else if (data === '\x7f') {
        if (currentCommandRef.current.length > 0) {
          currentCommandRef.current = currentCommandRef.current.slice(0, -1);
          setCurrentCommand(currentCommandRef.current);
          xterm.write('\b \b');
        }
      } else if (data === '\x03') {
        xterm.write('^C\n');
        printPrompt(xterm);
        currentCommandRef.current = '';
        setCurrentCommand('');
      } else if (data >= ' ' && data <= '~') {
        currentCommandRef.current += data;
        setCurrentCommand(currentCommandRef.current);
        xterm.write(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
      xtermRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle copy
  const handleCopyTerminal = () => {
    const allOutput = terminalHistory
      .map((cmd) => `$ ${cmd.command}\n${cmd.output}`)
      .join('\n\n');
    navigator.clipboard.writeText(allOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear terminal
  const clearTerminal = () => {
    xtermRef.current?.clear();
    setCurrentCommand('');
    currentCommandRef.current = '';
    if (xtermRef.current) printWelcomeMessage(xtermRef.current);
  };

  // Format duration
  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'running';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  // Quick commands
  const quickCommands = [
    'nexus --version',
    'nexus scan',
    'nexus status',
    'nexus memory-stats',
    'git status',
    'git log --oneline -10',
  ];

  const executeQuickCommand = async (cmd: string) => {
    if (!xtermRef.current || isExecuting) return;

    currentCommandRef.current = cmd;
    setCurrentCommand(cmd);
    xtermRef.current.write(cmd);
    // Small delay to show the command before executing
    setTimeout(() => {
      if (xtermRef.current) doExecute(xtermRef.current, cmd);
    }, 100);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-zinc-800 rounded-lg">
            <Terminal className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: 'terminal', icon: Command, label: 'Terminal' },
              { id: 'history', icon: Play, label: `History (${terminalHistory.length})` },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyTerminal}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            title="Copy terminal content"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
          <button
            onClick={clearTerminal}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 text-zinc-500" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
              title="Close terminal"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' ? (
          <div ref={terminalRef} className="h-full w-full p-2" />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-2">
              {terminalHistory.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">
                  <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No commands executed yet</p>
                  <p className="text-xs mt-1 opacity-70">Use the terminal to run commands</p>
                </div>
              ) : (
                terminalHistory.map((cmd, index) => (
                  <div
                    key={cmd.id}
                    className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600">#{index + 1}</span>
                        <code className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                          {cmd.command}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        {cmd.status === 'running' ? (
                          <span className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                            <Square className="w-3 h-3 fill-current" />
                            Running
                          </span>
                        ) : cmd.status === 'error' ? (
                          <span className="flex items-center gap-1.5 text-[10px] text-red-400">
                            <X className="w-3 h-3" />
                            Error
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                            <Check className="w-3 h-3" />
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                      <span>{new Date(cmd.startTime).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{formatDuration(cmd.startTime, cmd.endTime)}</span>
                    </div>
                    {cmd.output && (
                      <div className="mt-2 p-2 bg-zinc-950 rounded text-xs font-mono text-zinc-400 max-h-32 overflow-auto">
                        <pre className="whitespace-pre-wrap">{cmd.output.substring(0, 500)}{cmd.output.length > 500 ? '...' : ''}</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Commands */}
      <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider whitespace-nowrap">
          Quick:
        </span>
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            onClick={() => executeQuickCommand(cmd)}
            disabled={isExecuting || !isConnected}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors whitespace-nowrap"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Execution indicator */}
      {isExecuting && (
        <div className="absolute bottom-16 left-4 flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span className="text-xs text-blue-400">Executing...</span>
        </div>
      )}
    </div>
  );
};

export default TerminalPanel;
