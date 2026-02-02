const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

class ExportGenerator {
  constructor() {
    this.components = {
      header: { tag: 'h1', defaultClass: 'header' },
      paragraph: { tag: 'p', defaultClass: 'paragraph' },
      button: { tag: 'button', defaultClass: 'button' },
      image: { tag: 'div', defaultClass: 'image' },
      container: { tag: 'div', defaultClass: 'container' },
      modal: { tag: 'div', defaultClass: 'modal' },
      row: { tag: 'div', defaultClass: 'row' },
      column: { tag: 'div', defaultClass: 'column' }
    };
  }

  // Оптимизированная генерация CSS
  generateElementCSS(styles) {
    if (!styles) return '';
    
    const css = [];
    const styleMap = {
      color: 'color',
      backgroundColor: 'background-color',
      fontSize: 'font-size',
      fontWeight: 'font-weight',
      textAlign: 'text-align',
      padding: 'padding',
      margin: 'margin',
      border: 'border',
      borderRadius: 'border-radius',
      width: 'width',
      height: 'height',
      position: 'position',
      left: 'left',
      top: 'top',
      display: 'display',
      flexDirection: 'flex-direction',
      justifyContent: 'justify-content',
      alignItems: 'align-items',
      opacity: 'opacity',
      boxShadow: 'box-shadow',
      zIndex: 'z-index'
    };
    
    for (const [key, value] of Object.entries(styles)) {
      if (value && styleMap[key]) {
        css.push(`${styleMap[key]}: ${value};`);
      }
    }
    
    return css.join(' ');
  }

  generateElementHTML(element, pageId) {
    const component = this.components[element.type] || { tag: 'div', defaultClass: 'element' };
    const elementId = `el-${element.id}`;
    
    // Собираем все стили вместе
    let styles = { ...element.styles };
    
    // Добавляем позиционирование
    if (element.position) {
      styles.position = 'absolute';
      styles.left = `${element.position.x}px`;
      styles.top = `${element.position.y}px`;
    }
    
    // Добавляем размеры
    if (element.size) {
      styles.width = `${element.size.width}px`;
      styles.height = `${element.size.height}px`;
    }
    
    const inlineStyles = this.generateElementCSS(styles);
    
    let html = `<${component.tag} id="${elementId}" class="${component.defaultClass}"`;
    
    if (inlineStyles) {
      html += ` style="${inlineStyles}"`;
    }
    
    // Контент
    html += '>';
    
    if (element.content) {
      html += element.content;
    } else if (element.type === 'image') {
      html += `<img src="${element.imageUrl || 'https://via.placeholder.com/200x150'}" alt="${element.alt || 'Image'}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else if (element.type === 'button') {
      html += element.text || 'Кнопка';
    }
    
    html += `</${component.tag}>`;
    
    return html;
  }

  generatePageHTML(page, projectName) {
    const elements = Array.isArray(page.elements) ? page.elements : [];
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Visual Site Builder">
  <title>${page.name} | ${projectName}</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/${page.id}.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <div class="page" id="page-${page.id}">
    ${elements.map(el => this.generateElementHTML(el, page.id)).join('\n    ')}
  </div>
  
  <script src="js/main.js"></script>
  <script src="js/${page.id}.js"></script>
</body>
</html>`;
  }

  generateGlobalCSS() {
    return `/* Глобальные стили - сгенерировано Visual Site Builder */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page {
  position: relative;
  min-height: 100vh;
  background-color: white;
  margin: 0 auto;
  overflow-x: hidden;
}

.container {
  position: relative;
  border: 1px dashed #ddd;
  background-color: #f9f9f9;
}

.header {
  font-weight: bold;
  color: #2c3e50;
}

.paragraph {
  color: #555;
  line-height: 1.8;
}

.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-align: center;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.image {
  overflow: hidden;
  background-color: #e0e0e0;
}

.image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.column {
  flex: 1;
  min-width: 200px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .page {
    padding: 10px;
  }
  
  .row {
    flex-direction: column;
  }
  
  .column {
    width: 100%;
  }
}`;
  }

  generatePageCSS(page) {
    const elements = Array.isArray(page.elements) ? page.elements : [];
    const styles = [];
    
    elements.forEach(element => {
      const selector = `#el-${element.id}`;
      const elementStyles = this.generateElementCSS(element.styles);
      
      if (elementStyles) {
        styles.push(`${selector} { ${elementStyles} }`);
      }
    });
    
    return `/* Стили для страницы: ${page.name} */
${styles.join('\n')}`;
  }

  generateGlobalJS() {
    return `// Глобальные скрипты - сгенерировано Visual Site Builder

// Управление модальными окнами
class ModalManager {
  constructor() {
    this.modals = new Map();
    this.init();
  }
  
  init() {
    // Автоматическая инициализация модальных окон
    document.querySelectorAll('.modal').forEach(modal => {
      const modalId = modal.id.replace('modal-', '');
      this.modals.set(modalId, modal);
      
      // Закрытие по клику на фон
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close(modalId);
        }
      });
      
      // Закрытие по кнопке
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close(modalId));
      }
    });
    
    // Инициализация кнопок открытия модальных окон
    document.querySelectorAll('[data-modal]').forEach(button => {
      const modalId = button.dataset.modal;
      button.addEventListener('click', () => this.open(modalId));
    });
  }
  
  open(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }
  
  close(modalId) {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('Сайт загружен');
  
  // Инициализация менеджера модальных окон
  window.modalManager = new ModalManager();
  
  // Плавные анимации
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
      }
    });
  }, observerOptions);
  
  // Наблюдаем за элементами с анимацией
  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
});

// Глобальные утилиты
window.VSB = {
  // Открыть модальное окно
  openModal: (modalId) => {
    if (window.modalManager) {
      window.modalManager.open(modalId);
    }
  },
  
  // Закрыть модальное окно
  closeModal: (modalId) => {
    if (window.modalManager) {
      window.modalManager.close(modalId);
    }
  },
  
  // Показать уведомление
  showNotification: (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = \`notification notification-\${type}\`;
    notification.innerHTML = \`
      <div class="notification-content">\${message}</div>
      <button class="notification-close">&times;</button>
    \`;
    
    notification.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    \`;
    
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close').onclick = () => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    };
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
};

// Стили для анимаций
const style = document.createElement('style');
style.textContent = \`
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .animated {
    animation: fadeInUp 0.6s ease;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    margin-left: 15px;
  }
\`;
document.head.appendChild(style);`;
  }

  generatePageJS(page) {
    return `// Скрипты для страницы: ${page.name}
document.addEventListener('DOMContentLoaded', () => {
  console.log('Страница "${page.name}" загружена');
  
  // Здесь можно добавить страничные скрипты
  // Например, обработчики для конкретных элементов этой страницы
});`;
  }

  async exportProject(projectData, exportDir) {
    try {
      await fs.ensureDir(exportDir);
      
      // Создаем структуру папок
      await fs.ensureDir(path.join(exportDir, 'css'));
      await fs.ensureDir(path.join(exportDir, 'js'));
      await fs.ensureDir(path.join(exportDir, 'assets'));
      
      const projectName = projectData.name || 'Мой сайт';
      const pages = projectData.pages || [];
      
      // Генерируем главную страницу
      const homepage = pages.find(p => p.isHomepage) || pages[0];
      if (homepage) {
        const homepageHTML = this.generatePageHTML(homepage, projectName);
        await fs.writeFile(path.join(exportDir, 'index.html'), homepageHTML);
        
        const homepageCSS = this.generatePageCSS(homepage);
        await fs.writeFile(path.join(exportDir, 'css', `${homepage.id}.css`), homepageCSS);
        
        const homepageJS = this.generatePageJS(homepage);
        await fs.writeFile(path.join(exportDir, 'js', `${homepage.id}.js`), homepageJS);
      }
      
      // Генерируем остальные страницы
      for (const page of pages) {
        if (page !== homepage) {
          const pageHTML = this.generatePageHTML(page, projectName);
          const filename = page.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.html';
          await fs.writeFile(path.join(exportDir, filename), pageHTML);
          
          const pageCSS = this.generatePageCSS(page);
          await fs.writeFile(path.join(exportDir, 'css', `${page.id}.css`), pageCSS);
          
          const pageJS = this.generatePageJS(page);
          await fs.writeFile(path.join(exportDir, 'js', `${page.id}.js`), pageJS);
        }
      }
      
      // Глобальные файлы
      const globalCSS = this.generateGlobalCSS();
      await fs.writeFile(path.join(exportDir, 'css', 'style.css'), globalCSS);
      
      const globalJS = this.generateGlobalJS();
      await fs.writeFile(path.join(exportDir, 'js', 'main.js'), globalJS);
      
      // Файл README
      const readme = `# ${projectName}

Этот сайт был создан с помощью Visual Site Builder.

## Структура файлов

- index.html - Главная страница
- css/style.css - Глобальные стили
- css/[id-страницы].css - Стили для конкретных страниц
- js/main.js - Глобальные скрипты
- js/[id-страницы].js - Скрипты для конкретных страниц

## Как использовать

1. Загрузите все файлы на ваш хостинг
2. Настройте пути к ресурсам при необходимости
3. Для модальных окон используйте: VSB.openModal('modal-id')

## Поддержка

Сайт адаптирован для мобильных устройств и современных браузеров.

Сгенерировано: ${new Date().toLocaleDateString('ru-RU')}`;
      
      await fs.writeFile(path.join(exportDir, 'README.md'), readme);
      
      console.log(`✅ Экспорт проекта завершен: ${exportDir}`);
      return exportDir;
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      throw error;
    }
  }

  async createZipArchive(sourceDir, zipPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Максимальное сжатие
      });

      output.on('close', () => {
        console.log(`📦 ZIP архив создан: ${archive.pointer()} байт`);
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}

module.exports = new ExportGenerator();