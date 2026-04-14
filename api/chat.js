const OpenAI = require('openai');

const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY 
});

module.exports = async function handler(req, res) {
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
        // Regresamos el error exacto para saber qué falló
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}