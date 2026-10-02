# Projet 347 - Virtualisation d'une application avec des conteneurs (Mini-GLPI)

**Auteurs :** Taveeporn Matta & Eyuel Worku  
**Module :** ICT-347 - Utiliser un service avec des conteneurs (CPNV)  
**Dépôt Docker Hub :** [https://hub.docker.com/r/taveeporn/projet347-backend](https://hub.docker.com/r/taveeporn/projet347-backend)

---

## 1. Introduction / But du projet
L'objectif de ce projet est de moderniser une infrastructure applicative d'entreprise en conteneurisant une application web de gestion de parc informatique (**Mini-GLPI**) à l'aide de Docker et Docker Compose.

L'application permet de recenser les équipements informatiques d'une entreprise (serveurs, postes de travail, switchs réseau, imprimantes), de visualiser leur adresse IP et leur statut (`Actif`, `En maintenance`, `Hors service`), ainsi que d'ajouter ou de supprimer du matériel avec sauvegarde persistante en base de données.

---

## 2. Architecture
L'infrastructure repose sur une architecture 3-tiers composée de 3 services interconnectés et répartis sur 2 réseaux Docker distincts pour garantir l'isolation :

```text
[ Navigateur Client ]
         │ (Port exposé : 8080 -> 80)
         ▼
┌───────────────────┐
│  Frontend : Nginx │ (Interface Web HTML/CSS/JS + Reverse Proxy)
└─────────┬─────────┘
          │ Réseau : front-net (bridge)
          ▼
┌───────────────────┐
│ Backend : Node.js │ (API REST Express - Dockerfile multistage, user non-root)
└─────────┬─────────┘
          │ Réseau : back-net (bridge, internal: true)
          ▼
┌───────────────────┐
│ Database : MySQL  │ ◄───► [ Volume Persistant : db_data ]
└───────────────────┘
```

* **Frontend (`nginx_frontend`) :** Basé sur `nginx:alpine`, il sert l'interface utilisateur Mini-GLPI et agit comme *Reverse Proxy* en redirigeant les requêtes `/api` vers le conteneur Backend.
* **Backend (`node_backend`) :** API REST développée avec Node.js et Express (`GET /api`, `POST /api/equipements`, `DELETE /api/equipements/:id`, `GET /api/health`).
* **Database (`mysql_db`) :** Base de données relationnelle `mysql:8.0` stockant la table `equipements` avec initialisation automatique de données par défaut.

---

## 3. Instructions de lancement

### Prérequis
* Docker Desktop et Docker Compose installés et démarrés.
* Git installé.

### Étapes de déploiement local
1. **Cloner le dépôt GitHub :**
   ```bash
   git clone https://github.com/Joetyson1403/ICT-347-Projet-Docker.git
   cd ICT-347-Projet-Docker
   ```
2. **Configurer les variables d'environnement :**
   Créer le fichier `.env` à partir du modèle fourni :
   ```bash
   cp .env.example .env
   ```
3. **Construire et démarrer les conteneurs :**
   ```bash
   docker compose up -d --build
   ```
4. **Accéder à l'application :**
   Ouvrir un navigateur à l'adresse : `http://localhost:8080`

---

## 4. Publication sur Docker Hub
L'image personnalisée du service Backend a été construite, taguée et publiée sur le registry distant **Docker Hub** :
* **URL du dépôt :** [https://hub.docker.com/r/taveeporn/projet347-backend](https://hub.docker.com/r/taveeporn/projet347-backend)
* **Commande de récupération (Pull) :**
  ```bash
  docker pull taveeporn/projet347-backend:1.0.0
  ```

---

## 5. Réseau, Sécurité et Persistance

### Sécurité et gestion des secrets
* **Variables d'environnement (`.env`) :** Aucun mot de passe ni paramètre sensible n'est écrit en dur dans le code ou dans le `docker-compose.yml`. Le fichier `.env` est exclu du suivi Git via `.gitignore`, et un fichier `.env.example` documente les variables attendues.
* **Utilisateur non-root :** Le `Dockerfile` du Backend exécute l'application sous l'utilisateur non-privilégié `node` (`USER node`) afin de limiter les risques en cas de compromission du conteneur.
* **Optimisation Multistage :** Le `Dockerfile` utilise une construction en deux étapes (*multistage build*) basée sur `node:18-alpine` avec `npm install --omit=dev` pour réduire la taille de l'image finale et la surface d'attaque.
* **Réduction des ports exposés :** Seul le port `8080` du conteneur Nginx est exposé sur la machine hôte. Les ports du Backend (`3000`) et de MySQL (`3306`) ne sont jamais exposés à l'extérieur.

### Isolation réseau
* **`front-net` (driver `bridge`) :** Connecte uniquement le Frontend Nginx et le Backend Node.js.
* **`back-net` (driver `bridge`, `internal: true`) :** Réseau strictement interne reliant le Backend à la base de données MySQL. Le conteneur MySQL est totalement isolé d'Internet et du conteneur Frontend.

### Stratégie de persistance (Volumes)
* **Volume nommé `db_data` :** Monté sur `/var/lib/mysql` dans le conteneur MySQL, il garantit que les équipements ajoutés ou supprimés dans l'inventaire persistent après un arrêt (`docker compose down`) ou un redémarrage des conteneurs.
* **Bind mounts en lecture seule (`:ro`) :** Les fichiers de configuration et d'interface (`index.html` et `nginx.conf`) sont montés en lecture seule dans Nginx pour empêcher toute modification non autorisée depuis le conteneur.

---

## 6. Tests effectués et résultats
* **Qualité du code (Linter) :** Vérification syntaxique automatisée du code Backend avec `node --check backend/server.js`.
* **Script de test automatisé (`test.sh`) :** Script Bash vérifiant que le serveur web Nginx répond correctement en HTTP sur le port `8080` et que l'API Backend communique bien avec MySQL.
* **Pipeline CI/CD (GitHub Actions) :** Le workflow `.github/workflows/ci.yml` s'exécute automatiquement à chaque `git push` sur la branche `main`. Il génère un fichier `.env` de test, exécute le linter, construit les images, démarre la stack Docker Compose et valide le script `test.sh`.
* **Test de persistance :** Ajout d'un nouvel équipement via le formulaire web, arrêt complet des conteneurs (`docker compose down`), puis relance (`docker compose up -d`) : l'équipement est toujours présent dans la base MySQL.

---

## 7. Problèmes rencontrés et pistes d'amélioration

### Problèmes rencontrés et solutions
1. **Synchronisation du démarrage Backend / MySQL :** Le conteneur Node.js démarrait plus rapidement que l'initialisation du serveur MySQL. Résolu par l'ajout d'un `healthcheck` (`mysqladmin ping`) sur le conteneur `database` combiné à la condition `depends_on: condition: service_healthy`.
2. **Mise à jour du code Backend dans l'image :** Après le passage à l'application Mini-GLPI, l'ajout d'équipements ne fonctionnait pas car le conteneur exécutait encore l'ancienne image en cache. Résolu en reconstruisant l'image avec `docker compose up -d --build --force-recreate`.
3. **Configuration de l'environnement local :** Résolution des erreurs initiales de lancement (`no configuration file provided`, démarrage du démon Docker Desktop et sauvegarde préalable du `Dockerfile` dans VS Code avant le build).

### Pistes d'amélioration
* Mise en place du chiffrement HTTPS (certificat SSL/TLS) sur le Reverse Proxy Nginx.
* Ajout d'un système d'authentification administrateur pour sécuriser la suppression des équipements.
* Intégration de **Portainer** pour superviser visuellement l'état des conteneurs et des volumes.

---

## 8. Outils et assistance utilisés
* **Outils techniques :** Docker Desktop, Docker Compose, Visual Studio Code, Git, GitHub / GitHub Actions, Docker Hub.
* **Assistance IA :** Ce projet et sa documentation ont été réalisés avec l'aide de **Google Gemini**, utilisé comme assistant pour structurer l'architecture Docker Compose, développer l'interface et l'API Mini-GLPI, configurer le pipeline CI/CD GitHub Actions et résoudre les erreurs de déploiement.