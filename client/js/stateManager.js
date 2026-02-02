class StateManager {
  constructor() {
    // Простое состояние без избыточных данных
    this.state = {
      currentProject: null,
      currentPage: null,
      pages: {},
      selectedElement: null,
      zoom: 1,
      grid: true,
      settings: {
        language: 'ru',
        theme: 'light',
        autoSave: true
      }
    };
    
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 20;
    this.subscribers = new Set();
    this.changeQueue = [];
    this.isProcessingQueue = false;
    
    this.init();
  }

  init() {
    this.loadFromStorage();
    
    // Если нет проекта, создаем новый по умолчанию
    if (!this.state.currentProject) {
      this.createProject('Мой первый проект');
    }
    
    this.setupAutoSave();
    this.debouncedSave = this.debounce(this.saveToStorage.bind(this), 1000);
  }

  // Дебаунс для оптимизации
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Подписка на изменения
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Уведомление подписчиков
  notify() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Оптимизированный setState
  setState(updater, addToHistory = true) {
    try {
      const newState = typeof updater === 'function' ? updater(this.state) : updater;
      
      // Добавляем в историю только если требуется и не превышен лимит
      if (addToHistory && this.history.length < this.maxHistorySize) {
        this.addToHistory(this.state);
      }
      
      // Мержим состояния без глубокого копирования
      Object.assign(this.state, newState);
      
      // Очередь изменений для предотвращения блокировки UI
      this.changeQueue.push(() => {
        this.notify();
        this.debouncedSave();
      });
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    } catch (error) {
      console.error('StateManager.setState error:', error);
    }
  }

  // Обработка очереди
  processQueue() {
    this.isProcessingQueue = true;
    
    requestAnimationFrame(() => {
      while (this.changeQueue.length > 0) {
        const task = this.changeQueue.shift();
        try {
          task();
        } catch (error) {
          console.error('Queue task error:', error);
        }
      }
      this.isProcessingQueue = false;
    });
  }

  // Добавление в историю с оптимизацией
  addToHistory(state) {
    try {
      // Сохраняем только минимальные необходимые данные
      const historyEntry = {
        timestamp: Date.now(),
        selectedElement: state.selectedElement ? {
          id: state.selectedElement.id,
          type: state.selectedElement.type
        } : null,
        pages: {}
      };
      
      // Сохраняем только текущую страницу для истории
      if (state.currentPage && state.pages[state.currentPage]) {
        const page = state.pages[state.currentPage];
        historyEntry.pages[state.currentPage] = {
          id: page.id,
          elementsCount: page.elements ? page.elements.length : 0
        };
      }
      
      this.history.push(historyEntry);
      this.historyIndex = this.history.length - 1;
      
      // Ограничиваем размер истории
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.historyIndex--;
      }
    } catch (error) {
      console.error('StateManager.addToHistory error:', error);
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      // В реальном приложении здесь была бы загрузка состояния из истории
      console.log('Undo to history index:', this.historyIndex);
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      console.log('Redo to history index:', this.historyIndex);
      return true;
    }
    return false;
  }

  // Оптимизированные методы работы с проектом
  createProject(name = 'Новый проект') {
    const projectId = 'proj_' + Date.now();
    const pageId = 'page_' + Date.now();
    
    this.setState({
      currentProject: {
        id: projectId,
        name: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      pages: {
        [pageId]: {
          id: pageId,
          name: 'Главная',
          elements: [],
          styles: {},
          isHomepage: true,
          createdAt: new Date().toISOString()
        }
      },
      currentPage: pageId,
      selectedElement: null
    });
    
    return projectId;
  }

  addPage(name = 'Новая страница') {
    const pageId = 'page_' + Date.now();
    
    this.setState(state => ({
      pages: {
        ...state.pages,
        [pageId]: {
          id: pageId,
          name: name,
          elements: [],
          styles: {},
          isHomepage: false,
          createdAt: new Date().toISOString()
        }
      },
      currentPage: pageId
    }));
    
    return pageId;
  }

  deletePage(pageId) {
    if (Object.keys(this.state.pages).length <= 1) {
      alert('Нельзя удалить последнюю страницу');
      return false;
    }
    
    this.setState(state => {
      const pages = { ...state.pages };
      delete pages[pageId];
      
      return {
        pages,
        currentPage: state.currentPage === pageId ? Object.keys(pages)[0] : state.currentPage,
        selectedElement: state.selectedElement?.pageId === pageId ? null : state.selectedElement
      };
    });
    
    return true;
  }

  // Оптимизированные методы работы с элементами
  addElement(element) {
    const pageId = this.state.currentPage;
    
    // Проверяем, что текущая страница существует
    if (!pageId || !this.state.pages[pageId]) {
      console.error('No active page selected');
      return null;
    }
    
    const elementId = 'el_' + Date.now();
    
    const newElement = {
      id: elementId,
      type: element.type,
      position: element.position || { x: 100, y: 100 },
      size: element.size || { width: 200, height: 100 },
      styles: element.styles || {},
      content: element.content || '',
      pageId: pageId
    };
    
    this.setState(state => ({
      pages: {
        ...state.pages,
        [pageId]: {
          ...state.pages[pageId],
          elements: [...(state.pages[pageId].elements || []), newElement]
        }
      },
      selectedElement: newElement
    }));
    
    return elementId;
  }

  updateElement(elementId, updates) {
    const pageId = this.state.currentPage;
    const page = this.state.pages[pageId];
    
    if (!page || !page.elements) return;
    
    const elementIndex = page.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return;
    
    this.setState(state => {
      const pages = { ...state.pages };
      const elements = [...pages[pageId].elements];
      elements[elementIndex] = { ...elements[elementIndex], ...updates };
      
      pages[pageId] = { ...pages[pageId], elements };
      
      return {
        pages,
        selectedElement: state.selectedElement?.id === elementId 
          ? { ...state.selectedElement, ...updates }
          : state.selectedElement
      };
    });
  }

  deleteElement(elementId) {
    const pageId = this.state.currentPage;
    
    this.setState(state => ({
      pages: {
        ...state.pages,
        [pageId]: {
          ...state.pages[pageId],
          elements: state.pages[pageId].elements.filter(el => el.id !== elementId)
        }
      },
      selectedElement: state.selectedElement?.id === elementId ? null : state.selectedElement
    }));
  }

  selectElement(element) {
    this.setState({
      selectedElement: element ? { ...element } : null
    }, false); // Не добавляем в историю при выборе элемента
  }

  // Локальное хранилище
  saveToStorage() {
    try {
      const data = {
        currentProject: this.state.currentProject,
        pages: this.state.pages,
        currentPage: this.state.currentPage,
        settings: this.state.settings,
        version: '1.0'
      };
      
      localStorage.setItem('vsb_state', JSON.stringify(data));
    } catch (error) {
      console.warn('Не удалось сохранить состояние:', error);
    }
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('vsb_state');
      if (saved) {
        const data = JSON.parse(saved);
        
        // Проверяем версию и загружаем данные
        if (data.version === '1.0') {
          this.state = {
            ...this.state,
            currentProject: data.currentProject || null,
            pages: data.pages || {},
            currentPage: data.currentPage || null,
            settings: { ...this.state.settings, ...data.settings }
          };
        }
      }
    } catch (error) {
      console.warn('Не удалось загрузить состояние:', error);
    }
  }

  // Автосохранение
  setupAutoSave() {
    if (this.state.settings.autoSave) {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  // Экспорт состояния
  exportState() {
    const data = {
      project: this.state.currentProject,
      pages: this.state.pages,
      settings: this.state.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Импорт состояния
  importState(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.version === '1.0') {
        this.setState({
          currentProject: data.project,
          pages: data.pages || {},
          currentPage: Object.keys(data.pages || {})[0] || null,
          settings: { ...this.state.settings, ...data.settings },
          selectedElement: null
        });
        
        return true;
      }
    } catch (error) {
      console.error('Ошибка импорта:', error);
    }
    return false;
  }

  // Получение данных проекта для API
  getProjectData() {
    const currentPage = this.state.pages[this.state.currentPage];
    
    return {
      project: this.state.currentProject,
      pages: Object.values(this.state.pages).map(page => ({
        id: page.id,
        name: page.name,
        elements: page.elements || [],
        styles: page.styles || {},
        isHomepage: page.isHomepage || false
      })),
      currentPage: currentPage ? {
        id: currentPage.id,
        name: currentPage.name,
        elements: currentPage.elements || [],
        styles: currentPage.styles || {}
      } : null
    };
  }

  // Установка данных проекта из API
  setProjectData(projectData) {
    const pages = {};
    
    projectData.pages.forEach(page => {
      pages[page.id] = {
        id: page.id,
        name: page.name,
        elements: page.elements || [],
        styles: page.styles || {},
        isHomepage: page.isHomepage || false,
        createdAt: new Date().toISOString()
      };
    });
    
    this.setState({
      currentProject: projectData.project,
      pages: pages,
      currentPage: pages[Object.keys(pages)[0]]?.id || null,
      selectedElement: null
    });
  }

  // Сброс состояния
  reset() {
    this.setState({
      currentProject: null,
      currentPage: null,
      pages: {},
      selectedElement: null,
      zoom: 1,
      grid: true
    });
    
    this.history = [];
    this.historyIndex = -1;
    localStorage.removeItem('vsb_state');
  }
}

// Глобальный экземпляр
window.StateManager = StateManager;
window.stateManager = new StateManager();