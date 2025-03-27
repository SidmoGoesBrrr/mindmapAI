import { NextResponse } from 'next/server';

const fallbackMarkdown = `
# Fallback Mindmap
- Could not generate mindmap because Ollama is not running.
- This is a mock mindmap.
`;

function extractMarkdown(text: string): string | null {
  const regex = /```markdown\s*([\s\S]*?)```/i;
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export async function POST(request: Request) {
  const BASE_URL = process.env.BASE_URL;
  try {
    const { mindmap, prompt } = await request.json();
    if (!mindmap || !prompt) {
      return NextResponse.json(
        { error: 'Both mindmap and prompt are required' },
        { status: 400 }
      );
    }

    const payload = {
      prompt: `
Take the existing mindmap in markdown format below:

${mindmap}

Now update it based on the following instructions:
${prompt}

Return the updated mindmap in proper markdown format (use '-' for subnodes).
      `,
      model: 'llama3.3',
      stream: false,
    };

    const ollamaResponse = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawText = await ollamaResponse.text();
    let updatedMarkdown: string | null = extractMarkdown(rawText);

    if (!updatedMarkdown) {
      // Try to parse the raw response as JSON and use its "response" field.
      try {
        const parsed = JSON.parse(rawText);
        if (parsed.response) {
          updatedMarkdown = parsed.response;
        }
      } catch (err) {
        console.error("Error parsing rawText as JSON:", err);
      }
      if (!updatedMarkdown) {
        updatedMarkdown = rawText || fallbackMarkdown;
      }
    }

    return NextResponse.json({ markdown: updatedMarkdown }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/ollama/edit:', error);
    return NextResponse.json({ markdown: fallbackMarkdown }, { status: 200 });
  }
}
