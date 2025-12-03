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

// Раздаем статические файлы из текущей директории
app.use(express.static(path.join(__dirname)));

// Подключение к базе данных Railway
console.log('🔧 Проверка переменных окружения:');
console.log('MYSQLHOST:', process.env.MYSQLHOST);
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
console.log('MYSQLUSER:', process.env.MYSQLUSER);

const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('🔧 Конфиг БД:', JSON.stringify(dbConfig, null, 2));

const db = mysql.createPool(dbConfig);

// Проверка подключения
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Ошибка подключения к MySQL:', err.message);
        console.error('Код ошибки:', err.code);
        console.error('Полный stack:', err.stack);
    } else {
        console.log('✅ Успешно подключено к MySQL!');
        connection.query('SHOW TABLES', (err, results) => {
            if (err) {
                console.error('❌ Ошибка при проверке таблиц:', err.message);
            } else {
                console.log('📋 Найдены таблицы:', results);
            }
            connection.release();
        });
    }
});

// --- API РЕГИСТРАЦИИ ---
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    console.log('📝 Регистрация пользователя:', email);
    
    // Проверяем подключение к БД
    db.getConnection((err, connection) => {
        if (err) {
            console.error('❌ Нет подключения к БД:', err.message);
            return res.status(500).json({ message: 'Ошибка подключения к базе данных' });
        }
        
        const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
        connection.query(sql, [email, password], (err, result) => {
            connection.release();
            if (err) {
                console.error('❌ Ошибка регистрации:', err.message);
                return res.status(500).json({ message: 'Ошибка регистрации' });
            }
            console.log('✅ Пользователь зарегистрирован:', email);
            res.json({ message: 'Успешная регистрация' });
        });
    });
});

// --- API ВХОДА ---
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    console.log('🔑 Попытка входа:', email);
    
    db.getConnection((err, connection) => {
        if (err) {
            console.error('❌ Нет подключения к БД для входа');
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        
        const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
        connection.query(sql, [email, password], (err, results) => {
            connection.release();
            if (err) {
                console.error('❌ Ошибка при входе:', err.message);
                return res.status(500).json({ success: false, message: 'Ошибка сервера' });
            }
            if (results.length > 0) {
                console.log('✅ Успешный вход:', email);
                res.json({ success: true, user: results[0] });
            } else {
                console.log('❌ Неверные данные для входа:', email);
                res.json({ success: false, message: 'Неверный логин или пароль' });
            }
        });
    });
});

// --- API TRADE-IN ---
app.post('/api/trade-in', (req, res) => {
    console.log('📦 Получена заявка Trade-In:', req.body);
    
    db.getConnection((err, connection) => {
        if (err) {
            console.error('❌ Нет подключения к БД для Trade-In');
            return res.status(500).json({ error: 'Ошибка сервера' });
        }
        
        const { make, model, year, mileage, phone, userEmail } = req.body;
        const sql = 'INSERT INTO requests (car_brand, car_model, year, mileage, phone, userEmail) VALUES (?, ?, ?, ?, ?, ?)';
        
        connection.query(sql, [make, model, year, mileage, phone, userEmail], (err, result) => {
            connection.release();
            if (err) {
                console.error('❌ Ошибка сохранения Trade-In:', err.message);
                return res.status(500).json({ error: 'Ошибка сохранения' });
            }
            console.log('✅ Trade-In сохранен, ID:', result.insertId);
            res.json({ message: 'Заявка успешно отправлена!' });
        });
    });
});

// --- ОБРАБОТКА ВСЕХ ДРУГИХ МАРШРУТОВ ---
app.get('*', (req, res) => {
    const requestedPath = req.path;
    
    // Если это API маршрут, возвращаем 404
    if (requestedPath.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Определяем файл для отдачи
    let filePath = path.join(__dirname, requestedPath);
    
    // Если путь заканчивается на / или это корень, отдаем index.html
    if (requestedPath === '/' || requestedPath === '') {
        filePath = path.join(__dirname, 'index.html');
    }
    
    // Если файл не найден, отдаем index.html (для SPA)
    const fs = require('fs');
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        console.log(`📄 Отдаем файл: ${requestedPath}`);
        res.sendFile(filePath);
    } else {
        console.log(`📄 Файл не найден ${requestedPath}, отдаем index.html`);
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// --- ЗАПУСК СЕРВЕРА ---
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
    console.log(`📁 Текущая директория: ${__dirname}`);
    console.log(`🌐 Сайт будет доступен по URL от Railway`);
    
    // Показываем содержимое директории
    const fs = require('fs');
    fs.readdir(__dirname, (err, files) => {
        if (err) {
            console.error('❌ Не могу прочитать директорию:', err.message);
        } else {
            console.log('📂 Файлы в директории:', files);
        }
    });
});