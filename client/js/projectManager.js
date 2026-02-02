class ProjectManager {
  constructor() {
    this.apiBaseUrl = '/api';
    this.currentProjectId = null;
    this.isSaving = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadProjectsList();
  }

  setupEventListeners() {
    // Сохранить проект
    document.getElementById('saveProjectBtn')?.addEventListener('click', () => {
      this.saveProject();
    });
    
    // Новый проект
    document.getElementById('newProjectBtn')?.addEventListener('click', () => {
      this.createNewProject();
    });
    
    // Загрузить проект
    document.getElementById('loadProjectBtn')?.addEventListener('click', () => {
      this.showProjectsModal();
    });
    
    // Экспорт проекта
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      this.exportProject();
    });
    
    // Предпросмотр
    document.getElementById('previewBtn')?.addEventListener('click', () => {
      this.previewProject();
    });
    
    // Название проекта
    const projectNameInput = document.getElementById('projectName');
    if (projectNameInput) {
      projectNameInput.addEventListener('change', (e) => {
        const newName = e.target.value.trim();
        if (newName && stateManager.state.currentProject) {
          stateManager.setState(state => ({
            currentProject: { ...state.currentProject, name: newName }
          }));
        }
      });
      
      stateManager.subscribe((state) => {
        if (state.currentProject && projectNameInput.value !== state.currentProject.name) {
          projectNameInput.value = state.currentProject.name || '';
        }
      });
    }
  }

  async createNewProject() {
    const projectName = prompt('Введите название проекта:', 'Мой новый проект');
    if (!projectName) return;
    
    try {
      const projectData = stateManager.getProjectData();
      const response = await fetch(`${this.apiBaseUrl}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          data: projectData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.currentProjectId = result.project.id;
        
        // Обновляем локальное состояние
        stateManager.setState({
          currentProject: result.project
        });
        
        this.showNotification('Проект создан успешно', 'success');
        this.updateUI();
      } else {
        throw new Error(result.error || 'Не удалось создать проект');
      }
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      this.showNotification('Ошибка создания проекта: ' + error.message, 'error');
    }
  }

  async saveProject() {
    if (this.isSaving) return;
    
    if (!stateManager.state.currentProject) {
      await this.createNewProject();
      return;
    }
    
    this.isSaving = true;
    
    try {
      const projectData = stateManager.getProjectData();
      const projectId = stateManager.state.currentProject.id;
      
      const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: projectData.project.name,
          data: projectData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Сохраняем каждую страницу
        const pages = Object.values(projectData.pages);
        for (const page of pages) {
          await fetch(`${this.apiBaseUrl}/projects/${projectId}/pages/${page.id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              name: page.name,
              data: page
            })
          });
        }
        
        this.showNotification('Проект сохранен успешно', 'success');
      } else {
        throw new Error(result.error || 'Не удалось сохранить проект');
      }
    } catch (error) {
      console.error('Ошибка сохранения проекта:', error);
      this.showNotification('Ошибка сохранения проекта: ' + error.message, 'error');
    } finally {
      this.isSaving = false;
    }
  }

  async loadProject(projectId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.currentProjectId = projectId;
        
        // Очищаем текущее состояние
        stateManager.reset();
        
        // Загружаем данные проекта
        stateManager.setProjectData(result);
        
        this.showNotification('Проект загружен успешно', 'success');
        this.updateUI();
        this.closeModal();
      } else {
        throw new Error(result.error || 'Не удалось загрузить проект');
      }
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
      this.showNotification('Ошибка загрузки проекта: ' + error.message, 'error');
    }
  }

  async deleteProject(projectId) {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) {
      return;
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Если удален текущий проект, создаем новый
        if (this.currentProjectId === projectId) {
          stateManager.createNewProject();
        }
        
        this.showNotification('Проект удален', 'success');
        this.loadProjectsList();
      } else {
        throw new Error(result.error || 'Не удалось удалить проект');
      }
    } catch (error) {
      console.error('Ошибка удаления проекта:', error);
      this.showNotification('Ошибка удаления проекта: ' + error.message, 'error');
    }
  }

  async exportProject() {
    if (!stateManager.state.currentProject) {
      this.showNotification('Пожалуйста, сначала сохраните проект', 'warning');
      return;
    }
    
    try {
      const projectId = stateManager.state.currentProject.id;
      
      this.showNotification('Экспорт проекта...', 'info');
      
      const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/export`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Скачиваем ZIP файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stateManager.state.currentProject.name.replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      this.showNotification('Проект экспортирован успешно', 'success');
    } catch (error) {
      console.error('Ошибка экспорта проекта:', error);
      this.showNotification('Ошибка экспорта проекта: ' + error.message, 'error');
    }
  }

  async previewProject() {
    // Генерируем HTML для предпросмотра
    const projectData = stateManager.getProjectData();
    const currentPage = projectData.currentPage;
    
    if (!currentPage) {
      this.showNotification('Нет страницы для предпросмотра', 'warning');
      return;
    }
    
    // Создаем временный iframe для предпросмотра
    const modal = document.getElementById('previewModal') || this.createPreviewModal();
    const previewFrame = document.getElementById('previewFrame');
    
    if (previewFrame) {
      const previewHTML = this.generatePreviewHTML(currentPage);
      const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(previewHTML);
      iframeDoc.close();
      
      modal.style.display = 'flex';
    }
  }

  generatePreviewHTML(page) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${page.name} - Предпросмотр</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .preview-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            position: relative;
          }
          .preview-element {
            position: absolute;
            transition: all 0.3s ease;
          }
          .preview-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            font-size: 24px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="preview-header">
            ${page.name} - Предпросмотр
          </div>
          <div style="position: relative; min-height: 800px; padding: 20px;">
    `;
    
    // Добавляем элементы
    (page.elements || []).forEach(element => {
      const styles = Object.entries(element.styles || {})
        .map(([key, val]) => `${this.camelToKebab(key)}: ${val}`)
        .join('; ');
      
      html += `
        <div class="preview-element" style="
          position: absolute;
          left: ${element.position?.x || 0}px;
          top: ${element.position?.y || 0}px;
          width: ${element.size?.width || 200}px;
          height: ${element.size?.height || 100}px;
          ${styles}
        ">
          ${element.content || ''}
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  camelToKebab(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  createPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'previewModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content preview-modal">
        <div class="modal-header">
          <h3>Предпросмотр</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <iframe id="previewFrame" class="preview-frame"></iframe>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Обработчики событий
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    return modal;
  }

  async loadProjectsList() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/projects`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.projects = result.projects;
        this.updateProjectsList();
      }
    } catch (error) {
      console.error('Ошибка загрузки списка проектов:', error);
    }
  }

  showProjectsModal() {
    const modal = document.getElementById('projectModal') || this.createProjectsModal();
    const modalBody = document.getElementById('projectModalBody');
    
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="projects-list" id="projectsList">
          <div class="loading">Загрузка проектов...</div>
        </div>
        <div class="modal-actions">
          <button id="importLocalBtn" class="btn btn-secondary">
            <i class="fas fa-upload"></i> Импорт локального
          </button>
          <button id="closeModalBtn" class="btn">
            Отмена
          </button>
        </div>
      `;
      
      modal.style.display = 'flex';
      this.updateProjectsList();
      this.setupModalEvents();
    }
  }

  createProjectsModal() {
    const modal = document.createElement('div');
    modal.id = 'projectModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-project-diagram"></i> Управление проектами</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="projectModalBody"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  updateProjectsList() {
    const projectsList = document.getElementById('projectsList');
    if (!projectsList || !this.projects) return;
    
    if (this.projects.length === 0) {
      projectsList.innerHTML = `
        <div class="no-projects">
          <i class="fas fa-folder-open"></i>
          <p>Проекты не найдены</p>
          <small>Создайте новый проект</small>
        </div>
      `;
      return;
    }
    
    projectsList.innerHTML = this.projects.map(project => `
      <div class="project-item" data-project-id="${project.id}">
        <div class="project-info">
          <i class="fas fa-project-diagram"></i>
          <div>
            <h4>${project.name}</h4>
            <small>Создан: ${new Date(project.created_at).toLocaleDateString('ru-RU')}</small>
            <small>Изменен: ${new Date(project.updated_at).toLocaleDateString('ru-RU')}</small>
          </div>
        </div>
        <div class="project-actions">
          <button class="btn-icon load-project-btn" title="Загрузить">
            <i class="fas fa-folder-open"></i>
          </button>
          <button class="btn-icon delete-project-btn" title="Удалить">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    // Обработчики событий
    projectsList.querySelectorAll('.load-project-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const projectId = e.target.closest('.project-item').dataset.projectId;
        this.loadProject(projectId);
      });
    });
    
    projectsList.querySelectorAll('.delete-project-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const projectId = e.target.closest('.project-item').dataset.projectId;
        this.deleteProject(projectId);
      });
    });
  }

  setupModalEvents() {
    // Кнопка закрытия
    document.querySelectorAll('.modal-close').forEach(button => {
      button.addEventListener('click', () => this.closeModal());
    });
    
    // Фон модального окна
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }
    
    // Импорт локального проекта
    document.getElementById('importLocalBtn')?.addEventListener('click', () => {
      this.importLocalProject();
    });
    
    // Кнопка отмены
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
      this.closeModal();
    });
  }

  importLocalProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const content = await file.text();
        const success = stateManager.importState(content);
        
        if (success) {
          this.showNotification('Проект импортирован успешно', 'success');
          this.updateUI();
          this.closeModal();
        } else {
          throw new Error('Неверный формат файла проекта');
        }
      } catch (error) {
        console.error('Ошибка импорта проекта:', error);
        this.showNotification('Ошибка импорта проекта: ' + error.message, 'error');
      }
    });
    
    input.click();
  }

  closeModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  updateUI() {
    // Название проекта
    const projectNameInput = document.getElementById('projectName');
    if (projectNameInput && stateManager.state.currentProject) {
      projectNameInput.value = stateManager.state.currentProject.name;
    }
    
    // Вкладки страниц
    this.updatePageTabs();
  }

  updatePageTabs() {
    const pageTabs = document.getElementById('pageTabs');
    if (!pageTabs) return;
    
    const pages = stateManager.state.pages;
    const currentPageId = stateManager.state.currentPage;
    
    // Очищаем существующие вкладки
    const addButton = pageTabs.querySelector('.add-page-btn');
    pageTabs.innerHTML = '';
    
    // Добавляем вкладки страниц
    Object.values(pages).forEach(page => {
      const tab = document.createElement('div');
      tab.className = `page-tab ${page.id === currentPageId ? 'active' : ''}`;
      tab.dataset.pageId = page.id;
      tab.innerHTML = `
        <span>${page.name}</span>
        ${Object.keys(pages).length > 1 ? '<button class="page-close"><i class="fas fa-times"></i></button>' : ''}
      `;
      
      // Клик для переключения страницы
      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.page-close')) {
          stateManager.setState({ currentPage: page.id });
        }
      });
      
      // Кнопка закрытия страницы
      const closeBtn = tab.querySelector('.page-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deletePage(page.id);
        });
      }
      
      pageTabs.appendChild(tab);
    });
    
    // Кнопка добавления страницы
    if (addButton) {
      pageTabs.appendChild(addButton);
    } else {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-page-btn';
      addBtn.innerHTML = '<i class="fas fa-plus"></i>';
      addBtn.addEventListener('click', () => this.addPage());
      pageTabs.appendChild(addBtn);
    }
  }

  async addPage() {
    const pageName = prompt('Введите название страницы:', `Страница ${Object.keys(stateManager.state.pages).length + 1}`);
    if (!pageName) return;
    
    if (!stateManager.state.currentProject) {
      this.showNotification('Пожалуйста, сначала сохраните проект', 'warning');
      return;
    }
    
    try {
      const pageId = stateManager.addPage(pageName);
      
      // Сохраняем на сервере
      const response = await fetch(`${this.apiBaseUrl}/projects/${stateManager.state.currentProject.id}/pages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: pageName,
          data: stateManager.state.pages[pageId]
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        this.showNotification('Страница добавлена успешно', 'success');
        this.updatePageTabs();
      } else {
        // Удаляем из локального состояния, если сохранение на сервере не удалось
        stateManager.deletePage(pageId);
        throw new Error(result.error || 'Не удалось сохранить страницу');
      }
    } catch (error) {
      console.error('Ошибка добавления страницы:', error);
      this.showNotification('Ошибка добавления страницы: ' + error.message, 'error');
    }
  }

  async deletePage(pageId) {
    if (!confirm('Вы уверены, что хотите удалить эту страницу?')) {
      return;
    }
    
    if (!stateManager.state.currentProject) {
      stateManager.deletePage(pageId);
      this.updatePageTabs();
      return;
    }
    
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/projects/${stateManager.state.currentProject.id}/pages/${pageId}`,
        { 
          method: 'DELETE',
          headers: { 'Accept': 'application/json' }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        stateManager.deletePage(pageId);
        this.showNotification('Страница удалена', 'success');
        this.updatePageTabs();
      } else {
        throw new Error(result.error || 'Не удалось удалить страницу');
      }
    } catch (error) {
      console.error('Ошибка удаления страницы:', error);
      this.showNotification('Ошибка удаления страницы: ' + error.message, 'error');
    }
  }

  exportLocalProject() {
    const projectData = stateManager.exportState();
    const projectName = stateManager.state.currentProject?.name || 'проект';
    
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Проект экспортирован локально', 'success');
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
  }
}

window.ProjectManager = ProjectManager;
window.projectManager = new ProjectManager();