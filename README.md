# GLAMBOT

GLAMBOT is an AI-powered beauty recommendation prototype for students and everyday users. It presents a face scanner flow, skin concern dashboard, affordable skincare and makeup recommendations, natural remedies, and personalized morning/night routines.

## Run

Open `index.html` in a browser. The prototype is dependency-free and uses in-browser simulated analysis so it can be demonstrated without installing React, Flask, OpenCV, or MongoDB.

## Included Features

- Face scan page with camera and upload controls
- Skin tone, acne, pigmentation, dark circle, skin type, and tanning report
- Product recommendation cards with prices, benefits, ratings, and affordable swaps
- Morning routine, night routine, and home remedies
- Architecture section matching the planned React, Flask, AI, and MongoDB flow

## Backend Extension Plan

The UI can later be connected to a Flask API:

- `POST /api/analyze-face` for OpenCV, MediaPipe, and TensorFlow analysis
- `GET /api/products?issue=Acne&budget=500` for MongoDB product recommendations
- `GET /api/routine?skinType=Oily&concerns=Pigmentation,Acne` for personalized routines
