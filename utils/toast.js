/**
 * Toast notification utility for displaying temporary messages
 */
class Toast {
  constructor() {
    this.defaultOptions = {
      message: '',
      type: 'info', // info, success, warning, error
      duration: 3000,
      position: 'center', // center, top-right, top-center, top-left, bottom-right, bottom-center, bottom-left
    };
    
    // Create container if it doesn't exist
    this.initContainer();
  }

  initContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        width: auto;
        max-width: 100%;
      `;
      document.body.appendChild(container);
      
      // Add CSS for toast container positions
      const style = document.createElement('style');
      style.textContent = `
        #toast-container.center { 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
        }
        #toast-container.top-right { top: 12px; right: 12px; }
        #toast-container.top-center { top: 12px; left: 50%; transform: translateX(-50%); }
        #toast-container.top-left { top: 12px; left: 12px; }
        #toast-container.bottom-right { bottom: 12px; right: 12px; }
        #toast-container.bottom-center { bottom: 12px; left: 50%; transform: translateX(-50%); }
        #toast-container.bottom-left { bottom: 12px; left: 12px; }
        
        .toast {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          margin-bottom: 8px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          pointer-events: auto;
          opacity: 0;
          transform: translateY(0);
          animation: toast-in 0.3s ease forwards;
          color: white;
          min-width: 200px;
          text-align: center;
          font-weight: 500;
        }
        
        #toast-container.center .toast {
          animation: toast-in-center 0.3s ease forwards;
          margin-bottom: 0;
        }
        
        .toast.info { background-color: rgba(33, 150, 243, 0.95); }
        .toast.success { background-color: rgba(76, 175, 80, 0.95); }
        .toast.warning { background-color: rgba(255, 152, 0, 0.95); }
        .toast.error { background-color: rgba(244, 67, 54, 0.95); }
        
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes toast-in-center {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes toast-out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.8); }
        }
        
        /* Mobile optimization */
        @media (max-width: 480px) {
          .toast {
            min-width: 80%;
            max-width: 90%;
            margin: 0 auto 8px;
            font-size: 14px;
          }
          
          #toast-container.center {
            width: 90%;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  show(options) {
    const opts = { ...this.defaultOptions, ...options };
    const container = document.getElementById('toast-container');
    
    // Set container position
    container.className = opts.position;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${opts.type}`;
    toast.textContent = opts.message;
    
    // Add to container
    container.appendChild(toast);
    
    // Schedule removal
    setTimeout(() => {
      toast.style.animation = 'toast-out 0.3s ease forwards';
      setTimeout(() => container.removeChild(toast), 300);
    }, opts.duration);
  }
  
  info(message, options = {}) {
    this.show({ ...options, message, type: 'info' });
  }
  
  success(message, options = {}) {
    this.show({ ...options, message, type: 'success' });
  }
  
  warning(message, options = {}) {
    this.show({ ...options, message, type: 'warning' });
  }
  
  error(message, options = {}) {
    this.show({ ...options, message, type: 'error' });
  }
}

// Create singleton instance
const toast = new Toast();
export default toast;
