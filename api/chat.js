import OpenAI from 'openai';

// Vercel inyecta automáticamente las variables de entorno si las configuras en su panel
const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
});

export default async function handler(req, res) {
    // Solo permitimos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { messages } = req.body;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            max_tokens: 600,
            temperature: 0.7
        });

        const reply = response.choices[0]?.message?.content || 'Sin respuesta';
        res.status(200).json({ reply });

    } catch (error) {
        console.error("❌ Error en OpenAI:", error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}