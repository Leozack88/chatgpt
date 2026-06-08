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
const downloadBtn = document.querySelector('#downloadBtn');
const tabs = document.querySelectorAll('.tab');

let currentFormat = 'markdown';
let lastReport = null;

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
    copyBtn.textContent = 'Скопировано!';
    setTimeout(() => copyBtn.textContent = 'Скопировать', 1200);
}

function downloadMarkdown() {
    if (!lastReport) return;

    const blob = new Blob([toMarkdown(lastReport)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'bug-report.md';
    link.click();

    URL.revokeObjectURL(url);
}

generateBtn.addEventListener('click', generateReport);
clearBtn.addEventListener('click', clearForm);
copyBtn.addEventListener('click', copyReport);
downloadBtn.addEventListener('click', downloadMarkdown);

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabs.forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        currentFormat = tab.dataset.format;
        renderReport();
    });
});
