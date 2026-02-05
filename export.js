import appState from './state.js';

class Exporter {
    constructor() {
        this.initExportButton();
    }
    
    initExportButton() {
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportProject();
        });
    }
    
    async exportProject() {
        try {
            const zip = new JSZip();
            
            // Получаем текущую страницу
            const page = appState.getCurrentPage();
            const projectName = appState.state.project.name.replace(/\s+/g, '-').toLowerCase();
            
            // Генерируем HTML
            const html = this.generateHTML(page);
            zip.file("index.html", html);
            
            // Генерируем CSS
            const css = this.generateCSS(page);
            zip.file("css/styles.css", css);
            
            // Генерируем JS (если есть модальные окна или интерактивность)
            const js = this.generateJS(page);
            zip.file("js/scripts.js", js);
            
            // Создаем архив
            const content = await zip.generateAsync({ type: "blob" });
            
            // Сохраняем файл
            saveAs(content, `${projectName}.zip`);
            
            // Уведомление об успешном экспорте
            const btn = document.getElementById('exportBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Экспортировано!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка при экспорте:', error);
            alert('Произошла ошибка при экспорте проекта.');
        }
    }
    
    generateHTML(page) {
        const projectName = appState.state.project.name;
        
        let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="site-container">`;
        
        // Добавляем элементы страницы
        page.elements.forEach(element => {
            const elementClass = this.getElementClassName(element);
            const elementId = element.id;
            const elementContent = this.getElementContent(element);
            const inlineStyles = this.getInlineStyles(element);
            
            html += `
        <div class="${elementClass}" id="${elementId}"${inlineStyles}>
            ${elementContent}
        </div>`;
        });
        
        html += `
    </div>
    <script src="js/scripts.js"></script>
</body>
</html>`;
        
        return html;
    }
    
    generateCSS(page) {
        let css = `/* Стили для проекта: ${appState.state.project.name} */
/* Сгенерировано в Site Builder */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f9f9f9;
    min-height: 100vh;
}

.site-container {
    position: relative;
    min-height: 100vh;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* Общие стили элементов */`;

        // Генерируем CSS для каждого элемента
        page.elements.forEach(element => {
            const elementClass = this.getElementClassName(element);
            css += `
            
.${elementClass} {
    position: absolute;`;
            
            // Добавляем стили элемента
            Object.entries(element.styles).forEach(([property, value]) => {
                if (property === 'backgroundImage' && element.type === 'image') {
                    css += `
    background-image: ${value};
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;`;
                } else if (property !== 'top' && property !== 'left' && 
                          property !== 'width' && property !== 'height') {
                    const cssProperty = this.camelToKebab(property);
                    const cssValue = typeof value === 'number' && 
                                    !['zIndex', 'opacity', 'fontWeight'].includes(property) 
                                    ? `${value}px` : value;
                    css += `
    ${cssProperty}: ${cssValue};`;
                }
            });
            
            // Позиционирование
            css += `
    top: ${element.styles.top || 0}px;
    left: ${element.styles.left || 0}px;
    width: ${element.styles.width || 200}px;
    height: ${element.styles.height || 100}px;
}`;
            
            // Дополнительные стили для типов элементов
            if (element.type === 'button') {
                css += `
                
.${elementClass}:hover {
    opacity: 0.9;
    cursor: pointer;
    transform: translateY(-1px);
    transition: all 0.2s ease;
}`;
            } else if (element.type === 'heading') {
                css += `
                
.${elementClass} {
    font-weight: bold;
    line-height: 1.2;
}`;
            } else if (element.type === 'paragraph') {
                css += `
                
.${elementClass} {
    line-height: 1.5;
    text-align: left;
}`;
            } else if (element.type === 'container') {
                css += `
                
.${elementClass} {
    overflow: auto;
}`;
            }
        });
        
        // Медиа-запросы для адаптивности
        css += `

/* Адаптивность */
@media (max-width: 768px) {
    .site-container {
        padding: 10px;
    }`;
        
        page.elements.forEach(element => {
            if (element.styles.width > 400) {
                const elementClass = this.getElementClassName(element);
                css += `
    
    .${elementClass} {
        width: 100% !important;
        left: 0 !important;
        position: relative !important;
        margin-bottom: 20px;
    }`;
            }
        });
        
        css += `
}`;
        
        return css;
    }
    
    generateJS(page) {
        let js = `// JavaScript для проекта: ${appState.state.project.name}
// Сгенерировано в Site Builder

document.addEventListener('DOMContentLoaded', function() {
    console.log('Сайт загружен');
    
    // Инициализация кнопок
    const buttons = document.querySelectorAll('.element-button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Кнопка нажата:', this.textContent);
            alert('Кнопка "' + this.textContent + '" нажата!');
        });
    });
    
    // Адаптивная логика
    function adjustLayout() {
        const isMobile = window.innerWidth < 768;
        const containers = document.querySelectorAll('.element-container');
        
        if (isMobile) {
            containers.forEach(container => {
                container.style.position = 'relative';
                container.style.left = '0';
                container.style.width = '100%';
                container.style.marginBottom = '20px';
            });
        }
    }
    
    // Вызов при загрузке и изменении размера окна
    adjustLayout();
    window.addEventListener('resize', adjustLayout);
});`;
        
        return js;
    }
    
    getElementClassName(element) {
        return `element-${element.type}-${element.id.substring(4, 8)}`;
    }
    
    getElementContent(element) {
        if (element.type === 'image') {
            return `<img src="${element.content}" alt="Изображение" style="width:100%;height:100%;object-fit:cover;">`;
        }
        return element.content;
    }
    
    getInlineStyles(element) {
        // Для экспорта мы не используем inline-стили, кроме критических
        // В этом простом экспорте мы будем использовать только классы
        return '';
    }
    
    camelToKebab(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }
}

// Инициализация экспортера после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    new Exporter();
});