import appState from './state.js';

class OptimizedExporter {
    constructor() {
        this.init();
    }
    
    init() {
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportProject();
        });
        
        // Preview
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreview();
        });
        
        // Modal close handlers
        document.querySelectorAll('.close-modal, #closePreview').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('previewModal').classList.remove('show');
            });
        });
    }
    
    async exportProject() {
        try {
            const zip = new JSZip();
            const page = appState.getCurrentPage();
            const projectName = this.sanitizeName(appState.state.project.name);
            
            // Генерируем файлы параллельно
            const [html, css, js] = await Promise.all([
                this.generateHTML(page),
                this.generateCSS(page),
                this.generateJS(page)
            ]);
            
            // Создаем структуру архива
            zip.file("index.html", html);
            
            const cssFolder = zip.folder("css");
            cssFolder.file("styles.css", css);
            
            const jsFolder = zip.folder("js");
            jsFolder.file("scripts.js", js);
            
            // Генерируем и скачиваем
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${projectName}.zip`);
            
            this.showNotification('Экспортировано!');
            
        } catch (error) {
            console.error('Export error:', error);
            alert('Ошибка при экспорте проекта.');
        }
    }
    
    generateHTML(page) {
        const elements = Object.values(page.elements);
        
        let html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appState.state.project.name}</title>
    <link rel="stylesheet" href="css/styles.css">
    <style>
        :root {
            ${this.generateCSSVariables()}
        }
    </style>
</head>
<body>
    <div class="page-container">`;
        
        // Генерируем элементы с семантичными классами
        elements.forEach(element => {
            const className = this.getElementClassName(element);
            const content = this.getExportContent(element);
            
            html += `
        <div class="${className}">
            ${content}
        </div>`;
        });
        
        html += `
    </div>
    <script src="js/scripts.js" defer></script>
</body>
</html>`;
        
        return html;
    }
    
    generateCSS(page) {
        const elements = Object.values(page.elements);
        const cssVariables = this.extractCSSVariables(elements);
        
        let css = `/* Стили проекта: ${appState.state.project.name} */
/* Сгенерировано в Site Builder */

:root {
${cssVariables}
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--text-color, #333);
    background-color: var(--bg-color, #f9f9f9);
}

.page-container {
    position: relative;
    min-height: 100vh;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* Элементы */`;

        // Генерируем стили для каждого элемента
        elements.forEach(element => {
            const className = this.getElementClassName(element);
            css += `
            
.${className} {
    position: absolute;`;
            
            // Добавляем только необходимые стили
            const essentialStyles = this.getEssentialStyles(element.styles);
            Object.entries(essentialStyles).forEach(([prop, value]) => {
                css += `
    ${this.camelToKebab(prop)}: ${value};`;
            });
            
            css += `
}`;
            
            // Добавляем hover стили для кнопок
            if (element.type === 'button') {
                css += `
                
.${className}:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    transition: all 0.2s ease;
}`;
            }
        });
        
        // Адаптивность
        css += `

/* Адаптивность */
@media (max-width: 768px) {
    .page-container {
        padding: 10px;
    }
    
    .page-container > div {
        position: relative !important;
        width: 100% !important;
        left: 0 !important;
        margin-bottom: 20px;
    }
}`;
        
        return css;
    }
    
    generateJS() {
        return `// JavaScript для проекта
// Сгенерировано автоматически

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация интерактивных элементов
    const buttons = document.querySelectorAll('[data-element-type="button"]');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Button clicked:', this.textContent);
            // Добавьте свою логику здесь
        });
    });
    
    // Адаптивная логика
    function handleResize() {
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile-view', isMobile);
    }
    
    // Инициализация
    handleResize();
    window.addEventListener('resize', handleResize);
    
    console.log('Сайт загружен и готов к работе');
});`;
    }
    
    getElementClassName(element) {
        const typeMap = {
            'container': 'container',
            'heading': 'heading',
            'paragraph': 'text',
            'button': 'btn',
            'image': 'image'
        };
        
        const type = typeMap[element.type] || 'element';
        const idShort = element.id.substring(4, 8);
        return `${type}-${idShort}`;
    }
    
    getExportContent(element) {
        if (element.type === 'image') {
            const alt = element.content.split('/').pop() || 'Изображение';
            return `<img src="${element.content}" alt="${alt}" loading="lazy">`;
        }
        return element.content || '';
    }
    
    getEssentialStyles(styles) {
        // Выбираем только необходимые для экспорта стили
        const essential = {};
        const essentialProps = [
            'top', 'left', 'width', 'height',
            'backgroundColor', 'color', 'fontSize',
            'padding', 'borderRadius', 'border',
            'textAlign', 'fontWeight'
        ];
        
        essentialProps.forEach(prop => {
            if (styles[prop] !== undefined) {
                essential[prop] = styles[prop];
            }
        });
        
        return essential;
    }
    
    extractCSSVariables(elements) {
        const variables = new Set();
        
        // Извлекаем цвета
        elements.forEach(el => {
            if (el.styles.backgroundColor) {
                variables.add(`--${this.getElementClassName(el)}-bg: ${el.styles.backgroundColor};`);
            }
            if (el.styles.color) {
                variables.add(`--${this.getElementClassName(el)}-color: ${el.styles.color};`);
            }
        });
        
        return Array.from(variables).join('\n    ');
    }
    
    camelToKebab(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }
    
    sanitizeName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9а-яё]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    showPreview() {
        const page = appState.getCurrentPage();
        const html = this.generateHTML(page);
        const css = this.generateCSS(page);
        const js = this.generateJS();
        
        const fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>${css}</style>
</head>
<body>
    ${html.split('<body>')[1].split('</body>')[0]}
    <script>${js}</script>
</body>
</html>`;
        
        const iframe = document.getElementById('sitePreview');
        const blob = new Blob([fullHTML], { type: 'text/html' });
        iframe.src = URL.createObjectURL(blob);
        
        document.getElementById('previewModal').classList.add('show');
    }
    
    showNotification(text) {
        const btn = document.getElementById('exportBtn');
        const original = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> ${text}`;
        setTimeout(() => btn.innerHTML = original, 2000);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    new OptimizedExporter();
});