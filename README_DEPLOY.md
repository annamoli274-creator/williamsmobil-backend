Déploiement backend (Express) — Instructions rapides

1) Créer un dépôt GitHub pour le backend (ex: `williamsmobil-backend`).
2) Sur Railway, créer un nouveau projet et relier le dépôt GitHub.

Variables d'environnement à ajouter (Railway):
- FRONTEND_ORIGIN=https://<YOUR_VERCEL_DOMAIN>
- SMTP_HOST=...
- SMTP_USER=...
- SMTP_PASS=...
- DATABASE_URL=...
- (autres clés utilisées par `backend/src/services/*`)

Commandes Git pour pousser local -> GitHub (exécuter dans `backend/`):

```bash
git init
git add .
git commit -m "Initial backend commit"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
git push -u origin main
```

Démarrer localement:

```bash
cd backend
npm install
npm run start
```

Notes:
- Railway fournit l'URL publique à utiliser comme `NEXT_PUBLIC_BACKEND_URL` dans le frontend (le préfixe `NEXT_PUBLIC_` est requis par Next.js pour exposer la variable côté client/serveur en production).
- Sur Railway, définis la variable `FRONTEND_ORIGIN` pour autoriser CORS depuis Vercel.
