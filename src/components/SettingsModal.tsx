import { useState, useEffect, useRef } from 'react';
import {
  X, Server, Shield, Key, Terminal, Check, AlertCircle,
  Palette, Code2, Settings2, Cpu, Zap, Eye, EyeOff,
  RotateCcw, Database, Activity, FileText, Clock, Play, StopCircle,
  Layers, Search
} from 'lucide-react';
import { useNexusStore } from '../store/useNexusStore';
import { invoke } from '@tauri-apps/api/core';

type Tab = 'connection' | 'provider' | 'appearance' | 'editor' | 'hierarchy' | 'advanced' | 'logs';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'connection', label: 'Connection', icon: Server },
  { id: 'provider', label: 'Provider & Model', icon: Cpu },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code2 },
  { id: 'hierarchy', label: 'Model Hierarchy', icon: Layers },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
  { id: 'logs', label: 'Logs', icon: FileText },
];

// Shared input styling
const inputClass = 'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelClass = 'text-[11px] font-medium text-zinc-400 ml-1';
const sectionTitleClass = 'flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest';

// ============================================================================
// Toggle Component
// ============================================================================

const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({
  enabled, onChange, label, description,
}) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm text-zinc-300">{label}</p>
      {description && <p className="text-[11px] text-zinc-600 mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  </div>
);

// ============================================================================
// Connection Tab (existing SSH settings)
// ============================================================================

const ConnectionTab: React.FC = () => {
  const { settings, updateSetting, setBackendStatus, addToast } = useNexusStore();
  const [host, setHost] = useState(settings.sshSettings?.host || '89.167.14.222');
  const [port, setPort] = useState(settings.sshSettings?.port || 22);
  const [username, setUsername] = useState(settings.sshSettings?.username || 'root');
  const [password, setPassword] = useState(settings.sshSettings?.password || '');
  const [privateKey, setPrivateKey] = useState(settings.sshSettings?.privateKey || '');
  const [publicKey, setPublicKey] = useState(settings.sshSettings?.publicKey || '');
  const [authMode, setAuthMode] = useState<'password' | 'key'>(privateKey ? 'key' : 'password');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConnect = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    try {
      await invoke('connect_remote', {
        host, port, username,
        password: authMode === 'password' ? (password || null) : null,
        privateKey: authMode === 'key' ? (privateKey || null) : null,
        publicKey: authMode === 'key' ? (publicKey || null) : null,
      });
      updateSetting('sshSettings', {
        host, port, username,
        password: authMode === 'password' ? password : '',
        privateKey: authMode === 'key' ? privateKey : '',
        publicKey: authMode === 'key' ? publicKey : '',
      });
      setBackendStatus('connected');
      setStatus('success');
      addToast({ type: 'success', title: 'Connected', message: `SSH to ${host}:${port}` });
    } catch (err: any) {
      setStatus('error');
      setBackendStatus('error', err.toString());
      setErrorMessage(err.toString());
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Shield className="w-3.5 h-3.5" />
        <span>Remote SSH</span>
        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 ml-auto">
          <button
            onClick={() => setAuthMode('password')}
            className={`px-2 py-1 rounded-md text-[10px] transition-all ${authMode === 'password' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}
          >Password</button>
          <button
            onClick={() => setAuthMode('key')}
            className={`px-2 py-1 rounded-md text-[10px] transition-all ${authMode === 'key' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}
          >Key</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Host Address</label>
          <input value={host} onChange={(e) => setHost(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>SSH Port</label>
          <input type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
      </div>

      {authMode === 'password' ? (
        <div className="space-y-1.5">
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
            <Key className="absolute right-3 top-2.5 w-4 h-4 text-zinc-600" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Private Key Content</label>
            <textarea value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} rows={4} className={`${inputClass} text-[10px] font-mono resize-none`} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Public Key Content (Optional for RSA, Required for ED25519)</label>
            <textarea value={publicKey} onChange={(e) => setPublicKey(e.target.value)} rows={2} className={`${inputClass} text-[10px] font-mono resize-none`} placeholder="ssh-ed25519 AAAA..." />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 leading-relaxed">{errorMessage}</p>
        </div>
      )}
      {status === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-400 font-medium">Connected to Nexus brain</p>
        </div>
      )}

      <button onClick={handleConnect} disabled={status === 'connecting'} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all w-full justify-center ${status === 'connecting' ? 'bg-blue-600/50 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'}`}>
        {status === 'connecting' ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
            <span>Connecting...</span>
          </div>
        ) : (
          <><Terminal className="w-3.5 h-3.5" /><span>Establish Connection</span></>
        )}
      </button>
    </div>
  );
};

// ============================================================================
// Provider & Model Tab
// ============================================================================

const ProviderTab: React.FC = () => {
  const {
    availableProviders, availableModels, activeProvider, activeModel,
    setProvider, setModel, setApiKey, loadAvailableModels, testProviderConnection, loadProviders,
  } = useNexusStore();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [savingKey, setSavingKey] = useState(false);

  // OAuth state
  const [authorizingOAuth, setAuthorizingOAuth] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<{authorized: boolean; expiresAt?: string} | null>(null);

  const knownProviders = ['opencode', 'openrouter', 'google', 'claude', 'custom'];
  const providerList = availableProviders.length > 0
    ? [...new Set([...availableProviders, ...knownProviders])]
    : knownProviders;

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (activeProvider) {
      loadAvailableModels(activeProvider);
    }
  }, [activeProvider, loadAvailableModels]);

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim() || !activeProvider) return;
    setSavingKey(true);
    try {
      await setApiKey(activeProvider, apiKeyInput.trim());
      setApiKeyInput('');
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestConnection = async () => {
    if (!activeProvider) return;
    setTestStatus('testing');
    try {
      await testProviderConnection(activeProvider);
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  // Check OAuth status when provider changes
  useEffect(() => {
    const checkOAuth = async () => {
      if (['claude', 'openai'].includes(activeProvider)) {
        try {
          const status: {authorized: boolean; provider: string; expiresAt?: string} = await invoke('oauth_check_status', { provider: activeProvider });
          setOauthStatus({ authorized: status.authorized, expiresAt: status.expiresAt });
        } catch {
          setOauthStatus({ authorized: false });
        }
      } else {
        setOauthStatus(null);
      }
    };
    checkOAuth();
  }, [activeProvider]);

  const handleOAuthAuthorize = async () => {
    setAuthorizingOAuth(true);
    try {
      // Start OAuth flow - opens browser automatically
      await invoke('oauth_authorize', { provider: activeProvider });

      // Refresh OAuth status after a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      const status: {authorized: boolean; expiresAt?: string} = await invoke('oauth_check_status', { provider: activeProvider });
      setOauthStatus(status);

      if (status.authorized) {
        // Refresh model list now that we're authenticated
        await loadAvailableModels(activeProvider);

        useNexusStore.getState().addToast({
          type: 'success',
          title: 'OAuth Authorized!',
          message: `Successfully authorized ${activeProvider}`
        });
      }
    } catch (e) {
      useNexusStore.getState().addToast({
        type: 'error',
        title: 'OAuth Failed',
        message: String(e)
      });
    } finally {
      setAuthorizingOAuth(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Cpu className="w-3.5 h-3.5" />
        <span>AI Provider</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Provider</label>
        <select
          value={activeProvider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          <option value="">Select provider...</option>
          {providerList.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Model</label>
        <select
          value={activeModel}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
          disabled={!activeProvider}
        >
          <option value="">Select model...</option>
          {availableModels.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {availableModels.length === 0 && activeProvider && (
          <p className="text-[10px] text-zinc-600 mt-1">No models loaded. Save an API key and test connection first.</p>
        )}
      </div>

      {/* Error Recovery UI */}
      {!activeProvider && (
        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-300 space-y-2">
              <p className="font-medium">⚠️ No Provider Configured</p>
              <p className="text-yellow-400/80">Select a provider above to get started. You'll need to configure authentication (API key or OAuth) for the provider to work.</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setProvider('google');
                  }}
                  className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-[10px] font-medium text-yellow-300 transition-colors"
                >
                  Configure Google (Free)
                </button>
                <button
                  onClick={() => {
                    setProvider('openrouter');
                  }}
                  className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-[10px] font-medium text-yellow-300 transition-colors"
                >
                  Configure OpenRouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeProvider && availableModels.length === 0 && !oauthStatus?.authorized && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300 space-y-2">
              <p className="font-medium">🔑 Authentication Required</p>
              <p className="text-blue-400/80">
                Provider <span className="font-mono text-blue-300">{activeProvider}</span> is selected but not authenticated.
                {['google', 'claude', 'openai'].includes(activeProvider)
                  ? ' Use OAuth (recommended) or add an API key below.'
                  : ' Add an API key below to continue.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={sectionTitleClass}>
        <Key className="w-3.5 h-3.5" />
        <span>Authentication</span>
      </div>

      {/* OAuth UI for providers that support it (NOT Google - Gemini uses API keys) */}
      {['claude', 'openai'].includes(activeProvider) && (
        <div className="space-y-4">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-300">
              <Shield className="w-4 h-4" />
              <span>OAuth Authentication (Recommended)</span>
            </div>

            {oauthStatus?.authorized ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Check className="w-4 h-4" />
                  <span>Authorized</span>
                  {oauthStatus.expiresAt && (
                    <span className="text-zinc-500">
                      • Expires: {new Date(oauthStatus.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400">
                  You're authenticated and ready to use {
                    activeProvider === 'google' ? 'Google Gemini' :
                    activeProvider === 'claude' ? 'Anthropic Claude' :
                    'OpenAI'
                  }
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-blue-300">
                  Click below to securely authenticate. Your browser will open for login.
                </p>

                <button
                  onClick={handleOAuthAuthorize}
                  disabled={authorizingOAuth}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {authorizingOAuth ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Authorizing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Login with {
                        activeProvider === 'google' ? 'Google' :
                        activeProvider === 'claude' ? 'Anthropic' :
                        'OpenAI'
                      }
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="text-center text-xs text-zinc-500">
            — or —
          </div>
        </div>
      )}

      {/* API Key for all providers */}
      <div className="space-y-1.5">
        <label className={labelClass}>API Key {activeProvider ? `(${activeProvider})` : ''}</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className={`${inputClass} pr-10`}
              placeholder="sk-..."
              disabled={!activeProvider}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-2.5 text-zinc-600 hover:text-zinc-400"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKeyInput.trim() || !activeProvider || savingKey}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            {savingKey ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {activeProvider === 'custom' && (
        <div className="space-y-1.5">
          <label className={labelClass}>Base URL</label>
          <input
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            className={inputClass}
            placeholder="https://api.example.com/v1"
          />
        </div>
      )}

      <button
        onClick={handleTestConnection}
        disabled={!activeProvider || testStatus === 'testing'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all w-full justify-center ${
          testStatus === 'testing' ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed' :
          testStatus === 'success' ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' :
          testStatus === 'error' ? 'bg-red-600/20 border border-red-500/30 text-red-400' :
          'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
        }`}
      >
        {testStatus === 'testing' ? (
          <><div className="animate-spin h-3.5 w-3.5 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full" /><span>Testing...</span></>
        ) : testStatus === 'success' ? (
          <><Check className="w-3.5 h-3.5" /><span>Connection Verified</span></>
        ) : testStatus === 'error' ? (
          <><AlertCircle className="w-3.5 h-3.5" /><span>Connection Failed</span></>
        ) : (
          <><Zap className="w-3.5 h-3.5" /><span>Test Connection</span></>
        )}
      </button>
    </div>
  );
};

// ============================================================================
// Appearance Tab
// ============================================================================

const AppearanceTab: React.FC = () => {
  const { settings, updateSetting } = useNexusStore();

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Palette className="w-3.5 h-3.5" />
        <span>Theme & Display</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Theme</label>
        <div className="flex gap-2">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateSetting('theme', t)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                settings.theme === t
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Font Size ({settings.fontSize}px)</label>
        <input
          type="range" min={10} max={20} step={1}
          value={settings.fontSize}
          onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>10px</span><span>20px</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Font Family</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => updateSetting('fontFamily', e.target.value)}
          className={inputClass}
        >
          {['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Cascadia Code', 'Menlo', 'Monaco', 'Consolas'].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className={sectionTitleClass}>
        <Settings2 className="w-3.5 h-3.5" />
        <span>Panels</span>
      </div>

      <Toggle
        label="Sidebar Visible"
        description="Show the left sidebar on startup"
        enabled={settings.sidebarVisible}
        onChange={(v) => updateSetting('sidebarVisible', v)}
      />
      <Toggle
        label="Terminal Visible"
        description="Show the terminal panel on startup"
        enabled={settings.terminalVisible}
        onChange={(v) => updateSetting('terminalVisible', v)}
      />
    </div>
  );
};

// ============================================================================
// Editor Tab
// ============================================================================

const EditorTab: React.FC = () => {
  const { settings, updateSetting } = useNexusStore();
  const editor = settings.editorSettings || { tabSize: 2, useSpaces: true, wordWrap: true, minimap: false, lineNumbers: true };

  const updateEditor = (key: string, value: any) => {
    updateSetting('editorSettings', { ...editor, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Code2 className="w-3.5 h-3.5" />
        <span>Code Editor</span>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Tab Size</label>
        <div className="flex gap-2">
          {[2, 4, 8].map((size) => (
            <button
              key={size}
              onClick={() => updateEditor('tabSize', size)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                editor.tabSize === size
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {size} spaces
            </button>
          ))}
        </div>
      </div>

      <Toggle
        label="Use Spaces"
        description="Insert spaces instead of tab characters"
        enabled={editor.useSpaces}
        onChange={(v) => updateEditor('useSpaces', v)}
      />
      <Toggle
        label="Word Wrap"
        description="Wrap long lines to fit the editor width"
        enabled={editor.wordWrap}
        onChange={(v) => updateEditor('wordWrap', v)}
      />
      <Toggle
        label="Minimap"
        description="Show code minimap on the right side"
        enabled={editor.minimap}
        onChange={(v) => updateEditor('minimap', v)}
      />
      <Toggle
        label="Line Numbers"
        description="Show line numbers in the gutter"
        enabled={editor.lineNumbers}
        onChange={(v) => updateEditor('lineNumbers', v)}
      />
    </div>
  );
};

// ============================================================================
// Heartbeat Section Component
// ============================================================================

const HeartbeatSection: React.FC = () => {
  const { addToast } = useNexusStore();
  const [daemonStatus, setDaemonStatus] = useState<{
    running: boolean;
    pid?: number;
    interval_hours?: number;
    last_run?: string;
    next_run?: string;
  } | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState(24);
  const [loading, setLoading] = useState(false);

  const fetchDaemonStatus = async () => {
    try {
      const status = await invoke<{
        running: boolean;
        pid?: number;
        interval_hours?: number;
        last_run?: string;
        next_run?: string;
      }>('daemon_status');
      setDaemonStatus(status);
      if (status.interval_hours) {
        setHeartbeatInterval(status.interval_hours);
      }
    } catch (e) {
      console.error('Failed to fetch daemon status:', e);
    }
  };

  useEffect(() => {
    fetchDaemonStatus();
    const pollInterval = setInterval(fetchDaemonStatus, 10000); // Poll every 10s
    return () => clearInterval(pollInterval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      await invoke('daemon_start', { interval: heartbeatInterval });
      addToast({ type: 'success', title: 'Heartbeat daemon started', message: `Running every ${heartbeatInterval} hours` });
      await fetchDaemonStatus();
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to start daemon', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await invoke('daemon_stop');
      addToast({ type: 'success', title: 'Heartbeat daemon stopped' });
      await fetchDaemonStatus();
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to stop daemon', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async () => {
    setLoading(true);
    try {
      await invoke('daemon_run_tasks');
      addToast({ type: 'success', title: 'Proactive tasks completed' });
      await fetchDaemonStatus();
    } catch (e) {
      addToast({ type: 'error', title: 'Tasks failed', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={sectionTitleClass}>
        <Clock className="w-3.5 h-3.5" />
        <span>Proactive Heartbeat</span>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-3">
        <p className="text-[11px] text-zinc-500">
          Run proactive tasks in the background at regular intervals: memory consolidation, TODO scanning, dependency checks, and build error detection.
        </p>

        {daemonStatus && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Status:</span>
              <span className={daemonStatus.running ? 'text-emerald-400' : 'text-zinc-600'}>
                {daemonStatus.running ? 'Running' : 'Stopped'}
                {daemonStatus.pid && ` (PID ${daemonStatus.pid})`}
              </span>
            </div>

            {daemonStatus.last_run && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Last Run:</span>
                <span className="text-zinc-400">{daemonStatus.last_run}</span>
              </div>
            )}

            {daemonStatus.next_run && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Next Run:</span>
                <span className="text-zinc-400">{daemonStatus.next_run}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className={labelClass}>
            Heartbeat Interval ({heartbeatInterval} hours)
          </label>
          <input
            type="range"
            min={1}
            max={24}
            step={1}
            value={heartbeatInterval}
            onChange={(e) => setHeartbeatInterval(parseInt(e.target.value))}
            disabled={daemonStatus?.running || loading}
            className="w-full accent-blue-500 disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>1h</span>
            <span>12h</span>
            <span>24h</span>
          </div>
        </div>

        <div className="flex gap-2">
          {!daemonStatus?.running ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400 transition-colors"
            >
              {loading ? (
                <div className="animate-spin h-3.5 w-3.5 border-2 border-emerald-500/30 border-t-emerald-300 rounded-full" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Start Heartbeat</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 border border-red-500/30 rounded-lg text-xs font-medium text-red-400 transition-colors"
            >
              {loading ? (
                <div className="animate-spin h-3.5 w-3.5 border-2 border-red-500/30 border-t-red-300 rounded-full" />
              ) : (
                <StopCircle className="w-3.5 h-3.5" />
              )}
              <span>Stop Heartbeat</span>
            </button>
          )}

          <button
            onClick={handleRunNow}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-400 transition-colors"
          >
            {loading ? (
              <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-500/30 border-t-blue-300 rounded-full" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Run Now</span>
          </button>
        </div>
      </div>
    </>
  );
};

// Hierarchy Tab
// ============================================================================

interface ModelCapability {
  id: string;
  provider: string;
  display_name: string;
  speed_score: number;
  reasoning_score: number;
  coding_score: number;
  cost_per_1m_tokens: number;
}

interface ModelTier {
  model_id: string;
  max_tokens?: number;
  max_cost_per_request?: number;
}

interface Hierarchy {
  heartbeat: ModelTier[];
  daily: ModelTier[];
  planning: ModelTier[];
  coding: ModelTier[];
  review: ModelTier[];
}

const HierarchyTab: React.FC = () => {
  const { addToast } = useNexusStore();
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [models, setModels] = useState<ModelCapability[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const presets = [
    { id: 'balanced', label: 'Balanced', description: 'Good mix of speed, cost, and quality' },
    { id: 'budget', label: 'Budget', description: 'Minimize costs with free/cheap models' },
    { id: 'premium', label: 'Premium', description: 'Best models, ignore cost' },
    { id: 'speed', label: 'Speed', description: 'Prioritize fast responses' },
    { id: 'claude-only', label: 'Claude Only', description: 'Use only Claude models' },
  ];

  const categories = [
    { id: 'heartbeat', label: 'Heartbeat', description: 'Proactive checks, simple automation', icon: Clock },
    { id: 'daily', label: 'Daily', description: 'Simple queries, file reads, status', icon: Activity },
    { id: 'planning', label: 'Planning', description: 'Architecture, design, reasoning', icon: Zap },
    { id: 'coding', label: 'Coding', description: 'Code generation, refactoring', icon: Code2 },
    { id: 'review', label: 'Review', description: 'Code review, testing, validation', icon: Check },
  ];

  useEffect(() => {
    loadHierarchy();
    loadModels();
  }, []);

  const loadHierarchy = async () => {
    try {
      const data = await invoke<Hierarchy>('hierarchy_get');
      setHierarchy(data);
    } catch (e) {
      console.error('Failed to load hierarchy:', e);
      addToast({ type: 'error', title: 'Failed to load hierarchy', message: String(e) });
    }
  };

  const loadModels = async () => {
    try {
      const data = await invoke<ModelCapability[]>('get_model_capabilities');
      setModels(data);
    } catch (e) {
      console.error('Failed to load models:', e);
    }
  };

  const handlePresetChange = async (preset: string) => {
    setLoading(true);
    try {
      await invoke('hierarchy_set_preset', { preset });
      setSelectedPreset(preset);
      await loadHierarchy();
      addToast({ type: 'success', title: 'Preset applied', message: `Switched to ${preset} preset` });
      setEditMode(false);
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to set preset', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (category: string, tier: number, modelId: string) => {
    setLoading(true);
    try {
      await invoke('hierarchy_set_model', { category, tier, modelId });
      await loadHierarchy();
      addToast({ type: 'success', title: 'Model updated', message: `Set ${category} tier ${tier + 1} to ${modelId}` });
    } catch (e) {
      addToast({ type: 'error', title: 'Failed to update model', message: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const getModelDisplay = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return modelId;

    const costBadge = model.cost_per_1m_tokens === 0 ? '💚 Free' : `$${model.cost_per_1m_tokens.toFixed(2)}/1M`;
    return `${model.display_name} - ${costBadge}`;
  };

  const ScoreBadge: React.FC<{ label: string; score: number; max?: number }> = ({ label, score, max = 10 }) => {
    const percentage = (score / max) * 100;
    const color = percentage >= 80 ? 'emerald' : percentage >= 60 ? 'blue' : percentage >= 40 ? 'yellow' : 'red';

    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-600 uppercase">{label}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-sm ${
                i < score ? `bg-${color}-500` : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-zinc-500 ml-0.5">{score}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Preset Selection */}
      <div>
        <div className={sectionTitleClass}>
          <Layers className="w-3.5 h-3.5" />
          <span>Quick Presets</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              disabled={loading}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedPreset === preset.id
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-xs font-medium">{preset.label}</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {editMode ? '← Back to presets' : '✏️ Customize tiers'}
          </button>
        </div>
      </div>

      {/* Custom Hierarchy Editor */}
      {editMode && hierarchy && (
        <div className="space-y-4">
          <div className={sectionTitleClass}>
            <Settings2 className="w-3.5 h-3.5" />
            <span>Custom Hierarchy</span>
          </div>

          {categories.map(category => {
            const Icon = category.icon;
            const tiers = hierarchy[category.id as keyof Hierarchy] || [];

            return (
              <div key={category.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-300">{category.label}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{category.description}</span>
                </div>

                {tiers.map((tier, index) => (
                  <div key={index} className="space-y-1.5">
                    <label className={labelClass}>
                      Tier {index + 1} {index === 0 && '(Primary)'}
                    </label>
                    <select
                      value={tier.model_id}
                      onChange={(e) => handleModelChange(category.id, index, e.target.value)}
                      disabled={loading}
                      className={inputClass}
                    >
                      <option value="">Select model...</option>
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {getModelDisplay(model.id)}
                        </option>
                      ))}
                    </select>

                    {/* Show model details */}
                    {tier.model_id && models.find(m => m.id === tier.model_id) && (
                      <div className="flex gap-3 px-2">
                        <ScoreBadge
                          label="Speed"
                          score={models.find(m => m.id === tier.model_id)!.speed_score}
                        />
                        <ScoreBadge
                          label="Reason"
                          score={models.find(m => m.id === tier.model_id)!.reasoning_score}
                        />
                        <ScoreBadge
                          label="Code"
                          score={models.find(m => m.id === tier.model_id)!.coding_score}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {tiers.length === 0 && (
                  <p className="text-xs text-zinc-600 italic">No tiers configured</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Panel */}
      {!editMode && (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300 space-y-1">
              <p className="font-medium">How Model Hierarchy Works:</p>
              <ul className="list-disc list-inside text-[11px] text-blue-400/80 space-y-0.5">
                <li>Tasks are categorized automatically (heartbeat, daily, planning, coding, review)</li>
                <li>Each category has 1-3 tiers (Tier 1 = cheapest/fastest, Tier 2+ = escalation)</li>
                <li>If a model fails or refuses, the system auto-escalates to the next tier</li>
                <li>Presets configure all categories at once, or customize per-category</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Advanced Tab
// ============================================================================

const AdvancedTab: React.FC = () => {
  const { settings, updateSetting, consolidateMemory, addToast } = useNexusStore();
  const [consolidating, setConsolidating] = useState(false);

  const handleConsolidate = async () => {
    setConsolidating(true);
    try {
      await consolidateMemory();
      addToast({ type: 'success', title: 'Memory consolidated' });
    } catch {
      addToast({ type: 'error', title: 'Consolidation failed' });
    } finally {
      setConsolidating(false);
    }
  };

  const handleWatcherAction = async (action: 'start' | 'stop') => {
    try {
      await invoke(action === 'start' ? 'watch_start' : 'watch_stop');
      addToast({ type: 'success', title: `Watcher ${action}ed` });
    } catch (e) {
      addToast({ type: 'error', title: `Failed to ${action} watcher`, message: String(e) });
    }
  };

  return (
    <div className="space-y-6">
      <div className={sectionTitleClass}>
        <Settings2 className="w-3.5 h-3.5" />
        <span>Auto-Save</span>
      </div>

      <Toggle
        label="Auto-Save"
        description="Automatically save changes"
        enabled={settings.autoSave}
        onChange={(v) => updateSetting('autoSave', v)}
      />

      {settings.autoSave && (
        <div className="space-y-1.5">
          <label className={labelClass}>Save Interval ({settings.autoSaveInterval}s)</label>
          <input
            type="range" min={5} max={120} step={5}
            value={settings.autoSaveInterval}
            onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>5s</span><span>120s</span>
          </div>
        </div>
      )}

      <div className={sectionTitleClass}>
        <Activity className="w-3.5 h-3.5" />
        <span>Notifications & Privacy</span>
      </div>

      <Toggle
        label="Notifications"
        description="Show desktop notifications for events"
        enabled={settings.enableNotifications}
        onChange={(v) => updateSetting('enableNotifications', v)}
      />
      <Toggle
        label="Sound Effects"
        description="Play sounds for certain events"
        enabled={settings.soundEffects}
        onChange={(v) => updateSetting('soundEffects', v)}
      />
      <Toggle
        label="Telemetry"
        description="Send anonymous usage data to improve Nexus"
        enabled={settings.telemetryEnabled}
        onChange={(v) => updateSetting('telemetryEnabled', v)}
      />

      <div className={sectionTitleClass}>
        <Database className="w-3.5 h-3.5" />
        <span>Memory & Watcher</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConsolidate}
          disabled={consolidating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-colors"
        >
          {consolidating ? (
            <><div className="animate-spin h-3.5 w-3.5 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full" /><span>Consolidating...</span></>
          ) : (
            <><Database className="w-3.5 h-3.5" /><span>Consolidate Memory</span></>
          )}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleWatcherAction('start')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Start Watcher</span>
        </button>
        <button
          onClick={() => handleWatcherAction('stop')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-xs font-medium text-red-400 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Stop Watcher</span>
        </button>
      </div>

      <HeartbeatSection />

      <div className={sectionTitleClass}>
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reset</span>
      </div>

      <button
        onClick={() => {
          useNexusStore.getState().resetSettings();
          addToast({ type: 'info', title: 'Settings reset to defaults' });
        }}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors w-full"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reset All Settings</span>
      </button>
    </div>
  );
};

// ============================================================================
// Logs Tab
// ============================================================================

const LogsTab: React.FC = () => {
  const { logs, clearLogs } = useNexusStore();
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log =>
    filterLevel === 'all' || log.level === filterLevel
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-500/10';
      case 'warn': return 'text-yellow-400 bg-yellow-500/10';
      case 'info': return 'text-blue-400 bg-blue-500/10';
      case 'debug': return 'text-zinc-400 bg-zinc-500/10';
      default: return 'text-zinc-300';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'frontend': return '🖥️';
      case 'backend': return '⚙️';
      case 'cli': return '💻';
      default: return '📄';
    }
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="px-3 py-1.5 bg-zinc-800 rounded text-xs"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings Only</option>
            <option value="info">Info Only</option>
            <option value="debug">Debug Only</option>
          </select>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportLogs}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs"
          >
            📥 Export
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Logs Display */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 h-96 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            No logs to display
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredLogs.map((log, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="opacity-60">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{getSourceIcon(log.source)}</span>
                  <span className="uppercase font-bold">{log.level}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
                {log.details && (
                  <div className="mt-1 pl-20 text-zinc-500 text-[10px]">
                    {log.details}
                  </div>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-zinc-500">Total</div>
          <div className="text-lg font-bold">{logs.length}</div>
        </div>
        <div className="bg-red-500/10 rounded p-2 text-center">
          <div className="text-red-400">Errors</div>
          <div className="text-lg font-bold text-red-400">
            {logs.filter(l => l.level === 'error').length}
          </div>
        </div>
        <div className="bg-yellow-500/10 rounded p-2 text-center">
          <div className="text-yellow-400">Warnings</div>
          <div className="text-lg font-bold text-yellow-400">
            {logs.filter(l => l.level === 'warn').length}
          </div>
        </div>
        <div className="bg-blue-500/10 rounded p-2 text-center">
          <div className="text-blue-400">Info</div>
          <div className="text-lg font-bold text-blue-400">
            {logs.filter(l => l.level === 'info').length}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Settings Modal
// ============================================================================

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('connection');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tabs based on search query
  const filteredTabs = tabs.filter(tab => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return tab.label.toLowerCase().includes(query) ||
           tab.id.toLowerCase().includes(query);
  });

  // Auto-switch to first matching tab when searching
  useEffect(() => {
    if (searchQuery && filteredTabs.length > 0 && !filteredTabs.find(t => t.id === activeTab)) {
      setActiveTab(filteredTabs[0].id);
    }
  }, [searchQuery, filteredTabs, activeTab]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[680px] max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
            </div>
            <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Tab Sidebar */}
          <div className="w-48 border-r border-zinc-800 bg-zinc-950/50 py-2 flex-shrink-0">
            {filteredTabs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-zinc-600">No matching settings</p>
              </div>
            ) : (
              filteredTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === id
                      ? 'bg-zinc-800/80 text-zinc-100 border-r-2 border-blue-500'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'connection' && <ConnectionTab />}
            {activeTab === 'provider' && <ProviderTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'editor' && <EditorTab />}
            {activeTab === 'hierarchy' && <HierarchyTab />}
            {activeTab === 'advanced' && <AdvancedTab />}
            {activeTab === 'logs' && <LogsTab />}
          </div>
        </div>
      </div>
    </div>
  );
};
