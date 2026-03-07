#!/usr/bin/env python3
import os, sys, subprocess, shutil, tarfile, datetime

BACKUP_DIR   = "/root/torflix-backups"
DB_CONTAINER = "1199583b22b8_torflix-postgres"
DB_USER      = "torflixuser"
DB_NAME      = "torflix"
SOURCE_DIRS  = ["/root/backend","/root/frontend","/root/TorFlixMobile","/root/streampanel-android","/root/torflix-app","/root/torflix-tizen","/root/streampanel-app","/root/bloc11","/var/www/html"]
ROOT_FILES   = ["/root/docker-compose.yml","/root/publish-ota.sh","/root/deploy-ota.sh","/root/torflix.keystore","/root/yts-proxy.js","/root/backend/.env"]
CONTAINER_FILES = {
    "torflix-backend":  ["/app/src/server.js","/app/src/routes/auth-tv.js","/app/src/routes/ota.js","/app/src/routes/stream.routes.js","/app/src/services/stream.service.js"],
    "torflix-frontend": ["/app/app/player/[type]/[id]/page.jsx","/app/components/ui/Header.jsx"],
}
G="\033[0;32m"; Y="\033[1;33m"; R="\033[0;31m"; NC="\033[0m"
def log(m):  print(f"{G}checkmark {m}{NC}")
def info(m): print(f"{Y}-> {m}{NC}")
def err(m):  print(f"{R}x {m}{NC}")
def run(cmd): return subprocess.run(cmd, shell=True, capture_output=True, text=True)
def ts(): return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

def backup():
    t = ts(); bp = os.path.join(BACKUP_DIR, f"torflix-{t}"); os.makedirs(bp, exist_ok=True)
    print(f"\n=== TorFlix Backup {t} ===\n")
    info("Sources...")
    ex = "--exclude='node_modules' --exclude='.next' --exclude='.gradle' --exclude='build' --exclude='.git' --exclude='ios/Pods'"
    dirs = " ".join([d for d in SOURCE_DIRS if os.path.exists(d)])
    if dirs: run(f"tar -czf {bp}/sources.tar.gz {ex} {dirs} 2>/dev/null"); log(f"sources.tar.gz")
    info("Fichiers racine...")
    rf = f"{bp}/root-files"; os.makedirs(rf, exist_ok=True)
    for f in ROOT_FILES:
        if os.path.exists(f): shutil.copy2(f, rf); log(f"  {f}")
    info("Containers...")
    cd = f"{bp}/containers"; os.makedirs(cd, exist_ok=True)
    for c, files in CONTAINER_FILES.items():
        os.makedirs(f"{cd}/{c}", exist_ok=True)
        for f in files:
            safe = f.replace("/","_").lstrip("_")
            r = run(f"docker cp {c}:'{f}' {cd}/{c}/{safe}")
            if r.returncode == 0: log(f"  {c}:{f}")
            else: info(f"  skip {c}:{f}")
    info("Database...")
    r = run(f"docker exec {DB_CONTAINER} pg_dump -U {DB_USER} {DB_NAME}")
    if r.returncode == 0: open(f"{bp}/database.sql","w").write(r.stdout); log("database.sql")
    else: err(f"DB: {r.stderr[:100]}")
    info("Nginx...")
    ng = f"{bp}/nginx"; os.makedirs(ng, exist_ok=True)
    run(f"cp -r /etc/nginx/sites-enabled {ng}/ 2>/dev/null")
    for f in ["/var/www/html/tv.html","/var/www/html/privacy.html","/var/www/html/tv-fix.js"]:
        if os.path.exists(f): shutil.copy2(f, ng); log(f"  {f}")
    info("APK + assets...")
    ad = f"{bp}/assets"; os.makedirs(ad, exist_ok=True)
    for f in ["/var/www/html/torflix.apk","/var/www/html/torflix.wgt","/root/torflix.keystore"]:
        if os.path.exists(f): shutil.copy2(f, ad); log(f"  {os.path.basename(f)}")
    info("Archive finale...")
    final = os.path.join(BACKUP_DIR, f"torflix-{t}.tar.gz")
    with tarfile.open(final,"w:gz") as tar: tar.add(bp, arcname=f"torflix-{t}")
    shutil.rmtree(bp)
    size = os.path.getsize(final)/1024/1024
    print(f"\n=== Backup OK: {final} ({size:.1f} MB) ===\n")

def restore(bf=None):
    if not bf:
        bs = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith(".tar.gz")])
        if not bs: err("Aucun backup"); sys.exit(1)
        bf = os.path.join(BACKUP_DIR, bs[-1])
    print(f"\n=== Restore: {os.path.basename(bf)} ===\n")
    tmp = "/root/torflix-restore-tmp"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    with tarfile.open(bf,"r:gz") as tar: tar.extractall(tmp)
    root = os.path.join(tmp, os.listdir(tmp)[0])
    src = f"{root}/sources.tar.gz"
    if os.path.exists(src): run(f"tar -xzf {src} -C / 2>/dev/null"); log("Sources")
    rf = f"{root}/root-files"
    if os.path.exists(rf):
        for f in os.listdir(rf): shutil.copy2(f"{rf}/{f}", f"/root/{f}"); log(f"  /root/{f}")
    cd = f"{root}/containers"
    if os.path.exists(cd):
        for c in os.listdir(cd):
            for fname in os.listdir(f"{cd}/{c}"):
                orig = "/"+fname.replace("_","/",fname.count("_"))
                r = run(f"docker cp '{cd}/{c}/{fname}' {c}:'{orig}'")
                if r.returncode == 0: log(f"  {c}:{orig}")
    ng = f"{root}/nginx"
    if os.path.exists(ng):
        for f in ["tv.html","privacy.html","tv-fix.js"]:
            s=f"{ng}/{f}"
            if os.path.exists(s): shutil.copy2(s,f"/var/www/html/{f}"); log(f"  {f}")
        run("cp -r {ng}/sites-enabled /etc/nginx/ 2>/dev/null")
        run("nginx -t && systemctl reload nginx")
    db = f"{root}/database.sql"
    if os.path.exists(db):
        r = run(f"docker exec -i {DB_CONTAINER} psql -U {DB_USER} {DB_NAME} < {db}")
        log("Database") if r.returncode==0 else err(r.stderr[:100])
    for c in ["torflix-backend","torflix-frontend"]:
        run(f"docker restart {c}"); log(f"  {c} redemarré")
    shutil.rmtree(tmp)
    print(f"\n=== Restore terminé ! ===\n")

def lst():
    if not os.path.exists(BACKUP_DIR): err("Aucun backup"); return
    bs = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith(".tar.gz")])
    if not bs: err("Aucun backup"); return
    print(f"\nBackups ({len(bs)}) :")
    for i,b in enumerate(bs):
        s = os.path.getsize(os.path.join(BACKUP_DIR,b))/1024/1024
        print(f"  [{i+1}] {b} ({s:.1f} MB){' <- dernier' if i==len(bs)-1 else ''}")
    print()

os.makedirs(BACKUP_DIR, exist_ok=True)
cmd = sys.argv[1] if len(sys.argv)>1 else "help"
if   cmd=="backup":  backup()
elif cmd=="restore": restore(sys.argv[2] if len(sys.argv)>2 else None)
elif cmd=="list":    lst()
elif cmd=="auto":
    backup()
    bs=sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith(".tar.gz")])
    while len(bs)>5: os.remove(os.path.join(BACKUP_DIR,bs.pop(0)))
else: print("Usage: python3 torflix.py backup | restore | list | auto")
