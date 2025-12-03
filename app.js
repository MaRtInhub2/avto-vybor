const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
const staticPath = path.join(__dirname, 'car-dealership-website');
app.use(express.static(staticPath));

// 🔍 Проверяем переменные окружения
console.log('='.repeat(60));
console.log('🔧 RAILWAY CONFIGURATION');
console.log('='.repeat(60));
console.log('Port:', process.env.PORT || '8080 (default)');

// 🗄️ КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ
let dbConfig;

// ПРИОРИТЕТ 1: MYSQL_PUBLIC_URL (для публичного доступа)
if (process.env.MYSQL_PUBLIC_URL) {
    console.log('✅ Found MYSQL_PUBLIC_URL');
    try {
        const url = new URL(process.env.MYSQL_PUBLIC_URL);
        dbConfig = {
            host: url.hostname,       // crossover.proxy.rlwy.net
            user: url.username,       // root
            password: url.password,   // ваш пароль
            database: url.pathname.substring(1), // railway
            port: url.port || 3306,   // 44227
            ssl: { rejectUnauthorized: false }
        };
        console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`   Database: ${dbConfig.database}`);
    } catch (error) {
        console.error('❌ Error parsing MYSQL_PUBLIC_URL:', error.message);
    }
}

// ПРИОРИТЕТ 2: Отдельные переменные (через Reference)
if (!dbConfig && process.env.MYSQLHOST) {
    console.log('✅ Found individual MySQL variables via Reference');
    dbConfig = {
        host: process.env.MYSQLHOST,
        user: process.env.MYSQLUSER || 'root',
        password: process.env.MYSQLPASSWORD || '',
        database: process.env.MYSQLDATABASE || 'railway',
        port: process.env.MYSQLPORT || 3306,
        ssl: { rejectUnauthorized: false }
    };
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
}

// ПРИОРИТЕТ 3: Fallback
if (!dbConfig) {
    console.log('⚠️ Using fallback configuration');
    dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'railway',
        port: 3306
    };
}

console.log('='.repeat(60));

// 🗃️ Подключение к базе данных
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000,
    ssl: dbConfig.ssl
});

// Проверка подключения
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ DATABASE CONNECTION ERROR:', err.message);
        console.error('   Code:', err.code);
        console.error('   Host attempted:', dbConfig.host);
        console.error('   Port attempted:', dbConfig.port);
        
        // Предложения по исправлению
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('   1. Check if MySQL variables are referenced in Railway');
        console.log('   2. Verify MySQL service is running');
        console.log('   3. Check firewall/network settings');
        console.log('   4. Try MYSQL_PUBLIC_URL instead of individual vars');
    } else {
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
        console.log(`   Host: ${connection.config.host}`);
        console.log(`   Database: ${connection.config.database}`);
        console.log(`   User: ${connection.config.user}`);
        
        // Проверяем таблицы
        connection.query('SHOW TABLES', (tableErr, results) => {
            if (tableErr) {
                console.log('   Could not list tables:', tableErr.message);
            } else {
                const tables = results.map(row => Object.values(row)[0]);
                console.log(`   Found ${tables.length} tables`);
                if (tables.includes('users') && tables.includes('trade_in_requests')) {
                    console.log('   ✅ Required tables exist: users, trade_in_requests');
                }
            }
            connection.release();
        });
    }
});

// 📱 API Endpoints
app.post('/api/register', (req, res) => {
    console.log('📝 Registration attempt for:', req.body.email);
    
    pool.getConnection((err, connection) => {
        if (err) {
            return res.json({
                success: false,
                message: 'Database unavailable',
                error: err.message
            });
        }
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            connection.release();
            return res.json({
                success: false,
                message: 'Email and password required'
            });
        }
        
        // Проверяем существование пользователя
        connection.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                connection.release();
                return res.json({
                    success: false,
                    message: 'Database error',
                    error: err.message
                });
            }
            
            if (results.length > 0) {
                connection.release();
                return res.json({
                    success: false,
                    message: 'Email already registered'
                });
            }
            
            // Создаем пользователя
            connection.query('INSERT INTO users (email, password) VALUES (?, ?)', 
                [email, password], 
                (err, result) => {
                    connection.release();
                    
                    if (err) {
                        console.error('Registration error:', err.message);
                        return res.json({
                            success: false,
                            message: 'Registration failed',
                            error: err.message
                        });
                    }
                    
                    console.log('✅ New user registered:', email);
                    res.json({
                        success: true,
                        message: 'Registration successful!',
                        userId: result.insertId
                    });
                }
            );
        });
    });
});

// 🩺 Health Check
app.get('/api/health', (req, res) => {
    pool.query('SELECT 1 as health', (err) => {
        if (err) {
            res.json({
                status: 'ERROR',
                message: 'Database connection failed',
                error: err.message,
                config: {
                    host: dbConfig.host,
                    port: dbConfig.port,
                    database: dbConfig.database
                }
            });
        } else {
            res.json({
                status: 'OK',
                message: 'All systems operational',
                database: 'Connected',
                timestamp: new Date().toISOString()
            });
        }
    });
});

// 🏠 Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Все HTML файлы
app.get('*.html', (req, res) => {
    const filePath = path.join(staticPath, req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.redirect('/');
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`🚀 SERVER STARTED on port ${PORT}`);
    console.log(`📁 Serving static files from: ${staticPath}`);
    console.log('='.repeat(60));
    console.log('👉 Health Check:', `/api/health`);
    console.log('👉 Debug Info:', `/api/debug`);
    console.log('='.repeat(60));
});