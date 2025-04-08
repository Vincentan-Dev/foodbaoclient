(function() {
  // This self-executing function ensures code runs only once
  let initialized = false;
  
  function initMaterialize() {
    if (initialized) return;
    console.log('Initializing Materialize components...');
    
    if (typeof M === 'undefined') {
      console.error('Materialize not loaded! Check file paths.');
      return;
    }
    
    // Initialize sidenav with specific options for mobile
    const sidenavElems = document.querySelectorAll('.sidenav');
    if (sidenavElems.length) {
      const sidenavInstances = M.Sidenav.init(sidenavElems, {
        edge: 'left',
        draggable: true,
        inDuration: 250,
        outDuration: 200
      });
      console.log('Sidenav initialized with', sidenavElems.length, 'elements');
      
      // Store instance for later use
      window.sidenavInstances = sidenavInstances;
    }
    
    // Initialize other components
    const dropdowns = document.querySelectorAll('.dropdown-trigger');
    if (dropdowns.length) {
      M.Dropdown.init(dropdowns, {
        coverTrigger: false,
        constrainWidth: false
      });
    }
    
    const tooltips = document.querySelectorAll('.tooltipped');
    if (tooltips.length) {
      M.Tooltip.init(tooltips);
    }
    
    initialized = true;
    console.log('All Materialize components initialized successfully');
  }
  
  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    initMaterialize();
  });
  
  // Expose function for manual initialization if needed
  window.initMaterialize = initMaterialize;
})();