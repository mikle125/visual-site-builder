import appState from './state.js';

// Оптимизированный менеджер свойств
class PropertyManager {
    constructor() {
        this.form = document.getElementById('propertiesForm');
        this.inputs = new Map();
        this.currentElementId = null;
        this.updateQueue = new Map();
        this.batchTimeout = null;
        
        this.init();
    }
    
    init() {
        // Собираем все input элементы
        const inputElements = this.form.querySelectorAll('input, textarea, select');
        inputElements.forEach(input => {
            this.inputs.set(input.id, {
                element: input,
                lastValue: input.value,
                handler: this.createInputHandler(input.id)
            });
            
            input.addEventListener('input', this.inputs.get(input.id).handler);
        });
        
        // Кнопки действий
        document.getElementById('deleteElement')?.addEventListener('click', () => {
            if (this.currentElementId) {
                appState.deleteElement(this.currentElementId);
            }
        });
        
        document.getElementById('duplicateElement')?.addEventListener('click', () => {
            if (this.currentElementId) {
                this.duplicateElement();
            }
        });
        
        // Подписываемся на изменения состояния
        appState.subscribe(this.onStateChange.bind(this));
    }
    
    createInputHandler(inputId) {
        return (e) => {
            const value = e.target.value;
            const inputData = this.inputs.get(inputId);
            
            // Проверяем, действительно ли изменилось значение
            if (value === inputData.lastValue) return;
            
            inputData.lastValue = value;
            
            // Добавляем в очередь обновлений
            this.queueUpdate(inputId, value);
        };
    }
    
    // Очередь обновлений с дебаунсом
    queueUpdate(property, value) {
        this.updateQueue.set(property, value);
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        this.batchTimeout = setTimeout(() => {
            this.applyQueuedUpdates();
        }, 50); // Больший дебаунс для батчинга
    }
    
    applyQueuedUpdates() {
        if (this.updateQueue.size === 0 || !this.currentElementId) {
            return;
        }
        
        const updates = {};
        const element = appState.getElement(this.currentElementId);
        
        // Группируем обновления по типу
        for (const [property, value] of this.updateQueue) {
            switch(property) {
                case 'textContent':
                    updates.content = value;
                    break;
                    
                case 'imageUrl':
                    updates.content = value;
                    updates.styles = {
                        ...updates.styles,
                        backgroundImage: `url(${value})`
                    };
                    break;
                    
                default:
                    // Определяем, это стиль или другое свойство
                    const styleProperties = [
                        'width', 'height', 'top', 'left', 
                        'backgroundColor', 'color', 'fontSize',
                        'padding', 'borderRadius', 'border'
                    ];
                    
                    if (styleProperties.includes(property)) {
                        updates.styles = {
                            ...updates.styles,
                            [property]: this.parseValue(property, value)
                        };
                    }
            }
        }
        
        // Применяем все обновления за один раз
        if (Object.keys(updates).length > 0) {
            appState.batchStart();
            
            if (updates.content !== undefined) {
                element.content = updates.content;
            }
            
            if (updates.styles) {
                Object.assign(element.styles, updates.styles);
            }
            
            // Инвалидируем кэш и обновляем
            appState.elementCache.delete(this.currentElementId);
            appState.batchEnd();
        }
        
        this.updateQueue.clear();
        this.batchTimeout = null;
    }
    
    parseValue(property, value) {
        const input = this.inputs.get(property)?.element;
        if (!input) return value;
        
        if (input.type === 'number') {
            return parseInt(value) || 0;
        }
        if (input.type === 'color') {
            return value;
        }
        return value;
    }
    
    onStateChange(state) {
        const element = state.selectedElementId ? 
            appState.getElement(state.selectedElementId) : null;
        
        this.currentElementId = state.selectedElementId;
        this.updateForm(element);
    }
    
    updateForm(element) {
        if (!element) {
            this.showNoElementMessage();
            return;
        }
        
        // Показываем/скрываем соответствующие поля
        this.toggleFieldVisibility(element.type);
        
        // Заполняем значения
        this.inputs.forEach((inputData, id) => {
            const input = inputData.element;
            
            switch(id) {
                case 'textContent':
                    if (element.type !== 'image') {
                        input.value = element.content || '';
                        inputData.lastValue = input.value;
                    }
                    break;
                    
                case 'imageUrl':
                    if (element.type === 'image') {
                        input.value = element.content || '';
                        inputData.lastValue = input.value;
                    }
                    break;
                    
                default:
                    // Для стилевых свойств
                    if (element.styles && element.styles[id] !== undefined) {
                        input.value = element.styles[id];
                        inputData.lastValue = input.value;
                    }
            }
        });
        
        // Обновляем информацию об элементе
        const elementInfo = document.getElementById('elementInfo');
        if (elementInfo) {
            elementInfo.innerHTML = `
                <p><strong>Тип:</strong> ${element.type}<br>
                <strong>Размер:</strong> ${element.styles.width}×${element.styles.height}px</p>`;
        }
    }
    
    toggleFieldVisibility(elementType) {
        const textContentGroup = document.getElementById('textContent')?.closest('.form-control');
        const imageUrlGroup = document.getElementById('imageUrl')?.closest('.form-control');
        
        if (textContentGroup) {
            textContentGroup.style.display = elementType === 'image' ? 'none' : 'block';
        }
        if (imageUrlGroup) {
            imageUrlGroup.style.display = elementType === 'image' ? 'block' : 'none';
        }
        
        // Включаем/выключаем форму
        this.form.style.opacity = elementType ? '1' : '0.5';
        this.form.style.pointerEvents = elementType ? 'auto' : 'none';
    }
    
    showNoElementMessage() {
        const elementInfo = document.getElementById('elementInfo');
        if (elementInfo) {
            elementInfo.innerHTML = '<p>Выберите элемент для редактирования</p>';
        }
        
        this.form.style.opacity = '0.5';
        this.form.style.pointerEvents = 'none';
        
        // Сбрасываем очередь обновлений
        this.updateQueue.clear();
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }
    
    duplicateElement() {
        const original = appState.getElement(this.currentElementId);
        if (!original) return;
        
        const newElement = {
            ...JSON.parse(JSON.stringify(original)),
            id: appState.generateId(),
            styles: {
                ...original.styles,
                top: (original.styles.top || 0) + 20,
                left: (original.styles.left || 0) + 20
            }
        };
        
        appState.addElement(newElement);
    }
}

export default PropertyManager;