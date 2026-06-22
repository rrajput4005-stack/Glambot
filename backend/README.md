# GLAMBOT Backend

This backend powers the GLAMBOT frontend with a real acne CNN model and product recommendations from the CSV dataset.

## Run

```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\Glambot"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\activate
python -m pip install -r backend\requirements.txt
python backend\app.py
```

Open the frontend from another terminal:

```powershell
cd "C:\Users\LENOVO\OneDrive\Desktop\Glambot"
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## API

- `GET /api/health`
- `POST /api/analyze` with multipart form field `image`

## Current AI Coverage

- Acne type: real CNN from `acne_cnn_model.keras`
- Product suggestions: real CSV filtering from `products.csv`
- Skin tone: color-estimation fallback by default
- Skin type, pigmentation, dark circles, tanning: lightweight inference/rules until separate datasets/models are trained
