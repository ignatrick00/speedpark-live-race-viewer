#!/bin/bash

echo "🚀 Creando usuario de prueba..."
echo ""

# Crear usuario Ignacio
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ignacio@karteando.cl",
    "password": "test1234",
    "firstName": "Ignacio",
    "lastName": "Cabrera"
  }' | jq '.'

echo ""
echo "✅ Usuario creado!"
echo ""
echo "📧 Email: ignacio@karteando.cl"
echo "🔑 Password: test1234"
echo ""
echo "🔗 Ahora puedes hacer login en: http://localhost:3000"
