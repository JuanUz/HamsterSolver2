const OpenAI = require('openai');

const openai = new OpenAI({ 
    apiKey: process.env.GEMINI_API_KEY, 
    // 👇 ES VITAL QUE TERMINE EXACTAMENTE CON LA DIAGONAL (/) 👇
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" 
});

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { messages } = req.body;

    try {
        const response = await openai.chat.completions.create({
            // 👇 ACTUALIZAMOS EL MODELO A LA VERSIÓN MÁS RECIENTE 👇
            model: "gemini-2.5-flash", 
            messages: messages,
            max_tokens: 600,
            temperature: 0.7
        });

        const reply = response.choices[0]?.message?.content || 'Sin respuesta';
        res.status(200).json({ reply });

    } catch (error) {
        console.error("❌ Error en Gemini:", error.message);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
}