#!/bin/bash
set -e

echo "1. Vérification de la réponse du Frontend Nginx..."
curl -f http://localhost:8080/ > /dev/null
echo "Frontend OK"

echo "2. Vérification de l'API Backend et de la base de données MySQL..."
RESPONSE=$(curl -s http://localhost:8080/api)
echo "Réponse reçue : $RESPONSE"

if echo "$RESPONSE" | grep -q "visites_enregistrees"; then
  echo "Test d'intégration Backend + DB réussi"
else
  echo "Échec du test API/DB"
  exit 1
fi