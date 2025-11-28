# SmartCharge NEO ⚡🚗

> **Gestion intelligente des bornes de recharge pour véhicules électriques via IoT et IA.**

![Status](https://img.shields.io/badge/Status-Development-orange)
![Tech](https://img.shields.io/badge/Stack-Next.js_|_Neon_|_IoT-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 📖 À propos du projet

**SmartCharge NEO** est une solution complète (Hardware + Software) visant à résoudre la problématique de la saturation des bornes de recharge urbaines.

Face à l'augmentation rapide des véhicules électriques, ce projet propose une approche connectée pour :
1.  **Réduire le temps d'attente** des utilisateurs grâce à une visualisation en temps réel.
2.  **Optimiser le réseau électrique** (Smart Grid) via une distribution d'énergie assistée par IA.
3.  **Faciliter l'expérience utilisateur** avec une application fluide pour la réservation.

Ce projet a été développé dans le cadre de notre cursus d'ingénierie à **Sorbonne Université**.

---

## 🚀 Fonctionnalités Clés

### 🔌 Côté IoT (Borne Connectée)
* **Surveillance en temps réel :** Détection de l'état de la borne (Libre / Occupée / En panne) via des capteurs de courant/tension.
* **Indicateurs visuels :** Feedback LED immédiat sur le statut de la charge.
* **Communication :** Transmission des données télémétriques vers le cloud.

### 📱 Côté Application (Expérience Utilisateur)
* **Carte interactive :** Localisation des bornes et affichage de leur disponibilité en direct.
* **Réservation intelligente :** Possibilité de réserver une borne à distance.
* **Tableau de bord :** Suivi de la consommation et historique des recharges.

### 🧠 Côté Intelligence (Smart Grid)
* **Algorithme de délestage :** Gestion dynamique de la puissance délivrée pour éviter la surcharge du réseau local.
* **Analyse de données :** Utilisation de l'historique pour prédire les pics de fréquentation.

---

## 🛠️ Architecture Technique

Nous utilisons une architecture **Moderne et Serverless** pour garantir la scalabilité et la rapidité de développement.

| Composant | Technologie | Description |
| :--- | :--- | :--- |
| **Frontend & Backend** | **Next.js 14 (App Router)** | Framework React complet hébergé sur **Vercel**. Gère l'UI et les API Routes. |
| **Base de Données** | **Neon (Serverless Postgres)** | Stockage des utilisateurs, réservations et états des bornes. |
| **ORM** | **Prisma** | Gestion des schémas de données et communication type-safe avec la DB. |
| **IoT Hardware** | **ESP32** | Microcontrôleur gérant les capteurs et l'envoi de données (HTTP/MQTT). |
| **Styling** | **Tailwind CSS** | Design moderne et responsive. |

### Schéma de flux de données (Simplifié)
`[ESP32 / Capteurs]` ➡ `[Next.js API (Vercel)]` ➡ `[Neon Postgres]` ⬅ `[Interface Utilisateur]`

---
