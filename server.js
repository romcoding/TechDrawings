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

app.post('/api/analyze', async (req, res) => {
  try {
    const { image, message } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing technical drawings and building plans. Focus on identifying and explaining technical components like valves, pipes, electrical systems, HVAC components, and other technical elements. Provide detailed, professional analysis."
        },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Please analyze this technical drawing." },
            {
              type: "image_url",
              image_url: {
                url: image,
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    const messages = [
      {
        role: "system",
        content: "You are an expert in technical drawings and building plans. Help users understand technical components and answer their questions about building systems, components, and technical specifications."
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
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});