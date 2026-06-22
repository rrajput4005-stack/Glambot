const API_BASE_URL = (window.GLAMBOT_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const API_URL = `${API_BASE_URL}/api/analyze`;

let analysis = [
  { label: "Skin Tone", value: "Upload image", score: 0 },
  { label: "Acne Type", value: "Waiting", score: 0 },
  { label: "Acne Level", value: "Waiting", score: 0 },
  { label: "Skin Type", value: "Waiting", score: 0 },
  { label: "Pigmentation", value: "Waiting", score: 0 },
  { label: "Dark Circles", value: "Waiting", score: 0 },
  { label: "Tanning", value: "Waiting", score: 0 }
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

function renderAnalysis() {
  reportGrid.innerHTML = analysis
    .map(
      (item) => `
        <article class="report-card">
          <span class="label">${item.label}</span>
          <div class="value">${item.value}</div>
          <div class="meter" aria-label="${item.label} score ${item.score} percent">
            <span style="width: ${Math.max(0, Math.min(100, item.score))}%"></span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderProducts(filter = activeFilter) {
  activeFilter = filter;
  const visible = filter === "all" ? products : products.filter((product) => product.type === filter);

  productGrid.innerHTML = visible
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-top">
            <span class="issue-chip">${product.issue}</span>
            <span class="rating-chip">${product.rating}</span>
          </div>
          <h3>${product.name}</h3>
          <p>${product.benefit}</p>
          <div class="price">${product.price}</div>
          <div class="swap">${product.swap}</div>
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

async function analyzeImage(blob) {
  const formData = new FormData();
  formData.append("image", blob, "glambot-face.jpg");
  setScannerState("Analyzing image with GLAMBOT CNN backend...", previewImage.classList.contains("active") ? "image" : "camera");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Analysis failed");
    }

    analysis = payload.analysis;
    products = payload.products;
    morningRoutine = payload.routine.morning;
    nightRoutine = payload.routine.night;
    remedies = payload.routine.remedies;
    renderAll();

    const confidence = Math.round((payload.acne.confidence || 0) * 100);
    setScannerState(`Detected ${payload.acne.type} acne pattern with ${confidence}% confidence.`, previewImage.classList.contains("active") ? "image" : "camera");
    document.querySelector("#analysis").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    setScannerState(`Backend not ready: ${error.message}. Start Flask and try again.`, previewImage.classList.contains("active") ? "image" : "camera");
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
  setScannerState("Image ready. Sending to CNN backend...", "image");
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

