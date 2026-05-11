# Extraction des caractéristiques en Machine Learning

## 1. Introduction
Une **caractéristique (feature)** est une information mesurable qui décrit un aspect important d’une donnée (par exemple la forme, la couleur ou la texture d’une image). **L’extraction des caractéristiques** consiste à transformer des données brutes en une représentation plus informative et plus compacte, adaptée à un algorithme de Machine Learning. Elle est importante parce qu’elle rend l’apprentissage plus fiable, plus rapide et plus robuste. En classification d’images, elle est très utilisée car une image brute contient beaucoup d’informations redondantes et du bruit : il faut donc isoler ce qui est vraiment utile pour reconnaître les objets.

## 2. Problème des données brutes
Une image brute est difficile à utiliser directement pour plusieurs raisons :
- **Grand nombre de pixels** : chaque image peut contenir des milliers voire des millions de pixels, ce qui crée des vecteurs très longs et coûteux à traiter.
- **Bruit** : les variations d’arrière-plan, de couleur ou d’expression introduisent des informations inutiles.
- **Variations** : la taille, la rotation, la luminosité ou la position d’un objet peuvent changer alors que l’objet reste le même.
- **Peu d’informations pertinentes** : toutes les valeurs de pixels ne sont pas utiles pour la tâche de classification.

Il faut donc **transformer les données brutes en informations plus utiles** pour la tâche (bords, textures, formes, etc.).

## 3. Définition de l’extraction des caractéristiques
- **Définition simple** : transformer une image en un ensemble de valeurs qui résument ses aspects importants.
- **Définition technique** : opération qui convertit une donnée brute nettoyée en un ensemble de descripteurs numériques pertinents pour la modélisation.
- **Objectif principal** : obtenir des caractéristiques **pertinentes, discriminantes, robustes et compactes**.
- **Donnée brute vs feature** : la donnée brute est une image pixel par pixel ; une feature est une mesure descriptive (ex. histogramme de gradients).
- **Feature extraction vs classification** : l’extraction produit la représentation ; la classification utilise cette représentation pour prédire une classe.

## 4. Rôle des features dans un système de classification
**Pipeline :**

Image brute → Prétraitement → Extraction des caractéristiques → Vecteur de caractéristiques → Classificateur → Classe prédite

- **Image brute** : image d’origine avec ses pixels.
- **Prétraitement** : réduction du bruit, normalisation, redimensionnement.
- **Extraction des caractéristiques** : calcul d’informations utiles (bords, textures, points d’intérêt).
- **Vecteur de caractéristiques** : représentation numérique compacte de l’image.
- **Classificateur** : modèle (ex. SVM, réseau de neurones) qui apprend à séparer les classes.
- **Classe prédite** : étiquette finale (chat, chien, etc.).

## 5. Vecteur de caractéristiques
Un **vecteur de caractéristiques** est une liste de nombres qui résume l’image. Une image peut être transformée en vecteur en calculant, par exemple, des histogrammes de gradients ou des statistiques de texture. Les algorithmes comme les **SVM** utilisent ces vecteurs pour séparer les classes dans un espace numérique.

**Exemple simple :**
Une image peut être représentée par quelques valeurs :
- [moyenne de luminosité = 0,65 ; contraste = 0,30 ; densité de contours = 0,12]
Ce petit vecteur peut ensuite être utilisé par un classificateur.

## 6. Exemples de caractéristiques

### Couleur
- **Définition** : distribution des couleurs (ex. histogramme RGB).
- **Exemple** : proportion de rouge pour reconnaître un panneau.
- **Utilité** : distinguer des objets par leur teinte.

### Forme
- **Définition** : information sur la silhouette ou la géométrie d’un objet.
- **Exemple** : contour circulaire d’un ballon.
- **Utilité** : différencier des objets aux formes distinctes.

### Texture
- **Définition** : motif répétitif ou structure locale (rugosité, motifs).
- **Exemple** : texture du pelage d’un animal.
- **Utilité** : reconnaître des matériaux ou des surfaces.

### Contours
- **Définition** : bords où l’intensité change fortement.
- **Exemple** : bord d’un visage.
- **Utilité** : mettre en évidence la structure des objets.

### Gradients
- **Définition** : variations d’intensité en x et y.
- **Exemple** : orientation des bords dans HOG.
- **Utilité** : décrire la forme locale.

### Points d’intérêt
- **Définition** : pixels distinctifs (coins, jonctions).
- **Exemple** : coins d’un bâtiment.
- **Utilité** : faciliter la correspondance d’images.

### Descripteurs locaux
- **Définition** : décrivent une petite région autour d’un point clé.
- **Exemple** : SIFT autour d’un point d’intérêt.
- **Utilité** : robustes aux changements locaux.

### Descripteurs globaux
- **Définition** : décrivent l’image entière.
- **Exemple** : histogramme global de couleurs.
- **Utilité** : représentation simple et rapide.

## 7. Extraction de caractéristiques en traitement d’images
L’extraction consiste à **garder les informations utiles** (forme, texture, bords) et à **supprimer les détails inutiles** (bruit, variations d’éclairage). Par exemple, on veut reconnaître un objet **même si la lumière ou la position change**. Les caractéristiques doivent donc être **invariantes** (translation, rotation, échelle, illumination) et **robustes au bruit**.

## 8. Méthodes classiques d’extraction des caractéristiques

### HOG (Histogram of Oriented Gradients)
- **Principe** : calculer les gradients, diviser l’image en cellules et créer des histogrammes d’orientation.
- **Caractéristiques extraites** : orientations des contours.
- **Exemple d’utilisation** : détection de piétons.
- **Avantages** : simple, interprétable, robuste à l’illumination.
- **Limites** : sensible aux variations de pose/échelle, peu adapté aux scènes complexes.

### SIFT (Scale-Invariant Feature Transform)
- **Principe** : détecter des points clés stables à différentes échelles, attribuer une orientation et construire un descripteur local.
- **Caractéristiques extraites** : points clés + descripteurs locaux (128 valeurs par point).
- **Exemple d’utilisation** : correspondance d’images, détection d’objets.
- **Avantages** : invariant à l’échelle et à la rotation, robuste aux variations.
- **Limites** : coûteux en calcul, vecteur de taille variable (nécessite parfois un BoW).

### LBP (Local Binary Patterns)
- **Principe** : comparer un pixel à ses voisins pour créer un motif binaire.
- **Caractéristiques extraites** : micro-textures locales.
- **Exemple d’utilisation** : reconnaissance faciale.
- **Avantages** : simple, rapide.
- **Limites** : sensible au bruit et aux variations d’illumination.

### Descripteurs de couleur
- **Principe** : histogrammes ou statistiques de couleurs.
- **Caractéristiques extraites** : distribution des couleurs.
- **Exemple d’utilisation** : classification d’objets dominés par une couleur.
- **Avantages** : faciles à calculer.
- **Limites** : sensibles à la lumière et au fond.

### Descripteurs de texture
- **Principe** : capturer les motifs répétitifs (ex. statistiques locales).
- **Caractéristiques extraites** : régularité, rugosité.
- **Exemple d’utilisation** : classification de matériaux.
- **Avantages** : utiles pour distinguer des surfaces.
- **Limites** : moins efficaces si la texture est faible.

## Complément utile
Ces éléments complètent le cours pour mieux situer certaines méthodes de texture ou de couleur.

## 9. Exemple complet
**Objectif :** classifier des images de chats et de chiens.
1. **On récupère les images** (dataset de chats/chiens).
2. **On applique un prétraitement** (redimensionnement, suppression du bruit).
3. **On extrait des caractéristiques** (par exemple HOG ou SIFT).
4. **Chaque image devient un vecteur numérique** (concaténation d’histogrammes).
5. **On entraîne un classificateur** (ex. SVM) sur ces vecteurs.
6. **Le modèle prédit la classe** : chat ou chien.

## 10. Importance de la qualité des caractéristiques
- De **bonnes features** améliorent la séparation entre classes.
- De **mauvaises features** créent des confusions et diminuent la précision.
- La performance du modèle dépend fortement de la pertinence et de la **discriminativité** des caractéristiques.
- Une **feature discriminante** aide à distinguer clairement deux classes proches.

## 11. Avantages et limites de l’extraction des caractéristiques

| Avantages | Limites |
| --- | --- |
| Réduction de la dimension | Perte possible d’informations utiles |
| Amélioration de la robustesse | Dépend du choix du descripteur |
| Facilite l’apprentissage | Peut nécessiter une expertise domaine |
| Meilleure interprétabilité | Parfois insuffisant pour des scènes complexes |

## 12. Questions probables d’examen

**Q : Qu’est-ce qu’une feature ?**
R : Une feature est une information mesurable qui décrit un aspect important d’une donnée.

**Q : Pourquoi extrait-on des caractéristiques ?**
R : Pour transformer les données brutes en informations utiles, robustes et compactes.

**Q : Quelle est la différence entre une image brute et un vecteur de caractéristiques ?**
R : L’image brute est un ensemble de pixels ; le vecteur est une représentation numérique résumée.

**Q : Quelle est la différence entre feature extraction et classification ?**
R : L’extraction produit la représentation ; la classification décide la classe.

**Q : Pourquoi HOG et SIFT sont utilisés en classification d’images ?**
R : Parce qu’ils extraient des informations robustes sur les contours et les points clés.

**Q : Que signifie feature discriminante ?**
R : Une feature qui permet de séparer clairement des classes différentes.

## 13. Résumé final
L’extraction des caractéristiques transforme des images brutes en informations plus utiles pour un classificateur. Elle permet de réduire la dimension, de rendre les données plus robustes au bruit et aux variations, et de mettre en évidence les éléments réellement discriminants (contours, textures, formes). Des méthodes classiques comme HOG et SIFT illustrent cette démarche en produisant des vecteurs numériques exploitables par les algorithmes de classification. La qualité des features est déterminante : de bonnes caractéristiques améliorent directement la performance du modèle.
