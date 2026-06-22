from __future__ import annotations

import csv
import json
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
ACNE_MODEL_PATH = MODEL_DIR / "acne_cnn_model.keras"
ACNE_CLASSES_PATH = MODEL_DIR / "acne_classes.json"
SKIN_TONE_MODEL_PATH = MODEL_DIR / "skin_tone_cnn_model.keras"
SKIN_TONE_CLASSES_PATH = MODEL_DIR / "skin_tone_classes.json"
PRODUCTS_PATH = DATA_DIR / "products.csv"
IMAGE_SIZE = 128

app = Flask(__name__)
CORS(app)

acne_model = tf.keras.models.load_model(ACNE_MODEL_PATH)
with ACNE_CLASSES_PATH.open("r", encoding="utf-8") as file:
    acne_classes = json.load(file)

skin_tone_model = None
skin_tone_classes: list[str] = []
if SKIN_TONE_MODEL_PATH.exists() and SKIN_TONE_CLASSES_PATH.exists():
    skin_tone_model = tf.keras.models.load_model(SKIN_TONE_MODEL_PATH)
    with SKIN_TONE_CLASSES_PATH.open("r", encoding="utf-8") as file:
        skin_tone_classes = json.load(file)


def load_products() -> list[dict[str, str]]:
    with PRODUCTS_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


PRODUCTS = load_products()


def image_from_upload() -> Image.Image:
    if "image" not in request.files:
        raise ValueError("Upload an image using the 'image' form field.")

    image_file = request.files["image"]
    image = Image.open(image_file.stream).convert("RGB")
    return image


def prepare_for_cnn(image: Image.Image) -> np.ndarray:
    resized = image.resize((IMAGE_SIZE, IMAGE_SIZE))
    array = np.asarray(resized, dtype=np.float32) / 255.0
    return np.expand_dims(array, axis=0)


def predict_acne(image: Image.Image) -> dict[str, Any]:
    probabilities = acne_model.predict(prepare_for_cnn(image), verbose=0)[0]
    index = int(np.argmax(probabilities))
    acne_type = acne_classes[index]
    confidence = float(probabilities[index])

    severity_map = {
        "Blackheads": "Mild",
        "Whiteheads": "Mild",
        "Papules": "Moderate",
        "Pustules": "Moderate",
        "Cyst": "Severe",
    }

    return {
        "type": acne_type,
        "level": severity_map.get(acne_type, "Moderate"),
        "confidence": round(confidence, 4),
        "score": int(round(confidence * 100)),
    }


def estimate_skin_tone_by_color(image: Image.Image) -> dict[str, Any]:
    # A lightweight fallback for skin-tone estimation when no trained skin-tone CNN is saved yet.
    small = np.asarray(image.resize((180, 180)), dtype=np.uint8)
    hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV)
    ycrcb = cv2.cvtColor(small, cv2.COLOR_RGB2YCrCb)

    lower_hsv = np.array([0, 15, 40], dtype=np.uint8)
    upper_hsv = np.array([35, 190, 255], dtype=np.uint8)
    mask_hsv = cv2.inRange(hsv, lower_hsv, upper_hsv)

    lower_ycrcb = np.array([35, 133, 77], dtype=np.uint8)
    upper_ycrcb = np.array([255, 173, 127], dtype=np.uint8)
    mask_ycrcb = cv2.inRange(ycrcb, lower_ycrcb, upper_ycrcb)
    mask = cv2.bitwise_and(mask_hsv, mask_ycrcb)

    pixels = small[mask > 0]
    if len(pixels) < 80:
        pixels = small.reshape(-1, 3)

    brightness = float(np.mean(0.299 * pixels[:, 0] + 0.587 * pixels[:, 1] + 0.114 * pixels[:, 2]))
    if brightness < 95:
        tone = "Deep"
        score = 76
    elif brightness < 145:
        tone = "Medium Brown"
        score = 82
    else:
        tone = "Fair / Light"
        score = 84

    return {"value": tone, "score": score, "method": "color-estimation"}


def predict_skin_tone(image: Image.Image) -> dict[str, Any]:
    if skin_tone_model is None:
        return estimate_skin_tone_by_color(image)

    probabilities = skin_tone_model.predict(prepare_for_cnn(image), verbose=0)[0]
    index = int(np.argmax(probabilities))
    return {
        "value": skin_tone_classes[index],
        "score": int(round(float(probabilities[index]) * 100)),
        "confidence": round(float(probabilities[index]), 4),
        "method": "cnn",
    }


def infer_skin_type(acne: dict[str, Any]) -> dict[str, Any]:
    if acne["type"] in {"Blackheads", "Whiteheads", "Papules", "Pustules"}:
        return {"value": "Oily", "score": 72}
    if acne["type"] == "Cyst":
        return {"value": "Sensitive", "score": 68}
    return {"value": "All", "score": 58}


def select_products(acne: dict[str, Any], skin_type: str) -> list[dict[str, Any]]:
    concern_priority = ["Acne", "Acne Marks", "Daily Care"]
    if acne["level"] in {"Moderate", "Severe"}:
        concern_priority.insert(1, "Sensitive Skin")

    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for concern in concern_priority:
        for product in PRODUCTS:
            matches_concern = product.get("target_condition", "").lower() == concern.lower()
            product_skin_type = product.get("skin_type", "All")
            matches_skin = product_skin_type in {"All", skin_type}
            if matches_concern and matches_skin and product["product_id"] not in seen:
                seen.add(product["product_id"])
                selected.append(
                    {
                        "id": product["product_id"],
                        "name": product["product_name"],
                        "brand": product["brand"],
                        "issue": product["target_condition"],
                        "skinType": product_skin_type,
                        "type": "skincare",
                        "price": "Budget friendly",
                        "rating": "Trusted",
                        "benefit": product_benefit(product["target_condition"], product["product_name"]),
                        "swap": product_swap(product["brand"], product["target_condition"]),
                    }
                )
            if len(selected) >= 6:
                return selected
    return selected


def product_benefit(condition: str, name: str) -> str:
    benefits = {
        "Acne": "Targets acne-prone skin and helps reduce clogged pores.",
        "Acne Marks": "Supports post-acne mark care and uneven texture improvement.",
        "Daily Care": "Maintains everyday skin protection and barrier support.",
        "Sensitive Skin": "Gentle option for irritated or reactive skin.",
        "Pigmentation": "Helps with uneven tone and pigmentation care.",
        "Dark Spots": "Supports visible dark spot and dullness care.",
        "Dark Circles": "Targets tired-looking under-eye areas.",
        "Dry Skin": "Adds hydration and supports the skin barrier.",
        "Oily Skin": "Hydrates without a heavy or greasy finish.",
    }
    return benefits.get(condition, f"Recommended match for {name} based on GLAMBOT analysis.")


def product_swap(brand: str, condition: str) -> str:
    return f"Affordable {brand} option for {condition.lower()} care."


def build_report(acne: dict[str, Any], skin_tone: dict[str, Any], skin_type: dict[str, Any]) -> list[dict[str, Any]]:
    pigmentation_value = "Possible" if acne["level"] in {"Moderate", "Severe"} else "Low"
    tanning_value = "Possible" if skin_tone["value"] in {"Medium Brown", "Deep", "Brown", "Black"} else "Low"
    skin_tone_result: dict[str, Any] = {
        "label": "Skin Tone",
        "value": skin_tone["value"],
        "evidence": "CNN confidence" if skin_tone.get("method") == "cnn" else "Color-based estimate",
    }
    if skin_tone.get("method") == "cnn":
        skin_tone_result["percentage"] = skin_tone["score"]

    return [
        skin_tone_result,
        {
            "label": "Acne Type",
            "value": acne["type"],
            "percentage": acne["score"],
            "evidence": "CNN confidence",
        },
        {
            "label": "Acne Level",
            "value": acne["level"],
            "evidence": "Derived from acne class",
        },
        {
            "label": "Skin Type",
            "value": skin_type["value"],
            "evidence": "Rule-based estimate",
        },
        {
            "label": "Pigmentation",
            "value": pigmentation_value,
            "evidence": "Rule-based estimate",
        },
        {
            "label": "Dark Circles",
            "value": "Manual check advised",
            "evidence": "No trained CNN yet",
        },
        {
            "label": "Tanning",
            "value": tanning_value,
            "evidence": "Rule-based estimate",
        },
    ]

def build_routine(acne: dict[str, Any], skin_type: str) -> dict[str, list[str]]:
    morning = [
        "Gentle cleanser suited for acne-prone skin",
        "Niacinamide serum for oil balance and marks",
        "Lightweight moisturizer" if skin_type == "Oily" else "Barrier-support moisturizer",
        "Broad-spectrum SPF 50 sunscreen",
    ]
    night = [
        "Cleanse sunscreen and makeup thoroughly",
        "Salicylic acid treatment 2-3 nights per week",
        "Alpha arbutin or niacinamide for marks",
        "Moisturizer to protect skin barrier",
    ]
    if acne["level"] == "Severe":
        night.insert(1, "Avoid harsh scrubs; consider dermatologist guidance for cystic acne")

    remedies = [
        "Pure aloe vera gel for calming irritated acne areas",
        "Honey mask once weekly for gentle hydration",
        "Rose water or cucumber gel for soothing skin",
    ]
    if acne["level"] != "Mild":
        remedies.append("Avoid turmeric/lemon on active acne because they can irritate sensitive skin")

    return {"morning": morning, "night": night, "remedies": remedies}


@app.get("/")
def root() -> Any:
    return jsonify({
        "name": "GLAMBOT API",
        "status": "running",
        "health": "/api/health",
    })


@app.get("/api/health")
def health() -> Any:
    return jsonify({
        "status": "ok",
        "acneModel": ACNE_MODEL_PATH.exists(),
        "skinToneModel": skin_tone_model is not None,
        "products": len(PRODUCTS),
    })


@app.post("/api/analyze")
def analyze() -> Any:
    try:
        image = image_from_upload()
        acne = predict_acne(image)
        skin_tone = predict_skin_tone(image)
        skin_type = infer_skin_type(acne)
        products = select_products(acne, skin_type["value"])
        routine = build_routine(acne, skin_type["value"])
        report = build_report(acne, skin_tone, skin_type)

        return jsonify({
            "analysis": report,
            "acne": acne,
            "skinTone": skin_tone,
            "skinType": skin_type,
            "products": products,
            "routine": routine,
        })
    except Exception as exc:  # Keep API errors readable for project demos.
        return jsonify({"error": str(exc)}), 400


if __name__ == "__main__":
    app.run(
        debug=os.environ.get("FLASK_DEBUG") == "1",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
    )
