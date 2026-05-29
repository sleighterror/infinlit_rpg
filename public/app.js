let currentRunId = null;
let currentData = null;
let busy = false;

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });

    if (!res.ok) {
        let message = 'Request failed';

        try {
            const data = await res.json();
            message = data.error || message;
        } catch {
            message = await res.text();
        }

        throw new Error(message);
    }

    return res.json();
}
async function loadConfig() {
    try {
        const config = await api('/api/config');
        $('modelBadge').textContent = `${config.modelProvider}: ${config.modelName}`;
        logDebug('config', config);
    } catch (err) {
        $('modelBadge').textContent = 'model: unknown';
        logDebug('config error', { message: err.message });
    }
}
function setBusy(value, label = 'Generating next page…') {
    busy = value;

    const homePanel = $('homePanel');
    const gamePanel = $('gamePanel');

    const isHomeVisible = homePanel && !homePanel.classList.contains('hidden');
    const isGameVisible = gamePanel && !gamePanel.classList.contains('hidden');

    $('startLoading')?.classList.toggle('hidden', !(value && isHomeVisible));
    $('pageLoading')?.classList.toggle('hidden', !(value && isGameVisible));

    const loadingLabel = $('loadingLabel');
    if (loadingLabel) loadingLabel.textContent = label;

    document
        .querySelectorAll('.choice, #customAction, #customActionBtn, #beginBtn')
        .forEach(el => {
            el.disabled = value;
        });
}

function logDebug(label, payload) {
    const time = new Date().toLocaleTimeString();
    const existing = $('debugBox').textContent || '';

    $('debugBox').textContent =
        `[${time}] ${label}\n${JSON.stringify(payload, null, 2)}\n\n${existing}`;
}

function showGame() {
    $('homePanel')?.classList.add('hidden');
    $('gamePanel')?.classList.remove('hidden');
    setActiveTab('pageTab');
}

function showHomeMode(mode) {
    $('homeNewRunPanel').classList.toggle('hidden', mode !== 'new');
    $('homeContinuePanel').classList.toggle('hidden', mode !== 'continue');
}

function showHome() {
    $('homePanel')?.classList.remove('hidden');
    $('gamePanel')?.classList.add('hidden');
    $('subtitle').textContent = 'Local-first infinite LitRPG engine.';
    showHomeMode('continue');
    loadRuns();
}

function showStart() {
    $('homePanel').classList.remove('hidden');
    $('gamePanel').classList.add('hidden');
    $('subtitle').textContent = 'New Run';
    showHomeMode('new');
}
function setActiveTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    document.querySelectorAll('.tabPanel').forEach(panel => {
        panel.classList.toggle('active', panel.id === tabId);
    });
}
function showStart() {
    $('startPanel').classList.remove('hidden');
    $('gamePanel').classList.add('hidden');
    $('backToRunBtn').classList.toggle('hidden', !currentRunId);
}


function render(data) {
    currentData = data;

    const { run, pages } = data;
    currentRunId = run.id;

    const lastPage = pages[pages.length - 1];
    const choices = JSON.parse(lastPage.choices_json || '[]').map(normalizeChoice);

    $('runTitle').textContent = run.title;
    $('runPremise').textContent = run.premise || '';
    $('subtitle').textContent = run.title || 'Local-first infinite LitRPG engine.';
    $('stateBox').textContent = JSON.stringify(run.state, null, 2);
    renderCharacterSheet(run.state);
    $('storySummary').textContent = run.state?.story?.summary || '(no summary yet)';

    $('pageMeta').textContent = `Page ${lastPage.page_number} — ${lastPage.player_input || ''}`;
    $('currentPageText').innerHTML = `<p>${escapeHtml(lastPage.story_text)}</p>`;

    $('choices').innerHTML = choices.map(choice => `
  <button class="choice" data-choice="${escapeAttr(choice.action)}">
    ${escapeHtml(choice.label)}
  </button>
`).join('');

    document.querySelectorAll('.choice').forEach(button => {
        button.addEventListener('click', () => continueWith(button.dataset.choice));
    });

    logDebug('render', {
        runId: run.id,
        page: lastPage.page_number,
        choices
    });

    showGame();
    setActiveTab('pageTab');
    loadRuns();
}

async function beginRun() {
    if (busy) return;

    try {
        setBusy(true, 'Starting run…');

        const payload = {
            genre: $('genre').value,
            tone: $('tone').value,
            character: $('character').value,
            theme: $('theme').value
        };

        logDebug('create run request', payload);

        const data = await api('/api/runs', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        logDebug('create run response', data);
        render(data);
    } catch (err) {
        logDebug('create run error', { message: err.message });
        alert(err.message);
    } finally {
        setBusy(false);
    }
}

async function loadRun(id) {
    if (busy) return;

    try {
        setBusy(true, 'Loading run…');

        const run = await api(`/api/runs/${id}`);
        const pages = await api(`/api/runs/${id}/pages`);

        render({ run, pages });
    } catch (err) {
        logDebug('load run error', { message: err.message });
        alert(err.message);
    } finally {
        setBusy(false);
    }
}

async function continueWith(playerInput) {
    if (busy || !currentRunId) return;

    try {
        setBusy(true, 'Generating next page…');

        logDebug('continue request', {
            runId: currentRunId,
            playerInput
        });

        const data = await api(`/api/runs/${currentRunId}/continue`, {
            method: 'POST',
            body: JSON.stringify({ player_input: playerInput })
        });

        $('customAction').value = '';

        logDebug('continue response', data);
        render(data);
    } catch (err) {
        logDebug('continue error', { message: err.message });
        alert(err.message);
    } finally {
        setBusy(false);
    }
}

async function loadRuns() {
    try {
        const runs = await api('/api/runs');

        const html = runs.length
            ? runs.map(run => `
                 <button class="runButton ${Number(run.id) === Number(currentRunId) ? 'activeRun' : ''}" data-run-id="${run.id}">
                     ${escapeHtml(run.title || `Run ${run.id}`)}
                     ${Number(run.id) === Number(currentRunId) ? '<span class="currentRunBadge">current</span>' : ''}
                </button>
                `).join('')
            : `<p class="muted">No saved runs yet.</p>`;

        if ($('runList')) $('runList').innerHTML = html;
        if ($('homeRunList')) $('homeRunList').innerHTML = html;

        document.querySelectorAll('.runButton').forEach(button => {
            button.addEventListener('click', () => loadRun(button.dataset.runId));
        });
    } catch (err) {
        logDebug('load runs error', { message: err.message });
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#096;');
}
function normalizeChoice(choice) {
    if (typeof choice === 'string') {
        try {
            const parsed = JSON.parse(choice);
            return {
                label: parsed.label || parsed.action || choice,
                action: parsed.action || choice,
                type: parsed.type || 'custom'
            };
        } catch {
            return {
                label: choice,
                action: choice,
                type: 'custom'
            };
        }
    }

    return {
        label: choice.label || choice.action || 'Continue',
        action: choice.action || choice.label || 'Continue',
        type: choice.type || 'custom'
    };
}
function renderKeyValueBox(targetId, obj = {}) {
    const target = $(targetId);

    const entries = Object.entries(obj || {});

    if (!entries.length) {
        target.innerHTML = `<p class="muted">(none yet)</p>`;
        return;
    }

    target.innerHTML = entries.map(([key, value]) => `
    <div class="statRow">
      <span class="statKey">${escapeHtml(key)}</span>
      <span class="statValue">${escapeHtml(formatValue(value))}</span>
    </div>
  `).join('');
}

function formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function renderCharacterSheet(state = {}) {
    $('characterConcept').textContent = state.player?.concept || '';

    renderKeyValueBox('playerSheet', state.player || {});
    renderKeyValueBox('systemsSheet', state.systems || {});
    renderKeyValueBox('resourcesSheet', state.resources || {});

    const inventory = Array.isArray(state.inventory) ? state.inventory : [];

    $('inventorySheet').innerHTML = inventory.length
        ? inventory.map(item => `<li>${escapeHtml(formatValue(item))}</li>`).join('')
        : `<li class="muted">(empty)</li>`;
}
$('beginBtn').addEventListener('click', beginRun);
$('newRunBtn').addEventListener('click', showStart);

$('customActionBtn').addEventListener('click', () => {
    const action = $('customAction').value.trim();
    if (action) continueWith(action);
});

$('customAction').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const action = $('customAction').value.trim();
        if (action) continueWith(action);
    }
});
//$('backToRunBtn').addEventListener('click', showGame);
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});
$('homeNewRunBtn').addEventListener('click', () => showHomeMode('new'));
$('homeContinueBtn').addEventListener('click', () => showHomeMode('continue'));

$('newRunBtn').addEventListener('click', showHome);
loadConfig();
loadRuns();