import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { file, message } = req.body;

    if (!file || !file.data) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing technical drawings, PDFs, and documents. Focus on identifying and explaining technical components, specifications, and important details from the provided files. Provide detailed, professional analysis."
        },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Please analyze this file." },
            {
              type: "image_url",
              image_url: {
                url: file.data,
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({ 
      error: 'Failed to analyze file',
      details: error.message 
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const messages = [
      {
        role: "system",
        content: "You are an expert in technical drawings and documents. Help users understand technical components and answer their questions about specifications, systems, and technical details."
      },
      ...context,
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 500,
    });

    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});