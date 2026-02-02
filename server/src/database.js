const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
fs.ensureDirSync(dataDir);

const db = new Database(path.join(dataDir, 'projects.db'), {
  verbose: console.log
});

// Initialize database schema
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = 10000;
  PRAGMA foreign_keys = ON;
  
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    elements TEXT DEFAULT '[]',
    styles TEXT DEFAULT '{}',
    is_homepage INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at);
  CREATE INDEX IF NOT EXISTS idx_pages_project ON pages(project_id);
`);

// Projects CRUD
const projectQueries = {
  createProject: db.prepare(`
    INSERT OR REPLACE INTO projects (id, name, thumbnail) 
    VALUES (?, ?, ?)
  `),
  
  getProject: db.prepare(`
    SELECT * FROM projects WHERE id = ?
  `),
  
  getAllProjects: db.prepare(`
    SELECT id, name, thumbnail, created_at, updated_at 
    FROM projects 
    ORDER BY updated_at DESC
  `),
  
  updateProject: db.prepare(`
    UPDATE projects 
    SET name = ?, thumbnail = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  deleteProject: db.prepare(`
    DELETE FROM projects WHERE id = ?
  `),
  
  updateProjectTimestamp: db.prepare(`
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `)
};

// Pages CRUD
const pageQueries = {
  createPage: db.prepare(`
    INSERT OR REPLACE INTO pages (id, project_id, name, elements, styles, is_homepage) 
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  
  getPage: db.prepare(`
    SELECT * FROM pages 
    WHERE id = ?
  `),
  
  getProjectPages: db.prepare(`
    SELECT * FROM pages 
    WHERE project_id = ? 
    ORDER BY created_at
  `),
  
  updatePage: db.prepare(`
    UPDATE pages 
    SET name = ?, elements = ?, styles = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  deletePage: db.prepare(`
    DELETE FROM pages WHERE id = ?
  `),
  
  setHomepage: db.prepare(`
    UPDATE pages 
    SET is_homepage = CASE 
      WHEN id = ? THEN 1 
      ELSE 0 
    END 
    WHERE project_id = ?
  `),
  
  getHomepage: db.prepare(`
    SELECT * FROM pages 
    WHERE project_id = ? AND is_homepage = 1 
    LIMIT 1
  `)
};

// Оптимизированные методы
const database = {
  // Проекты
  createProject: (id, name, thumbnail = '') => {
    return projectQueries.createProject.run(id, name, thumbnail);
  },
  
  getProject: (id) => {
    return projectQueries.getProject.get(id);
  },
  
  getAllProjects: () => {
    return projectQueries.getAllProjects.all();
  },
  
  updateProject: (id, name, thumbnail) => {
    return projectQueries.updateProject.run(name, thumbnail, id);
  },
  
  deleteProject: (id) => {
    return projectQueries.deleteProject.run(id);
  },
  
  updateProjectTimestamp: (id) => {
    return projectQueries.updateProjectTimestamp.run(id);
  },
  
  // Страницы
  createPage: (id, projectId, name, elements = '[]', styles = '{}', isHomepage = 0) => {
    return pageQueries.createPage.run(id, projectId, name, elements, styles, isHomepage);
  },
  
  getPage: (id) => {
    return pageQueries.getPage.get(id);
  },
  
  getProjectPages: (projectId) => {
    return pageQueries.getProjectPages.all(projectId);
  },
  
  updatePage: (id, name, elements, styles) => {
    return pageQueries.updatePage.run(name, elements, styles, id);
  },
  
  deletePage: (id) => {
    return pageQueries.deletePage.run(id);
  },
  
  setHomepage: (pageId, projectId) => {
    return pageQueries.setHomepage.run(pageId, projectId);
  },
  
  getHomepage: (projectId) => {
    return pageQueries.getHomepage.get(projectId);
  },
  
  // Транзакции
  transaction: (operations) => {
    return db.transaction(operations)();
  },
  
  // Оптимизированный метод для массового обновления
  batchUpdatePages: (pages) => {
    const updateStmt = db.prepare(`
      UPDATE pages 
      SET elements = ?, styles = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    const updateMany = db.transaction((pages) => {
      for (const page of pages) {
        updateStmt.run(page.elements, page.styles, page.id);
      }
    });
    
    return updateMany(pages);
  }
};

// Закрытие соединения при выходе
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

module.exports = database;