// state.js - исправленная версия с массивом
class OptimizedState {
    constructor() {
        this.state = {
            project: {
                id: this.generateId(),
                name: 'Мой проект',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            pages: [
                {
                    id: 'page-1',
                    name: 'Главная',
                    elements: [] // Оставляем массив для совместимости
                }
            ],
            currentPageId: 'page-1',
            selectedElementId: null,
            history: {
                past: [],
                future: [],
                maxSteps: 50,
                batchMode: false,
                batchChanges: []
            }
        };
        
        this.listeners = new Set();
        this.elementCache = new Map();
        this.batchTimeout = null;
        this.updateQueue = new Map();
        this.animationFrame = null;
    }
    
    generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    getCurrentPage() {
        return this.state.pages.find(page => page.id === this.state.currentPageId);
    }
    
    getElement(id) {
        if (this.elementCache.has(id)) {
            return this.elementCache.get(id);
        }
        
        const page = this.getCurrentPage();
        const element = page.elements.find(el => el.id === id);
        if (element) {
            this.elementCache.set(id, element);
        }
        return element;
    }
    
    getSelectedElement() {
        if (!this.state.selectedElementId) return null;
        return this.getElement(this.state.selectedElementId);
    }
    
    // Оптимизированный поиск элемента по ID
    findElementIndex(id) {
        const page = this.getCurrentPage();
        return page.elements.findIndex(el => el.id === id);
    }
    
    batchStart() {
        this.state.history.batchMode = true;
        this.state.history.batchChanges = [];
    }
    
    batchEnd() {
        this.state.history.batchMode = false;
        if (this.state.history.batchChanges.length > 0) {
            this.addToHistory(this.createStateSnapshot());
        }
        this.state.history.batchChanges = [];
        this.notifyListeners();
    }
    
    update(newState, addToHistory = true) {
        if (this.state.history.batchMode) {
            this.state.history.batchChanges.push({ newState, addToHistory });
            this.applyUpdate(newState, false);
            return;
        }
        
        if (addToHistory) {
            this.addToHistory(this.createStateSnapshot());
        }
        
        this.applyUpdate(newState, true);
    }
    
    applyUpdate(newState, notify = true) {
        // Обновляем состояние
        if (newState.pages) {
            this.state.pages = newState.pages;
        }
        if (newState.project) {
            this.state.project = { ...this.state.project, ...newState.project };
        }
        if (newState.selectedElementId !== undefined) {
            this.state.selectedElementId = newState.selectedElementId;
        }
        if (newState.currentPageId !== undefined) {
            this.state.currentPageId = newState.currentPageId;
        }
        
        // Инвалидируем кэш если изменились страницы
        if (newState.pages) {
            this.elementCache.clear();
        } else if (this.state.selectedElementId) {
            this.elementCache.delete(this.state.selectedElementId);
        }
        
        this.state.project.updatedAt = new Date().toISOString();
        
        if (notify) {
            this.notifyListeners();
        }
    }
    
    // Быстрое обновление стилей элемента
    updateElementStyles(elementId, styleUpdates) {
        const index = this.findElementIndex(elementId);
        if (index === -1) return;
        
        const page = this.getCurrentPage();
        const element = page.elements[index];
        
        console.log('Updating element styles:', elementId, styleUpdates);
        
        // Батчинг обновлений стилей
        this.scheduleStyleUpdate(elementId, styleUpdates);
    }
    
    scheduleStyleUpdate(elementId, styleUpdates) {
        if (!this.updateQueue.has(elementId)) {
            this.updateQueue.set(elementId, {});
        }
        
        const currentUpdates = this.updateQueue.get(elementId);
        Object.assign(currentUpdates, styleUpdates);
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        this.batchTimeout = setTimeout(() => {
            this.applyStyleUpdates();
        }, 50); // Батчинг каждые 50мс
    }
    
    applyStyleUpdates() {
        if (this.updateQueue.size === 0) return;
        
        this.batchStart();
        
        for (const [elementId, styleUpdates] of this.updateQueue) {
            const index = this.findElementIndex(elementId);
            if (index === -1) continue;
            
            const page = this.getCurrentPage();
            const element = page.elements[index];
            
            // Обновляем стили
            Object.assign(element.styles, styleUpdates);
            this.elementCache.delete(elementId);
        }
        
        this.updateQueue.clear();
        this.batchEnd();
        this.batchTimeout = null;
    }
    
    // Добавление элемента
    addElement(element) {
        const page = this.getCurrentPage();
        page.elements.push(element);
        this.elementCache.set(element.id, element);
        
        this.update({
            selectedElementId: element.id
        });
    }
    
    // Обновление элемента
    updateElement(elementId, updates) {
        const index = this.findElementIndex(elementId);
        if (index === -1) return;
        
        const page = this.getCurrentPage();
        const element = page.elements[index];
        
        // Обновляем элемент
        Object.assign(element, updates);
        this.elementCache.delete(elementId);
        
        this.scheduleUIUpdate();
    }
    
    // Удаление элемента
    deleteElement(elementId) {
        const page = this.getCurrentPage();
        const index = page.elements.findIndex(el => el.id === elementId);
        
        if (index !== -1) {
            page.elements.splice(index, 1);
            this.elementCache.delete(elementId);
            
            this.update({ 
                selectedElementId: this.state.selectedElementId === elementId ? null : this.state.selectedElementId
            });
        }
    }
    
    scheduleUIUpdate() {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        this.batchTimeout = setTimeout(() => {
            this.notifyListeners();
            this.batchTimeout = null;
        }, 16);
    }
    
    createStateSnapshot() {
        return {
            project: { ...this.state.project },
            pages: JSON.parse(JSON.stringify(this.state.pages)),
            currentPageId: this.state.currentPageId,
            selectedElementId: this.state.selectedElementId
        };
    }
    
    addToHistory(snapshot) {
        const { past, future, maxSteps } = this.state.history;
        
        if (past.length > 0) {
            const lastState = past[past.length - 1];
            if (this.isStateSimilar(lastState, snapshot)) {
                return;
            }
        }
        
        const newPast = [...past, snapshot];
        if (newPast.length > maxSteps) {
            newPast.shift();
        }
        
        this.state.history.past = newPast;
        this.state.history.future = [];
    }
    
    isStateSimilar(state1, state2) {
        if (state1.selectedElementId !== state2.selectedElementId) {
            return false;
        }
        
        const page1 = state1.pages.find(p => p.id === state1.currentPageId);
        const page2 = state2.pages.find(p => p.id === state2.currentPageId);
        
        if (!page1 || !page2) return false;
        
        // Проверяем количество элементов и их основные свойства
        if (page1.elements.length !== page2.elements.length) {
            return false;
        }
        
        // Поверхностное сравнение элементов
        for (let i = 0; i < page1.elements.length; i++) {
            const el1 = page1.elements[i];
            const el2 = page2.elements[i];
            
            if (el1.id !== el2.id || el1.type !== el2.type) {
                return false;
            }
        }
        
        return true;
    }
    
    undo() {
        const { past, future } = this.state.history;
        if (past.length === 0) return;
        
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        const newFuture = [this.createStateSnapshot(), ...future];
        
        this.state.history.past = newPast;
        this.state.history.future = newFuture;
        
        this.state = previous;
        this.elementCache.clear();
        this.notifyListeners();
    }
    
    redo() {
        const { past, future } = this.state.history;
        if (future.length === 0) return;
        
        const next = future[0];
        const newFuture = future.slice(1);
        const newPast = [...past, this.createStateSnapshot()];
        
        this.state.history.past = newPast;
        this.state.history.future = newFuture;
        
        this.state = next;
        this.elementCache.clear();
        this.notifyListeners();
    }
    
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    
    notifyListeners() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            const snapshot = this.createStateSnapshot();
            this.listeners.forEach(listener => listener(snapshot));
            this.animationFrame = null;
        });
    }
    
    exportForSave() {
        const exportData = {
            project: this.state.project,
            pages: this.state.pages,
            currentPageId: this.state.currentPageId
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    importFromSave(data) {
        try {
            const parsed = JSON.parse(data);
            
            this.state = {
                ...this.state,
                ...parsed,
                history: this.state.history,
                selectedElementId: null
            };
            
            this.elementCache.clear();
            this.notifyListeners();
            return true;
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return false;
        }
    }
    
    clearCanvas() {
        const page = this.getCurrentPage();
        page.elements = [];
        this.elementCache.clear();
        
        this.update({ 
            selectedElementId: null
        });
    }
}

const appState = new OptimizedState();
export default appState;