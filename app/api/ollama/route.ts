import { NextResponse } from 'next/server';

const fallbackMarkdown = `
# Fallback Mindmap
- Could not generate mindmap because Ollama is not running.
- This is a mock mindmap.
`;

/**
 * Convert a JSON object into a basic markdown bullet list.
 */
function convertMapToMarkdown(map: any, indent = 0): string {
  let md = '';
  const prefix = '  '.repeat(indent) + '- ';
  for (const key in map) {
    if (typeof map[key] === 'object' && map[key] !== null) {
      md += `${prefix}**${key}**:\n`;
      md += convertMapToMarkdown(map[key], indent + 1);
    } else {
      md += `${prefix}**${key}**: ${map[key]}\n`;
    }
  }
  return md;
}

/**
 * Extract markdown code block from a string.
 * If the string contains a markdown code block starting with "```markdown" and ending with "```",
 * return the content inside that code block.
 */
function extractMarkdown(text: string): string | null {
  const regex = /```markdown\s*([\s\S]*?)```/i;
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const reqData = await request.json();
    const { prompt } = reqData;
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    const payload = {
      prompt: `Generate a mindmap in markdown format based on the following prompt: ${prompt}. Make sure you use - for subnodes. Give only the mindmap, no notes
      Below is an example of a markdown file that can be used to generate a mindmap:
        # My title
        
        ## Resources

        - <https://markmap.js.org/>
        - [GitHub](https://github.com/markmap/markmap)

        ## Related

        - [coc-markmap](https://github.com/markmap/coc-markmap)
        - [gatsby-remark-markmap](https://github.com/markmap/gatsby-remark-markmap)

        ## Features

        - links
        - **inline** ~~text~~ *styles*
        - multiline
          text
        
        - Katex - $x = {-b \pm \sqrt{b^2-4ac} \over 2a}$
        - This is a very very very very very very very very very very very very very very very long line.
        `,
      model: 'llama3.3', // adjust model if needed
      stream: false,
    };

    const ollamaResponse = await fetch('http://129.49.69.210:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Read the response body as text.
    const rawText = await ollamaResponse.text();
    
    console.log("Ollama raw text response:", rawText);

    let data: any;
    try {
      data = JSON.parse(rawText);
      console.log("Parsed data:", data);
    } catch (parseError) {
      console.error("JSON parsing failed, returning raw text as markdown");
      return NextResponse.json({ markdown: rawText || fallbackMarkdown }, { status: 200 });
    }

    let output: string | undefined;

    // If there is a markdown property, use it.
    if (data.markdown && typeof data.markdown === 'string') {
      output = data.markdown;
    } 
    // Else if there's a response property, try to extract markdown from it.
    else if (data.response && typeof data.response === 'string') {
      // Try to extract markdown code block if available.
      const extracted = extractMarkdown(data.response);
      output = extracted || data.response;
    } 
    // Else if there's a map property, convert it.
    else if (data.map && typeof data.map === 'object') {
      output = convertMapToMarkdown(data.map);
    }

    if (!output) {
      console.error("No suitable markdown property found. Returning full parsed data as string.");
      output = JSON.stringify(data, null, 2);
    }
    
    return NextResponse.json({ markdown: output }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/ollama handler:", error);
    return NextResponse.json({ markdown: fallbackMarkdown }, { status: 200 });
  }
}
