const OpenAI = require('openai');

// Inicializamos la librería de OpenAI, ¡pero la conectamos a los servidores de Google!
const openai = new OpenAI({ 
    apiKey: process.env.GEMINI_API_KEY, 
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" // <--- EL TRUCO ESTÁ AQUÍ
});

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { messages } = req.body;

    try {
        const response = await openai.chat.completions.create({
            model: "gemini-1.5-flash", // Usamos el modelo gratuito y veloz de Gemini
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