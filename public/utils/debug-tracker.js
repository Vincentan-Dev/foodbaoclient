/**
 * Debug Tracker Utility
 * This module provides debugging tools for tracking authentication and email issues
 */

// Debug log storage in sessionStorage to survive page reloads but not persist permanently
const DEBUG_KEY = 'foodbao_debug_logs';

// Debug levels
const DEBUG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARNING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
};

/**
 * Main debug tracker object
 */
const debugTracker = {
  /**
   * Log a debug message with optional data
   * @param {string} source - Source of the log (e.g., 'login', 'reset-password')
   * @param {string} message - Log message
   * @param {string} level - Log level (INFO, WARN, ERROR, SUCCESS)
   * @param {Object} data - Optional data to log
   */
  log(source, message, level = DEBUG_LEVELS.INFO, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      source,
      level,
      message,
      data: data ? JSON.stringify(data) : null
    };
    
    // Add to in-memory logs
    this.getLogs().push(logEntry);
    
    // Save to sessionStorage
    this.saveLogs();
    
    // Also output to console for immediate visibility
    const styles = {
      INFO: 'color: #2196F3; font-weight: bold;',
      WARNING: 'color: #FF9800; font-weight: bold;',
      ERROR: 'color: #F44336; font-weight: bold;',
      SUCCESS: 'color: #4CAF50; font-weight: bold;'
    };
    
    console.log(
      `%c[DEBUG ${source.toUpperCase()}] [${level}]`,
      styles[level] || styles.INFO,
      message,
      data || ''
    );
    
    return logEntry;
  },
  
  /**
   * Log info level message
   */
  info(source, message, data = null) {
    return this.log(source, message, DEBUG_LEVELS.INFO, data);
  },
  
  /**
   * Log warning level message
   */
  warn(source, message, data = null) {
    return this.log(source, message, DEBUG_LEVELS.WARN, data);
  },
  
  /**
   * Log error level message
   */
  error(source, message, data = null) {
    return this.log(source, message, DEBUG_LEVELS.ERROR, data);
  },
  
  /**
   * Log success level message
   */
  success(source, message, data = null) {
    return this.log(source, message, DEBUG_LEVELS.SUCCESS, data);
  },
  
  /**
   * Get all stored logs
   * @returns {Array} - Array of log entries
   */
  getLogs() {
    try {
      const logsJson = sessionStorage.getItem(DEBUG_KEY) || '[]';
      return JSON.parse(logsJson);
    } catch (e) {
      console.error('Error parsing debug logs from sessionStorage:', e);
      return [];
    }
  },
  
  /**
   * Save logs to sessionStorage
   */
  saveLogs() {
    try {
      const logs = this.getLogs();
      // Limit to last 500 log entries to prevent storage issues
      const trimmedLogs = logs.slice(-500);
      sessionStorage.setItem(DEBUG_KEY, JSON.stringify(trimmedLogs));
    } catch (e) {
      console.error('Error saving debug logs to sessionStorage:', e);
    }
  },
  
  /**
   * Clear all logs
   */
  clearLogs() {
    sessionStorage.removeItem(DEBUG_KEY);
  },
  
  /**
   * Export logs as JSON string
   * @returns {string} - JSON string representation of logs
   */
  exportLogs() {
    return JSON.stringify(this.getLogs(), null, 2);
  },
  
  /**
   * Create a logger for a specific component/feature
   * @param {string} source - Source identifier for the logger
   * @returns {Object} - Component-specific logger
   */
  createLogger(source) {
    return {
      info: (message, data) => this.info(source, message, data),
      warn: (message, data) => this.warn(source, message, data),
      error: (message, data) => this.error(source, message, data),
      success: (message, data) => this.success(source, message, data)
    };
  },
  
  /**
   * Display debug console in the UI
   * Creates a floating debug console on the page
   */
  showConsole() {
    // Check if console already exists
    if (document.getElementById('debug-console')) {
      return;
    }
    
    // Create console container
    const consoleEl = document.createElement('div');
    consoleEl.id = 'debug-console';
    consoleEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 500px;
      max-width: 90vw;
      height: 300px;
      background-color: rgba(0, 0, 0, 0.85);
      color: #f0f0f0;
      border-radius: 5px;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    
    // Create header with title and actions
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 5px 10px;
      background-color: #333;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('span');
    title.textContent = 'Debug Console';
    title.style.fontWeight = 'bold';
    
    const actions = document.createElement('div');
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'margin-right: 5px; padding: 2px 5px; cursor: pointer;';
    clearBtn.onclick = () => {
      this.clearLogs();
      this.updateConsoleContent();
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding: 2px 5px; cursor: pointer;';
    closeBtn.onclick = () => {
      document.body.removeChild(consoleEl);
    };
    
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);
    
    header.appendChild(title);
    header.appendChild(actions);
    
    // Create log content area
    const content = document.createElement('div');
    content.id = 'debug-console-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      font-size: 12px;
    `;
    
    // Fill with logs
    this.updateConsoleContent = () => {
      const logs = this.getLogs();
      content.innerHTML = '';
      
      if (logs.length === 0) {
        content.innerHTML = '<div style="color: #999;">No logs yet.</div>';
        return;
      }
      
      logs.forEach(log => {
        const entry = document.createElement('div');
        entry.style.cssText = 'margin-bottom: 5px; border-bottom: 1px solid #555; padding-bottom: 3px;';
        
        const colors = {
          INFO: '#2196F3',
          WARNING: '#FF9800',
          ERROR: '#F44336',
          SUCCESS: '#4CAF50'
        };
        
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        
        entry.innerHTML = `
          <div>
            <span style="color: #999;">[${timestamp}]</span>
            <span style="color: ${colors[log.level] || '#fff'}; font-weight: bold;">[${log.level}]</span>
            <span style="color: #ddd; font-weight: bold;">[${log.source}]</span>
            ${log.message}
          </div>
          ${log.data ? `<div style="color: #aaa; margin-left: 10px; margin-top: 3px; word-break: break-all;">${log.data}</div>` : ''}
        `;
        
        content.appendChild(entry);
      });
      
      // Auto-scroll to bottom
      content.scrollTop = content.scrollHeight;
    };
    
    // Add all elements to the console
    consoleEl.appendChild(header);
    consoleEl.appendChild(content);
    
    // Make the console draggable
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    header.style.cursor = 'move';
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffsetX = e.clientX - consoleEl.getBoundingClientRect().left;
      dragOffsetY = e.clientY - consoleEl.getBoundingClientRect().top;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const left = e.clientX - dragOffsetX;
        const top = e.clientY - dragOffsetY;
        
        consoleEl.style.left = `${Math.max(0, Math.min(window.innerWidth - consoleEl.offsetWidth, left))}px`;
        consoleEl.style.top = `${Math.max(0, Math.min(window.innerHeight - consoleEl.offsetHeight, top))}px`;
        consoleEl.style.bottom = 'auto';
        consoleEl.style.right = 'auto';
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Add the console to the page
    document.body.appendChild(consoleEl);
    this.updateConsoleContent();
    
    // Refresh the console content every 2 seconds
    this.consoleInterval = setInterval(() => {
      if (document.getElementById('debug-console')) {
        this.updateConsoleContent();
      } else {
        clearInterval(this.consoleInterval);
      }
    }, 2000);
  }
};

// Create keyboard shortcut to toggle debug console (Ctrl+Shift+D)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    const existingConsole = document.getElementById('debug-console');
    if (existingConsole) {
      document.body.removeChild(existingConsole);
    } else {
      debugTracker.showConsole();
    }
  }
});

// Make debugTracker available globally instead of using ES6 export
window.debugTracker = debugTracker;