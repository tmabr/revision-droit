# Révisions — Droit L3

Application web de gestion des révisions : tableau de bord, matières et plans, flashcards en répétition espacée, QCM, annales et cas pratiques, concentration, habitudes et ressources juridiques.

- **Technique :** HTML, CSS et JavaScript, sans outil de compilation. Hébergement gratuit sur GitHub Pages.
- **Données :** stockées dans le navigateur (mode local) ou synchronisées sur Supabase (plusieurs PC, connexion par email et mot de passe).

---

## 1. Tester tout de suite (mode local)

Ouvre `index.html` dans Chrome ou Edge. L'app démarre avec des données d'exemple, que tu peux supprimer dans Réglages → Données.
En mode local, les données restent dans ce navigateur, sur ce PC.

## 2. Mettre en ligne sur GitHub Pages (environ 5 minutes)

1. Sur github.com, crée un dépôt, par exemple `revisions-droit`. Il peut être **privé**, mais GitHub Pages sur un dépôt privé demande un compte GitHub Pro. Avec un dépôt **public**, le code est visible, mais **pas les données** : elles sont dans Supabase, protégées par mot de passe.
2. Envoie tous les fichiers de ce dossier à la racine du dépôt (bouton « Add file → Upload files », ou `git push`).
3. Va dans **Settings → Pages → Build and deployment**, choisis « Deploy from a branch », la branche `main` et le dossier `/ (root)`, puis Save.
4. Une à deux minutes plus tard, l'app est en ligne à l'adresse `https://<ton-pseudo>.github.io/revisions-droit/`.

## 3. Activer la synchronisation entre PC (Supabase, gratuit, environ 10 minutes)

1. Crée un compte sur supabase.com, puis **New project** (région : Paris ou Francfort). Note le mot de passe de la base, même s'il ne servira plus.
2. **SQL Editor → New query** : colle le contenu de `supabase/schema.sql`, puis **Run**.
3. **Authentication → Users → Add user → Create new user** : saisis l'email et le mot de passe de l'utilisatrice, et coche « Auto Confirm User ».
4. **Authentication → Sign In / Providers** : désactive **« Allow new users to sign up »**. Comme ça, personne d'autre ne peut créer de compte, même avec le lien.
5. **Project Settings → API** (ou « Data API » / « API Keys ») : copie la **Project URL** et la clé **anon public**.
6. Colle-les dans `js/config.js` :
   ```js
   window.APP_CONFIG = {
     supabaseUrl: 'https://xxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...'
   };
   ```
7. Envoie le fichier modifié sur GitHub. Au prochain chargement, l'app affiche l'écran de connexion.

La clé « anon » est faite pour être publique. La sécurité repose sur les règles RLS du `schema.sql` : un compte ne peut lire que ses propres données.

> Si l'app a d'abord été utilisée en mode local sur un PC, les données de ce PC sont envoyées en ligne à la première connexion, s'il n'y a encore rien sur le serveur.

> Un projet Supabase gratuit est mis en pause après 7 jours sans aucune activité. Une utilisation quotidienne l'en empêche. S'il est en pause, il suffit de le relancer depuis le tableau de bord Supabase.

## 4. Flashcards et QCM avec Claude

Dans **Révisions → Ajouter des cartes** et **Entraînement → QCM**, un bouton copie une consigne prête à l'emploi. Colle-la dans Claude avec ton cours, puis colle la réponse de Claude dans le champ d'import.

- Format des flashcards : une carte par ligne, `question :: réponse`
- Format des QCM : un tableau JSON `[{"q","options","answer","explanation"}]`

## 5. Sauvegarde

Réglages → Exporter (.json). À faire de temps en temps, par sécurité.

## Évolutions prévues

- Connexion à Obsidian pour lire les fiches directement depuis le coffre.
- Génération des cartes et QCM depuis l'app, avec une clé d'API.
