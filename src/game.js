import { db } from './db.js';
import { generateJson } from './model/adapter.js';
import { buildStartPrompt, buildContinuePrompt } from './prompts.js';

function parseJson(text, fallback) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

function createBaseState(input = {}) {
    return {
        player: {
            concept: input.character || 'A reluctant protagonist'
        },
        world: {
            genre: input.genre || 'fantasy',
            tone: input.tone || 'weird'
        },
        story: {
            summary: '',
            current_arc: '',
            open_threads: []
        },
        systems: {},
        resources: {},
        inventory: [],
        relationships: {},
        flags: []
    };
}

function mergeObjects(base = {}, patch = {}) {
    return {
        ...base,
        ...patch
    };
}

function mergeUniqueArray(base = [], additions = []) {
    return Array.from(new Set([...base, ...additions]));
}

function applyStateDelta(state, delta = {}) {
    const next = structuredClone(state);

    if (delta.player) next.player = mergeObjects(next.player, delta.player);
    if (delta.world) next.world = mergeObjects(next.world, delta.world);
    if (delta.systems) next.systems = mergeObjects(next.systems, delta.systems);
    if (delta.resources) next.resources = mergeObjects(next.resources, delta.resources);
    if (delta.relationships) {
        next.relationships = mergeObjects(next.relationships, delta.relationships);
    }

    if (delta.inventory_add) {
        next.inventory = mergeUniqueArray(next.inventory, asArray(delta.inventory_add));
    }

    if (delta.inventory_remove) {
        next.inventory = next.inventory.filter(
            item => !asArray(delta.inventory_remove).includes(item)
        );
    }

    if (delta.flags_set) {
        next.flags = mergeUniqueArray(next.flags, asArray(delta.flags_set));
    }

    if (delta.story) {
        next.story = {
            ...next.story,
            ...delta.story,
            current_scene: delta.story.current_scene ?? next.story.current_scene,
            current_location: delta.story.current_location ?? next.story.current_location,
            open_threads: mergeUniqueArray(
                next.story?.open_threads || [],
                delta.story.open_threads_add || []
            )
        };

        if (delta.story.open_threads_remove) {
            next.story.open_threads = next.story.open_threads.filter(
                thread => !delta.story.open_threads_remove.includes(thread)
            );
        }

        delete next.story.open_threads_add;
        delete next.story.open_threads_remove;
    }

    return next;
}
function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}
export function listRuns() {
    return db.prepare('SELECT * FROM runs ORDER BY updated_at DESC').all();
}

export function getRun(id) {
    const run = db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
    if (!run) return null;

    return {
        ...run,
        state: parseJson(run.state_json, {})
    };
}

export function getPages(runId) {
    return db.prepare('SELECT * FROM pages WHERE run_id = ? ORDER BY page_number ASC').all(runId);
}

export async function createRun(input = {}) {
    const prompt = buildStartPrompt(input);
    const response = await generateJson(prompt, 'start');

    const initialState = createBaseState(input);
    const state = applyStateDelta(initialState, response.state_delta);

    state.story.summary = response.summary_update || state.story.summary;
    const runInsert = db.prepare(`
    INSERT INTO runs (title, premise, genre, tone, state_json)
    VALUES (?, ?, ?, ?, ?)
  `);

    const result = runInsert.run(
        response.title || 'Untitled Run',
        response.premise || '',
        input.genre || 'fantasy',
        input.tone || 'weird',
        JSON.stringify(state)
    );

    const runId = result.lastInsertRowid;

    db.prepare(`
    INSERT INTO pages (
      run_id, page_number, player_input, story_text, choices_json,
      state_delta_json, full_response_json, prompt_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        runId,
        1,
        '[start]',
        response.story_text,
        JSON.stringify(response.choices || []),
        JSON.stringify(response.state_delta || {}),
        JSON.stringify(response),
        prompt
    );

    db.prepare(`
    INSERT INTO run_events (run_id, event_type, payload_json)
    VALUES (?, ?, ?)
  `).run(runId, 'run_created', JSON.stringify(input));

    return {
        run: getRun(runId),
        pages: getPages(runId)
    };
}

export async function continueRun(runId, input = {}) {
    const run = getRun(runId);
    if (!run) throw new Error('Run not found');

    const pages = getPages(runId);
    const playerInput = input.player_input || input.choice || 'Continue';

    const prompt = buildContinuePrompt({ run, pages, playerInput });
    const response = await generateJson(prompt, 'continue');

    const nextState = applyStateDelta(run.state, response.state_delta);

    nextState.story.summary = response.summary_update || nextState.story.summary;
    const pageNumber = pages.length + 1;

    db.prepare(`
    INSERT INTO pages (
      run_id, page_number, player_input, story_text, choices_json,
      state_delta_json, full_response_json, prompt_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        runId,
        pageNumber,
        playerInput,
        response.story_text,
        JSON.stringify(response.choices || []),
        JSON.stringify(response.state_delta || {}),
        JSON.stringify(response),
        prompt
    );

    db.prepare(`
    UPDATE runs
    SET state_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(nextState), runId);

    db.prepare(`
    INSERT INTO run_events (run_id, event_type, payload_json)
    VALUES (?, ?, ?)
  `).run(runId, 'player_action', JSON.stringify({ playerInput }));

    return {
        run: getRun(runId),
        pages: getPages(runId)
    };
}