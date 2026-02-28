#!/bin/bash
# ═══════════════════════════════════════════════
# TorFlix — Script d'installation rapide
# ═══════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║          🎬 TorFlix Installer            ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé.${NC}"
    echo "   Installer Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker détecté${NC}"

# Create .env if not exists
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Création du fichier .env...${NC}"
    cp .env.example .env
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 64)
    JWT_REFRESH_SECRET=$(openssl rand -hex 64)
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    DB_PASSWORD=$(openssl rand -hex 16)
    
    # Replace in .env
    sed -i "s|change_this_to_a_very_long_random_string_at_least_64_chars|${JWT_SECRET}|g" .env
    sed -i "s|change_this_refresh_secret_also_very_long_and_random|${JWT_REFRESH_SECRET}|g" .env
    sed -i "s|change_me_32_characters_long_key!|${ENCRYPTION_KEY}|g" .env
    sed -i "s|torflix_secret_2026|${DB_PASSWORD}|g" .env
    
    echo -e "${GREEN}✅ Secrets générés automatiquement${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT : Ajoutez votre clé TMDB dans .env${NC}"
    echo "   Obtenir une clé : https://www.themoviedb.org/settings/api"
    echo ""
    read -p "   Entrez votre clé TMDB API (ou appuyez Entrée pour skip) : " TMDB_KEY
    if [ ! -z "$TMDB_KEY" ]; then
        sed -i "s|your_tmdb_api_key_here|${TMDB_KEY}|g" .env
        echo -e "${GREEN}✅ Clé TMDB configurée${NC}"
    fi
fi

# Create SSL directory
mkdir -p docker/ssl

# Build and start
echo ""
echo -e "${BLUE}🏗  Construction des images Docker...${NC}"
docker compose build

echo ""
echo -e "${BLUE}🚀 Lancement des services...${NC}"
docker compose up -d

# Wait for health checks
echo ""
echo -e "${BLUE}⏳ Attente que les services soient prêts...${NC}"
sleep 10

# Check status
echo ""
docker compose ps

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ TorFlix est prêt !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Panel    : ${BLUE}http://localhost${NC}"
echo -e "  📡 API      : ${BLUE}http://localhost:4000/api/health${NC}"
echo ""
echo -e "  👤 Compte admin par défaut :"
echo -e "     Email    : ${BLUE}admin@torflix.local${NC}"
echo -e "     Password : ${RED}admin123${NC} (⚠️ CHANGER !)"
echo ""
echo -e "  📖 Documentation : README.md"
echo ""
