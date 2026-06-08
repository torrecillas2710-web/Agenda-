#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        JARVIS ULTRA — SETUP          ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Backend
echo "→ Configurando backend..."
cd backend

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip -q
pip install -r requirements.txt -q

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ✓ Archivo .env creado"
  echo ""
  echo "  ⚠️  IMPORTANTE: Edita backend/.env y agrega tu ANTHROPIC_API_KEY"
  echo "     Obtén tu key en: https://console.anthropic.com"
  echo ""
fi

cd ..

# Frontend
echo "→ Instalando dependencias del frontend..."
cd frontend
npm install --silent
cd ..

echo ""
echo "✓ Setup completado"
echo ""
echo "Para iniciar JARVIS ULTRA:"
echo ""
echo "  Terminal 1 (backend):"
echo "    cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Abrir: http://localhost:5173"
echo ""
