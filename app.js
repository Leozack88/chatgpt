const STORAGE_KEY = 'qaBugReportHistory.v1';

const fields = {
    title: document.querySelector('#title'),
    module: document.querySelector('#module'),
    environment: document.querySelector('#environment'),
    severity: document.querySelector('#severity'),
    priority: document.querySelector('#priority'),
    steps: document.querySelector('#steps'),
    actual: document.querySelector('#actual'),
    expected: document.querySelector('#expected'),
    notes: document.querySelector('#notes')
};

const output = document.querySelector('#output');
const scoreBadge = document.querySelector('#scoreBadge');
const qualityHint = document.querySelector('#qualityHint');
const generateBtn = document.querySelector('#generateBtn');
const clearBtn = document.querySelector('#clearBtn');
const copyBtn = document.querySelector('#copyBtn');
const saveBtn = document.querySelector('#saveBtn');
const downloadBtn = document.querySelector('#downloadBtn');
const exportHistoryBtn = document.querySelector('#exportHistoryBtn');
const clearHistoryBtn = document.querySelector('#clearHistoryBtn');
const historyList = document.querySelector('#historyList');
const historyCount = document.querySelector('#historyCount');
const tabs = document.querySelectorAll('.tab');

let currentFormat = 'markdown';
let lastReport = null;
let history = loadHistory();

const requiredFields = ['title', 'module', 'environment', 'steps', 'actual', 'expected'];

function valueOf(name) {
    return fields[name].value.trim();
}

function autoSeverity(text) {
    const lower = text.toLowerCase();

    if (lower.includes('crash') || lower.includes('payment') || lower.includes('data loss') || lower.includes('cannot login')) {
        return 'Critical';
    }

    if (lower.includes('error') || lower.includes('not work') || lower.includes('does not work') || lower.includes('broken')) {
        return 'Major';
    }

    if (lower.includes('typo') || lower.includes('text') || lower.includes('layout')) {
        return 'Minor';
    }

    return 'Major';
}

function autoPriority(severity) {
    if (severity === 'Blocker' || severity === 'Critical') return 'High';
    if (severity === 'Major') return 'Medium';
    return 'Low';
}

function calculateScore() {
    const filled = requiredFields.filter((name) => valueOf(name).length > 0).length;
    const baseScore = Math.round((filled / requiredFields.length) * 80);
    const hasNotes = valueOf('notes').length > 0 ? 10 : 0;
    const hasNumberedSteps = /(^|\n)\s*\d+[.)]/.test(valueOf('steps')) ? 10 : 0;

    return Math.min(100, baseScore + hasNotes + hasNumberedSteps);
}

function buildReport() {
    const combinedText = `${valueOf('title')} ${valueOf('actual')} ${valueOf('expected')}`;
    const severity = fields.severity.value === 'auto' ? autoSeverity(combinedText) : fields.severity.value;
    const priority = fields.priority.value === 'auto' ? autoPriority(severity) : fields.priority.value;
    const score = calculateScore();

    return {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title: valueOf('title') || 'Untitled bug report',
        module: valueOf('module') || 'Not specified',
        environment: valueOf('environment') || 'Not specified',
        severity,
        priority,
        steps: valueOf('steps') || 'Not specified',
        actualResult: valueOf('actual') || 'Not specified',
        expectedResult: valueOf('expected') || 'Not specified',
        notes: valueOf('notes') || 'No additional notes',
        qaScore: score,
        createdAt: new Date().toISOString()
    };
}

function toMarkdown(report) {
    return `# Bug Report: ${report.title}\n\n` +
        `## Summary\n` +
        `- **Module:** ${report.module}\n` +
        `- **Environment:** ${report.environment}\n` +
        `- **Severity:** ${report.severity}\n` +
        `- **Priority:** ${report.priority}\n` +
        `- **QA Quality Score:** ${report.qaScore}%\n` +
        `- **Created At:** ${report.createdAt}\n\n` +
        `## Steps to Reproduce\n${report.steps}\n\n` +
        `## Actual Result\n${report.actualResult}\n\n` +
        `## Expected Result\n${report.expectedResult}\n\n` +
        `## Notes / Attachments\n${report.notes}\n`;
}

function toJson(report) {
    return JSON.stringify(report, null, 2);
}

function renderReport() {
    if (!lastReport) {
        output.textContent = 'Здесь появится отчёт.';
        return;
    }

    output.textContent = currentFormat === 'json' ? toJson(lastReport) : toMarkdown(lastReport);
}

function updateQuality(report) {
    scoreBadge.textContent = `QA score: ${report.qaScore}%`;

    if (report.qaScore >= 90) {
        qualityHint.textContent = 'Отличный отчёт: достаточно данных для разработчика.';
        return;
    }

    if (report.qaScore >= 70) {
        qualityHint.textContent = 'Хорошо, но можно добавить логи, скриншоты или точные условия.';
        return;
    }

    qualityHint.textContent = 'Мало данных: добавь шаги, фактический и ожидаемый результат.';
}

function generateReport() {
    lastReport = buildReport();
    updateQuality(lastReport);
    renderReport();
}

function clearForm() {
    Object.values(fields).forEach((field) => {
        field.value = field.tagName === 'SELECT' ? 'auto' : '';
    });

    lastReport = null;
    scoreBadge.textContent = 'QA score: 0%';
    qualityHint.textContent = 'Заполни форму и нажми кнопку генерации.';
    renderReport();
}

async function copyReport() {
    if (!output.textContent || output.textContent === 'Здесь появится отчёт.') return;
    await navigator.clipboard.writeText(output.textContent);
    flashButton(copyBtn, 'Скопировано!', 'Скопировать');
}

function downloadMarkdown() {
    if (!lastReport) return;
    downloadFile('bug-report.md', toMarkdown(lastReport), 'text/markdown;charset=utf-8');
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.warn('Cannot read history from LocalStorage:', error);
        return [];
    }
}

function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function saveCurrentReport() {
    if (!lastReport) {
        generateReport();
    }

    const exists = history.some((item) => item.id === lastReport.id);

    if (!exists) {
        history.unshift(lastReport);
        history = history.slice(0, 20);
        saveHistory();
        renderHistory();
    }

    flashButton(saveBtn, 'Сохранено!', 'Сохранить в историю');
}

function loadReportToForm(reportId) {
    const report = history.find((item) => item.id === reportId);
    if (!report) return;

    fields.title.value = report.title;
    fields.module.value = report.module;
    fields.environment.value = report.environment;
    fields.severity.value = report.severity;
    fields.priority.value = report.priority;
    fields.steps.value = report.steps;
    fields.actual.value = report.actualResult;
    fields.expected.value = report.expectedResult;
    fields.notes.value = report.notes === 'No additional notes' ? '' : report.notes;

    lastReport = report;
    updateQuality(report);
    renderReport();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteReport(reportId) {
    history = history.filter((item) => item.id !== reportId);
    saveHistory();
    renderHistory();
}

function clearHistory() {
    if (!history.length) return;

    const confirmed = confirm('Удалить всю историю баг-репортов?');
    if (!confirmed) return;

    history = [];
    saveHistory();
    renderHistory();
}

function exportHistory() {
    if (!history.length) return;

    const content = JSON.stringify(history, null, 2);
    downloadFile('bug-report-history.json', content, 'application/json;charset=utf-8');
}

function renderHistory() {
    historyCount.textContent = `${history.length} saved`;

    if (!history.length) {
        historyList.innerHTML = '<p class="empty-state">История пока пустая. Сгенерируй отчёт и нажми «Сохранить в историю».</p>';
        return;
    }

    historyList.innerHTML = history.map((report) => {
        const safeTitle = escapeHtml(report.title);
        const safeModule = escapeHtml(report.module);
        const date = new Date(report.createdAt).toLocaleString('ru-RU');

        return `
            <article class="history-item">
                <div>
                    <h3>${safeTitle}</h3>
                    <p>${safeModule} · ${report.severity} · ${report.priority} · ${report.qaScore}%</p>
                    <small>${date}</small>
                </div>
                <div class="history-actions">
                    <button type="button" data-action="load" data-id="${report.id}">Открыть</button>
                    <button type="button" class="secondary" data-action="copy" data-id="${report.id}">Copy MD</button>
                    <button type="button" class="danger" data-action="delete" data-id="${report.id}">Удалить</button>
                </div>
            </article>
        `;
    }).join('');
}

async function handleHistoryClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const report = history.find((item) => item.id === id);

    if (action === 'load') {
        loadReportToForm(id);
    }

    if (action === 'copy' && report) {
        await navigator.clipboard.writeText(toMarkdown(report));
        flashButton(button, 'Copied!', 'Copy MD');
    }

    if (action === 'delete') {
        deleteReport(id);
    }
}

function downloadFile(fileName, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
}

function flashButton(button, temporaryText, originalText) {
    button.textContent = temporaryText;
    setTimeout(() => button.textContent = originalText, 1200);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

generateBtn.addEventListener('click', generateReport);
clearBtn.addEventListener('click', clearForm);
copyBtn.addEventListener('click', copyReport);
saveBtn.addEventListener('click', saveCurrentReport);
downloadBtn.addEventListener('click', downloadMarkdown);
exportHistoryBtn.addEventListener('click', exportHistory);
clearHistoryBtn.addEventListener('click', clearHistory);
historyList.addEventListener('click', handleHistoryClick);

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabs.forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        currentFormat = tab.dataset.format;
        renderReport();
    });
});

renderHistory();
