from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.layers import Conv2D, Dense, Dropout, Flatten, MaxPooling2D, RandomFlip, RandomRotation, RandomZoom, Rescaling

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
ZIP_PATH = PROJECT_DIR / "skin tone.v1i.folder.zip"
EXTRACT_DIR = BASE_DIR / "data" / "skin_tone"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "skin_tone_cnn_model.keras"
CLASSES_PATH = MODEL_DIR / "skin_tone_classes.json"

IMAGE_SIZE = 128
BATCH_SIZE = 32
EPOCHS = 10


def extract_dataset() -> None:
    if not ZIP_PATH.exists():
        raise FileNotFoundError(f"Could not find {ZIP_PATH}")

    if (EXTRACT_DIR / "train").exists() and (EXTRACT_DIR / "valid").exists() and (EXTRACT_DIR / "test").exists():
        print("Skin tone dataset already extracted.")
        return

    if EXTRACT_DIR.exists():
        shutil.rmtree(EXTRACT_DIR)
    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Extracting {ZIP_PATH.name}...")
    with zipfile.ZipFile(ZIP_PATH, "r") as zip_file:
        zip_file.extractall(EXTRACT_DIR)


def load_dataset(split: str, shuffle: bool) -> tf.data.Dataset:
    return tf.keras.preprocessing.image_dataset_from_directory(
        EXTRACT_DIR / split,
        label_mode="int",
        image_size=(IMAGE_SIZE, IMAGE_SIZE),
        batch_size=BATCH_SIZE,
        shuffle=shuffle,
    )


def build_model(num_classes: int) -> tf.keras.Model:
    model = Sequential([
        Rescaling(1.0 / 255, input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3)),
        RandomFlip("horizontal"),
        RandomRotation(0.08),
        RandomZoom(0.08),
        Conv2D(32, 3, activation="relu"),
        MaxPooling2D(),
        Conv2D(64, 3, activation="relu"),
        MaxPooling2D(),
        Conv2D(128, 3, activation="relu"),
        MaxPooling2D(),
        Flatten(),
        Dense(128, activation="relu"),
        Dropout(0.35),
        Dense(num_classes, activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def main() -> None:
    extract_dataset()
    train_ds = load_dataset("train", shuffle=True)
    valid_ds = load_dataset("valid", shuffle=False)
    test_ds = load_dataset("test", shuffle=False)

    class_names = train_ds.class_names
    print("Classes:", class_names)

    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
    valid_ds = valid_ds.prefetch(tf.data.AUTOTUNE)
    test_ds = test_ds.prefetch(tf.data.AUTOTUNE)

    model = build_model(len(class_names))
    model.summary()

    history = model.fit(
        train_ds,
        validation_data=valid_ds,
        epochs=EPOCHS,
        callbacks=[
            EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6),
        ],
        verbose=2,
    )

    loss, accuracy = model.evaluate(test_ds, verbose=2)
    print(f"Skin tone test accuracy: {accuracy:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save(MODEL_PATH)
    with CLASSES_PATH.open("w", encoding="utf-8") as file:
        json.dump(class_names, file)

    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved classes: {CLASSES_PATH}")


if __name__ == "__main__":
    main()
