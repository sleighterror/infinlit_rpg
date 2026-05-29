import { generate as mockGenerate } from './mock.js';
import { generate as ollamaGenerate } from './ollama.js';

export async function generateJson(prompt, mode) {
  const provider = process.env.MODEL_PROVIDER || 'mock';

  if (provider === 'ollama') {
    return ollamaGenerate(prompt);
  }

  return mockGenerate(prompt, mode);
}