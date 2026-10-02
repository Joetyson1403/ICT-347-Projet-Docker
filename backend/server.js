const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Pool de connexions MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// Initialisation automatique de la table GLPI et de données par défaut
function initDB(callback) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS equipements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      categorie VARCHAR(50) NOT NULL,
      ip VARCHAR(45) NOT NULL,
      statut VARCHAR(30) NOT NULL,
      date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  pool.query(createTableQuery, (err) => {
    if (err) return callback(err);

    pool.query('SELECT COUNT(*) AS count FROM equipements', (err, results) => {
      if (err) return callback(err);
      if (results[0].count === 0) {
        const seedQuery = `
          INSERT INTO equipements (nom, categorie, ip, statut) VALUES
          ('SRV-DEBIAN-PROD', 'Serveur', '192.168.10.10', 'Actif'),
          ('SW-CISCO-CORE01', 'Réseau / Switch', '192.168.10.254', 'Actif'),
          ('PC-CPNV-SALLE204', 'Poste de travail', '192.168.20.45', 'En maintenance')
        `;
        pool.query(seedQuery, callback);
      } else {
        callback(null);
      }
    });
  });
}

// Endpoint de santé
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// GET /api : Récupérer tout l'inventaire GLPI
// (Conserve la clé "visites_enregistrees" pour que le script test.sh reste 100% compatible)
app.get('/api', (req, res) => {
  initDB((err) => {
    if (err) return res.status(500).json({ error: 'Erreur init DB: ' + err.message });

    pool.query('SELECT * FROM equipements ORDER BY id DESC', (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur lecture DB: ' + err.message });
      res.json({
        message: 'Connecté à la base MySQL (Inventaire GLPI)',
        visites_enregistrees: rows.length,
        equipements: rows
      });
    });
  });
});

// POST /api/equipements : Ajouter un équipement au parc
app.post('/api/equipements', (req, res) => {
  const { nom, categorie, ip, statut } = req.body;
  if (!nom || !categorie || !ip || !statut) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  pool.query(
    'INSERT INTO equipements (nom, categorie, ip, statut) VALUES (?, ?, ?, ?)',
    [nom, categorie, ip, statut],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Erreur insertion: ' + err.message });
      res.status(201).json({ id: result.insertId, message: 'Équipement ajouté avec succès' });
    }
  );
});

// DELETE /api/equipements/:id : Supprimer un équipement
app.delete('/api/equipements/:id', (req, res) => {
  const { id } = req.params;
  pool.query('DELETE FROM equipements WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Erreur suppression: ' + err.message });
    res.json({ message: 'Équipement supprimé' });
  });
});

app.listen(port, () => {
  console.log(`API Mini-GLPI en écoute sur le port ${port}`);
});