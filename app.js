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
app.use(express.static(path.join(__dirname, 'car-dealership-website')));

// ✅ ПРАВИЛЬНОЕ подключение к Railway MySQL
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверка подключения
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        console.log('Environment variables:', {
            host: process.env.MYSQLHOST || process.env.DB_HOST,
            user: process.env.MYSQLUSER || process.env.DB_USER,
            database: process.env.MYSQLDATABASE || process.env.DB_NAME,
            port: process.env.MYSQLPORT || process.env.DB_PORT
        });
    } else {
        console.log('✅ Connected to MySQL database on Railway');
        connection.release();
    }
});

// ✅ API регистрации (используем pool)
app.post('/api/register', (req, res) => {
    console.log('Registration request:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }
    
    // Проверяем, есть ли пользователь с таким email
    const checkQuery = 'SELECT id FROM users WHERE email = ?';
    pool.query(checkQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error: ' + err.message 
            });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }
        
        // Создаем нового пользователя
        const insertQuery = 'INSERT INTO users (email, password) VALUES (?, ?)';
        pool.query(insertQuery, [email, password], (err, result) => {
            if (err) {
                console.error('Insert error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error creating user: ' + err.message 
                });
            }
            
            console.log('User created with ID:', result.insertId);
            res.json({ 
                success: true, 
                message: 'Registration successful',
                userId: result.insertId 
            });
        });
    });
});

// ✅ API входа
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    pool.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error: ' + err.message 
            });
        }
        
        if (results.length === 0) {
            return res.json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: results[0]
        });
    });
});

// ✅ API Trade-In
app.post('/api/tradein', (req, res) => {
    const { make, model, year, mileage, phone, user_email } = req.body;
    
    const query = `
        INSERT INTO trade_in_requests (make, model, year, mileage, phone, user_email) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    pool.query(query, [make, model, year, mileage, phone, user_email], (err, result) => {
        if (err) {
            console.error('Trade-in error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error: ' + err.message 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Trade-in request submitted successfully',
            requestId: result.insertId
        });
    });
});

// Проверка работы сервера
app.get('/api/health', (req, res) => {
    pool.query('SELECT 1 as test', (err) => {
        if (err) {
            return res.json({ 
                status: 'WARNING', 
                message: 'Server is running',
                database: 'DISCONNECTED: ' + err.message
            });
        }
        
        res.json({ 
            status: 'OK', 
            message: 'Server is running',
            database: 'CONNECTED'
        });
    });
});

// Все остальные запросы отправляем на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'car-dealership-website', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving from: ${path.join(__dirname, 'car-dealership-website')}`);
    console.log('Database config:', {
        host: process.env.MYSQLHOST || process.env.DB_HOST,
        database: process.env.MYSQLDATABASE || process.env.DB_NAME
    });
});