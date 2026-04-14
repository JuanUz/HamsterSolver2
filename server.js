require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
});

app.use(cors());
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            max_tokens: 600,
            temperature: 0.7
        });

        const reply = response.choices[0]?.message?.content || 'Sin respuesta';
        res.json({ reply });

    } catch (error) {
        console.error("❌ Error en OpenAI:", error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ HamsterSolver corriendo a toda velocidad en http://localhost:${PORT}`);
});