class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.elementsContainer = document.getElementById('canvasElements');
    
    this.selectedElement = null;
    this.isDragging = false;
    this.isResizing = false;
    this.dragStart = { x: 0, y: 0 };
    this.originalPosition = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.originalSize = { width: 0, height: 0 };
    
    this.gridSize = 20;
    this.snapToGrid = true;
    
    this.init();
    this.setupEventListeners();
    this.subscribeToState();
  }

  init() {
    this.updateCanvasSize();
    this.render();
  }

  subscribeToState() {
    this.lastPageId = null;
    this.lastElementsLength = 0;
    
    stateManager.subscribe((state) => {
      const currentPage = state.pages[state.currentPage];
      const elementCount = currentPage?.elements?.length || 0;
      
      // Перересовываем если изменилась страница или количество элементов
      if (state.currentPage !== this.lastPageId || elementCount !== this.lastElementsLength) {
        this.lastPageId = state.currentPage;
        this.lastElementsLength = elementCount;
        this.render();
      }
      
      // Обновляем выбранный элемент
      if (state.selectedElement && state.selectedElement.id !== this.selectedElement?.id) {
        this.selectElementById(state.selectedElement.id);
      } else if (!state.selectedElement && this.selectedElement) {
        this.deselectElement();
      }
      
      // Обновляем сетку
      if (state.grid !== this.showGrid) {
        this.showGrid = state.grid;
        this.toggleGrid(state.grid);
      }
      
      // Обновляем масштаб
      if (state.zoom !== this.zoom) {
        this.zoom = state.zoom;
        this.updateZoom(state.zoom);
      }
    });
  }

  updateCanvasSize() {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.style.width = container.clientWidth + 'px';
      this.canvas.style.height = container.clientHeight + 'px';
    }
  }

  render() {
    const state = stateManager.state;
    const currentPage = state.pages[state.currentPage];
    
    if (!currentPage) {
      // Если нет текущей страницы, ищем первую доступную
      if (Object.keys(state.pages).length === 0) {
        this.elementsContainer.innerHTML = '';
        return;
      }
      // Устанавливаем первую страницу как текущую
      const firstPageId = Object.keys(state.pages)[0];
      stateManager.setState({ currentPage: firstPageId }, false);
      return;
    }
    
    const elements = currentPage.elements || [];
    
    // Используем DocumentFragment для оптимизации
    const fragment = document.createDocumentFragment();
    
    elements.forEach(element => {
      const elementDiv = this.createElementDOM(element);
      if (elementDiv) {
        fragment.appendChild(elementDiv);
      }
    });
    
    // Замена всех элементов за одну операцию
    this.elementsContainer.innerHTML = '';
    this.elementsContainer.appendChild(fragment);
    
    // Обновляем выбранный элемент
    if (state.selectedElement) {
      this.selectElementById(state.selectedElement.id);
    }
  }

  createElementDOM(element) {
    if (!element || !element.id) return null;
    
    const elementDiv = document.createElement('div');
    elementDiv.className = `canvas-element element-${element.type}`;
    elementDiv.id = `element-${element.id}`;
    elementDiv.dataset.elementId = element.id;
    
    // Позиция и размер
    const x = element.position?.x || 0;
    const y = element.position?.y || 0;
    const width = element.size?.width || 200;
    const height = element.size?.height || 100;
    
    elementDiv.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${width}px;
      height: ${height}px;
      cursor: move;
      user-select: none;
      border: 1px solid transparent;
      transition: border-color 0.2s;
    `;
    
    // Применяем стили элемента
    if (element.styles) {
      Object.entries(element.styles).forEach(([key, value]) => {
        if (value) {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          elementDiv.style[cssKey] = value;
        }
      });
    }
    
    // Содержимое элемента
    const contentDiv = document.createElement('div');
    contentDiv.className = 'element-content';
    contentDiv.style.cssText = 'width: 100%; height: 100%; overflow: hidden;';
    
    switch (element.type) {
      case 'header':
        contentDiv.innerHTML = `<h1 style="margin: 0; padding: 10px;">${element.content || 'Заголовок'}</h1>`;
        break;
      case 'paragraph':
        contentDiv.innerHTML = `<p style="margin: 0; padding: 10px;">${element.content || 'Текст абзаца...'}</p>`;
        break;
      case 'button':
        contentDiv.innerHTML = `
          <button style="
            width: 100%;
            height: 100%;
            border: none;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          ">
            ${element.content || 'Кнопка'}
          </button>
        `;
        break;
      case 'image':
        contentDiv.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px dashed #ccc;
          ">
            <i class="fas fa-image" style="font-size: 24px; color: #999;"></i>
            <span style="margin-left: 10px; color: #666;">${element.content || 'Изображение'}</span>
          </div>
        `;
        break;
      case 'container':
        contentDiv.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: rgba(102, 126, 234, 0.1);
            border: 2px dashed #667eea;
            padding: 10px;
          ">
            <div style="color: #667eea; font-weight: 600;">Контейнер</div>
          </div>
        `;
        break;
      default:
        contentDiv.textContent = element.content || element.type;
    }
    
    elementDiv.appendChild(contentDiv);
    
    // Обработчики событий
    elementDiv.addEventListener('mousedown', (e) => this.onElementMouseDown(e, element));
    elementDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectElement(elementDiv, element);
    });
    
    return elementDiv;
  }

  setupEventListeners() {
    // Перетаскивание на канвас
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleDrop(e);
    });
    
    // Выделение на канвасе
    this.canvas.addEventListener('click', (e) => {
      if (e.target === this.canvas || e.target === this.elementsContainer) {
        stateManager.selectElement(null);
      }
    });
    
    // Глобальные события мыши
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
    
    // События клавиатуры
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    
    // Ресайз окна
    window.addEventListener('resize', () => {
      this.updateCanvasSize();
      this.render();
    });
  }

  handleDrop(e) {
    const type = e.dataTransfer.getData('component-type');
    if (!type) return;
    
    // Проверяем, есть ли активный проект и страница
    if (!stateManager.state.currentProject || !stateManager.state.currentPage) {
      this.showNotification('Проект не инициализирован', 'error');
      return;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 100;
    const y = e.clientY - rect.top - 50;
    
    const element = {
      type: type,
      position: { x: Math.max(0, x), y: Math.max(0, y) },
      size: this.getDefaultSize(type),
      content: this.getDefaultContent(type),
      styles: this.getDefaultStyles(type)
    };
    
    const elementId = stateManager.addElement(element);
    
    // Проверяем, успешно ли добавлен элемент
    if (!elementId) {
      this.showNotification('Ошибка при добавлении элемента', 'error');
      return;
    }
    
    // Выбираем новый элемент
    setTimeout(() => {
      this.selectElementById(elementId);
    }, 10);
    
    this.showNotification('Элемент добавлен', 'success');
  }

  getDefaultSize(type) {
    const sizes = {
      header: { width: 400, height: 60 },
      paragraph: { width: 400, height: 120 },
      button: { width: 150, height: 50 },
      image: { width: 300, height: 200 },
      container: { width: 500, height: 300 },
      modal: { width: 400, height: 300 }
    };
    
    return sizes[type] || { width: 200, height: 100 };
  }

  getDefaultContent(type) {
    const contents = {
      header: 'Новый заголовок',
      paragraph: 'Текст абзаца...',
      button: 'Кнопка',
      image: 'Изображение',
      container: 'Контейнер',
      modal: 'Модальное окно'
    };
    
    return contents[type] || 'Элемент';
  }

  getDefaultStyles(type) {
    const styles = {
      header: { 
        fontSize: '24px', 
        fontWeight: 'bold',
        color: '#2c3e50'
      },
      paragraph: { 
        fontSize: '16px', 
        lineHeight: '1.6',
        color: '#34495e'
      },
      button: { 
        fontSize: '14px',
        fontWeight: '600'
      },
      image: {},
      container: {
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        padding: '20px'
      }
    };
    
    return styles[type] || {};
  }

  selectElement(elementDiv, element) {
    this.deselectElement();
    
    this.selectedElement = elementDiv;
    elementDiv.classList.add('selected');
    elementDiv.style.borderColor = '#667eea';
    elementDiv.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.3)';
    
    stateManager.selectElement(element);
  }

  selectElementById(elementId) {
    const elementDiv = document.getElementById(`element-${elementId}`);
    if (elementDiv) {
      const element = this.findElementById(elementId);
      if (element) {
        this.selectElement(elementDiv, element);
      }
    }
  }

  findElementById(elementId) {
    const state = stateManager.state;
    const currentPage = state.pages[state.currentPage];
    if (!currentPage || !currentPage.elements) return null;
    
    return currentPage.elements.find(el => el.id === elementId);
  }

  deselectElement() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('selected');
      this.selectedElement.style.borderColor = 'transparent';
      this.selectedElement.style.boxShadow = 'none';
      this.selectedElement = null;
    }
  }

  onElementMouseDown(e, element) {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = this.selectedElement.getBoundingClientRect();
    const handleSize = 8;
    
    // Проверяем, кликнули ли на ресайз-хэндл
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const isResizeHandle = 
      mouseX < handleSize || 
      mouseX > rect.width - handleSize || 
      mouseY < handleSize || 
      mouseY > rect.height - handleSize;
    
    if (isResizeHandle && e.target === this.selectedElement) {
      this.startResizing(e);
    } else {
      this.startDragging(e);
    }
  }

  startDragging(e) {
    if (!this.selectedElement) return;
    
    this.isDragging = true;
    this.dragStart.x = e.clientX;
    this.dragStart.y = e.clientY;
    
    const rect = this.selectedElement.getBoundingClientRect();
    this.originalPosition.x = rect.left;
    this.originalPosition.y = rect.top;
    
    document.body.style.cursor = 'grabbing';
    this.selectedElement.style.cursor = 'grabbing';
  }

  startResizing(e) {
    if (!this.selectedElement) return;
    
    this.isResizing = true;
    this.dragStart.x = e.clientX;
    this.dragStart.y = e.clientY;
    
    const rect = this.selectedElement.getBoundingClientRect();
    this.originalSize.width = rect.width;
    this.originalSize.height = rect.height;
    
    // Определяем сторону ресайза
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const handleSize = 8;
    
    this.resizeHandle = {
      left: mouseX < handleSize,
      right: mouseX > rect.width - handleSize,
      top: mouseY < handleSize,
      bottom: mouseY > rect.height - handleSize
    };
    
    document.body.style.cursor = this.getResizeCursor();
  }

  getResizeCursor() {
    if (this.resizeHandle.left && this.resizeHandle.top) return 'nw-resize';
    if (this.resizeHandle.right && this.resizeHandle.top) return 'ne-resize';
    if (this.resizeHandle.left && this.resizeHandle.bottom) return 'sw-resize';
    if (this.resizeHandle.right && this.resizeHandle.bottom) return 'se-resize';
    if (this.resizeHandle.left || this.resizeHandle.right) return 'ew-resize';
    if (this.resizeHandle.top || this.resizeHandle.bottom) return 'ns-resize';
    return 'move';
  }

  onMouseMove(e) {
    if (this.isDragging) {
      this.dragElement(e);
    } else if (this.isResizing) {
      this.resizeElement(e);
    }
  }

  dragElement(e) {
    if (!this.selectedElement) return;
    
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;
    
    let newX = this.originalPosition.x + deltaX;
    let newY = this.originalPosition.y + deltaY;
    
    // Привязка к сетке
    if (this.snapToGrid) {
      newX = Math.round(newX / this.gridSize) * this.gridSize;
      newY = Math.round(newY / this.gridSize) * this.gridSize;
    }
    
    // Применяем новые координаты
    this.selectedElement.style.left = newX + 'px';
    this.selectedElement.style.top = newY + 'px';
  }

  resizeElement(e) {
    if (!this.selectedElement) return;
    
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;
    
    let newWidth = this.originalSize.width;
    let newHeight = this.originalSize.height;
    let newX = parseFloat(this.selectedElement.style.left);
    let newY = parseFloat(this.selectedElement.style.top);
    
    // Изменяем размер в зависимости от стороны
    if (this.resizeHandle.right) {
      newWidth = Math.max(50, this.originalSize.width + deltaX);
    }
    if (this.resizeHandle.bottom) {
      newHeight = Math.max(30, this.originalSize.height + deltaY);
    }
    if (this.resizeHandle.left) {
      newWidth = Math.max(50, this.originalSize.width - deltaX);
      newX = this.originalPosition.x + deltaX;
    }
    if (this.resizeHandle.top) {
      newHeight = Math.max(30, this.originalSize.height - deltaY);
      newY = this.originalPosition.y + deltaY;
    }
    
    // Применяем новые размеры и позицию
    this.selectedElement.style.width = newWidth + 'px';
    this.selectedElement.style.height = newHeight + 'px';
    this.selectedElement.style.left = newX + 'px';
    this.selectedElement.style.top = newY + 'px';
  }

  onMouseUp() {
    if (this.isDragging) {
      this.stopDragging();
    } else if (this.isResizing) {
      this.stopResizing();
    }
  }

  stopDragging() {
    if (!this.selectedElement) return;
    
    this.isDragging = false;
    
    const elementId = this.selectedElement.dataset.elementId;
    const x = parseFloat(this.selectedElement.style.left);
    const y = parseFloat(this.selectedElement.style.top);
    
    stateManager.updateElement(elementId, {
      position: { x, y }
    });
    
    document.body.style.cursor = '';
    this.selectedElement.style.cursor = '';
  }

  stopResizing() {
    if (!this.selectedElement) return;
    
    this.isResizing = false;
    
    const elementId = this.selectedElement.dataset.elementId;
    const width = parseFloat(this.selectedElement.style.width);
    const height = parseFloat(this.selectedElement.style.height);
    const x = parseFloat(this.selectedElement.style.left);
    const y = parseFloat(this.selectedElement.style.top);
    
    stateManager.updateElement(elementId, {
      size: { width, height },
      position: { x, y }
    });
    
    document.body.style.cursor = '';
    this.resizeHandle = null;
  }

  onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (this.selectedElement) {
          this.deleteSelectedElement();
        }
        break;
      case 'Escape':
        this.deselectElement();
        stateManager.selectElement(null);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (this.selectedElement && !e.ctrlKey && !e.metaKey) {
          this.nudgeElement(e.key, e.shiftKey ? 10 : 1);
          e.preventDefault();
        }
        break;
      case 'z':
      case 'я': // Русская z
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.shiftKey) {
            stateManager.redo();
          } else {
            stateManager.undo();
          }
        }
        break;
    }
  }

  deleteSelectedElement() {
    if (!this.selectedElement) return;
    
    const elementId = this.selectedElement.dataset.elementId;
    const elementType = this.selectedElement.classList[1].replace('element-', '');
    
    if (confirm(`Удалить элемент "${elementType}"?`)) {
      stateManager.deleteElement(elementId);
      this.showNotification('Элемент удален', 'success');
    }
  }

  nudgeElement(direction, amount) {
    if (!this.selectedElement) return;
    
    const elementId = this.selectedElement.dataset.elementId;
    const element = this.findElementById(elementId);
    
    if (!element) return;
    
    let newX = element.position?.x || 0;
    let newY = element.position?.y || 0;
    
    switch (direction) {
      case 'ArrowUp': newY -= amount; break;
      case 'ArrowDown': newY += amount; break;
      case 'ArrowLeft': newX -= amount; break;
      case 'ArrowRight': newX += amount; break;
    }
    
    this.selectedElement.style.left = newX + 'px';
    this.selectedElement.style.top = newY + 'px';
    
    stateManager.updateElement(elementId, {
      position: { x: newX, y: newY }
    });
  }

  clearCanvas() {
    const state = stateManager.state;
    const currentPage = state.pages[state.currentPage];
    
    if (!currentPage || !currentPage.elements || currentPage.elements.length === 0) {
      return;
    }
    
    if (confirm('Очистить всю страницу?')) {
      // Удаляем все элементы текущей страницы
      const pageId = state.currentPage;
      const elements = [...currentPage.elements];
      
      elements.forEach(element => {
        stateManager.deleteElement(element.id);
      });
      
      this.showNotification('Страница очищена', 'success');
    }
  }

  duplicateElement(elementId) {
    const element = this.findElementById(elementId);
    if (!element) return;
    
    const newElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: 'el_' + Date.now(),
      position: {
        x: (element.position?.x || 0) + 20,
        y: (element.position?.y || 0) + 20
      }
    };
    
    delete newElement.pageId;
    
    const newElementId = stateManager.addElement(newElement);
    
    setTimeout(() => {
      this.selectElementById(newElementId);
    }, 10);
    
    this.showNotification('Элемент скопирован', 'success');
  }

  bringToFront(elementId) {
    const element = this.findElementById(elementId);
    if (!element) return;

    const currentPage = stateManager.state.pages[stateManager.state.currentPage];
    if (!currentPage) return;

    // Находим индекс элемента
    const index = currentPage.elements.findIndex(el => el.id === elementId);
    if (index === -1) return;

    // Перемещаем в конец массива (последний элемент будет поверх)
    const elements = [...currentPage.elements];
    const [movedElement] = elements.splice(index, 1);
    elements.push(movedElement);

    // Обновляем состояние
    stateManager.setState(state => ({
      pages: {
        ...state.pages,
        [stateManager.state.currentPage]: {
          ...state.pages[stateManager.state.currentPage],
          elements: elements
        }
      }
    }));

    this.render();
    this.showNotification('Элемент поднят на передний план', 'success');
  }

  sendToBack(elementId) {
    const element = this.findElementById(elementId);
    if (!element) return;

    const currentPage = stateManager.state.pages[stateManager.state.currentPage];
    if (!currentPage) return;

    // Находим индекс элемента
    const index = currentPage.elements.findIndex(el => el.id === elementId);
    if (index === -1) return;

    // Перемещаем в начало массива (первый элемент будет снизу)
    const elements = [...currentPage.elements];
    const [movedElement] = elements.splice(index, 1);
    elements.unshift(movedElement);

    // Обновляем состояние
    stateManager.setState(state => ({
      pages: {
        ...state.pages,
        [stateManager.state.currentPage]: {
          ...state.pages[stateManager.state.currentPage],
          elements: elements
        }
      }
    }));

    this.render();
    this.showNotification('Элемент отправлен на задний план', 'success');
  }

  updateZoom(zoom) {
    this.elementsContainer.style.transform = `scale(${zoom})`;
    this.elementsContainer.style.transformOrigin = 'top left';
  }

  toggleGrid(show) {
    const grid = this.canvas.querySelector('.canvas-grid');
    if (grid) {
      grid.style.display = show ? 'block' : 'none';
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `vsb-notification vsb-notification-${type}`;
    notification.innerHTML = `
      <div class="vsb-notification-content">${message}</div>
      <button class="vsb-notification-close">&times;</button>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideInRight 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 250px;
      max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    notification.querySelector('.vsb-notification-close').onclick = () => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    };
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
    
    // Добавляем стили анимации
    if (!document.querySelector('#vsb-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'vsb-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .vsb-notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          margin-left: 15px;
        }
      `;
      document.head.appendChild(style);
    }
  }
}

window.CanvasManager = CanvasManager;