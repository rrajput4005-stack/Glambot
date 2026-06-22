const API_BASE_URL = (window.GLAMBOT_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const API_URL = `${API_BASE_URL}/api/analyze`;

let analysis = [
  { label: "Skin Tone", value: "Upload image", evidence: "Awaiting CNN analysis" },
  { label: "Acne Type", value: "Waiting", evidence: "Awaiting CNN analysis" },
  { label: "Acne Level", value: "Waiting", evidence: "Derived after analysis" },
  { label: "Skin Type", value: "Waiting", evidence: "Rule-based estimate" },
  { label: "Pigmentation", value: "Waiting", evidence: "Rule-based estimate" },
  { label: "Dark Circles", value: "Waiting", evidence: "Manual check advised" },
  { label: "Tanning", value: "Waiting", evidence: "Rule-based estimate" }
];

let products = [
  {
    name: "Minimalist 2% Salicylic Acid Face Wash",
    issue: "Acne",
    price: "Budget friendly",
    rating: "Trusted",
    type: "skincare",
    benefit: "Upload a face image to get CNN-powered acne recommendations from GLAMBOT.",
    swap: "Backend recommendations will appear here."
  }
];

let morningRoutine = ["Upload an image to generate a personalized morning routine"];
let nightRoutine = ["Upload an image to generate a personalized night routine"];
let remedies = ["Upload an image to generate safe home remedy suggestions"];

const reportGrid = document.querySelector("#reportGrid");
const productGrid = document.querySelector("#productGrid");
const morningList = document.querySelector("#morningRoutine");
const nightList = document.querySelector("#nightRoutine");
const remedyList = document.querySelector("#remedyList");
const tabs = document.querySelectorAll(".tab");
const imageUpload = document.querySelector("#imageUpload");
const previewImage = document.querySelector("#previewImage");
const cameraFeed = document.querySelector("#cameraFeed");
const startCameraBtn = document.querySelector("#startCameraBtn");
const captureBtn = document.querySelector("#captureBtn");
const scannerStatus = document.querySelector("#scannerStatus");
const scannerFrame = document.querySelector(".scanner-frame");

let cameraStream = null;
let activeFilter = "all";
let scanStepTimer = null;

const scanMessages = [
  "Preparing your image...",
  "Detecting face landmarks...",
  "Running acne CNN model...",
  "Checking skin tone confidence...",
  "Matching budget-friendly products..."
];

function renderAnalysis() {
  reportGrid.innerHTML = analysis
    .map((item) => {
      const hasPercentage = Number.isFinite(item.percentage);
      const percentage = hasPercentage ? Math.max(0, Math.min(100, item.percentage)) : null;
      return `
        <article class="report-card ${hasPercentage ? "cnn-result" : "estimated-result"}">
          <span class="label">${item.label}</span>
          <div class="value">${item.value}</div>
          ${hasPercentage ? `
            <div class="confidence-row">
              <strong>${percentage}%</strong>
              <span>${item.evidence}</span>
            </div>
            <div class="meter" aria-label="${item.label} CNN confidence ${percentage} percent">
              <span style="width: ${percentage}%"></span>
            </div>
          ` : `<div class="estimate-label">${item.evidence}</div>`}
        </article>
      `;
    })
    .join("");
}

function productImageFor(product) {
  const text = `${product.name} ${product.issue}`.toLowerCase();
  if (text.includes("face wash") || text.includes("cleanser")) return "assets/products/cleanser.png";
  if (text.includes("moistur") || text.includes("cream")) return "assets/products/moisturizer.png";
  return "assets/products/serum.png";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function ratingStars(rating) {
  const score = Number.parseFloat(String(rating).replace(/[^0-9.]/g, ""));
  const filled = Number.isFinite(score) ? Math.max(1, Math.min(5, Math.round(score))) : 5;
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function productSearchUrl(product) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${product.name} skincare product`)}`;
}

function renderProducts(filter = activeFilter) {
  activeFilter = filter;
  const visible = filter === "all" ? products : products.filter((product) => product.type === filter);

  productGrid.innerHTML = visible
    .map(
      (product) => `
        <article class="product-card">
          <img class="product-image" src="${productImageFor(product)}" alt="${escapeHtml(product.issue)} skincare product" loading="lazy" />
          <div class="product-content">
            <div class="product-rating" aria-label="${escapeHtml(product.rating)} rating">
              <span class="stars" aria-hidden="true">${ratingStars(product.rating)}</span>
              <span>${escapeHtml(product.rating)}</span>
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <span class="for-chip">For ${escapeHtml(product.issue)}</span>
            <div class="price">${escapeHtml(product.price)}</div>
            <div class="why-block">
              <strong>Why Recommended</strong>
              <p>${escapeHtml(product.benefit)}</p>
            </div>
            <div class="swap">${escapeHtml(product.swap)}</div>
            <a class="view-product-btn" href="${productSearchUrl(product)}" target="_blank" rel="noreferrer">View Product</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderList(target, items) {
  target.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function renderAll() {
  renderAnalysis();
  renderProducts(activeFilter);
  renderList(morningList, morningRoutine);
  renderList(nightList, nightRoutine);
  renderList(remedyList, remedies);
}

function setScannerState(message, mode) {
  scannerStatus.textContent = message;
  scannerFrame.classList.toggle("has-media", Boolean(mode));
  previewImage.classList.toggle("active", mode === "image");
  cameraFeed.classList.toggle("active", mode === "camera");
}

function startScanSequence(mode) {
  window.clearInterval(scanStepTimer);
  scannerFrame.classList.add("is-scanning");
  let index = 0;
  setScannerState(scanMessages[index], mode);
  scanStepTimer = window.setInterval(() => {
    index = Math.min(index + 1, scanMessages.length - 1);
    setScannerState(scanMessages[index], mode);
  }, 900);
}

function stopScanSequence() {
  window.clearInterval(scanStepTimer);
  scannerFrame.classList.remove("is-scanning");
  scanStepTimer = null;
}

async function analyzeImage(blob) {
  const formData = new FormData();
  formData.append("image", blob, "glambot-face.jpg");
  const mode = previewImage.classList.contains("active") ? "image" : "camera";
  startScanSequence(mode);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Analysis failed");
    }

    stopScanSequence();
    analysis = payload.analysis;
    products = payload.products;
    morningRoutine = payload.routine.morning;
    nightRoutine = payload.routine.night;
    remedies = payload.routine.remedies;
    renderAll();

    const confidence = Math.round((payload.acne.confidence || 0) * 100);
    setScannerState(`Detected ${payload.acne.type} acne pattern with ${confidence}% confidence.`, mode);
    document.querySelector("#analysis").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    stopScanSequence();
    setScannerState(`Backend not ready: ${error.message}. Start Flask and try again.`, mode);
  }
}

function captureFrameAsBlob() {
  const canvas = document.createElement("canvas");
  canvas.width = cameraFeed.videoWidth || 640;
  canvas.height = cameraFeed.videoHeight || 480;
  const context = canvas.getContext("2d");
  context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    renderProducts(tab.dataset.filter);
  });
});

imageUpload.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  previewImage.src = URL.createObjectURL(file);
  setScannerState("Image selected. Starting AI scan...", "image");
  await analyzeImage(file);
});

startCameraBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    setScannerState("Camera is not supported in this browser. Upload an image instead.", "");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    cameraFeed.srcObject = cameraStream;
    await cameraFeed.play();
    setScannerState("Camera active. Align face inside the scanner.", "camera");
  } catch (error) {
    setScannerState("Camera permission was blocked. Upload an image to continue.", "");
  }
});

captureBtn.addEventListener("click", async () => {
  if (!cameraStream) {
    setScannerState("Open camera first or upload an image.", "");
    return;
  }

  const blob = await captureFrameAsBlob();
  if (!blob) {
    setScannerState("Could not capture camera frame. Try again.", "camera");
    return;
  }
  await analyzeImage(blob);
});

renderAll();



