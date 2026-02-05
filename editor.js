import appState from './state.js';

class Editor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeDirection = null;
        
        this.init();
    }
    
    init() {
        this.initComponentDrag();
        this.initCanvasEvents();
        this.initPropertyPanel();
        this.initControls();
        
        appState.subscribe(this.render.bind(this));
        this.render(appState.state);
        
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                appState.undo();
            }
            
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                appState.redo();
            }
            
            if (e.key === 'Delete' && appState.getSelectedElement()) {
                appState.deleteElement(appState.getSelectedElement().id);
            }
        });
    }
    
    initComponentDrag() {
        const components = document.querySelectorAll('.component');
        
        components.forEach(component => {
            component.addEventListener('dragstart', (e) => {
                const type = component.getAttribute('data-type');
                e.dataTransfer.setData('text/plain', type);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });
        
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const type = e.dataTransfer.getData('text/plain');
            if (!type) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.createElement(type, x, y);
        });
    }
    
    createElement(type, x, y) {
        const elementId = appState.generateId();
        let element;
        
        // Базовые стили для всех элементов
        const baseStyles = {
            position: 'absolute',
            top: Math.max(0, y - 50) + 'px',
            left: Math.max(0, x - 100) + 'px',
            width: '200px',
            height: '100px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontSize: '16px',
            padding: '10px',
            borderRadius: '0px',
            border: '1px solid #ddd',
            boxSizing: 'border-box',
            cursor: 'move',
            userSelect: 'none'
        };
        
        switch(type) {
            case 'container':
                element = {
                    id: elementId,
                    type: 'container',
                    content: 'Контейнер',
                    styles: { 
                        ...baseStyles, 
                        backgroundColor: '#f8f9fa', 
                        height: '150px' 
                    }
                };
                break;
            case 'heading':
                element = {
                    id: elementId,
                    type: 'heading',
                    content: 'Заголовок',
                    styles: { 
                        ...baseStyles, 
                        fontSize: '24px', 
                        fontWeight: 'bold', 
                        height: '50px',
                        margin: '0',
                        lineHeight: '1.2'
                    }
                };
                break;
            case 'paragraph':
                element = {
                    id: elementId,
                    type: 'paragraph',
                    content: 'Текст параграфа. Нажмите дважды для редактирования.',
                    styles: { 
                        ...baseStyles, 
                        height: '80px',
                        lineHeight: '1.5',
                        overflow: 'auto'
                    }
                };
                break;
            case 'button':
                element = {
                    id: elementId,
                    type: 'button',
                    content: 'Кнопка',
                    styles: { 
                        ...baseStyles, 
                        backgroundColor: '#3498db', 
                        color: '#ffffff',
                        height: '40px',
                        width: '120px',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }
                };
                break;
            case 'image':
                element = {
                    id: elementId,
                    type: 'image',
                    content: 'https://via.placeholder.com/200x100',
                    styles: { 
                        ...baseStyles, 
                        backgroundColor: '#ecf0f1',
                        backgroundImage: 'url(https://via.placeholder.com/200x100)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }
                };
                break;
            default:
                return;
        }
        
        appState.addElement(element);
    }
    
    initCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.target === this.canvas || e.target.classList.contains('grid-overlay')) {
                appState.update({ selectedElementId: null });
            }
        });
    }
    
    initPropertyPanel() {
        const propertyInputs = [
            'textContent', 'imageUrl', 'width', 'height', 
            'top', 'left', 'backgroundColor', 'color', 
            'fontSize', 'padding', 'borderRadius'
        ];
        
        // Оптимизированный дебаунс
        const createDebouncedHandler = (callback, delay) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => callback(...args), delay);
            };
        };
        
        propertyInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            const updateHandler = createDebouncedHandler(() => {
                const element = appState.getSelectedElement();
                if (!element) return;
                
                const updates = {};
                
                switch(inputId) {
                    case 'textContent':
                        updates.content = input.value;
                        appState.updateElement(element.id, updates);
                        break;
                    case 'imageUrl':
                        updates.content = input.value;
                        updates.styles = {
                            ...element.styles,
                            backgroundImage: `url(${input.value})`
                        };
                        appState.updateElement(element.id, updates);
                        break;
                    default:
                        const value = input.type === 'number' ? input.value + 'px' : input.value;
                        appState.updateElementStyles(element.id, {
                            [inputId]: value
                        });
                        break;
                }
            }, 100);
            
            input.addEventListener('input', updateHandler);
        });
        
        document.getElementById('deleteElement').addEventListener('click', () => {
            const element = appState.getSelectedElement();
            if (element) {
                appState.deleteElement(element.id);
            }
        });
        
        document.getElementById('duplicateElement').addEventListener('click', () => {
            const element = appState.getSelectedElement();
            if (element) {
                const newElement = {
                    ...JSON.parse(JSON.stringify(element)),
                    id: appState.generateId(),
                    styles: {
                        ...element.styles,
                        top: (parseInt(element.styles.top) || 0) + 20 + 'px',
                        left: (parseInt(element.styles.left) || 0) + 20 + 'px'
                    }
                };
                
                appState.addElement(newElement);
            }
        });
    }
    
    initControls() {
        document.getElementById('saveBtn').addEventListener('click', () => {
            const data = appState.exportForSave();
            localStorage.setItem('siteBuilderProject', data);
            
            const btn = document.getElementById('saveBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Сохранено!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        });
        
        document.getElementById('loadBtn').addEventListener('click', () => {
            const data = localStorage.getItem('siteBuilderProject');
            if (data) {
                if (confirm('Загрузить сохраненный проект?')) {
                    appState.importFromSave(data);
                }
            } else {
                alert('Сохраненные проекты не найдены.');
            }
        });
        
        document.getElementById('clearCanvas').addEventListener('click', () => {
            if (confirm('Очистить холст?')) {
                appState.clearCanvas();
            }
        });
        
        document.getElementById('undoBtn').addEventListener('click', () => appState.undo());
        document.getElementById('redoBtn').addEventListener('click', () => appState.redo());
        
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.openPreview();
        });
        
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('previewModal').classList.remove('show');
        });
        
        document.getElementById('closePreview').addEventListener('click', () => {
            document.getElementById('previewModal').classList.remove('show');
        });
        
        document.getElementById('previewModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('previewModal')) {
                document.getElementById('previewModal').classList.remove('show');
            }
        });
        
        document.getElementById('projectName').addEventListener('input', (e) => {
            appState.update({ project: { ...appState.state.project, name: e.target.value } });
        });
        
        document.querySelectorAll('.viewport-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.viewport-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const viewport = btn.getAttribute('data-viewport');
                let width = '1200px';
                
                switch(viewport) {
                    case 'tablet': width = '768px'; break;
                    case 'mobile': width = '375px'; break;
                }
                
                this.canvas.style.width = width;
            });
        });
    }
    
    openPreview() {
        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('sitePreview');
        
        const html = this.generatePreviewHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        iframe.src = url;
        modal.classList.add('show');
    }
    
    generatePreviewHTML() {
        const page = appState.getCurrentPage();
        let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appState.state.project.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; min-height: 100vh; position: relative; }
    </style>
</head>
<body>`;
        
        page.elements.forEach(element => {
            const styleString = this.stylesToString(element.styles);
            let content = element.content;
            
            if (element.type === 'image') {
                content = `<img src="${element.content}" alt="Изображение" style="width:100%;height:100%;object-fit:cover;">`;
            }
            
            html += `
    <div class="page-element ${element.type}" id="${element.id}" style="${styleString}">
        ${content}
    </div>`;
        });
        
        html += `
</body>
</html>`;
        
        return html;
    }
    
    stylesToString(styles) {
        const styleArray = [];
        
        for (const [key, value] of Object.entries(styles)) {
            // Преобразуем camelCase в kebab-case
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            
            // Убедимся, что значения правильно форматированы
            let cssValue = value;
            if (typeof value === 'number') {
                // Для числовых значений добавляем px, если это размер
                const sizeProperties = ['width', 'height', 'top', 'left', 'right', 'bottom', 
                                       'fontSize', 'padding', 'margin', 'borderRadius'];
                if (sizeProperties.includes(key)) {
                    cssValue = value + 'px';
                }
            }
            
            styleArray.push(`${cssKey}: ${cssValue}`);
        }
        
        return styleArray.join('; ');
    }
    
    render(state) {
        const page = state.pages.find(p => p.id === state.currentPageId);
        if (!page) return;
        
        document.getElementById('projectName').value = state.project.name;
        
        // Очищаем холст
        this.canvas.innerHTML = '<div class="grid-overlay"></div>';
        
        // Добавляем элементы
        page.elements.forEach(element => {
            const elementDiv = this.createElementDiv(element);
            this.canvas.appendChild(elementDiv);
        });
        
        this.updatePropertyPanel(state.selectedElementId);
    }
    
    createElementDiv(element) {
        const div = document.createElement('div');
        div.id = element.id;
        div.className = `canvas-element element-${element.type} ${element.id === appState.state.selectedElementId ? 'selected' : ''}`;
        
        // Применяем стили
        this.applyStylesToElement(div, element.styles);
        
        // Добавляем содержимое
        this.setElementContent(div, element);
        
        // Добавляем обработчики событий
        this.setupElementEvents(div, element);
        
        // Добавляем resize handles если элемент выбран
        if (element.id === appState.state.selectedElementId) {
            this.addResizeHandles(div);
        }
        
        return div;
    }
    
    applyStylesToElement(elementDiv, styles) {
        // Применяем стили напрямую
        for (const [key, value] of Object.entries(styles)) {
            // Преобразуем camelCase в kebab-case
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            elementDiv.style[cssKey] = value;
        }
        
        // Добавляем дополнительные обязательные стили
        elementDiv.style.position = 'absolute';
        elementDiv.style.cursor = 'move';
        elementDiv.style.userSelect = 'none';
        
        // Для изображений устанавливаем фон
        if (styles.backgroundImage) {
            elementDiv.style.backgroundImage = styles.backgroundImage;
            elementDiv.style.backgroundSize = 'cover';
            elementDiv.style.backgroundPosition = 'center';
            elementDiv.style.backgroundRepeat = 'no-repeat';
        }
    }
    
    setElementContent(elementDiv, element) {
        if (element.type === 'image') {
            elementDiv.innerHTML = `
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;">
                    <img src="${element.content}" alt="Изображение" 
                         style="max-width:100%;max-height:100%;object-fit:contain;"
                         onerror="this.style.display='none'; this.parentNode.innerHTML='Изображение'">
                </div>`;
        } else {
            elementDiv.textContent = element.content || '';
        }
    }
    
    setupElementEvents(elementDiv, element) {
        // Клик для выбора
        elementDiv.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            appState.update({ selectedElementId: element.id });
            
            if (!e.target.classList.contains('resize-handle')) {
                this.startDragging(e, elementDiv, element);
            }
        });
        
        // Двойной клик для редактирования текста
        if (element.type !== 'image') {
            elementDiv.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.makeElementEditable(elementDiv, element);
            });
        }
        
        // Предотвращаем выделение текста при перетаскивании
        elementDiv.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }
    
    startDragging(e, elementDiv, element) {
        this.isDragging = true;
        
        // Получаем текущие координаты элемента
        const rect = elementDiv.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Вычисляем смещение курсора относительно элемента
        this.dragOffset = {
            x: e.clientX - rect.left + canvasRect.left,
            y: e.clientY - rect.top + canvasRect.top
        };
        
        const mouseMoveHandler = (moveEvent) => {
            if (!this.isDragging) return;
            
            // Вычисляем новые координаты
            const newX = moveEvent.clientX - this.dragOffset.x;
            const newY = moveEvent.clientY - this.dragOffset.y;
            
            // Ограничиваем перемещение в пределах холста
            const maxX = this.canvas.offsetWidth - elementDiv.offsetWidth;
            const maxY = this.canvas.offsetHeight - elementDiv.offsetHeight;
            
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));
            
            // Применяем новые координаты
            elementDiv.style.left = clampedX + 'px';
            elementDiv.style.top = clampedY + 'px';
        };
        
        const mouseUpHandler = () => {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            
            // Сохраняем новые координаты в состоянии
            const finalLeft = parseInt(elementDiv.style.left);
            const finalTop = parseInt(elementDiv.style.top);
            
            appState.batchStart();
            appState.updateElementStyles(element.id, {
                left: finalLeft + 'px',
                top: finalTop + 'px'
            });
            appState.batchEnd();
            
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }
    
    addResizeHandles(elementDiv) {
        const handles = [
            { class: 'resize-n', cursor: 'n-resize', edge: 'top' },
            { class: 'resize-s', cursor: 's-resize', edge: 'bottom' },
            { class: 'resize-e', cursor: 'e-resize', edge: 'right' },
            { class: 'resize-w', cursor: 'w-resize', edge: 'left' },
            { class: 'resize-ne', cursor: 'ne-resize', edge: 'top-right' },
            { class: 'resize-nw', cursor: 'nw-resize', edge: 'top-left' },
            { class: 'resize-se', cursor: 'se-resize', edge: 'bottom-right' },
            { class: 'resize-sw', cursor: 'sw-resize', edge: 'bottom-left' }
        ];
        
        // Удаляем старые handles если они есть
        elementDiv.querySelectorAll('.resize-handle').forEach(h => h.remove());
        
        handles.forEach(handle => {
            const handleDiv = document.createElement('div');
            handleDiv.className = `resize-handle ${handle.class}`;
            handleDiv.style.cursor = handle.cursor;
            
            handleDiv.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startResizing(e, elementDiv, handle.edge);
            });
            
            elementDiv.appendChild(handleDiv);
        });
    }
    
    startResizing(e, elementDiv, direction) {
        e.preventDefault();
        this.isResizing = true;
        this.resizeDirection = direction;
        
        const elementId = elementDiv.id;
        const startX = e.clientX;
        const startY = e.clientY;
        
        const startWidth = elementDiv.offsetWidth;
        const startHeight = elementDiv.offsetHeight;
        const startLeft = elementDiv.offsetLeft;
        const startTop = elementDiv.offsetTop;
        
        const mouseMoveHandler = (moveEvent) => {
            if (!this.isResizing) return;
            
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            
            // Обрабатываем изменение размера в зависимости от направления
            if (direction.includes('right')) {
                newWidth = Math.max(50, startWidth + deltaX);
            }
            if (direction.includes('left')) {
                newWidth = Math.max(50, startWidth - deltaX);
                newLeft = startLeft + deltaX;
            }
            if (direction.includes('bottom')) {
                newHeight = Math.max(30, startHeight + deltaY);
            }
            if (direction.includes('top')) {
                newHeight = Math.max(30, startHeight - deltaY);
                newTop = startTop + deltaY;
            }
            
            // Ограничиваем размеры и положение
            const maxLeft = this.canvas.offsetWidth - newWidth;
            const maxTop = this.canvas.offsetHeight - newHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            
            // Применяем изменения
            elementDiv.style.width = newWidth + 'px';
            elementDiv.style.height = newHeight + 'px';
            elementDiv.style.left = newLeft + 'px';
            elementDiv.style.top = newTop + 'px';
        };
        
        const mouseUpHandler = () => {
            if (!this.isResizing) return;
            
            this.isResizing = false;
            
            // Сохраняем изменения в состоянии
            appState.batchStart();
            appState.updateElementStyles(elementId, {
                width: parseInt(elementDiv.style.width) + 'px',
                height: parseInt(elementDiv.style.height) + 'px',
                left: parseInt(elementDiv.style.left) + 'px',
                top: parseInt(elementDiv.style.top) + 'px'
            });
            appState.batchEnd();
            
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }
    
    makeElementEditable(elementDiv, element) {
        const originalContent = elementDiv.textContent;
        
        elementDiv.contentEditable = true;
        elementDiv.focus();
        
        // Выделяем весь текст
        const range = document.createRange();
        range.selectNodeContents(elementDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const finishEditing = () => {
            elementDiv.contentEditable = false;
            const newContent = elementDiv.textContent.trim();
            
            if (newContent !== originalContent) {
                appState.updateElement(element.id, { content: newContent });
            }
        };
        
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEditing();
            }
            if (e.key === 'Escape') {
                elementDiv.textContent = originalContent;
                finishEditing();
            }
        };
        
        elementDiv.addEventListener('blur', finishEditing);
        elementDiv.addEventListener('keydown', handleKeyDown);
    }
    
    updatePropertyPanel(selectedElementId) {
        const elementInfo = document.getElementById('elementInfo');
        const propertiesForm = document.getElementById('propertiesForm');
        
        if (!selectedElementId) {
            elementInfo.innerHTML = '<p>Выберите элемент для редактирования</p>';
            propertiesForm.style.opacity = '0.5';
            propertiesForm.style.pointerEvents = 'none';
            this.selectedElement = null;
            return;
        }
        
        propertiesForm.style.opacity = '1';
        propertiesForm.style.pointerEvents = 'auto';
        
        const element = appState.getSelectedElement();
        if (!element) return;
        
        this.selectedElement = element;
        elementInfo.innerHTML = `<p><strong>Тип:</strong> ${element.type}<br><strong>Размер:</strong> ${element.styles.width || 'auto'} × ${element.styles.height || 'auto'}</p>`;
        
        // Заполняем поля формы
        if (element.type !== 'image') {
            document.getElementById('textContent').value = element.content || '';
        }
        
        if (element.type === 'image') {
            document.getElementById('imageUrl').value = element.content || '';
        }
        
        // Заполняем числовые поля (убираем 'px' если есть)
        const styleFields = {
            width: 'width',
            height: 'height',
            top: 'top',
            left: 'left',
            backgroundColor: 'backgroundColor',
            color: 'color',
            fontSize: 'fontSize',
            padding: 'padding',
            borderRadius: 'borderRadius'
        };
        
        Object.entries(styleFields).forEach(([field, styleProp]) => {
            const input = document.getElementById(field);
            if (input && element.styles[styleProp] !== undefined) {
                let value = element.styles[styleProp];
                
                // Убираем 'px' из числовых значений для полей ввода
                if (typeof value === 'string' && value.endsWith('px')) {
                    value = value.replace('px', '');
                }
                
                input.value = value;
            }
        });
        
        // Показываем/скрываем соответствующие поля
        const textContentGroup = document.getElementById('textContent')?.closest('.form-control');
        const imageUrlGroup = document.getElementById('imageUrl')?.closest('.form-control');
        
        if (textContentGroup) {
            textContentGroup.style.display = element.type === 'image' ? 'none' : 'block';
        }
        if (imageUrlGroup) {
            imageUrlGroup.style.display = element.type === 'image' ? 'block' : 'none';
        }
    }
}
// Добавьте эти стили для современных кнопок и эффектов
    // Добавьте эти стили для современных кнопок и эффектов
    const style = document.createElement('style');
    style.textContent = `
        .btn-modern {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: none !important;
        }
        
        .btn-modern::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .btn-modern:hover::after {
            width: 300px;
            height: 300px;
        }
        
        .icon-badge {
            position: relative;
        }
        
        .icon-badge::after {
            content: '';
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            border-radius: 50%;
            border: 2px solid white;
        }
        
        .floating-action {
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
            100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
        }
        
        /* Кнопка очистить с фиксированными стилями */
        #clearCanvas {
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%) !important;
            color: white !important;
            padding: 10px 20px !important;
            border-radius: 12px !important;
            border: none !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            cursor: pointer !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        #clearCanvas:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(255, 65, 108, 0.3) !important;
        }
        
        #clearCanvas i {
            font-size: 16px !important;
        }
        
        /* Градиенты для иконок */
        .toolbar button i, 
        .component i,
        .property-group h4 i {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        [data-theme="dark"] .toolbar button i,
        [data-theme="dark"] .component i,
        [data-theme="dark"] .property-group h4 i {
            background: linear-gradient(135deg, #8a2be2 0%, #4b0082 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    `;
    document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    new Editor();
});