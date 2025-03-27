// app/api/ollama/chat/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { conversation } = await request.json();
    // "conversation" might be an array of { role: 'user'|'assistant', content: string } messages
    // or a single prompt string. Adapt as needed.

    // Example: build a prompt from the conversation
    // and include the existing mindmap as context:
    let finalPrompt = '';
    for (const msg of conversation) {
      finalPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
    }

    // Send streaming request to Ollama
    const payload = {
      prompt: finalPrompt,
      model: 'llama3.3', // or whichever model
      stream: true,    // streaming!
    };

    const response = await fetch('http://129.49.69.210:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // If the remote server supports streaming, pipe it back to the client:
    if (!response.body) {
      // If there's no body, fallback to standard JSON
      const fallback = await response.text();
      return NextResponse.json({ response: fallback });
    }

    // Return a streamed response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in /api/ollama/chat:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
