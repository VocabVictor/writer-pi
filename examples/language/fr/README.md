# Exemple fr : chronique de quartier à partir de notes

Lancer writer-pi dans ce répertoire :

```bash
cd examples/language/fr
writer-pi
```

Puis saisir dans l'interface :

```
/draft Écris une chronique de quartier sur la boulangerie du coin
```

brief.md porte les consignes (langue cible, genre, longueur, mots interdits) ; sources/boulangerie.md contient la matière.
Génération réelle non interactive :

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft Écris une chronique de quartier sur la boulangerie du coin" --no-session
```

Le déroulé est automatique : ébauche, enregistrement, vérifications, révisions.
Le texte final se trouve dans article.md ; les versions sont dans drafts/.
