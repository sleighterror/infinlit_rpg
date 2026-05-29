export async function generate(prompt, mode = 'continue') {
    // Mock mode for now. This keeps the whole app runnable before model wiring.
    if (mode === 'start') {
        return {
            title: 'The Goblin Debt Spiral',
            premise: 'A broke adventurer discovers their starter quest has been outsourced to goblin middle management.',
            story_text:
                'You wake beneath a crooked wooden sign that reads: WELCOME, CONTRACTOR. Your inventory contains one dull knife, three lint-covered coins, and a quest notice stamped FINAL WARNING.',
            choices: [
                'Read the quest notice carefully',
                'Check your inventory',
                'Kick the sign and regret it'
            ],
            state_delta: {
                player: {
                    role: 'Contract Adventurer',
                    vibe: 'unlucky but persistent'
                },
                world: {
                    primary_conflict: 'goblin bureaucracy has infected the quest system'
                },
                systems: {
                    tension: 1,
                    weirdness: 2
                },
                resources: {
                    credibility: 0,
                    pocket_lint: 3
                },
                inventory_add: ['Dull Knife', 'Final Warning Quest Notice'],
                relationships: {
                    'Goblin Middle Management': -1
                },
                flags_set: ['run_started'],
                story: {
                    current_arc: 'Escape the starter contract',
                    open_threads_add: [
                        'Why was the player assigned a final warning before accepting a quest?'
                    ]
                }
            },
            summary_update:
                'The player began their adventure as a broke contractor near a goblin-controlled quest board.'
        };
    }

    return {
        story_text:
            'You make your choice, and the world immediately behaves like it has been waiting to make that a problem. Somewhere nearby, a goblin coughs in an official capacity.',
        choices: [
            'Ask the goblin what this is about',
            'Pretend you are supposed to be here',
            'Search for something useful'
        ],
        state_delta: {
            systems: {
                tension: 2
            },
            relationships: {
                'Nearby Official Goblin': -1
            },
            flags_set: ['heard_official_goblin_cough'],
            story: {
                open_threads_add: [
                    'A goblin appears to be monitoring the player in an official capacity.'
                ]
            }
        },
        summary_update:
            'The player continued forward and encountered signs of goblin bureaucracy.'
    };
}