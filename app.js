const analysis = [
  { label: "Skin Tone", value: "Medium Warm", score: 82 },
  { label: "Acne Level", value: "Mild", score: 36 },
  { label: "Pigmentation", value: "Moderate", score: 58 },
  { label: "Dark Circles", value: "Light", score: 31 },
  { label: "Skin Type", value: "Oily Combination", score: 74 },
  { label: "Tanning", value: "Low", score: 28 }
];

const products = [
  {
    name: "Minimalist 2% Salicylic Acid Face Wash",
    issue: "Acne",
    price: 299,
    rating: 4.5,
    type: "skincare",
    benefit: "Helps unclog pores, control excess oil, and reduce acne breakouts without a premium price.",
    swap: "Premium match: Paula's Choice BHA Cleanser"
  },
  {
    name: "Minimalist 10% Vitamin C Serum",
    issue: "Pigmentation",
    price: 499,
    rating: 4.4,
    type: "skincare",
    benefit: "Brightens uneven tone and supports daily antioxidant care for dull or pigmented skin.",
    swap: "Affordable alternative to The Ordinary Vitamin C"
  },
  {
    name: "Deconstruct Alpha Arbutin Serum",
    issue: "Dark Spots",
    price: 549,
    rating: 4.5,
    type: "skincare",
    benefit: "Targets dark spots and post-acne marks with a lightweight serum texture.",
    swap: "Budget swap for premium spot-correcting serums"
  },
  {
    name: "Re'equil Oil Free Moisturizer",
    issue: "Oily Skin",
    price: 395,
    rating: 4.6,
    type: "skincare",
    benefit: "Hydrates oily or combination skin without a heavy, greasy finish.",
    swap: "Affordable alternative to CeraVe PM Lotion"
  },
  {
    name: "Aqualogica Glow+ Dewy Sunscreen SPF 50",
    issue: "Tanning",
    price: 399,
    rating: 4.4,
    type: "skincare",
    benefit: "Protects against tanning and pigmentation triggers while keeping skin fresh.",
    swap: "Budget-friendly daily SPF option"
  },
  {
    name: "Maybelline Fit Me Matte Foundation",
    issue: "Makeup Match",
    price: 549,
    rating: 4.5,
    type: "makeup",
    benefit: "Offers accessible shade options and a natural matte finish for everyday wear.",
    swap: "Affordable alternative to Clinique foundation"
  }
];

const morningRoutine = [
  "Gentle salicylic acid face wash",
  "Vitamin C serum for pigmentation support",
  "Oil-free moisturizer",
  "Broad-spectrum SPF 50 sunscreen"
];

const nightRoutine = [
  "Cleanse makeup and sunscreen thoroughly",
  "Alpha arbutin or niacinamide treatment serum",
  "Lightweight moisturizer",
  "Caffeine eye cream for dark circles"
];

const remedies = [
  "Aloe vera gel for calming acne-prone areas",
  "Honey face mask once a week for soft hydration",
  "Turmeric and yogurt pack for dullness",
  "Cucumber gel or rose water for tanning comfort"
];

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

function renderAnalysis() {
  reportGrid.innerHTML = analysis
    .map(
      (item) => `
        <article class="report-card">
          <span class="label">${item.label}</span>
          <div class="value">${item.value}</div>
          <div class="meter" aria-label="${item.label} score ${item.score} percent">
            <span style="width: ${item.score}%"></span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderProducts(filter = "all") {
  const visible = filter === "all" ? products : products.filter((product) => product.type === filter);

  productGrid.innerHTML = visible
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-top">
            <span class="issue-chip">${product.issue}</span>
            <span class="rating-chip">${product.rating} rating</span>
          </div>
          <h3>${product.name}</h3>
          <p>${product.benefit}</p>
          <div class="price">Rs. ${product.price}</div>
          <div class="swap">${product.swap}</div>
        </article>
      `
    )
    .join("");
}

function renderList(target, items) {
  target.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function setScannerState(message, mode) {
  scannerStatus.textContent = message;
  scannerFrame.classList.toggle("has-media", Boolean(mode));
  previewImage.classList.toggle("active", mode === "image");
  cameraFeed.classList.toggle("active", mode === "camera");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    renderProducts(tab.dataset.filter);
  });
});

imageUpload.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;

  previewImage.src = URL.createObjectURL(file);
  setScannerState("Image ready. Simulated analysis complete.", "image");
  document.querySelector("#analysis").scrollIntoView({ behavior: "smooth" });
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

captureBtn.addEventListener("click", () => {
  if (!cameraStream) {
    setScannerState("Open camera first or upload an image.", "");
    return;
  }

  setScannerState("Face captured. Simulated analysis complete.", "camera");
  document.querySelector("#analysis").scrollIntoView({ behavior: "smooth" });
});

renderAnalysis();
renderProducts();
renderList(morningList, morningRoutine);
renderList(nightList, nightRoutine);
renderList(remedyList, remedies);
