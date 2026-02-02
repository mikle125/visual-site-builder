// Main application initialization
class VisualSiteBuilder {
  constructor() {
    this.modules = {};
    this.init();
  }

  init() {
    // Initialize modules in correct order
    this.modules.stateManager = window.stateManager;
    this.modules.canvasManager = new CanvasManager('mainCanvas');
    this.modules.componentPalette = window.componentPalette;
    this.modules.propertyInspector = window.propertyInspector;
    this.modules.projectManager = window.projectManager;
    
    // Инициализируем UI после загрузки
    this.setupUI();
    this.setupKeyboardShortcuts();
    this.setupTheme();
    this.setupModals();
    
    // Обновляем UI с текущим состоянием
    this.modules.projectManager.updateUI();
    
    console.log('Visual Site Builder initialized');
  }

  setupUI() {
    // Panel toggles
    document.getElementById('componentsToggle')?.addEventListener('click', () => {
      const panel = document.querySelector('.left-panel');
      panel.classList.toggle('collapsed');
      const icon = document.querySelector('#componentsToggle i');
      icon.classList.toggle('fa-chevron-left');
      icon.classList.toggle('fa-chevron-right');
    });
    
    document.getElementById('propertiesToggle')?.addEventListener('click', () => {
      const panel = document.querySelector('.right-panel');
      panel.classList.toggle('collapsed');
      const icon = document.querySelector('#propertiesToggle i');
      icon.classList.toggle('fa-chevron-right');
      icon.classList.toggle('fa-chevron-left');
    });
    
    // Add page button
    document.getElementById('addPageBtn')?.addEventListener('click', () => {
      projectManager.addPage();
    });
    
    // Canvas controls
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
      const currentZoom = stateManager.state.zoom;
      stateManager.setState({ zoom: Math.min(currentZoom + 0.25, 3) });
    });
    
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
      const currentZoom = stateManager.state.zoom;
      stateManager.setState({ zoom: Math.max(currentZoom - 0.25, 0.25) });
    });
    
    document.getElementById('gridToggleBtn')?.addEventListener('click', () => {
      stateManager.setState({ grid: !stateManager.state.grid });
    });
    
    document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
      if (window.canvasManager) {
        canvasManager.clearCanvas();
      }
    });
    
    // Help button
    document.getElementById('helpBtn')?.addEventListener('click', () => {
      this.showHelpModal();
    });
    
    // Setup modals
    this.setupModals();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        projectManager.saveProject();
      }
      
      // Ctrl/Cmd + E to export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        projectManager.exportProject();
      }
      
      // Ctrl/Cmd + N for new project
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        projectManager.createNewProject();
      }
      
      // Ctrl/Cmd + O to open project
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        projectManager.showProjectsModal();
      }
      
      // Ctrl/Cmd + P to preview
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        projectManager.previewProject();
      }
      
      // Ctrl/Cmd + G to toggle grid
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        stateManager.toggleGrid();
      }
      
      // Ctrl/Cmd + D to duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (stateManager.state.selectedElement && window.canvasManager) {
          canvasManager.duplicateElement(stateManager.state.selectedElement.id);
        }
      }
      
      // Ctrl/Cmd + ] to bring forward
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        if (stateManager.state.selectedElement && window.canvasManager) {
          canvasManager.bringToFront(stateManager.state.selectedElement.id);
        }
      }
      
      // Ctrl/Cmd + [ to send backward
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        if (stateManager.state.selectedElement && window.canvasManager) {
          canvasManager.sendToBack(stateManager.state.selectedElement.id);
        }
      }
      
      // Escape to deselect
      if (e.key === 'Escape') {
        stateManager.selectElement(null);
      }
    });
  }

  setupTheme() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('vsb-theme') || 'light';
    this.setTheme(savedTheme);
    
    // Theme toggle could be added to UI
    const themeToggle = document.createElement('button');
    themeToggle.className = 'btn btn-icon theme-toggle';
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.title = 'Toggle theme';
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(newTheme);
    });
    
    // Add to top bar
    const userActions = document.querySelector('.user-actions');
    if (userActions) {
      userActions.insertBefore(themeToggle, userActions.firstChild);
    }
  }

  setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      localStorage.setItem('vsb-theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('vsb-theme', 'light');
    }
  }

  setupModals() {
    // Close modals on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
    
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
      button.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
      });
    });
    
    // Modal background click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }

  showHelpModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-question-circle"></i> Help & Shortcuts</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="help-section">
            <h4>Keyboard Shortcuts</h4>
            <ul class="shortcuts-list">
              <li><kbd>Ctrl/Cmd + S</kbd> Save project</li>
              <li><kbd>Ctrl/Cmd + E</kbd> Export project</li>
              <li><kbd>Ctrl/Cmd + N</kbd> New project</li>
              <li><kbd>Ctrl/Cmd + O</kbd> Open project</li>
              <li><kbd>Ctrl/Cmd + P</kbd> Preview</li>
              <li><kbd>Ctrl/Cmd + G</kbd> Toggle grid</li>
              <li><kbd>Ctrl/Cmd + D</kbd> Duplicate element</li>
              <li><kbd>Ctrl/Cmd + Z</kbd> Undo</li>
              <li><kbd>Ctrl/Cmd + Shift + Z</kbd> Redo</li>
              <li><kbd>Delete</kbd> Delete selected element</li>
              <li><kbd>Arrow Keys</kbd> Move element (Shift for 10px)</li>
              <li><kbd>Escape</kbd> Deselect element</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h4>Getting Started</h4>
            <ol>
              <li>Drag components from the left panel to the canvas</li>
              <li>Click on elements to select and edit their properties</li>
              <li>Use the right panel to modify styles and content</li>
              <li>Save your project regularly</li>
              <li>Export when ready to download your website</li>
            </ol>
          </div>
          
          <div class="help-section">
            <h4>Tips</h4>
            <ul>
              <li>Hold Shift while resizing to maintain aspect ratio</li>
              <li>Use containers to group elements together</li>
              <li>Right-click on elements for more options</li>
              <li>Modal windows can be triggered by button clicks</li>
              <li>Use the grid for precise alignment</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Setup close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Utility methods
  showToast(message, type = 'info') {
    Utils.showNotification(message, type);
  }

  confirm(message) {
    return Utils.confirmDialog(message);
  }

  exportToFile(content, filename, type = 'text/plain') {
    Utils.downloadFile(filename, content, type);
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VisualSiteBuilder();
  
  // Auto-save reminder
  setInterval(() => {
    if (stateManager.state.currentProject && !stateManager.state.settings.autoSave) {
      const lastSave = localStorage.getItem('lastManualSave') || 0;
      const now = Date.now();
      
      if (now - lastSave > 300000) { // 5 minutes
        if (Math.random() < 0.1) { // 10% chance to show reminder
          Utils.showNotification('Remember to save your work!', 'info');
        }
      }
    }
  }, 60000); // Check every minute
});