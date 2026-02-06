const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для обработки JSON
app.use(express.json());
app.use(express.static('.'));

// База данных в памяти (для демо)
let projects = [];
let projectIdCounter = 1;

// Создаем папку для проектов, если её нет
const projectsDir = path.join(__dirname, 'projects');
fs.mkdir(projectsDir, { recursive: true }).catch(console.error);

// API: Сохранение проекта
app.post('/api/project/save', async (req, res) => {
    try {
        const { name, data } = req.body;
        
        if (!name || !data) {
            return res.status(400).json({ error: 'Не указано имя или данные проекта' });
        }
        
        const project = {
            id: projectIdCounter++,
            name,
            data: JSON.parse(data),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        projects.push(project);
        
        // Также сохраняем в файл
        const fileName = `project-${project.id}.json`;
        const filePath = path.join(projectsDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(project, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Проект сохранен', 
            projectId: project.id 
        });
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        res.status(500).json({ error: 'Ошибка сервера при сохранении' });
    }
});

// API: Загрузка проекта
app.get('/api/project/load/:id', async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
            // Попробуем загрузить из файла
            const fileName = `project-${projectId}.json`;
            const filePath = path.join(projectsDir, fileName);
            
            try {
                const fileContent = await fs.readFile(filePath, 'utf8');
                const fileProject = JSON.parse(fileContent);
                res.json({ success: true, project: fileProject });
            } catch (fileError) {
                return res.status(404).json({ error: 'Проект не найден' });
            }
        } else {
            res.json({ success: true, project });
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ error: 'Ошибка сервера при загрузке' });
    }
});

// API: Список проектов
app.get('/api/project/list', (req, res) => {
    try {
        const projectList = projects.map(p => ({
            id: p.id,
            name: p.name,
            created_at: p.created_at,
            updated_at: p.updated_at
        }));
        
        res.json({ success: true, projects: projectList });
    } catch (error) {
        console.error('Ошибка получения списка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Экспорт проекта (серверная генерация архива)
app.post('/api/export', (req, res) => {
    // В реальном приложении здесь будет генерация архива с помощью archiver
    // Для бета-версии используем клиентскую генерацию
    res.json({ 
        success: true, 
        message: 'Экспорт выполнен на клиенте' 
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port', PORT);
});
