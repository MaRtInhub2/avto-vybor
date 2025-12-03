// Проверка файла
const express = require('express');
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ВАЖНО: Раздаем файлы сайта (HTML, CSS, JS) из текущей папки
app.use(express.static(__dirname));

// Подключение к базе данных Railway
const db = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'avto_vybor',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверка подключения
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе:', err);
    } else {
        console.log('✅ Успешно подключено к MySQL!');
        connection.release();
    }
});

// --- 1. API РЕГИСТРАЦИИ ---
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
    db.query(sql, [email, password], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Ошибка регистрации (возможно, email занят)' });
        }
        res.json({ message: 'Успешная регистрация' });
    });
});

// --- 2. API ВХОДА ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.json({ success: false, message: 'Неверный логин или пароль' });
        }
    });
});

// --- 3. API TRADE-IN ---
app.post('/api/trade-in', (req, res) => {
    // Получаем данные из формы
    const { make, model, year, mileage, phone } = req.body;
    
    // SQL запрос для сохранения заявки
    const sql = 'INSERT INTO requests (car_brand, car_model, year, mileage, phone) VALUES (?, ?, ?, ?, ?)';
    
    db.query(sql, [make, model, year, mileage, phone], (err, result) => {
        if (err) {
            console.error('Ошибка Trade-In:', err);
            return res.status(500).json({ error: 'Ошибка сохранения заявки' });
        }
        res.json({ message: 'Заявка успешно отправлена!' });
    });
});

// --- 4. API ПРОДУКТОВ (ДЛЯ КАТАЛОГА) ---
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- ГЛАВНАЯ СТРАНИЦА ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});