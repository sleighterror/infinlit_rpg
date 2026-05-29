const RESPONSE_CONTRACT = `
Return ONLY valid JSON.

Choices MUST be objects, not JSON strings.

Required shape:
{
  "title": string,
  "premise": string,
  "story_text": string,
  "choices": [
    {
      "label": string,
      "action": string,
      "type": "dialogue" | "location" | "investigate" | "risk" | "rest" | "custom"
    }
  ],
  "state_delta": {
    "player": object,
    "world": object,
    "story": {
      "summary": string,
      "current_arc": string,
      "current_scene": string,
      "current_location": string,
      "open_threads_add": string[],
      "open_threads_remove": string[]
    },
    "systems": object,
    "resources": object,
    "inventory_add": string[],
    "inventory_remove": string[],
    "relationships": object,
    "flags_set": string[]
  },
  "summary_update": string
}

Rules:
- The story MUST advance every turn.
- story_text must describe what happens AFTER the player's action.
- Never repeat the previous page.
- Never restate the opening scene.
- Every page must add at least one consequence, discovery, complication, location change, or character interaction.
- Keep choices short and player-facing.
- Do not stringify choice objects.
`;

export function buildStartPrompt(input) {
  return `
You are the narrator/game engine for InfinLit RPG.

Create the opening page for a LitRPG / CYOA run.

${RESPONSE_CONTRACT}

For the opening state, establish:
- title for the story
- premise
- current_scene
- current_location
- current_arc
- one immediate problem

Player setup:
Genre: ${input.genre || 'fantasy'}
Tone: ${input.tone || 'weird, funny, adventurous'}
Character idea: ${input.character || 'a reluctant adventurer'}
Theme: ${input.theme || 'infinite paperback LitRPG'}
`;
}

export function buildContinuePrompt({ run, pages, playerInput }) {
  const recentPages = pages.slice(-3).map(p => ({
    page_number: p.page_number,
    player_input: p.player_input,
    story_text: p.story_text,
    choices: JSON.parse(p.choices_json)
  }));

  const lastPage = recentPages[recentPages.length - 1];

  return `
You are the narrator/game engine for InfinLit RPG.

Continue the story based on the saved state and player action.

${RESPONSE_CONTRACT}

CRITICAL CONTINUATION INSTRUCTION:
The player chose:
${playerInput}

You must now resolve that action directly.

The next story_text must be meaningfully different from the previous page.

Previous page:
${lastPage?.story_text || ''}

Current saved state:
${JSON.stringify(run.state, null, 2)}

Recent pages:
${JSON.stringify(recentPages, null, 2)}
`;
}