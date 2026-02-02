const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const exportGenerator = require('./exportGenerator');
const db = require('./database');

// Ensure exports directory exists
const exportsDir = path.join(__dirname, '../exports');
fs.ensureDirSync(exportsDir);

// Projects API
router.get('/projects', (req, res) => {
  try {
    const projects = db.getAllProjects();
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/projects', (req, res) => {
  try {
    const { name, data } = req.body;
    const projectId = 'proj_' + Date.now();
    
    // Создаем проект
    db.createProject(projectId, name, '');
    
    // Создаем домашнюю страницу
    const homepageId = 'page_' + Date.now();
    db.createPage(
      homepageId,
      projectId,
      'Главная',
      JSON.stringify(data?.pages?.[0]?.elements || []),
      JSON.stringify(data?.pages?.[0]?.styles || {}),
      1
    );
    
    res.json({
      success: true,
      project: {
        id: projectId,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, error: 'Ошибка создания проекта' });
  }
});

router.get('/projects/:projectId', (req, res) => {
  try {
    const project = db.getProject(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Проект не найден' });
    }
    
    const pages = db.getProjectPages(req.params.projectId);
    
    // Форматируем ответ
    const formattedPages = pages.map(page => ({
      id: page.id,
      name: page.name,
      elements: JSON.parse(page.elements || '[]'),
      styles: JSON.parse(page.styles || '{}'),
      is_homepage: page.is_homepage,
      created_at: page.created_at,
      updated_at: page.updated_at
    }));
    
    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        created_at: project.created_at,
        updated_at: project.updated_at
      },
      pages: formattedPages
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки проекта' });
  }
});

router.put('/projects/:projectId', (req, res) => {
  try {
    const { name, data } = req.body;
    const projectId = req.params.projectId;
    
    // Проверяем существование проекта
    const project = db.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Проект не найден' });
    }
    
    // Обновляем проект
    db.updateProject(projectId, name, '');
    
    // Обновляем страницы
    if (data && data.pages) {
      data.pages.forEach(page => {
        db.updatePage(
          page.id,
          page.name,
          JSON.stringify(page.elements || []),
          JSON.stringify(page.styles || {})
        );
      });
    }
    
    res.json({
      success: true,
      message: 'Проект обновлен'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, error: 'Ошибка обновления проекта' });
  }
});

router.delete('/projects/:projectId', (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    // Проверяем существование проекта
    const project = db.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Проект не найден' });
    }
    
    // Удаляем проект (страницы удалятся каскадно)
    db.deleteProject(projectId);
    
    res.json({ success: true, message: 'Проект удален' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, error: 'Ошибка удаления проекта' });
  }
});

// Pages API
router.post('/projects/:projectId/pages', (req, res) => {
  try {
    const { name, data } = req.body;
    const projectId = req.params.projectId;
    const pageId = 'page_' + Date.now();
    
    // Проверяем существование проекта
    const project = db.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Проект не найден' });
    }
    
    db.createPage(
      pageId,
      projectId,
      name || 'Новая страница',
      JSON.stringify(data?.elements || []),
      JSON.stringify(data?.styles || {}),
      0
    );
    
    res.json({
      success: true,
      page: {
        id: pageId,
        name: name || 'Новая страница',
        elements: data?.elements || [],
        styles: data?.styles || {}
      }
    });
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ success: false, error: 'Ошибка создания страницы' });
  }
});

router.get('/projects/:projectId/pages/:pageId', (req, res) => {
  try {
    const page = db.getPage(req.params.pageId);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Страница не найдена' });
    }
    
    res.json({
      success: true,
      page: {
        id: page.id,
        name: page.name,
        elements: JSON.parse(page.elements || '[]'),
        styles: JSON.parse(page.styles || '{}'),
        is_homepage: page.is_homepage,
        created_at: page.created_at,
        updated_at: page.updated_at
      }
    });
  } catch (error) {
    console.error('Error getting page:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки страницы' });
  }
});

router.put('/projects/:projectId/pages/:pageId', (req, res) => {
  try {
    const { name, data } = req.body;
    
    // Проверяем существование страницы
    const page = db.getPage(req.params.pageId);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Страница не найдена' });
    }
    
    db.updatePage(
      req.params.pageId,
      name || page.name,
      JSON.stringify(data?.elements || []),
      JSON.stringify(data?.styles || {})
    );
    
    // Обновляем время проекта
    db.updateProjectTimestamp(req.params.projectId);
    
    res.json({ success: true, message: 'Страница обновлена' });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ success: false, error: 'Ошибка обновления страницы' });
  }
});

router.delete('/projects/:projectId/pages/:pageId', (req, res) => {
  try {
    // Проверяем существование страницы
    const page = db.getPage(req.params.pageId);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Страница не найдена' });
    }
    
    db.deletePage(req.params.pageId);
    
    // Обновляем время проекта
    db.updateProjectTimestamp(req.params.projectId);
    
    res.json({ success: true, message: 'Страница удалена' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ success: false, error: 'Ошибка удаления страницы' });
  }
});

router.post('/projects/:projectId/pages/:pageId/set-homepage', (req, res) => {
  try {
    const { projectId, pageId } = req.params;
    
    // Проверяем существование страницы
    const page = db.getPage(pageId);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Страница не найдена' });
    }
    
    db.setHomepage(pageId, projectId);
    db.updateProjectTimestamp(projectId);
    
    res.json({ success: true, message: 'Главная страница установлена' });
  } catch (error) {
    console.error('Error setting homepage:', error);
    res.status(500).json({ success: false, error: 'Ошибка установки главной страницы' });
  }
});

// Export API
router.post('/projects/:projectId/export', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const project = db.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Проект не найден' });
    }
    
    const pages = db.getProjectPages(projectId);
    
    // Форматируем данные проекта для экспорта
    const projectData = {
      name: project.name,
      pages: pages.map(page => ({
        id: page.id,
        name: page.name,
        elements: JSON.parse(page.elements || '[]'),
        styles: JSON.parse(page.styles || '{}'),
        isHomepage: page.is_homepage
      }))
    };
    
    const exportId = uuidv4().substring(0, 8);
    const tempDir = path.join(exportsDir, exportId);
    const zipPath = path.join(exportsDir, `${exportId}.zip`);
    
    // Генерируем файлы
    await exportGenerator.exportProject(projectData, tempDir);
    
    // Создаем ZIP архив
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`Archive created: ${archive.pointer()} bytes`);
        
        // Отправляем файл
        res.download(zipPath, `${project.name.replace(/\s+/g, '-')}.zip`, (err) => {
          // Очистка временных файлов
          fs.remove(tempDir).catch(console.error);
          fs.remove(zipPath).catch(console.error);
          
          if (err) {
            console.error('Error sending file:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(tempDir, false);
      archive.finalize();
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка экспорта проекта: ' + error.message 
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Сервер работает',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;