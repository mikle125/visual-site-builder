import appState from './state.js';

// Виртуальный DOM для холста
class CanvasManager {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.elements = new Map(); // Map<id, DOMElement>
        this.selectedElement = null;
        
        // Оптимизация: пул DOM элементов для переиспользования
        this.elementPool = [];
        this.maxPoolSize = 50;
        
        // Оптимизация: throttle для resize/move
        this.resizeThrottle = this.throttle(this.handleResize, 16);
        this.moveThrottle = this.throttle(this.handleMove, 16);
        
        this.init();
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    init() {
        // Сетка
        const grid = document.createElement('div');
        grid.className = 'grid-overlay';
        this.canvas.appendChild(grid);
    }
    
    // Обновление холста (только измененных элементов)
    update(state) {
        const page = state.pages.find(p => p.id === state.currentPageId);
        if (!page) return;
        
        const currentElements = new Set(Object.keys(page.elements));
        const existingElements = new Set(this.elements.keys());
        
        // Удаляем отсутствующие элементы
        for (const id of existingElements) {
            if (!currentElements.has(id)) {
                this.removeElement(id);
            }
        }
        
        // Добавляем/обновляем элементы
        for (const id of currentElements) {
            const elementData = page.elements[id];
            if (this.elements.has(id)) {
                this.updateElement(id, elementData, state.selectedElementId === id);
            } else {
                this.createElement(id, elementData, state.selectedElementId === id);
            }
        }
    }
    
    // Создание элемента (с использованием пула)
    createElement(id, elementData, isSelected) {
        let element;
        
        // Пробуем взять из пула
        if (this.elementPool.length > 0) {
            element = this.elementPool.pop();
            this.resetElement(element, elementData, isSelected);
        } else {
            element = this.createNewElement(elementData, isSelected);
        }
        
        element.dataset.elementId = id;
        this.canvas.appendChild(element);
        this.elements.set(id, element);
        
        this.setupElementEvents(element, id);
        return element;
    }
    
    createNewElement(elementData, isSelected) {
        const element = document.createElement('div');
        element.className = `canvas-element element-${elementData.type} ${isSelected ? 'selected' : ''}`;
        
        // Применяем стили
        this.applyStyles(element, elementData.styles);
        
        // Добавляем содержимое
        this.setContent(element, elementData);
        
        return element;
    }
    
    resetElement(element, elementData, isSelected) {
        element.className = `canvas-element element-${elementData.type} ${isSelected ? 'selected' : ''}`;
        this.applyStyles(element, elementData.styles);
        this.setContent(element, elementData);
        element.style.display = 'block';
    }
    
    // Быстрое обновление элемента (только изменившихся свойств)
    updateElement(id, elementData, isSelected) {
        const element = this.elements.get(id);
        if (!element) return;
        
        // Обновляем класс выбора
        element.classList.toggle('selected', isSelected);
        
        // Обновляем только изменившиеся стили
        const currentStyles = element.dataset.styles ? 
            JSON.parse(element.dataset.styles) : {};
        
        // Находим измененные стили
        const changedStyles = {};
        for (const [key, value] of Object.entries(elementData.styles)) {
            if (currentStyles[key] !== value) {
                changedStyles[key] = value;
                element.style[key] = value;
            }
        }
        
        // Обновляем содержимое если изменилось
        if (element.dataset.content !== elementData.content) {
            this.setContent(element, elementData);
        }
        
        // Сохраняем текущие стили для быстрого сравнения
        element.dataset.styles = JSON.stringify(elementData.styles);
        element.dataset.content = elementData.content;
        
        // Обновляем resize handles если элемент выбран
        if (isSelected && !element.hasResizeHandles) {
            this.addResizeHandles(element);
            element.hasResizeHandles = true;
        } else if (!isSelected && element.hasResizeHandles) {
            this.removeResizeHandles(element);
            element.hasResizeHandles = false;
        }
    }
    
    // Быстрое применение стилей
    applyStyles(element, styles) {
        // Применяем сразу все стили
        Object.assign(element.style, styles);
        
        // Сохраняем для быстрого сравнения
        element.dataset.styles = JSON.stringify(styles);
    }
    
    setContent(element, elementData) {
        if (elementData.type === 'image') {
            element.innerHTML = `
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">
                    <img src="${elementData.content}" alt="Изображение" 
                         style="max-width:100%;max-height:100%;object-fit:contain;"
                         onerror="this.style.display='none'">
                </div>`;
        } else {
            element.textContent = elementData.content;
        }
        element.dataset.content = elementData.content;
    }
    
    removeElement(id) {
        const element = this.elements.get(id);
        if (!element) return;
        
        // Убираем обработчики
        element.onmousedown = null;
        element.ondblclick = null;
        
        // Добавляем в пул для переиспользования
        if (this.elementPool.length < this.maxPoolSize) {
            element.style.display = 'none';
            this.elementPool.push(element);
        } else {
            element.remove();
        }
        
        this.elements.delete(id);
    }
    
    setupElementEvents(element, id) {
        element.onmousedown = (e) => {
            e.stopPropagation();
            appState.update({ selectedElementId: id });
            
            if (!e.target.classList.contains('resize-handle')) {
                this.startDragging(e, element, id);
            }
        };
        
        if (!element.dataset.type || element.dataset.type !== 'image') {
            element.ondblclick = (e) => {
                e.stopPropagation();
                this.makeEditable(element, id);
            };
        }
    }
    
    startDragging(e, element, elementId) {
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = element.offsetLeft;
        const startTop = element.offsetTop;
        
        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            
            const newLeft = Math.max(0, startLeft + deltaX);
            const newTop = Math.max(0, startTop + deltaY);
            
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            const finalLeft = parseInt(element.style.left);
            const finalTop = parseInt(element.style.top);
            
            // Батчинг обновлений позиции
            appState.batchStart();
            appState.updateElementStyles(elementId, {
                left: finalLeft,
                top: finalTop
            });
            appState.batchEnd();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    handleResize(element, elementId, direction, deltaX, deltaY) {
        // Оптимизированный обработчик resize
        const updates = {};
        const styles = element.style;
        
        switch(direction) {
            case 'e':
                updates.width = Math.max(50, parseInt(styles.width) + deltaX);
                break;
            case 's':
                updates.height = Math.max(30, parseInt(styles.height) + deltaY);
                break;
            // ... другие направления
        }
        
        // Применяем изменения сразу
        Object.assign(element.style, updates);
        
        // Сохраняем для батчинга
        return updates;
    }
    
    handleMove(element, elementId, deltaX, deltaY) {
        // Аналогично для move
    }
    
    makeEditable(element, elementId) {
        const original = element.textContent;
        element.contentEditable = true;
        element.focus();
        
        const selectAll = () => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };
        
        selectAll();
        
        const finish = () => {
            element.contentEditable = false;
            const newContent = element.textContent.trim();
            if (newContent !== original) {
                const elementData = appState.getElement(elementId);
                appState.updateElementStyles(elementId, { content: newContent });
            }
        };
        
        element.onblur = finish;
        element.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finish();
            }
            if (e.key === 'Escape') {
                element.textContent = original;
                finish();
            }
        };
    }
    
    addResizeHandles(element) {
        const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        handles.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-${dir}`;
            handle.onmousedown = (e) => {
                e.stopPropagation();
                this.startResizing(e, element, dir);
            };
            element.appendChild(handle);
        });
    }
    
    removeResizeHandles(element) {
        element.querySelectorAll('.resize-handle').forEach(h => h.remove());
    }
    
    startResizing(e, element, direction) {
        const elementId = element.dataset.elementId;
        const startWidth = element.offsetWidth;
        const startHeight = element.offsetHeight;
        const startLeft = element.offsetLeft;
        const startTop = element.offsetTop;
        const startX = e.clientX;
        const startY = e.clientY;
        
        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            
            this.resizeThrottle(element, elementId, direction, deltaX, deltaY, 
                startWidth, startHeight, startLeft, startTop);
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Финализируем изменения
            const updates = {
                width: parseInt(element.style.width),
                height: parseInt(element.style.height),
                left: parseInt(element.style.left),
                top: parseInt(element.style.top)
            };
            
            appState.batchStart();
            appState.updateElementStyles(elementId, updates);
            appState.batchEnd();
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    clear() {
        this.elements.forEach((element, id) => this.removeElement(id));
        this.elements.clear();
    }
}

export default CanvasManager;