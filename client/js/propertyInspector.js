class PropertyInspector {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentElement = null;
    this.propertyGroups = {};
    
    this.init();
    this.subscribeToState();
  }

  init() {
    this.setupPropertyGroups();
    this.renderEmptyState();
  }

  subscribeToState() {
    stateManager.subscribe((state) => {
      if (state.selectedElement && state.selectedElement !== this.currentElement) {
        this.currentElement = state.selectedElement;
        this.renderElementProperties();
      } else if (!state.selectedElement && this.currentElement) {
        this.currentElement = null;
        this.renderEmptyState();
      }
    });
  }

  setupPropertyGroups() {
    this.propertyGroups = {
      content: {
        name: 'Содержимое',
        icon: 'fas fa-font',
        properties: {
          text: {
            type: 'textarea',
            label: 'Текст',
            getValue: (el) => el.content || '',
            setValue: (el, val) => ({ content: val })
          }
        }
      },
      
      layout: {
        name: 'Расположение',
        icon: 'fas fa-th',
        properties: {
          x: {
            type: 'number',
            label: 'X',
            unit: 'px',
            min: 0,
            getValue: (el) => el.position?.x || 0,
            setValue: (el, val) => ({ 
              position: { ...el.position, x: parseInt(val) || 0 }
            })
          },
          y: {
            type: 'number',
            label: 'Y',
            unit: 'px',
            min: 0,
            getValue: (el) => el.position?.y || 0,
            setValue: (el, val) => ({ 
              position: { ...el.position, y: parseInt(val) || 0 }
            })
          },
          width: {
            type: 'number',
            label: 'Ширина',
            unit: 'px',
            min: 10,
            getValue: (el) => el.size?.width || 200,
            setValue: (el, val) => ({ 
              size: { ...el.size, width: parseInt(val) || 200 }
            })
          },
          height: {
            type: 'number',
            label: 'Высота',
            unit: 'px',
            min: 10,
            getValue: (el) => el.size?.height || 100,
            setValue: (el, val) => ({ 
              size: { ...el.size, height: parseInt(val) || 100 }
            })
          }
        }
      },
      
      typography: {
        name: 'Текст',
        icon: 'fas fa-text-height',
        properties: {
          fontSize: {
            type: 'text',
            label: 'Размер шрифта',
            placeholder: '16px',
            getValue: (el) => el.styles?.fontSize || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, fontSize: val }
            })
          },
          fontWeight: {
            type: 'select',
            label: 'Насыщенность',
            options: [
              { value: '', label: 'Обычный' },
              { value: 'bold', label: 'Жирный' },
              { value: '300', label: 'Тонкий' },
              { value: '600', label: 'Полужирный' },
              { value: '900', label: 'Черный' }
            ],
            getValue: (el) => el.styles?.fontWeight || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, fontWeight: val }
            })
          },
          color: {
            type: 'color',
            label: 'Цвет текста',
            getValue: (el) => el.styles?.color || '#000000',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, color: val }
            })
          },
          textAlign: {
            type: 'select',
            label: 'Выравнивание',
            options: [
              { value: '', label: 'Слева' },
              { value: 'center', label: 'По центру' },
              { value: 'right', label: 'Справа' },
              { value: 'justify', label: 'По ширине' }
            ],
            getValue: (el) => el.styles?.textAlign || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, textAlign: val }
            })
          }
        }
      },
      
      background: {
        name: 'Фон',
        icon: 'fas fa-fill',
        properties: {
          backgroundColor: {
            type: 'color',
            label: 'Цвет фона',
            getValue: (el) => el.styles?.backgroundColor || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, backgroundColor: val }
            })
          }
        }
      },
      
      border: {
        name: 'Рамка',
        icon: 'fas fa-square',
        properties: {
          border: {
            type: 'text',
            label: 'Рамка',
            placeholder: '1px solid #ccc',
            getValue: (el) => el.styles?.border || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, border: val }
            })
          },
          borderRadius: {
            type: 'text',
            label: 'Закругление',
            placeholder: '8px',
            getValue: (el) => el.styles?.borderRadius || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, borderRadius: val }
            })
          }
        }
      },
      
      spacing: {
        name: 'Отступы',
        icon: 'fas fa-arrows-alt',
        properties: {
          padding: {
            type: 'text',
            label: 'Внутренние отступы',
            placeholder: '10px',
            getValue: (el) => el.styles?.padding || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, padding: val }
            })
          },
          margin: {
            type: 'text',
            label: 'Внешние отступы',
            placeholder: '10px',
            getValue: (el) => el.styles?.margin || '',
            setValue: (el, val) => ({ 
              styles: { ...el.styles, margin: val }
            })
          }
        }
      }
    };
  }

  renderEmptyState() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-mouse-pointer"></i>
        </div>
        <div class="empty-state-text">
          <h3>Выберите элемент</h3>
          <p>Выберите элемент на холсте для редактирования его свойств</p>
        </div>
      </div>
    `;
    
    // Стили для пустого состояния
    if (!document.querySelector('#empty-state-styles')) {
      const style = document.createElement('style');
      style.id = 'empty-state-styles';
      style.textContent = `
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px 20px;
          text-align: center;
          color: #666;
        }
        .empty-state-icon {
          font-size: 48px;
          color: #ddd;
          margin-bottom: 20px;
        }
        .empty-state-text h3 {
          margin: 0 0 10px 0;
          color: #444;
        }
        .empty-state-text p {
          margin: 0;
          color: #888;
          line-height: 1.5;
        }
      `;
      document.head.appendChild(style);
    }
  }

  renderElementProperties() {
    if (!this.currentElement) return;
    
    // Очищаем контейнер
    this.container.innerHTML = '';
    
    // Заголовок элемента
    const header = this.createElementHeader();
    this.container.appendChild(header);
    
    // Группы свойств
    Object.entries(this.propertyGroups).forEach(([groupId, group]) => {
      const groupElement = this.createPropertyGroup(groupId, group);
      if (groupElement) {
        this.container.appendChild(groupElement);
      }
    });
    
    // Кнопки действий
    const actions = this.createActionButtons();
    this.container.appendChild(actions);
  }

  createElementHeader() {
    const header = document.createElement('div');
    header.className = 'element-header';
    header.innerHTML = `
      <div class="element-header-info">
        <i class="${this.getElementIcon()}"></i>
        <div class="element-header-text">
          <h3>${this.getElementName()}</h3>
          <small>ID: ${this.currentElement.id.substring(0, 8)}...</small>
        </div>
      </div>
    `;
    
    header.style.cssText = `
      padding: 15px;
      border-bottom: 1px solid #eee;
      background: #f9f9f9;
    `;
    
    return header;
  }

  getElementIcon() {
    const icons = {
      header: 'fas fa-heading',
      paragraph: 'fas fa-paragraph',
      button: 'fas fa-square',
      image: 'fas fa-image',
      container: 'fas fa-square',
      modal: 'fas fa-window-maximize'
    };
    
    return icons[this.currentElement.type] || 'fas fa-cube';
  }

  getElementName() {
    const names = {
      header: 'Заголовок',
      paragraph: 'Текст',
      button: 'Кнопка',
      image: 'Изображение',
      container: 'Контейнер',
      modal: 'Модальное окно'
    };
    
    return names[this.currentElement.type] || 'Элемент';
  }

  createPropertyGroup(groupId, group) {
    // Проверяем, есть ли свойства для этого типа элемента
    const hasProperties = Object.values(group.properties).some(prop => {
      return !prop.visible || prop.visible(this.currentElement);
    });
    
    if (!hasProperties) return null;
    
    const groupDiv = document.createElement('div');
    groupDiv.className = 'property-group';
    groupDiv.dataset.groupId = groupId;
    
    const header = document.createElement('div');
    header.className = 'property-group-header';
    header.innerHTML = `
      <i class="${group.icon}"></i>
      <span>${group.name}</span>
      <i class="property-group-arrow fas fa-chevron-down"></i>
    `;
    
    const content = document.createElement('div');
    content.className = 'property-group-content';
    content.style.display = 'block'; // Все группы открыты по умолчанию
    
    Object.entries(group.properties).forEach(([propId, prop]) => {
      const propertyElement = this.createPropertyInput(propId, prop);
      if (propertyElement) {
        content.appendChild(propertyElement);
      }
    });
    
    groupDiv.appendChild(header);
    groupDiv.appendChild(content);
    
    // Переключение видимости группы
    header.addEventListener('click', () => {
      const isOpen = content.style.display === 'block';
      content.style.display = isOpen ? 'none' : 'block';
      const arrow = header.querySelector('.property-group-arrow');
      arrow.className = isOpen ? 'property-group-arrow fas fa-chevron-right' : 'property-group-arrow fas fa-chevron-down';
    });
    
    return groupDiv;
  }

  createPropertyInput(propId, prop) {
    const value = prop.getValue(this.currentElement);
    
    const row = document.createElement('div');
    row.className = 'property-row';
    
    const label = document.createElement('label');
    label.textContent = prop.label;
    label.style.cssText = `
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #555;
    `;
    
    const input = this.createInputElement(propId, prop, value);
    
    row.appendChild(label);
    row.appendChild(input);
    
    row.style.cssText = `
      margin-bottom: 15px;
    `;
    
    return row;
  }

  createInputElement(propId, prop, value) {
    switch (prop.type) {
      case 'textarea':
        return this.createTextarea(propId, prop, value);
      case 'number':
        return this.createNumberInput(propId, prop, value);
      case 'select':
        return this.createSelect(propId, prop, value);
      case 'color':
        return this.createColorInput(propId, prop, value);
      default:
        return this.createTextInput(propId, prop, value);
    }
  }

  createTextInput(propId, prop, value) {
    const container = document.createElement('div');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = prop.placeholder || '';
    
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    `;
    
    input.addEventListener('input', this.debounce(() => {
      this.updateProperty(propId, prop, input.value);
    }, 300));
    
    container.appendChild(input);
    return container;
  }

  createTextarea(propId, prop, value) {
    const textarea = document.createElement('textarea');
    textarea.value = value || '';
    textarea.placeholder = prop.placeholder || '';
    textarea.rows = 3;
    
    textarea.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      transition: border-color 0.3s;
    `;
    
    textarea.addEventListener('input', this.debounce(() => {
      this.updateProperty(propId, prop, textarea.value);
    }, 300));
    
    return textarea;
  }

  createNumberInput(propId, prop, value) {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center;';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value || 0;
    input.min = prop.min || 0;
    input.step = prop.step || 1;
    
    input.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    `;
    
    if (prop.unit) {
      const unit = document.createElement('span');
      unit.textContent = prop.unit;
      unit.style.cssText = `
        margin-left: 8px;
        font-size: 12px;
        color: #777;
        min-width: 20px;
      `;
      container.appendChild(unit);
    }
    
    input.addEventListener('input', this.debounce(() => {
      this.updateProperty(propId, prop, parseInt(input.value) || 0);
    }, 100));
    
    container.insertBefore(input, container.firstChild);
    return container;
  }

  createSelect(propId, prop, value) {
    const select = document.createElement('select');
    
    prop.options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = option.value === value;
      select.appendChild(optionElement);
    });
    
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      cursor: pointer;
      transition: border-color 0.3s;
    `;
    
    select.addEventListener('change', () => {
      this.updateProperty(propId, prop, select.value);
    });
    
    return select;
  }

  createColorInput(propId, prop, value) {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = value || '#000000';
    
    colorInput.style.cssText = `
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = value || '';
    textInput.placeholder = '#000000';
    
    textInput.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    `;
    
    const updateColor = (color) => {
      colorInput.value = color;
      textInput.value = color;
    };
    
    colorInput.addEventListener('input', () => {
      updateColor(colorInput.value);
      this.updateProperty(propId, prop, colorInput.value);
    });
    
    textInput.addEventListener('input', this.debounce(() => {
      updateColor(textInput.value);
      this.updateProperty(propId, prop, textInput.value);
    }, 300));
    
    container.appendChild(colorInput);
    container.appendChild(textInput);
    
    return container;
  }

  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  updateProperty(propId, prop, value) {
    if (!this.currentElement) return;
    
    try {
      const updates = prop.setValue(this.currentElement, value);
      stateManager.updateElement(this.currentElement.id, updates);
    } catch (error) {
      console.error('Ошибка обновления свойства:', error);
    }
  }

  createActionButtons() {
    const actions = document.createElement('div');
    actions.className = 'element-actions';
    actions.style.cssText = `
      padding: 15px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    `;
    
    const buttons = [
      {
        icon: 'fas fa-copy',
        text: 'Копировать',
        action: 'duplicate',
        color: '#4CAF50'
      },
      {
        icon: 'fas fa-trash',
        text: 'Удалить',
        action: 'delete',
        color: '#f44336'
      },
      {
        icon: 'fas fa-arrow-up',
        text: 'Наверх',
        action: 'bringToFront',
        color: '#2196F3'
      },
      {
        icon: 'fas fa-arrow-down',
        text: 'Вниз',
        action: 'sendToBack',
        color: '#FF9800'
      }
    ];
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.className = 'element-action-btn';
      button.innerHTML = `<i class="${btn.icon}"></i> ${btn.text}`;
      button.dataset.action = btn.action;
      
      button.style.cssText = `
        flex: 1;
        padding: 8px 12px;
        background: ${btn.color};
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: opacity 0.3s;
        min-width: 100px;
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.opacity = '0.9';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.opacity = '1';
      });
      
      button.addEventListener('click', () => {
        this.handleAction(btn.action);
      });
      
      actions.appendChild(button);
    });
    
    return actions;
  }

  handleAction(action) {
    if (!this.currentElement) return;
    
    switch (action) {
      case 'duplicate':
        if (window.canvasManager) {
          canvasManager.duplicateElement(this.currentElement.id);
        }
        break;
      case 'delete':
        if (window.canvasManager) {
          canvasManager.deleteSelectedElement();
        }
        break;
      case 'bringToFront':
        this.bringToFront();
        break;
      case 'sendToBack':
        this.sendToBack();
        break;
    }
  }

  bringToFront() {
    const elementId = this.currentElement.id;
    const pageId = this.currentElement.pageId || stateManager.state.currentPage;
    const page = stateManager.state.pages[pageId];
    
    if (!page || !page.elements) return;
    
    const elementIndex = page.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1 || elementIndex === page.elements.length - 1) return;
    
    const newElements = [...page.elements];
    const [element] = newElements.splice(elementIndex, 1);
    newElements.push(element);
    
    stateManager.setState(state => ({
      pages: {
        ...state.pages,
        [pageId]: {
          ...state.pages[pageId],
          elements: newElements
        }
      }
    }));
  }

  sendToBack() {
    const elementId = this.currentElement.id;
    const pageId = this.currentElement.pageId || stateManager.state.currentPage;
    const page = stateManager.state.pages[pageId];
    
    if (!page || !page.elements) return;
    
    const elementIndex = page.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1 || elementIndex === 0) return;
    
    const newElements = [...page.elements];
    const [element] = newElements.splice(elementIndex, 1);
    newElements.unshift(element);
    
    stateManager.setState(state => ({
      pages: {
        ...state.pages,
        [pageId]: {
          ...state.pages[pageId],
          elements: newElements
        }
      }
    }));
  }
}

window.PropertyInspector = PropertyInspector;
window.propertyInspector = new PropertyInspector('propertyInspector');