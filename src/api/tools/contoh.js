
export default function(app) {
    app.get('/api/contoh', (req, res) => {
        res.json({
            status: true,
            message: 'Ini adalah endpoint contoh dari Gemini!'
        });
    });
};
