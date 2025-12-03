const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// СТАЛО (для хостинга Beget)
const db = mysql.createConnection({
  host: 'localhost',            // Beget использует 'localhost'
  user: 'martiruc_1',           // Имя пользователя (как и имя базы)
  password: '123456mM', // 
  database: 'martiruc_1'        // Имя вашей базы данных
});

db.connect(err => {
  if (err) {
    console.error('Ошибка подключения к базе:', err);
  } else {
    console.log('Успешно подключено к MySQL!');
  }
});

// 1. API РЕГИСТРАЦИИ
app.post('/api/register', (req, res) => {
  const { email, password } = req.body;
  const sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json({ message: 'Ошибка (возможно, такой email уже есть)' });
    res.json({ message: 'Успешная регистрация' });
  });
});

// 2. API ВХОДА
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length > 0) {
      res.json({ success: true, user: results[0] });
    } else {
      res.json({ success: false });
    }
  });
});

// 3. API TRADE-IN
app.post('/api/trade-in', (req, res) => {
  const { make, model, year, mileage, phone } = req.body;
  const sql = 'INSERT INTO requests (car_brand, car_model, year, mileage, phone) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [make, model, year, mileage, phone], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Заявка сохранена' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});