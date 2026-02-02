class ComponentPalette {
  constructor() {
    this.components = [
      {
        id: 'container',
        name: 'Container',
        icon: 'fas fa-square',
        description: 'Group elements together',
        category: 'Basic',
        defaultSize: { width: 300, height: 200 },
        canHaveChildren: true
      },
      {
        id: 'header',
        name: 'Header',
        icon: 'fas fa-heading',
        description: 'Add a heading (H1-H6)',
        category: 'Basic',
        defaultSize: { width: 300, height: 60 }
      },
      {
        id: 'paragraph',
        name: 'Paragraph',
        icon: 'fas fa-paragraph',
        description: 'Add text content',
        category: 'Basic',
        defaultSize: { width: 300, height: 100 }
      },
      {
        id: 'button',
        name: 'Button',
        icon: 'fas fa-square',
        description: 'Interactive button',
        category: 'Basic',
        defaultSize: { width: 120, height: 40 }
      },
      {
        id: 'image',
        name: 'Image',
        icon: 'fas fa-image',
        description: 'Insert an image',
        category: 'Media',
        defaultSize: { width: 200, height: 150 }
      },
      {
        id: 'video',
        name: 'Video',
        icon: 'fas fa-video',
        description: 'Embed a video',
        category: 'Media',
        defaultSize: { width: 320, height: 180 }
      },
      {
        id: 'icon',
        name: 'Icon',
        icon: 'fas fa-icons',
        description: 'Font Awesome icon',
        category: 'Media',
        defaultSize: { width: 50, height: 50 }
      },
      {
        id: 'modal',
        name: 'Modal',
        icon: 'fas fa-window-maximize',
        description: 'Popup dialog',
        category: 'Interactive',
        defaultSize: { width: 400, height: 300 }
      },
      {
        id: 'form',
        name: 'Form',
        icon: 'fas fa-list-alt',
        description: 'Contact or login form',
        category: 'Interactive',
        defaultSize: { width: 300, height: 250 },
        canHaveChildren: true
      },
      {
        id: 'accordion',
        name: 'Accordion',
        icon: 'fas fa-bars',
        description: 'Collapsible sections',
        category: 'Interactive',
        defaultSize: { width: 300, height: 200 },
        canHaveChildren: true
      },
      {
        id: 'row',
        name: 'Row',
        icon: 'fas fa-grip-lines',
        description: 'Horizontal layout',
        category: 'Layout',
        defaultSize: { width: 400, height: 100 },
        canHaveChildren: true
      },
      {
        id: 'column',
        name: 'Column',
        icon: 'fas fa-columns',
        description: 'Vertical layout',
        category: 'Layout',
        defaultSize: { width: 150, height: 300 },
        canHaveChildren: true
      },
      {
        id: 'grid',
        name: 'Grid',
        icon: 'fas fa-th',
        description: 'Grid layout',
        category: 'Layout',
        defaultSize: { width: 300, height: 200 },
        canHaveChildren: true
      }
    ];

    this.categories = ['Basic', 'Media', 'Interactive', 'Layout'];
    this.init();
  }

  init() {
    this.setupDragAndDrop();
    this.setupSearch();
    this.render();
  }

  render() {
    const container = document.getElementById('componentsList');
    if (!container) return;

    container.innerHTML = '';

    this.categories.forEach(category => {
      const categoryComponents = this.components.filter(c => c.category === category);
      
      if (categoryComponents.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'component-category';
      categoryDiv.innerHTML = `
        <h4>
          <i class="fas fa-folder"></i>
          ${category}
          <span class="component-count">${categoryComponents.length}</span>
        </h4>
      `;

      const componentsGrid = document.createElement('div');
      componentsGrid.className = 'components-grid';

      categoryComponents.forEach(component => {
        const componentElement = this.createComponentElement(component);
        componentsGrid.appendChild(componentElement);
      });

      categoryDiv.appendChild(componentsGrid);
      container.appendChild(categoryDiv);
    });
  }

  createComponentElement(component) {
    const div = document.createElement('div');
    div.className = 'component-item';
    div.draggable = true;
    div.dataset.componentId = component.id;
    div.dataset.componentType = component.id;
    div.title = component.description;

    div.innerHTML = `
      <div class="component-icon">
        <i class="${component.icon}"></i>
      </div>
      <div class="component-info">
        <div class="component-name">${component.name}</div>
        <div class="component-description">${component.description}</div>
      </div>
      ${component.canHaveChildren ? '<div class="component-children-badge" title="Can contain child elements"><i class="fas fa-layer-group"></i></div>' : ''}
    `;

    return div;
  }

  setupDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('component-item')) {
        const componentId = e.target.dataset.componentId;
        const component = this.components.find(c => c.id === componentId);
        
        if (component) {
          e.dataTransfer.setData('component-id', componentId);
          e.dataTransfer.setData('component-type', component.id);
          e.dataTransfer.setData('component-name', component.name);
          
          // Create drag image
          const dragImage = document.createElement('div');
          dragImage.style.cssText = `
            position: absolute;
            top: -1000px;
            padding: 10px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 6px;
            color: #667eea;
            font-weight: bold;
          `;
          dragImage.textContent = component.name;
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 10, 10);
          
          setTimeout(() => document.body.removeChild(dragImage), 0);
        }
      }
    });

    document.addEventListener('dragend', () => {
      // Clean up any temporary elements
    });
  }

  setupSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search components...';
    searchInput.className = 'component-search';
    searchInput.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 14px;
    `;

    searchInput.addEventListener('input', Utils.debounce((e) => {
      this.filterComponents(e.target.value);
    }, 300));

    const componentsList = document.getElementById('componentsList');
    if (componentsList && componentsList.parentElement) {
      componentsList.parentElement.insertBefore(searchInput, componentsList);
    }
  }

  filterComponents(searchTerm) {
    const allCategories = document.querySelectorAll('.component-category');
    
    if (!searchTerm.trim()) {
      allCategories.forEach(cat => cat.style.display = 'block');
      return;
    }

    const term = searchTerm.toLowerCase();
    
    allCategories.forEach(category => {
      const components = category.querySelectorAll('.component-item');
      let visibleCount = 0;
      
      components.forEach(component => {
        const name = component.querySelector('.component-name').textContent.toLowerCase();
        const description = component.querySelector('.component-description').textContent.toLowerCase();
        
        if (name.includes(term) || description.includes(term)) {
          component.style.display = 'flex';
          visibleCount++;
        } else {
          component.style.display = 'none';
        }
      });
      
      category.style.display = visibleCount > 0 ? 'block' : 'none';
    });
  }

  getComponentById(id) {
    return this.components.find(c => c.id === id);
  }

  getComponentByType(type) {
    return this.components.find(c => c.id === type);
  }

  addCustomComponent(component) {
    // Validate component
    if (!component.id || !component.name) {
      throw new Error('Component must have id and name');
    }

    // Check for duplicates
    if (this.components.find(c => c.id === component.id)) {
      throw new Error(`Component with id "${component.id}" already exists`);
    }

    this.components.push({
      id: component.id,
      name: component.name,
      icon: component.icon || 'fas fa-cube',
      description: component.description || 'Custom component',
      category: component.category || 'Custom',
      defaultSize: component.defaultSize || { width: 200, height: 100 },
      canHaveChildren: component.canHaveChildren || false,
      custom: true
    });

    // Add category if new
    if (!this.categories.includes(component.category || 'Custom')) {
      this.categories.push(component.category || 'Custom');
    }

    this.render();
    Utils.showNotification(`Component "${component.name}" added`, 'success');
  }

  removeCustomComponent(componentId) {
    const index = this.components.findIndex(c => c.id === componentId && c.custom);
    
    if (index === -1) {
      throw new Error('Component not found or not removable');
    }

    this.components.splice(index, 1);
    this.render();
    Utils.showNotification('Component removed', 'success');
  }

  exportComponents() {
    const customComponents = this.components.filter(c => c.custom);
    
    if (customComponents.length === 0) {
      Utils.showNotification('No custom components to export', 'info');
      return;
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      components: customComponents
    };

    Utils.downloadFile(
      'custom-components.json',
      JSON.stringify(exportData, null, 2),
      'application/json'
    );
  }

  importComponents(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.version !== '1.0' || !Array.isArray(data.components)) {
        throw new Error('Invalid component file format');
      }

      let importedCount = 0;
      data.components.forEach(component => {
        try {
          this.addCustomComponent(component);
          importedCount++;
        } catch (error) {
          console.warn(`Failed to import component ${component.name}:`, error);
        }
      });

      Utils.showNotification(`Imported ${importedCount} component(s)`, 'success');
      return importedCount;
    } catch (error) {
      Utils.showNotification('Failed to import components: ' + error.message, 'error');
      return 0;
    }
  }
}

// Initialize component palette
window.componentPalette = new ComponentPalette();