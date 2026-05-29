const OLLAMA_URL =
  process.env.OLLAMA_URL ||
  'http://localhost:11434/api/generate';

export async function generate(prompt) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'qwen3:8b',
      prompt,
      stream: false,
      format: 'json'
    })
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('[ollama] non-json response:', text);
    throw new Error('Ollama returned non-JSON HTTP response');
  }

  if (!response.ok) {
    console.error('[ollama] HTTP error:', data);
    throw new Error(data.error || `Ollama HTTP ${response.status}`);
  }

  if (!data.response) {
    console.error('[ollama] missing data.response:', data);
    throw new Error('Ollama response missing data.response');
  }

  try {
    return JSON.parse(data.response);
  } catch {
    console.error('[ollama] model returned invalid JSON:', data.response);
    throw new Error('Model returned invalid JSON');
  }
}