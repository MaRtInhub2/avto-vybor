const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
const staticPath = path.join(__dirname, 'car-dealership-website');
app.use(express.static(staticPath));

// 🗄️ КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ
const dbConfig = {
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306
};

console.log('🚀 Server starting...');
console.log('📊 Database config:', {
    host: dbConfig.host,
    database: dbConfig.database,
    port: dbConfig.port
});

// Пул соединений (с таймаутами)
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000, // 10 секунд
    acquireTimeout: 10000
});

// 📱 API Endpoints

// Health check (ОБЯЗАТЕЛЬНО ДЛЯ RAILWAY)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
    // Быстрая проверка без блокировки
    pool.query('SELECT 1 as test', (err) => {
        if (err) {
            res.json({
                status: 'WARNING',
                message: 'App running, database issues',
                uptime: process.uptime()
            });
        } else {
            res.json({
                status: 'OK',
                message: 'Все системы работают',
                uptime: process.uptime()
            });
        }
    });
});

// Регистрация (ИСПРАВЛЕНО: русские ошибки)
app.post('/api/register', (req, res) => {
    console.log('📝 Registration attempt:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.json({ 
            success: false, 
            message: 'Email и пароль обязательны для заполнения' 
        });
    }
    
    // Простая валидация email
    if (!email.includes('@') || !email.includes('.')) {
        return res.json({
            success: false,
            message: 'Некорректный формат email'
        });
    }
    
    // Простая валидация пароля
    if (password.length < 6) {
        return res.json({
            success: false,
            message: 'Пароль должен содержать минимум 6 символов'
        });
    }
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Database connection error:', err.message);
            return res.json({ 
                success: false, 
                message: 'Сервис временно недоступен. Попробуйте позже.' 
            });
        }
        
        // Проверяем существование пользователя
        connection.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                connection.release();
                console.error('Query error:', err.message);
                return res.json({ 
                    success: false, 
                    message: 'Ошибка базы данных' 
                });
            }
            
            if (results.length > 0) {
                connection.release();
                return res.json({ 
                    success: false, 
                    message: 'Пользователь с таким email уже зарегистрирован' 
                });
            }
            
            // Создаем пользователя
            connection.query('INSERT INTO users (email, password) VALUES (?, ?)', 
                [email, password], 
                (err, result) => {
                    connection.release();
                    
                    if (err) {
                        console.error('Insert error:', err.message);
                        
                        // Проверка на дублирование email (на случай, если между проверкой и вставкой появился пользователь)
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.json({
                                success: false,
                                message: 'Пользователь с таким email уже зарегистрирован'
                            });
                        }
                        
                        return res.json({ 
                            success: false, 
                            message: 'Ошибка при регистрации. Попробуйте снова.' 
                        });
                    }
                    
                    console.log('✅ User registered:', email);
                    res.json({ 
                        success: true, 
                        message: 'Регистрация прошла успешно!',
                        userId: result.insertId 
                    });
                }
            );
        });
    });
});

// Вход (ИСПРАВЛЕНО: русские ошибки)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.json({
            success: false,
            message: 'Введите email и пароль'
        });
    }
    
    pool.query('SELECT * FROM users WHERE email = ? AND password = ?', 
        [email, password], 
        (err, results) => {
            if (err) {
                console.error('Login error:', err.message);
                return res.json({ 
                    success: false, 
                    message: 'Ошибка базы данных' 
                });
            }
            
            if (results.length === 0) {
                return res.json({ 
                    success: false, 
                    message: 'Неверный email или пароль' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Вход выполнен успешно',
                user: results[0]
            });
        }
    );
});

// Trade-In запрос (ИСПРАВЛЕНО: русские ошибки)
app.post('/api/tradein', (req, res) => {
    const { make, model, year, mileage, phone, user_email } = req.body;
    
    // Базовая валидация
    if (!make || !model || !year || !mileage || !phone || !user_email) {
        return res.json({
            success: false,
            message: 'Все поля обязательны для заполнения'
        });
    }
    
    if (phone.length < 10) {
        return res.json({
            success: false,
            message: 'Некорректный номер телефона'
        });
    }
    
    pool.query(
        'INSERT INTO trade_in_requests (make, model, year, mileage, phone, user_email) VALUES (?, ?, ?, ?, ?, ?)',
        [make, model, year, mileage, phone, user_email],
        (err, result) => {
            if (err) {
                console.error('Trade-in error:', err.message);
                return res.json({ 
                    success: false, 
                    message: 'Не удалось отправить заявку. Попробуйте позже.' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Заявка успешно отправлена',
                requestId: result.insertId
            });
        }
    );
});

// 🏠 Все маршруты ведут на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving from: ${staticPath}`);
    console.log('👉 Health check: /health');
    console.log('👉 API Health: /api/health');
    
    // Асинхронная проверка базы после запуска
    setTimeout(() => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.log('ℹ️ Database connection check:', err.message);
            } else {
                console.log('✅ Database connected');
                connection.query('SHOW TABLES', (err, tables) => {
                    if (!err && tables) {
                        console.log('📋 Tables:', tables.map(t => Object.values(t)[0]));
                    }
                    connection.release();
                });
            }
        });
    }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        pool.end();
        process.exit(0);
    });
});