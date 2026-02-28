# 🎬 TorFlix — Streaming Torrent Panel

> **Alternative à Stremio** — Plus rapide, plus stylisé, plus puissant.
> Panel web auto-hébergé de streaming torrent en temps réel.

---

## 📋 Table des Matières

1. [Architecture du Projet](#architecture)
2. [Prérequis](#prérequis)
3. [Installation Rapide (Docker)](#installation-docker)
4. [Installation Manuelle (Dev)](#installation-dev)
5. [Configuration](#configuration)
6. [Guide Étape par Étape](#guide-étapes)
7. [API Reference](#api)
8. [Dépannage](#dépannage)

---

## 🏗 Architecture du Projet <a name="architecture"></a>

```
torflix/
├── docker-compose.yml          # Orchestration de tous les services
├── .env.example                # Template des variables d'environnement
│
├── backend/                    # API Node.js (Express)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js           # Point d'entrée
│       ├── routes/
│       │   ├── auth.js         # Login / Register / JWT
│       │   ├── movies.js       # TMDB (métadonnées films/séries)
│       │   ├── search.js       # Recherche multi-sources
│       │   ├── torrents.js     # Scraping trackers (YGG, Torrent9, 1337x)
│       │   ├── stream.js       # 🔥 Moteur de streaming WebTorrent
│       │   ├── progress.js     # Reprise de lecture (positions sauvegardées)
│       │   └── accounts.js     # Gestion comptes torrent (chiffrés AES-256)
│       ├── middleware/
│       │   └── auth.js         # JWT middleware (route protection)
│       ├── models/
│       │   ├── db.js           # Connexion PostgreSQL
│       │   └── init.sql        # Schéma BDD complet
│       └── utils/
│           ├── redis.js        # Cache Redis
│           └── encryption.js   # Chiffrement AES-256
│
├── frontend/                   # Interface Next.js (React)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── lib/
│       │   ├── api.js          # Client API (axios + interceptors)
│       │   └── store.js        # State management (Zustand)
│       ├── app/                # Pages Next.js (App Router)
│       └── components/         # Composants React réutilisables
│
├── docker/
│   └── nginx.conf              # Reverse proxy + SSL
│
└── docs/                       # Documentation additionnelle
```

---

## ⚙️ Prérequis <a name="prérequis"></a>

### Option A : Docker (Recommandé)
- Docker 24+ et Docker Compose v2
- 4 GB RAM minimum (8 GB recommandé)
- Ubuntu 22.04+ / Debian 12+

### Option B : Installation Manuelle
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- FFmpeg
- npm ou yarn

### Clé API requise
- **TMDB API Key** : Créer un compte sur https://www.themoviedb.org/settings/api (gratuit)

---

## 🐳 Installation Rapide (Docker) <a name="installation-docker"></a>

### Étape 1 : Cloner et configurer

```bash
# Cloner le projet
git clone https://github.com/votre-user/torflix.git
cd torflix

# Copier le fichier d'environnement
cp .env.example .env

# IMPORTANT : Éditer .env avec vos vraies valeurs
nano .env
```

**Valeurs à modifier obligatoirement dans `.env` :**
```
JWT_SECRET=<générer avec: openssl rand -hex 64>
JWT_REFRESH_SECRET=<générer avec: openssl rand -hex 64>
ENCRYPTION_KEY=<générer avec: openssl rand -hex 16>
TMDB_API_KEY=<votre clé TMDB>
DB_PASSWORD=<un mot de passe fort>
```

### Étape 2 : Lancer

```bash
# Build et lancement de tous les services
docker compose up -d --build

# Vérifier que tout tourne
docker compose ps

# Voir les logs
docker compose logs -f
```

### Étape 3 : Accéder

- **Frontend** : http://localhost (ou http://votre-ip)
- **API** : http://localhost:4000/api/health
- **Compte admin par défaut** : `admin` / `admin123` (CHANGER IMMÉDIATEMENT)

---

## 🛠 Installation Manuelle (Dev) <a name="installation-dev"></a>

### Étape 1 : Base de données

```bash
# Installer PostgreSQL
sudo apt install postgresql postgresql-contrib

# Créer la base
sudo -u postgres createdb torflix
sudo -u postgres psql -d torflix -f backend/src/models/init.sql
```

### Étape 2 : Redis

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

### Étape 3 : FFmpeg

```bash
sudo apt install ffmpeg
```

### Étape 4 : Backend

```bash
cd backend
npm install

# Configurer les variables d'environnement
export DATABASE_URL=postgresql://torflix:password@localhost:5432/torflix
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=$(openssl rand -hex 64)
export TMDB_API_KEY=votre_clé_tmdb

# Lancer en dev
npm run dev
```

Le backend démarre sur http://localhost:4000

### Étape 5 : Frontend

```bash
cd frontend
npm install

# Configurer l'URL de l'API
export NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Lancer en dev
npm run dev
```

Le frontend démarre sur http://localhost:3000

---

## 🔧 Configuration <a name="configuration"></a>

### Ajouter vos comptes torrent

Après votre première connexion au panel :

1. Aller dans **Paramètres** > **Comptes Torrent**
2. Cliquer **Ajouter un compte**
3. Sélectionner le site (YGG, Torrent9, etc.)
4. Entrer vos identifiants
5. Cliquer **Tester la connexion**

Les identifiants sont chiffrés en AES-256 dans la base de données.

### Configurer un VPN/Proxy

```bash
# Dans .env, ajouter :
PROXY_URL=socks5://user:pass@proxy-host:1080

# Ou pour WireGuard :
VPN_ENABLED=true
VPN_TYPE=wireguard
```

### SSL/HTTPS (Production)

```bash
# Installer Certbot
sudo apt install certbot

# Générer le certificat
sudo certbot certonly --standalone -d votre-domaine.com

# Copier les certificats
cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem docker/ssl/
cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem docker/ssl/

# Décommenter la section HTTPS dans docker/nginx.conf
# Puis relancer
docker compose restart nginx
```

---

## 📖 Guide Étape par Étape <a name="guide-étapes"></a>

### Phase 1 : Backend fonctionnel (Semaine 1-2)

1. **✅ Setup Docker** — docker-compose.yml, PostgreSQL, Redis
2. **✅ Auth system** — Register/Login/JWT/Refresh tokens
3. **✅ TMDB integration** — Films trending, new, popular, detail
4. **✅ Torrent search** — Multi-tracker (1337x, Torrent9)
5. **✅ Streaming engine** — WebTorrent + HTTP range streaming
6. **✅ Watch progress** — Sauvegarde position toutes les 10s

### Phase 2 : Frontend (Semaine 3-4)

7. **🔲 Page Login/Register** — Design cinématographique
8. **🔲 Dashboard** — Hero + Reprendre lecture + Tendances + Nouveautés
9. **🔲 Catalogue Films** — Grille avec filtres langue/qualité
10. **🔲 Page Détail** — Synopsis, casting, torrents avec seeders/langue
11. **🔲 Lecteur Vidéo** — Video.js + contrôles custom + reprise auto
12. **🔲 Recherche** — Multi-sources avec filtre langue prioritaire

### Phase 3 : Intégrations (Semaine 5-6)

13. **🔲 YGG integration** — Login + cookies + recherche authentifiée
14. **🔲 Sous-titres** — OpenSubtitles API, multi-langues
15. **🔲 Transcodage** — FFmpeg pour MKV → MP4 à la volée

### Phase 4 : Polish (Semaine 7-8)

16. **🔲 Animations** — Framer Motion, transitions de page
17. **🔲 Responsive** — Mobile, tablette, mode TV
18. **🔲 PWA** — Installation comme app native
19. **🔲 Electron/Tauri** — App desktop installable

### Phase 5 : Sécurité (Semaine 9-10)

20. **🔲 2FA/TOTP** — Google Authenticator
21. **🔲 VPN kill switch** — Arrêt streaming si VPN down
22. **🔲 Rate limiting avancé** — Par route, par user
23. **🔲 Tests** — Unitaires + intégration

---

## 📡 API Reference <a name="api"></a>

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Se connecter |
| POST | `/api/auth/logout` | Se déconnecter |
| GET | `/api/auth/me` | Profil utilisateur |
| PUT | `/api/auth/preferences` | Modifier préférences (langue, qualité) |

### Movies (TMDB)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movies/trending` | Films tendance |
| GET | `/api/movies/new` | Nouveautés |
| GET | `/api/movies/popular` | Populaires |
| GET | `/api/movies/:id` | Détail film + casting + trailers |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=&lang=&genre=` | Recherche multi-sources |
| GET | `/api/search/suggestions?q=` | Auto-complétion |

### Torrents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/torrents/search?q=&lang=&quality=` | Chercher sur tous les trackers |
| GET | `/api/torrents/magnet?url=` | Récupérer le magnet link |

### Streaming 🔥
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stream/start?magnet=` | Démarrer le streaming |
| GET | `/api/stream/video/:infoHash` | Flux vidéo HTTP (range) |
| GET | `/api/stream/status/:infoHash` | Stats (peers, vitesse, buffer) |
| DELETE | `/api/stream/:infoHash` | Arrêter le streaming |

### Watch Progress (Reprise)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress` | Tous les contenus en cours |
| GET | `/api/progress/:tmdbId` | Position d'un contenu |
| PUT | `/api/progress/:tmdbId` | Sauvegarder la position |

### Torrent Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | Lister les comptes |
| POST | `/api/accounts` | Ajouter un compte |
| POST | `/api/accounts/:id/test` | Tester la connexion |
| DELETE | `/api/accounts/:id` | Supprimer un compte |

---

## 🔧 Dépannage <a name="dépannage"></a>

### Le streaming ne démarre pas
```bash
# Vérifier que WebTorrent fonctionne
docker compose logs backend | grep WebTorrent

# Vérifier le cache torrent
docker compose exec backend ls -la /tmp/torflix-cache

# Vérifier la mémoire disponible
docker stats
```

### Erreur 403 sur les trackers
- Certains trackers bloquent les IP de datacenters
- Solution : configurer un proxy résidentiel dans `.env`
- `PROXY_URL=socks5://user:pass@residential-proxy:1080`

### La base de données ne démarre pas
```bash
# Reset complet de la BDD
docker compose down -v
docker compose up -d db
docker compose exec db psql -U torflix -d torflix -f /docker-entrypoint-initdb.d/init.sql
```

### Performances lentes
```bash
# Augmenter le cache Redis
docker compose exec redis redis-cli CONFIG SET maxmemory 256mb

# Augmenter les connexions PostgreSQL
# Dans docker-compose.yml, ajouter pour le service db :
# command: postgres -c max_connections=200
```

---

## 📜 Licence

Projet privé — Usage personnel uniquement.

---

**TorFlix v1.0** — Stream Everything Instantly 🎬
