# GLAMBOT

GLAMBOT is an AI-powered beauty recommendation prototype for students and everyday users. It now includes a Flask backend that uses saved CNN models for acne and skin-tone prediction, then recommends affordable skincare products from the product CSV.

## Current AI Features

- Acne CNN model: `backend/models/acne_cnn_model.keras`
- Acne classes: Blackheads, Cyst, Papules, Pustules, Whiteheads
- Skin-tone CNN model: `backend/models/skin_tone_cnn_model.keras`
- Skin-tone classes: Black, Brown, White
- Product suggestions: `backend/data/products.csv` with 95 products
- Routine/remedy generation: rule-based from predicted acne level and inferred skin type

## Model Accuracy From Current Training

- Acne CNN test accuracy: about 60.89%
- Skin-tone CNN test accuracy: about 78.38%

These are suitable for a college prototype/demo. For medical or production use, the models would need larger, more balanced, clinically reviewed datasets.

## Run Backend

Open PowerShell:

```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\Glambot"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\activate
python backend\app.py
```

The backend runs at:

```text
http://127.0.0.1:5000
```

Health check:

```text
http://127.0.0.1:5000/api/health
```

## Run Frontend

Open a second PowerShell window:

```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\Glambot"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Upload a face image. The frontend sends it to Flask, Flask runs the CNN models, and GLAMBOT updates the dashboard, routines, remedies, and product cards.

## Train Skin-Tone CNN Again

Only needed if you change the skin-tone dataset:

```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\Glambot"
.\.venv\Scripts\activate
python backend\train_skin_tone_model.py
```

## Backend API

- `GET /api/health`
- `POST /api/analyze` with multipart form field `image`
