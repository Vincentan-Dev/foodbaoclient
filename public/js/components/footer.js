class AppFooter extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <footer class="page-footer grey lighten-3" style="padding-top: 0; position: fixed; bottom: 0; width: 100%; z-index: 1000;">
          <div class="footer-copyright" style="min-height: 24px; line-height: 24px; padding: 0 15px; background-color: transparent;">
            <div class="container center-align">
              <span style="font-size: 11px; color: #757575;">&copy; ${new Date().getFullYear()} 福宝熊猫 Food Bao Panda App</span>
            </div>
          </div>
        </footer>
        <div style="height: 24px;"></div> <!-- Spacer to prevent content from being hidden under fixed footer -->
      `;
      
      // Add padding to bottom of body to prevent footer from overlapping content
      document.body.style.paddingBottom = '24px';
    }
    
    disconnectedCallback() {
      document.body.style.paddingBottom = '0';
    }
  }
  
  customElements.define('app-footer', AppFooter);