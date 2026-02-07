# AppImage Initialization Hang - Debugging Build

## Build Location
```
/root/clawd/projects/nexus-desktop/src-tauri/target/release/bundle/appimage/Nexus_0.1.0_aarch64.AppImage
```

## Changes Made

### 1. Comprehensive Console Logging

Added extensive `console.log()` statements at every initialization stage to track exactly where the hang occurs:

#### index.html (loads first)
```javascript
console.log('[HTML] index.html loaded');
console.log('[HTML] window.__TAURI__ available:', typeof window.__TAURI__ !== 'undefined');
```

#### main.tsx (module loading)
```javascript
console.log('[main.tsx] Loading main.tsx');
// ... imports ...
console.log('[main.tsx] Imports complete');
console.log('[main.tsx] Tauri available:', typeof (window as any).__TAURI__ !== 'undefined');
console.log('[main.tsx] Root element:', rootElement);
console.log('[main.tsx] React render initiated');
```

#### App.tsx (React component initialization)
```javascript
console.log('[App] App component function called');
console.log('[App] useState initialized, isInitializing:', isInitializing);
console.log('[App] useNexusStore hook complete');
console.log('[App] useEffect triggered');
console.log('[App] Starting initialization...');
console.log('[App] Tauri runtime detected');
// ... etc
```

### 2. Force Show UI Timeout

Added a hard 3-second timeout that will force the UI to show even if initialization hangs:

```typescript
const forceShowUI = setTimeout(() => {
  console.warn('[App] Force showing UI after 3 seconds');
  setIsInitializing(false);
}, 3000);
```

### 3. Tauri Runtime Check

Added explicit check for Tauri runtime availability:

```typescript
if (typeof window !== 'undefined' && !(window as any).__TAURI__) {
  console.error('[App] Tauri runtime not available!');
  setIsInitializing(false);
  clearTimeout(forceShowUI);
  return;
}
```

### 4. Reduced Timeouts

- Status check timeout: 5s → 2s
- Force UI timeout: 3s (new)

## What to Expect When Testing

### If Console Logs Appear

You should see a sequence of logs like this:

```
[HTML] index.html loaded
[HTML] window.__TAURI__ available: true/false
[main.tsx] Loading main.tsx
[main.tsx] Imports complete
[main.tsx] Tauri available: true/false
[main.tsx] Root element: <div id="root">
[main.tsx] React render initiated
[App] App component function called
[App] useState initialized, isInitializing: true
[App] useNexusStore hook complete
[App] useEffect triggered
[App] Starting initialization...
```

**The last log message will tell you where the hang occurs.**

### If NO Console Logs Appear

This means the issue is BEFORE JavaScript executes:
- Tauri webview not initializing in AppImage
- AppImage FUSE mount blocking webview
- Missing runtime dependency for webview

### UI Behavior

**Best case:** App shows UI after 3 seconds maximum (instead of hanging forever)

**If still hanging:** The hang is before JavaScript execution, likely in Tauri/webview initialization

## How to Test

### Option 1: Run from Terminal (See Console Logs)

```bash
cd ~/Downloads
./Nexus_0.1.0_aarch64.AppImage
```

Watch the terminal output for console logs.

### Option 2: Check if Tauri is the Issue

Try running with different environment variables:

```bash
# Disable GPU acceleration
WEBKIT_DISABLE_COMPOSITING_MODE=1 ./Nexus_0.1.0_aarch64.AppImage

# Force software rendering
LIBGL_ALWAYS_SOFTWARE=1 ./Nexus_0.1.0_aarch64.AppImage

# Enable WebKit debugging
WEBKIT_INSPECTOR_SERVER=9222 ./Nexus_0.1.0_aarch64.AppImage
```

### Option 3: Extract and Inspect AppImage

```bash
./Nexus_0.1.0_aarch64.AppImage --appimage-extract
cd squashfs-root
ls -la  # Check if frontend files exist
cat nexus-desktop.desktop  # Check launcher config
```

## Expected Outcomes

### Scenario A: Logs appear, hang identified
- You'll see exactly which initialization step hangs
- We can fix that specific step

### Scenario B: Logs appear, UI shows after 3 seconds
- Initialization completes (even if timeout)
- App becomes usable
- We can then fix the underlying issue

### Scenario C: No logs, still hangs
- Issue is in Tauri webview initialization
- Need to check Tauri AppImage compatibility
- May need to use different bundle format (deb/rpm instead)

## Next Steps Based on Results

### If you see logs
- Copy the last few log messages before hang
- This will pinpoint the exact problem

### If you see NO logs but UI shows after 3 seconds
- The app is now usable!
- We can investigate why status check hangs

### If you see NO logs and still hangs
- Try the different environment variables above
- Consider using .deb package instead:
  ```bash
  sudo dpkg -i /root/clawd/projects/nexus-desktop/src-tauri/target/release/bundle/deb/Nexus_0.1.0_arm64.deb
  nexus-desktop
  ```

## Alternative: Use .deb Package

If AppImage continues to have issues, the .deb package is also built and ready:

```bash
# Copy to local machine
scp user@server:/root/clawd/projects/nexus-desktop/src-tauri/target/release/bundle/deb/Nexus_0.1.0_arm64.deb ~/Downloads/

# Install
sudo dpkg -i ~/Downloads/Nexus_0.1.0_arm64.deb

# Run
nexus-desktop
```

The .deb package doesn't use FUSE mounting and might avoid AppImage-specific issues.
