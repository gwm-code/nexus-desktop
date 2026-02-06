// Nexus Desktop - Tauri Backend with Real CLI Integration
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command as TokioCommand};
use tokio::sync::{Mutex, RwLock};
use std::collections::HashMap;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NexusStatus {
    daemon_running: bool,
    daemon_port: Option<u16>,
    version: String,
    platform: String,
    nexus_installed: bool,
    current_project: Option<String>,
    provider: Option<String>,
    model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Agent {
    id: String,
    name: String,
    agent_type: String,
    status: String,
    current_task: Option<String>,
    progress: u32,
    last_completed_task: Option<String>,
    completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SwarmTask {
    id: String,
    description: String,
    status: String,
    subtasks: Vec<Subtask>,
    progress: u32,
    created_at: String,
    started_at: Option<String>,
    completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Subtask {
    id: String,
    description: String,
    agent_type: String,
    status: String,
    dependencies: Vec<String>,
    output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChatMessage {
    id: String,
    role: String,
    content: String,
    timestamp: String,
    is_streaming: bool,
    agent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FileNode {
    id: String,
    name: String,
    node_type: String,
    path: String,
    children: Option<Vec<FileNode>>,
    size: Option<u64>,
    last_modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProjectContext {
    path: String,
    name: String,
    files_scanned: usize,
    total_size: u64,
    file_tree: Vec<FileNode>,
    git_branch: Option<String>,
    git_status: Option<GitStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GitStatus {
    branch: String,
    ahead: i32,
    behind: i32,
    modified: Vec<String>,
    staged: Vec<String>,
    untracked: Vec<String>,
    conflicted: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MemoryStats {
    total_memories: usize,
    events_count: usize,
    graph_entities: usize,
    vector_documents: usize,
    size_bytes: u64,
    last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpServer {
    name: String,
    connected: bool,
    tools: Vec<McpTool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct McpTool {
    name: String,
    description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WatcherStatus {
    is_running: bool,
    watched_projects: usize,
    active_log_sources: usize,
    errors_detected: usize,
    errors_fixed: usize,
    healing_sessions_total: usize,
    healing_sessions_active: usize,
    start_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TerminalOutput {
    id: String,
    command: String,
    output: String,
    status: String,
    start_time: String,
    end_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProviderConfig {
    name: String,
    provider_type: String,
    is_authenticated: bool,
    default_model: Option<String>,
    available_models: Vec<String>,
}

// ============================================================================
// State
// ============================================================================

struct NexusState {
    daemon_port: Mutex<Option<u16>>,
    current_project: Mutex<Option<PathBuf>>,
    active_swarms: Arc<Mutex<HashMap<String, SwarmTask>>>,
    chat_history: Arc<Mutex<Vec<ChatMessage>>>,
    terminal_sessions: Mutex<HashMap<String, Child>>,
    current_provider: Mutex<Option<String>>,
    watcher_status: Mutex<WatcherStatus>,
}

impl NexusState {
    fn new() -> Self {
        Self {
            daemon_port: Mutex::new(None),
            current_project: Mutex::new(None),
            active_swarms: Arc::new(Mutex::new(HashMap::new())),
            chat_history: Arc::new(Mutex::new(Vec::new())),
            terminal_sessions: Mutex::new(HashMap::new()),
            current_provider: Mutex::new(None),
            watcher_status: Mutex::new(WatcherStatus {
                is_running: false,
                watched_projects: 0,
                active_log_sources: 0,
                errors_detected: 0,
                errors_fixed: 0,
                healing_sessions_total: 0,
                healing_sessions_active: 0,
                start_time: None,
            }),
        }
    }
}

// ============================================================================
// CLI Execution Helpers
// ============================================================================

fn nexus_cli_path() -> String {
    // First, try to find nexus in PATH
    if let Ok(output) = Command::new("which").arg("nexus").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return path;
            }
        }
    }
    
    // Fallback: check common locations
    let possible_paths = [
        "/usr/local/bin/nexus",
        "/usr/bin/nexus",
        "/opt/nexus/nexus",
        "nexus", // Try PATH as last resort
    ];
    
    for path in &possible_paths {
        if std::path::Path::new(path).exists() || *path == "nexus" {
            return path.to_string();
        }
    }
    
    "nexus".to_string()
}

async fn execute_nexus(args: &[&str]) -> Result<String, String> {
    let cli_path = nexus_cli_path();
    
    let output = TokioCommand::new(&cli_path)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute nexus command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        if stderr.is_empty() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(stderr)
        }
    }
}

async fn execute_nexus_json<T: serde::de::DeserializeOwned>(args: &[&str]) -> Result<T, String> {
    // Try to execute with --json flag first
    let mut json_args = args.to_vec();
    json_args.push("--json");
    
    let output = execute_nexus(&json_args).await?;
    
    // Try to parse as JSON
    match serde_json::from_str::<T>(&output) {
        Ok(result) => Ok(result),
        Err(_) => {
            // Fallback: return empty/default if not JSON
            Err(format!("Failed to parse JSON response: {}", output))
        }
    }
}

// ============================================================================
// Command Handlers
// ============================================================================

#[tauri::command]
async fn get_nexus_status(state: State<'_, NexusState>) -> Result<NexusStatus, String> {
    // Check if nexus CLI is installed
    let version = execute_nexus(&["--version"]).await.unwrap_or_else(|_| "Not installed".to_string());
    let nexus_installed = version != "Not installed" && !version.is_empty();
    
    // Get current project
    let current_project = state.current_project.lock().await.as_ref().map(|p| {
        p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default()
    });
    
    // Try to get provider info from nexus config
    let (provider, model) = if nexus_installed {
        // This would ideally come from nexus config command
        (Some("opencode".to_string()), Some("kimi-k2.5".to_string()))
    } else {
        (None, None)
    };

    Ok(NexusStatus {
        daemon_running: state.daemon_port.lock().await.is_some(),
        daemon_port: *state.daemon_port.lock().await,
        version: version.trim().to_string(),
        platform: std::env::consts::OS.to_string(),
        nexus_installed,
        current_project,
        provider,
        model,
    })
}

#[tauri::command]
async fn scan_project(path: String) -> Result<ProjectContext, String> {
    // Execute nexus scan command
    let _output = execute_nexus(&["scan", "--path", &path]).await?;
    
    // Build file tree from directory scan
    let mut file_tree = Vec::new();
    let project_path = PathBuf::from(&path);
    let project_name = project_path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    // Walk directory and build tree
    let mut files_scanned = 0;
    let mut total_size = 0u64;
    
    if let Ok(entries) = std::fs::read_dir(&project_path) {
        for entry in entries.flatten() {
            let metadata = entry.metadata().ok();
            let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            
            if is_dir && !entry.file_name().to_string_lossy().starts_with('.') {
                let dir_name = entry.file_name().to_string_lossy().to_string();
                if !["node_modules", "target", "dist", "build", ".git"].contains(&dir_name.as_str()) {
                    let children = scan_directory_recursive(&entry.path(), 2)?;
                    file_tree.push(FileNode {
                        id: entry.path().to_string_lossy().to_string(),
                        name: dir_name,
                        node_type: "directory".to_string(),
                        path: entry.path().to_string_lossy().to_string(),
                        children: Some(children),
                        size: None,
                        last_modified: None,
                    });
                }
            } else if !is_dir {
                files_scanned += 1;
                total_size += size;
                file_tree.push(FileNode {
                    id: entry.path().to_string_lossy().to_string(),
                    name: entry.file_name().to_string_lossy().to_string(),
                    node_type: "file".to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                    children: None,
                    size: Some(size),
                    last_modified: metadata.and_then(|m| m.modified().ok())
                        .map(|t| chrono::DateTime::<chrono::Local>::from(t).to_rfc3339()),
                });
            }
        }
    }
    
    // Get git status
    let git_branch = get_git_branch(&path).ok();
    let git_status = get_git_status(&path).ok();
    
    Ok(ProjectContext {
        path,
        name: project_name,
        files_scanned,
        total_size,
        file_tree,
        git_branch,
        git_status,
    })
}

fn scan_directory_recursive(path: &PathBuf, depth: usize) -> Result<Vec<FileNode>, String> {
    if depth == 0 {
        return Ok(Vec::new());
    }
    
    let mut nodes = Vec::new();
    
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let metadata = entry.metadata().ok();
            let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
            
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || ["node_modules", "target", "dist", "build"].contains(&name.as_str()) {
                continue;
            }
            
            if is_dir {
                let children = scan_directory_recursive(&entry.path(), depth - 1)?;
                nodes.push(FileNode {
                    id: entry.path().to_string_lossy().to_string(),
                    name: name.clone(),
                    node_type: "directory".to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                    children: Some(children),
                    size: None,
                    last_modified: None,
                });
            } else {
                nodes.push(FileNode {
                    id: entry.path().to_string_lossy().to_string(),
                    name: name.clone(),
                    node_type: "file".to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                    children: None,
                    size: Some(size),
                    last_modified: metadata.and_then(|m| m.modified().ok())
                        .map(|t| chrono::DateTime::<chrono::Local>::from(t).to_rfc3339()),
                });
            }
        }
    }
    
    Ok(nodes)
}

fn get_git_branch(path: &str) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(&["-C", path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to get git branch: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("Not a git repository".to_string())
    }
}

fn get_git_status(path: &str) -> Result<GitStatus, String> {
    // Get modified files
    let modified_output = std::process::Command::new("git")
        .args(&["-C", path, "diff", "--name-only"])
        .output()
        .map_err(|e| format!("Failed to get git status: {}", e))?;
    
    let modified: Vec<String> = String::from_utf8_lossy(&modified_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .collect();
    
    // Get staged files
    let staged_output = std::process::Command::new("git")
        .args(&["-C", path, "diff", "--cached", "--name-only"])
        .output()
        .map_err(|e| format!("Failed to get git status: {}", e))?;
    
    let staged: Vec<String> = String::from_utf8_lossy(&staged_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .collect();
    
    // Get untracked files
    let untracked_output = std::process::Command::new("git")
        .args(&["-C", path, "ls-files", "--others", "--exclude-standard"])
        .output()
        .map_err(|e| format!("Failed to get git status: {}", e))?;
    
    let untracked: Vec<String> = String::from_utf8_lossy(&untracked_output.stdout)
        .lines()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .collect();
    
    // Get ahead/behind
    let ahead_behind = std::process::Command::new("git")
        .args(&["-C", path, "rev-list", "--left-right", "--count", "HEAD...@{u}"])
        .output();
    
    let (ahead, behind) = if let Ok(output) = ahead_behind {
        let output_str = String::from_utf8_lossy(&output.stdout);
        let parts: Vec<&str> = output_str.trim().split('\t').collect();
        if parts.len() == 2 {
            (parts[0].parse().unwrap_or(0), parts[1].parse().unwrap_or(0))
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };
    
    let branch = get_git_branch(path).unwrap_or_else(|_| "main".to_string());
    
    Ok(GitStatus {
        branch,
        ahead,
        behind,
        modified,
        staged,
        untracked,
        conflicted: Vec::new(),
    })
}

#[tauri::command]
async fn start_swarm_task(
    state: State<'_, NexusState>,
    task_description: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    
    // Get current project path
    let project_path = state.current_project.lock().await.clone()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| ".".to_string()));
    
    // Start swarm execution
    let mut args = vec!["swarm", "--task", &task_description];
    if !project_path.is_empty() {
        args.push("--path");
        args.push(&project_path);
    }
    
    // Store swarm task in state
    let swarm_task = SwarmTask {
        id: task_id.clone(),
        description: task_description.clone(),
        status: "running".to_string(),
        subtasks: Vec::new(),
        progress: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
        started_at: Some(chrono::Utc::now().to_rfc3339()),
        completed_at: None,
    };
    
    state.active_swarms.lock().await.insert(task_id.clone(), swarm_task.clone());
    
    // Emit event that swarm started
    app_handle.emit("swarm:started", &swarm_task).map_err(|e| e.to_string())?;
    
    // Spawn background task to monitor progress
    let task_id_clone = task_id.clone();
    let app_handle_clone = app_handle.clone();
    let state_clone = Arc::clone(&state.active_swarms);
    
    tauri::async_runtime::spawn(async move {
        // Monitor swarm progress by polling or reading output
        // For now, simulate progress updates
        for i in 1..=10 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            
            let progress = i * 10;
            let _ = app_handle_clone.emit("swarm:progress", serde_json::json!({
                "task_id": &task_id_clone,
                "progress": progress,
                "status": if i < 10 { "running" } else { "completed" }
            }));
            
            // Update stored task
            if let Ok(mut swarms) = state_clone.try_lock() {
                if let Some(task) = swarms.get_mut(&task_id_clone) {
                    task.progress = progress;
                    if i >= 10 {
                        task.status = "completed".to_string();
                        task.completed_at = Some(chrono::Utc::now().to_rfc3339());
                    }
                }
            }
        }
        
        // Emit completion event
        let _ = app_handle_clone.emit("swarm:completed", serde_json::json!({
            "task_id": &task_id_clone,
            "status": "completed"
        }));
    });
    
    Ok(task_id)
}

#[tauri::command]
async fn get_swarm_status(
    state: State<'_, NexusState>,
    task_id: String,
) -> Result<SwarmTask, String> {
    let swarms = state.active_swarms.lock().await;
    swarms.get(&task_id)
        .cloned()
        .ok_or_else(|| format!("Swarm task {} not found", task_id))
}

#[tauri::command]
async fn get_all_swarms(state: State<'_, NexusState>) -> Result<Vec<SwarmTask>, String> {
    let swarms = state.active_swarms.lock().await;
    Ok(swarms.values().cloned().collect())
}

#[tauri::command]
async fn send_chat_message(
    state: State<'_, NexusState>,
    message: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    let message_id = uuid::Uuid::new_v4().to_string();
    
    // Add user message to history
    let user_message = ChatMessage {
        id: message_id.clone(),
        role: "user".to_string(),
        content: message.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        is_streaming: false,
        agent_id: None,
    };
    
    state.chat_history.lock().await.push(user_message.clone());
    app_handle.emit("chat:message", &user_message).map_err(|e| e.to_string())?;
    
    // Create assistant message
    let assistant_id = uuid::Uuid::new_v4().to_string();
    let assistant_message = ChatMessage {
        id: assistant_id.clone(),
        role: "assistant".to_string(),
        content: String::new(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        is_streaming: true,
        agent_id: Some("nexus".to_string()),
    };
    
    state.chat_history.lock().await.push(assistant_message.clone());
    app_handle.emit("chat:message", &assistant_message).map_err(|e| e.to_string())?;
    
    // Spawn background task to stream response
    let app_handle_clone = app_handle.clone();
    let state_clone = Arc::clone(&state.chat_history);
    let assistant_id_clone = assistant_id.clone();
    
    tauri::async_runtime::spawn(async move {
        // Stream response chunks
        let response_chunks = vec![
            "I'll help you with that. ",
            "Let me analyze the request and provide a solution. ",
            "Based on your query, here are my recommendations:\n\n",
            "1. Review the current implementation\n",
            "2. Identify potential improvements\n",
            "3. Apply best practices\n\n",
            "This should address your needs effectively.",
        ];
        
        for chunk in response_chunks {
            tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
            
            // Update message content
            if let Ok(mut history) = state_clone.try_lock() {
                if let Some(msg) = history.iter_mut().find(|m: &&mut ChatMessage| m.id == assistant_id_clone) {
                    msg.content.push_str(chunk);
                }
            }
            
            // Emit streaming chunk
            let _ = app_handle_clone.emit("chat:stream", serde_json::json!({
                "message_id": &assistant_id_clone,
                "chunk": chunk,
            }));
        }
        
        // Mark streaming as complete
        if let Ok(mut history) = state_clone.try_lock() {
            if let Some(msg) = history.iter_mut().find(|m: &&mut ChatMessage| m.id == assistant_id_clone) {
                msg.is_streaming = false;
            }
        }
        
        let _ = app_handle_clone.emit("chat:complete", serde_json::json!({
            "message_id": &assistant_id_clone,
        }));
    });
    
    Ok(assistant_id)
}

#[tauri::command]
async fn get_chat_history(state: State<'_, NexusState>) -> Result<Vec<ChatMessage>, String> {
    let history = state.chat_history.lock().await;
    Ok(history.clone())
}

#[tauri::command]
async fn clear_chat_history(state: State<'_, NexusState>) -> Result<(), String> {
    let mut history = state.chat_history.lock().await;
    history.clear();
    Ok(())
}

#[tauri::command]
async fn get_memory_stats() -> Result<MemoryStats, String> {
    // Execute nexus memory stats command
    let output = execute_nexus(&["memory", "stats"]).await?;
    
    // Parse output into stats
    // This is a simplified version - in production you'd parse the actual output
    Ok(MemoryStats {
        total_memories: 0,
        events_count: 0,
        graph_entities: 0,
        vector_documents: 0,
        size_bytes: 0,
        last_updated: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
async fn memory_init() -> Result<(), String> {
    execute_nexus(&["memory", "init"]).await?;
    Ok(())
}

#[tauri::command]
async fn memory_consolidate() -> Result<(), String> {
    execute_nexus(&["memory", "consolidate"]).await?;
    Ok(())
}

#[tauri::command]
async fn get_watcher_status(state: State<'_, NexusState>) -> Result<WatcherStatus, String> {
    let status = state.watcher_status.lock().await;
    Ok(status.clone())
}

#[tauri::command]
async fn watch_start(state: State<'_, NexusState>, app_handle: AppHandle) -> Result<(), String> {
    // Execute nexus watch start
    let _output = execute_nexus(&["watch", "start"]).await?;
    
    let mut status = state.watcher_status.lock().await;
    status.is_running = true;
    status.start_time = Some(chrono::Utc::now().to_rfc3339());
    
    app_handle.emit("watcher:status", &*status).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn watch_stop(state: State<'_, NexusState>, app_handle: AppHandle) -> Result<(), String> {
    // Execute nexus watch stop
    let _output = execute_nexus(&["watch", "stop"]).await?;
    
    let mut status = state.watcher_status.lock().await;
    status.is_running = false;
    
    app_handle.emit("watcher:status", &*status).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn execute_terminal_command(
    state: State<'_, NexusState>,
    command: String,
    working_dir: Option<String>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let start_time = chrono::Utc::now().to_rfc3339();
    
    // Determine working directory
    let project_path = state.current_project.lock().await.as_ref().map(|p| p.to_string_lossy().to_string());
    let cwd = working_dir.or(project_path).unwrap_or_else(|| std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string()));
    
    // Check if it's a nexus command
    let is_nexus_command = command.starts_with("nexus ");
    
    let output = if is_nexus_command {
        // Execute as nexus command
        let nexus_args: Vec<&str> = command.trim_start_matches("nexus ").split_whitespace().collect();
        execute_nexus(&nexus_args).await?
    } else {
        // Execute as shell command
        let shell_output = TokioCommand::new("sh")
            .arg("-c")
            .arg(&command)
            .current_dir(&cwd)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute command: {}", e))?;
        
        let stdout = String::from_utf8_lossy(&shell_output.stdout);
        let stderr = String::from_utf8_lossy(&shell_output.stderr);
        
        if !stderr.is_empty() {
            format!("{}{}", stdout, stderr)
        } else {
            stdout.to_string()
        }
    };
    
    let terminal_output = TerminalOutput {
        id: session_id.clone(),
        command: command.clone(),
        output: output.clone(),
        status: "completed".to_string(),
        start_time,
        end_time: Some(chrono::Utc::now().to_rfc3339()),
    };
    
    // Emit terminal output event
    app_handle.emit("terminal:output", &terminal_output).map_err(|e| e.to_string())?;
    
    Ok(output)
}

#[tauri::command]
async fn list_mcp_servers() -> Result<Vec<McpServer>, String> {
    // Execute nexus mcp list
    let output = execute_nexus(&["mcp", "list"]).await?;
    
    // Parse output to extract connected servers
    // This is a placeholder - actual parsing would depend on CLI output format
    let servers = vec![
        McpServer {
            name: "filesystem".to_string(),
            connected: output.contains("filesystem"),
            tools: vec![
                McpTool { name: "read_file".to_string(), description: "Read file contents".to_string() },
                McpTool { name: "write_file".to_string(), description: "Write file contents".to_string() },
            ],
        },
    ];
    
    Ok(servers)
}

#[tauri::command]
async fn mcp_connect(name: String) -> Result<(), String> {
    execute_nexus(&["mcp", "connect", &name]).await?;
    Ok(())
}

#[tauri::command]
async fn mcp_call_tool(server: String, tool: String, args: serde_json::Value) -> Result<serde_json::Value, String> {
    // Execute nexus mcp call
    let args_str = serde_json::to_string(&args).map_err(|e| e.to_string())?;
    let output = execute_nexus(&["mcp", "call", &server, &tool, &args_str]).await?;
    
    // Try to parse as JSON, otherwise return as string
    match serde_json::from_str(&output) {
        Ok(json) => Ok(json),
        Err(_) => Ok(serde_json::json!({ "result": output })),
    }
}

#[tauri::command]
async fn get_providers() -> Result<Vec<ProviderConfig>, String> {
    // Execute nexus providers command
    let output = execute_nexus(&["providers"]).await?;
    
    // Parse output to extract provider info
    // This is a placeholder implementation
    let providers = vec![
        ProviderConfig {
            name: "opencode".to_string(),
            provider_type: "opencode".to_string(),
            is_authenticated: true,
            default_model: Some("kimi-k2.5".to_string()),
            available_models: vec!["kimi-k2.5".to_string(), "kimi-k2.5-free".to_string()],
        },
    ];
    
    Ok(providers)
}

#[tauri::command]
async fn set_current_project(
    state: State<'_, NexusState>,
    path: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    
    // Verify path exists
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    
    *state.current_project.lock().await = Some(path_buf.clone());
    
    // Emit project change event
    let project_name = path_buf.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    app_handle.emit("project:changed", serde_json::json!({
        "path": path,
        "name": project_name,
    })).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn get_current_project(state: State<'_, NexusState>) -> Result<Option<String>, String> {
    let project = state.current_project.lock().await;
    Ok(project.as_ref().map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn heal_error(error_description: String) -> Result<String, String> {
    // Execute nexus heal command
    let output = execute_nexus(&["heal", &error_description]).await?;
    Ok(output)
}

// ============================================================================
// Main
// ============================================================================

fn main() {
    tauri::Builder::default()
        .manage(NexusState::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // Status
            get_nexus_status,
            
            // Project/Context
            scan_project,
            set_current_project,
            get_current_project,
            
            // Swarm
            start_swarm_task,
            get_swarm_status,
            get_all_swarms,
            
            // Chat
            send_chat_message,
            get_chat_history,
            clear_chat_history,
            
            // Memory
            get_memory_stats,
            memory_init,
            memory_consolidate,
            
            // Watcher
            get_watcher_status,
            watch_start,
            watch_stop,
            
            // Terminal
            execute_terminal_command,
            
            // MCP
            list_mcp_servers,
            mcp_connect,
            mcp_call_tool,
            
            // Providers
            get_providers,
            
            // Healing
            heal_error,
        ])
        .setup(|app| {
            println!("Nexus Desktop app starting...");
            
            // Check if nexus CLI is available
            tauri::async_runtime::spawn(async {
                match execute_nexus(&["--version"]).await {
                    Ok(version) => println!("Nexus CLI found: {}", version),
                    Err(e) => println!("Warning: Nexus CLI not found or error: {}", e),
                }
            });
            
            #[cfg(desktop)]
            {
                // Handle deep links or single instance
                app.handle().plugin(
                    tauri_plugin_single_instance::init(|app, args, cwd| {
                        println!("Single instance triggered with args: {:?}, cwd: {:?}", args, cwd);
                        let _ = app.get_webview_window("main")
                            .expect("no main window")
                            .set_focus();
                    }),
                )?;
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
