/**
 * Debug Tracker Component
 * A reusable debug tracker that can be included in any page to track API calls and other events
 * 
 * Usage:
 * 1. Include this script in your HTML page
 * 2. Call DebugTracker.init() to initialize the tracker
 * 3. Use DebugTracker.log(), DebugTracker.info(), etc. to log events
 */

const DebugTracker = (function() {
    // Private variables and methods
    let _initialized = false;
    let _initializeInProgress = false;
    let _pendingOperations = [];
    let _debugConsoleId = 'debugConsole';
    let _debugOutputId = 'debugOutput';
    let _debugToggleId = 'debugToggle';
    
    // Positions
    const POSITIONS = {
        BOTTOM_CENTER: 'bottom-center',
        BOTTOM_RIGHT: 'bottom-right',
        BOTTOM_LEFT: 'bottom-left',
        TOP_RIGHT: 'top-right',
        TOP_LEFT: 'top-left',
        TOP_CENTER: 'top-center'
    };
    
    // Create debug console UI
    function _createDebugUI(position = POSITIONS.BOTTOM_CENTER, title = 'Debug Console') {
        // Make sure we don't create duplicates
        if (document.getElementById(_debugConsoleId)) {
            return;
        }
        
        // Create the debug toggle button with position adjustments
        const debugToggle = document.createElement('button');
        debugToggle.id = _debugToggleId;
        debugToggle.title = 'Toggle Debug Console';
        debugToggle.innerHTML = '<i class="fas fa-bug"></i>';
        
        // Create the debug console
        const debugConsole = document.createElement('div');
        debugConsole.id = _debugConsoleId;
        debugConsole.style.display = 'none';
        
        // Create the header
        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `
            <h4>${title}</h4>
            <div class="actions">
                <button id="clearDebug" title="Clear Console"><i class="fas fa-trash"></i> Clear</button>
                <button id="copyDebug" title="Copy to Clipboard"><i class="fas fa-copy"></i> Copy</button>
                <button id="closeDebug" title="Close Console"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        // Create the output area
        const debugOutput = document.createElement('div');
        debugOutput.id = _debugOutputId;
        
        // Add everything to the DOM
        debugConsole.appendChild(header);
        debugConsole.appendChild(debugOutput);
        
        // Apply different styling based on position
        _styleElementsByPosition(debugToggle, debugConsole, position);
        
        // Add styles
        _addStyles();
        
        // Add to the document
        document.body.appendChild(debugToggle);
        document.body.appendChild(debugConsole);
        
        // Add event listeners
        _setupEventListeners();
        
        _initialized = true;
        _initializeInProgress = false;
        
        // Process any pending operations
        _processPendingOperations();
    }
    
    // Process operations that were attempted before initialization was complete
    function _processPendingOperations() {
        if (_pendingOperations.length > 0) {
            console.log(`Processing ${_pendingOperations.length} pending operations`);
            
            _pendingOperations.forEach(op => {
                try {
                    switch (op.type) {
                        case 'log':
                            DebugTracker.log(op.message, op.level);
                            break;
                        case 'api':
                            // Skip API calls as they can't be replayed easily
                            DebugTracker.api(`Skipped pending API call to ${op.url}`);
                            break;
                    }
                } catch (e) {
                    console.error('Error processing pending operation:', e);
                }
            });
            
            // Clear pending operations
            _pendingOperations = [];
        }
    }
    
    // Apply styles based on position
    function _styleElementsByPosition(toggleBtn, console, position) {
        // Default styles for toggle button
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.width = '30px';
        toggleBtn.style.height = '30px';
        toggleBtn.style.borderRadius = '50%';
        toggleBtn.style.backgroundColor = '#3498db';
        toggleBtn.style.color = 'white';
        toggleBtn.style.display = 'flex';
        toggleBtn.style.alignItems = 'center';
        toggleBtn.style.justifyContent = 'center';
        toggleBtn.style.border = 'none';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.zIndex = '10000';
        toggleBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toggleBtn.style.fontSize = '12px';
        
        // Default styles for console
        console.style.position = 'fixed';
        console.style.width = 'calc(100% - 32px)';
        console.style.maxWidth = '600px';
        console.style.height = '200px';
        console.style.backgroundColor = '#1e1e1e';
        console.style.color = '#f0f0f0';
        console.style.borderRadius = '8px';
        console.style.padding = '10px';
        console.style.fontFamily = 'monospace';
        console.style.fontSize = '12px';
        console.style.overflowY = 'auto';
        console.style.zIndex = '9999';
        console.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        console.style.transition = 'all 0.3s ease';
        
        // Position-specific styles
        switch(position) {
            case POSITIONS.BOTTOM_CENTER:
                toggleBtn.style.bottom = '16px';
                toggleBtn.style.left = '50%';
                toggleBtn.style.transform = 'translateX(-50%)';
                
                console.style.left = '50%';
                console.style.transform = 'translateX(-50%)';
                console.style.bottom = '55px';
                break;
                
            case POSITIONS.BOTTOM_RIGHT:
                toggleBtn.style.bottom = '16px';
                toggleBtn.style.right = '16px';
                
                console.style.right = '16px';
                console.style.bottom = '55px';
                break;
                
            case POSITIONS.BOTTOM_LEFT:
                toggleBtn.style.bottom = '16px';
                toggleBtn.style.left = '16px';
                
                console.style.left = '16px';
                console.style.bottom = '55px';
                break;
                
            case POSITIONS.TOP_RIGHT:
                toggleBtn.style.top = '16px';
                toggleBtn.style.right = '16px';
                
                console.style.right = '16px';
                console.style.top = '55px';
                break;
                
            case POSITIONS.TOP_LEFT:
                toggleBtn.style.top = '16px';
                toggleBtn.style.left = '16px';
                
                console.style.left = '16px';
                console.style.top = '55px';
                break;
                
            case POSITIONS.TOP_CENTER:
                toggleBtn.style.top = '16px';
                toggleBtn.style.left = '50%';
                toggleBtn.style.transform = 'translateX(-50%)';
                
                console.style.left = '50%';
                console.style.transform = 'translateX(-50%)';
                console.style.top = '55px';
                break;
        }
    }
    
    // Add CSS styles for the debug console
    function _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #${_debugConsoleId} .header {
                position: sticky;
                top: 0;
                background-color: #2c3e50;
                padding: 5px;
                margin: -10px -10px 5px -10px;
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #34495e;
            }
            
            #${_debugConsoleId} .header h4 {
                font-size: 14px;
                margin: 0;
            }
            
            #${_debugConsoleId} .header .actions {
                display: flex;
                gap: 5px;
            }
            
            #${_debugConsoleId} .header button {
                background: none;
                border: none;
                color: #ecf0f1;
                cursor: pointer;
                padding: 0 5px;
                font-size: 12px;
            }
            
            #${_debugConsoleId} .header button:hover {
                color: #3498db;
            }
            
            #${_debugConsoleId} .log {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #3498db;
            }
            
            #${_debugConsoleId} .error {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #e74c3c;
                color: #ff6b6b;
            }
            
            #${_debugConsoleId} .warning {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #f39c12;
                color: #ffd166;
            }
            
            #${_debugConsoleId} .success {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #2ecc71;
                color: #52de97;
            }
            
            #${_debugConsoleId} .info {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #3498db;
                color: #74b9ff;
            }
            
            #${_debugConsoleId} .api {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #9b59b6;
                color: #c39bd3;
            }
            
            #${_debugConsoleId} .time {
                color: #7f8c8d;
                font-size: 10px;
            }
            
            #${_debugToggleId}:hover {
                background-color: #2980b9;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set up event listeners for the debug console
    function _setupEventListeners() {
        document.getElementById(_debugToggleId).addEventListener('click', function() {
            const console = document.getElementById(_debugConsoleId);
            console.style.display = console.style.display === 'none' ? 'block' : 'none';
        });
        
        document.getElementById('clearDebug').addEventListener('click', function() {
            document.getElementById(_debugOutputId).innerHTML = '';
        });
        
        document.getElementById('closeDebug').addEventListener('click', function() {
            document.getElementById(_debugConsoleId).style.display = 'none';
        });
        
        document.getElementById('copyDebug').addEventListener('click', function() {
            const debugOutput = document.getElementById(_debugOutputId);
            
            // Convert the HTML to text
            const plainText = debugOutput.innerText;
            
            // Copy to clipboard
            navigator.clipboard.writeText(plainText).then(() => {
                DebugTracker.success('Debug log copied to clipboard');
            }).catch(err => {
                DebugTracker.error('Failed to copy: ' + err);
            });
        });
    }
    
    // Format any kind of value for output
    function _formatValue(value) {
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch (e) {
                return String(value);
            }
        }
        return String(value);
    }
    
    // Public API
    return {
        // Constants
        POSITIONS: POSITIONS,
        
        // Initialize the debug tracker
        init: function(options = {}) {
            // If already initialized, no need to reinitialize
            if (_initialized) {
                console.log("Debug tracker already initialized");
                return this;
            }
            
            // If initialization is already in progress, don't start another one
            if (_initializeInProgress) {
                console.log("Debug tracker initialization in progress");
                return this;
            }
            
            _initializeInProgress = true;
            
            const { 
                position = POSITIONS.BOTTOM_CENTER,
                title = 'Debug Console',
                startMessage = 'Debug tracker initialized'
            } = options;
            
            // If DOM is not ready, wait for it
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    _createDebugUI(position, title);
                    this.info(startMessage);
                });
            } else {
                // DOM is ready, create UI immediately
                _createDebugUI(position, title);
                this.info(startMessage);
            }
            
            return this;
        },
        
        // Generic log method
        log: function(message, level = 'log') {
            if (!_initialized) {
                // Queue the operation for when we're initialized
                if (!_initializeInProgress) {
                    console.warn('Debug tracker not initialized. Call DebugTracker.init() first.');
                }
                
                // Store this operation to execute once initialized
                _pendingOperations.push({
                    type: 'log',
                    message: message,
                    level: level
                });
                
                // Also log to console
                console.log(message);
                return;
            }
            
            const output = document.getElementById(_debugOutputId);
            if (!output) return;
            
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour12: false });
            
            const formattedMessage = _formatValue(message);
            
            const logEntry = document.createElement('div');
            logEntry.className = level;
            logEntry.innerHTML = `<span class="time">[${timeString}]</span> ${formattedMessage}`;
            
            output.appendChild(logEntry);
            output.scrollTop = output.scrollHeight;
            
            // Also log to console for development
            switch(level) {
                case 'error':
                    console.error(message);
                    break;
                case 'warning':
                    console.warn(message);
                    break;
                case 'info':
                    console.info(message);
                    break;
                case 'success':
                case 'api':
                default:
                    console.log(message);
                    break;
            }
        },
        
        // Shorthand methods for different log levels
        info: function(message) {
            this.log(message, 'info');
        },
        
        error: function(message) {
            this.log(message, 'error');
        },
        
        warning: function(message) {
            this.log(message, 'warning');
        },
        
        success: function(message) {
            this.log(message, 'success');
        },
        
        api: function(message) {
            this.log(message, 'api');
        },
        
        // API request tracker (logs both request and response)
        trackApiCall: async function(url, options = {}, description = '') {
            // For HEAD requests, use a simpler tracking approach that doesn't require full initialization
            if (options.method === 'HEAD') {
                console.log(`HEAD request to ${url} ${description ? '(' + description + ')' : ''}`);
                try {
                    return await fetch(url, options);
                } catch (error) {
                    console.error(`Fetch error for HEAD request to ${url}: ${error.message}`);
                    throw error;
                }
            }
            
            if (!_initialized) {
                // Store this operation, but since it's an async request we can't really defer it
                // Just log it will be attempted
                _pendingOperations.push({
                    type: 'api',
                    url: url,
                    options: {...options, body: options.body ? 'Body content (not stored)' : null},
                    description: description
                });
                
                if (!_initializeInProgress) {
                    console.warn('Debug tracker not initialized for API call. Using native fetch instead.');
                }
                
                // Use native fetch since we can't track it properly
                try {
                    return await fetch(url, options);
                } catch (error) {
                    console.error(`Fetch error: ${error.message}`);
                    throw error;
                }
            }
            
            const method = options.method || 'GET';
            
            // Log request
            this.api(`${description ? description + ' - ' : ''}${method} request to ${url}`);
            
            if (options.body) {
                try {
                    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                    this.api(`Request payload: ${JSON.stringify(body, null, 2)}`);
                } catch (e) {
                    this.api(`Request payload: ${options.body}`);
                }
            }
            
            try {
                const startTime = performance.now();
                const response = await fetch(url, options);
                const endTime = performance.now();
                
                // Log response status and timing
                this.api(`Response status: ${response.status} ${response.statusText} (${Math.round(endTime - startTime)}ms)`);
                
                // Try to parse the response JSON
                try {
                    const clonedResponse = response.clone();
                    const data = await clonedResponse.json();
                    this.api(`Response data: ${JSON.stringify(data, null, 2)}`);
                    
                    if (data.success) {
                        this.success(`API call to ${url} successful`);
                    } else if (data.error || data.message) {
                        this.error(`API Error: ${data.error || data.message}`);
                    }
                    
                    return response;
                } catch (e) {
                    // If can't parse as JSON, log the response text
                    const textResponse = await response.text();
                    if (textResponse) {
                        this.api(`Response text: ${textResponse.substring(0, 500)}${textResponse.length > 500 ? '...' : ''}`);
                    } else {
                        this.api('Response has no content');
                    }
                    return response;
                }
            } catch (error) {
                this.error(`Fetch error: ${error.message}`);
                throw error;
            }
        },
        
        // Wrapped fetch with tracking
        fetch: async function(url, options = {}, description = '') {
            return this.trackApiCall(url, options, description);
        },
        
        // Check if initialized
        isInitialized: function() {
            return _initialized;
        },
        
        // Check if initialization is in progress
        isInitializing: function() {
            return _initializeInProgress;
        },
        
        // Ensure initialization
        ensureInitialized: function(options = {}) {
            if (!this.isInitialized() && !this.isInitializing()) {
                this.init(options);
            }
            return this.isInitialized();
        },
        
        // Clear the console
        clear: function() {
            if (!_initialized) return;
            document.getElementById(_debugOutputId).innerHTML = '';
        },
        
        // Show/hide the console
        show: function() {
            if (!_initialized) return;
            document.getElementById(_debugConsoleId).style.display = 'block';
        },
        
        hide: function() {
            if (!_initialized) return;
            document.getElementById(_debugConsoleId).style.display = 'none';
        },
        
        // Toggle console visibility
        toggle: function() {
            if (!_initialized) return;
            const console = document.getElementById(_debugConsoleId);
            console.style.display = console.style.display === 'none' ? 'block' : 'none';
        },
        
        // Destroy the debug tracker
        destroy: function() {
            if (!_initialized) return;
            
            const toggle = document.getElementById(_debugToggleId);
            const console = document.getElementById(_debugConsoleId);
            
            if (toggle) toggle.remove();
            if (console) console.remove();
            
            _initialized = false;
            _initializeInProgress = false;
            _pendingOperations = [];
        }
    };
})();

// Auto-initialize when included if the auto-init data attribute is present
document.addEventListener('DOMContentLoaded', function() {
    const script = document.querySelector('script[data-debug-tracker-auto-init]');
    if (script) {
        const position = script.getAttribute('data-position') || DebugTracker.POSITIONS.BOTTOM_CENTER;
        const title = script.getAttribute('data-title') || 'Debug Console';
        DebugTracker.init({ position, title });
    }
});