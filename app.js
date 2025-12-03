const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// Путь к вашим файлам
const websitePath = path.join(__dirname, 'car-dealership-website');

// Проверяем существование папки
if (!fs.existsSync(websitePath)) {
    console.error('❌ ERROR: car-dealership-website folder not found!');
    console.log('Current directory:', __dirname);
    console.log('Files in directory:', fs.readdirSync(__dirname));
} else {
    console.log('✅ car-dealership-website folder found');
    console.log('Files in website folder:', fs.readdirSync(websitePath));
}

// Статические файлы
app.use(express.static(websitePath));

// Тестовый маршрут
app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!',
        websitePath: websitePath,
        files: fs.readdirSync(websitePath)
    });
});

// Главная страница
app.get('/', (req, res) => {
    const indexPath = path.join(websitePath, 'index.html');
    if (fs.existsSync(indexPath)) {
        console.log('Serving index.html');
        res.sendFile(indexPath);
    } else {
        console.log('index.html not found, listing files');
        res.json({
            error: 'index.html not found',
            files: fs.readdirSync(websitePath)
        });
    }
});

// API endpoints
app.post('/api/register', (req, res) => {
    console.log('Register request:', req.body);
    res.json({ success: true, message: 'User registered' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`📁 Serving from: ${websitePath}`);
});