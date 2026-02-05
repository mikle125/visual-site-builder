import appState from './state.js';
import CanvasManager from './canvas-manager.js';
import PropertyManager from './property-manager.js';

class Editor {
    constructor() {
        this.canvasElement = document.getElementById('canvas');
        this.canvasManager = new CanvasManager(this.canvasElement);
        this.propertyManager = new PropertyManager();
        
        this.init();
    }
    
    init() {
        this.initDragAndDrop();
        this.initControls();
        this.initKeyboardShortcuts();
        this.initViewportControls();
        
        // Подписка на изменения состояния
        appState.subscribe(this.onStateChange.bind(this));
        
        // Начальный рендер
        this.onStateChange(appState.state);
    }
    
    initDragAndDrop() {
        // Drag from components panel
        document.querySelectorAll('.component').forEach(comp => {
            comp.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', comp.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });
        
        // Drop to canvas
        this.canvasElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.canvasElement.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const type = e.dataTransfer.getData('type');
            if (!type) return;
            
            const rect = this.canvasElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.createElement(type, x, y);
        });
    }
    
    createElement(type, x, y) {
        const elementId = appState.generateId();
        const defaultStyles = this.getDefaultStyles(type);
        
        const element = {
            id: elementId,
            type,
            content: this.getDefaultContent(type),
            styles: {
                ...defaultStyles,
                top: Math.max(0, y - defaultStyles.height / 2),
                left: Math.max(0, x - defaultStyles.width / 2)
            }
        };
        
        appState.addElement(element);
    }
    
    getDefaultStyles(type) {
        const styles = {
            position: 'absolute',
            width: 200,
            height: 100,
            backgroundColor: '#ffffff',
            color: '#000000',
            fontSize: 16,
            padding: 10,
            borderRadius: 0,
            border: '1px solid #ddd',
            boxSizing: 'border-box'
        };
        
        switch(type) {
            case 'container':
                return { ...styles, backgroundColor: '#f8f9fa', height: 150 };
            case 'heading':
                return { ...styles, fontSize: 24, fontWeight: 'bold', height: 50 };
            case 'paragraph':
                return { ...styles, height: 80, lineHeight: 1.5 };
            case 'button':
                return { 
                    ...styles, 
                    backgroundColor: '#3498db', 
                    color: '#ffffff',
                    height: 40,
                    width: 120,
                    textAlign: 'center',
                    cursor: 'pointer'
                };
            case 'image':
                return { 
                    ...styles, 
                    backgroundColor: '#ecf0f1',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                };
            default:
                return styles;
        }
    }
    
    getDefaultContent(type) {
        switch(type) {
            case 'heading': return 'Заголовок';
            case 'paragraph': return 'Текст параграфа';
            case 'button': return 'Кнопка';
            case 'container': return 'Контейнер';
            case 'image': return 'https://via.placeholder.com/200x100';
            default: return 'Элемент';
        }
    }
    
    initControls() {
        // Save/Load
        document.getElementById('saveBtn').addEventListener('click', () => {
            const data = appState.exportForSave();
            localStorage.setItem('siteBuilderProject', data);
            this.showNotification('Сохранено!');
        });
        
        document.getElementById('loadBtn').addEventListener('click', () => {
            const data = localStorage.getItem('siteBuilderProject');
            if (data && confirm('Загрузить сохраненный проект?')) {
                appState.importFromSave(data);
            }
        });
        
        // Clear
        document.getElementById('clearCanvas').addEventListener('click', () => {
            if (confirm('Очистить холст?')) {
                const page = appState.getCurrentPage();
                page.elements = {};
                appState.update({ selectedElementId: null });
                this.canvasManager.clear();
            }
        });
        
        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => appState.undo());
        document.getElementById('redoBtn').addEventListener('click', () => appState.redo());
        
        // Project name
        document.getElementById('projectName').addEventListener('input', (e) => {
            appState.update({ project: { ...appState.state.project, name: e.target.value } });
        });
    }
    
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'z':
                        e.preventDefault();
                        appState.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        appState.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        document.getElementById('saveBtn').click();
                        break;
                }
            }
            
            if (e.key === 'Delete' && appState.state.selectedElementId) {
                appState.deleteElement(appState.state.selectedElementId);
            }
        });
    }
    
    initViewportControls() {
        document.querySelectorAll('.viewport-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.viewport-btn').forEach(b => 
                    b.classList.remove('active'));
                btn.classList.add('active');
                
                const viewport = btn.dataset.viewport;
                const widths = { desktop: '1200px', tablet: '768px', mobile: '375px' };
                this.canvasElement.style.width = widths[viewport] || '1200px';
            });
        });
    }
    
    onStateChange(state) {
        // Обновляем холст
        this.canvasManager.update(state);
        
        // Обновляем название проекта
        const nameInput = document.getElementById('projectName');
        if (nameInput && nameInput.value !== state.project.name) {
            nameInput.value = state.project.name;
        }
    }
    
    showNotification(text) {
        const btn = document.getElementById('saveBtn');
        const original = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> ${text}`;
        setTimeout(() => btn.innerHTML = original, 2000);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new Editor();
});