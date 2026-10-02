const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = process.env.PORT || 3000;

// Utilisation d'un pool de connexions pour gérer l'attente du démarrage de MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.get('/api', (req, res) => {
  pool.query('CREATE TABLE IF NOT EXISTS visites (id INT AUTO_INCREMENT PRIMARY KEY, date_visite TIMESTAMP DEFAULT CURRENT_TIMESTAMP)', (err) => {
    if (err) return res.status(500).json({ error: 'Erreur DB: ' + err.message });

    pool.query('INSERT INTO visites () VALUES ()', (err) => {
      if (err) return res.status(500).json({ error: 'Erreur insertion: ' + err.message });

      pool.query('SELECT COUNT(*) AS total FROM visites', (err, results) => {
        if (err) return res.status(500).json({ error: 'Erreur lecture: ' + err.message });
        res.json({
          message: 'Connexion Backend -> MySQL réussie !',
          visites_enregistrees: results[0].total
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`API Backend démarrée sur le port ${port}`);
});