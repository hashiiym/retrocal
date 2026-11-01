import Groq from 'groq-sdk';

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request payload' });
      }
    }

    const { userMessage, contextData } = body || {};

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'Missing or empty userMessage parameter' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY is not configured in server environment' });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = "You are a concise, retro-styled AI task manager. You help the user optimize their study schedule. Use the provided JSON context of their tasks and syllabus to answer their questions accurately. Keep responses short, direct, and actionable.";

    const contextString = typeof contextData === 'string' 
      ? contextData 
      : JSON.stringify(contextData || { tasks: [], syllabus: [] }, null, 2);

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n[USER SYSTEM CONTEXT DATA]:\n${contextString}`,
      },
      {
        role: 'user',
        content: userMessage.trim(),
      },
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new study or productivity task for the user.',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The title or description of the task',
              },
              date: {
                type: 'string',
                description: 'The date for the task in YYYY-MM-DD format',
              },
              time: {
                type: 'string',
                description: 'The time for the task in HH:MM format',
              },
              priority: {
                type: 'string',
                enum: ['HIGH', 'MEDIUM', 'LOW'],
                description: 'The priority level of the task: HIGH, MEDIUM, or LOW',
              },
              tag: {
                type: 'string',
                description: 'A category tag for the task (e.g., #WORK, #STUDY, #EXAM)',
              },
            },
            required: ['title'],
          },
        },
      },
    ];

    let completion;
    try {
      // Primary model target as specified in requirements
      completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        tools,
        tool_choice: 'auto',
      });
    } catch (modelError) {
      // If the account does not have access or model is not found, fallback to an active available model
      if (modelError?.status === 404 || modelError?.message?.includes('model_not_found') || modelError?.code === 'model_not_found') {
        console.warn('llama-3.3-70b-versatile not accessible on this key, falling back to openai/gpt-oss-120b:', modelError.message);
        completion = await groq.chat.completions.create({
          messages,
          model: 'openai/gpt-oss-120b',
          tools,
          tool_choice: 'auto',
        });
      } else {
        throw modelError;
      }
    }

    const choice = completion.choices?.[0];
    const choiceMessage = choice?.message;

    // Check if tool_calls exists in the Groq response
    if (choiceMessage?.tool_calls && choiceMessage.tool_calls.length > 0) {
      const toolCall = choiceMessage.tool_calls[0];
      if (toolCall.function?.name === 'create_task') {
        let parsedArgs = {};
        try {
          parsedArgs = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : (toolCall.function.arguments || {});
        } catch (e) {
          console.warn('Failed to parse tool call arguments:', e);
          parsedArgs = {};
        }

        return res.status(200).json({
          type: 'action',
          action: 'create_task',
          payload: parsedArgs,
        });
      }
    }

    // If no tool is called, return standard text response
    return res.status(200).json({
      type: 'message',
      text: choiceMessage?.content || 'NO RESPONSE RECEIVED FROM MAINFRAME.',
    });
  } catch (error) {
    console.error('Groq AI API error:', error);
    return res.status(500).json({
      error: error.message || 'Internal Server Error while querying Groq AI',
    });
  }
}
