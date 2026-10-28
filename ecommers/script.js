
const API_URLS = [
  "https://dummyjson.com/products/category/laptops",
  "https://dummyjson.com/products/category/smartphones",
  "https://dummyjson.com/products/category/tablets"
];

// Elementos del HTML
const productGrid = document.getElementById("product-grid");
const resultsStatus = document.getElementById("results-status");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const retryButton = document.getElementById("retry-button");

const cartCount = document.getElementById("cart-count");
const cartDrawer = document.getElementById("cart-drawer");
const cartItems = document.getElementById("cart-items");
const cartSubtotal = document.getElementById("cart-subtotal");
const backdrop = document.getElementById("backdrop");
const toast = document.getElementById("toast");

// Variables de estado
let products = [];
let cart = [];
let searchTerm = "";
let activeFilter = "all";
let toastTimer;

// Formato de precio en dólares
function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(price);
}

// Evita insertar texto de la API como HTML sin escapar
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

// 1. OBTENER PRODUCTOS DE LA API
async function loadProducts() {
  resultsStatus.textContent = "Cargando productos...";
  retryButton.classList.add("hidden");
  productGrid.innerHTML = "";

  try {
    const responses = await Promise.all(API_URLS.map(url => fetch(url)));

    if (responses.some(response => !response.ok)) {
      throw new Error("No se pudieron obtener los productos");
    }

    const categories = await Promise.all(
      responses.map(response => response.json())
    );
    products = categories.flatMap(category => category.products || []);

    renderProducts();
  } catch (error) {
    console.error("Error al cargar productos:", error);

    resultsStatus.textContent =
      "No se pudieron cargar los productos. Revisá tu conexión e intentá nuevamente.";

    retryButton.classList.remove("hidden");
  }
}

// 2. BUSCAR, FILTRAR Y ORDENAR
function getVisibleProducts() {
  let visibleProducts = products.filter(product => {
    const searchableText = [
      product.title,
      product.brand,
      product.description
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    let matchesFilter = true;

    if (activeFilter === "budget") {
      matchesFilter = product.price < 800;
    } else if (activeFilter === "premium") {
      matchesFilter = product.price >= 800;
    }

    return matchesSearch && matchesFilter;
  });

  const sortValue = sortSelect.value;

  if (sortValue === "price-asc") {
    visibleProducts.sort((a, b) => a.price - b.price);
  }

  if (sortValue === "price-desc") {
    visibleProducts.sort((a, b) => b.price - a.price);
  }

  if (sortValue === "rating") {
    visibleProducts.sort((a, b) => b.rating - a.rating);
  }

  return visibleProducts;
}

// 3. MOSTRAR PRODUCTOS EN LA PÁGINA
function renderProducts() {
  const visibleProducts = getVisibleProducts();

  resultsStatus.textContent =
    `${visibleProducts.length} producto(s) encontrado(s)`;

  if (visibleProducts.length === 0) {
    productGrid.style.display = "block";

    productGrid.innerHTML = `
      <p>No encontramos productos con esos criterios.</p>
      <p>Probá con otra búsqueda o filtro.</p>
    `;

    return;
  }

  productGrid.style.display = "grid";

  productGrid.innerHTML = visibleProducts.map(product => {
    const image = product.thumbnail || product.images?.[0] || "";

    return `
      <article class="product-card">

        <div class="product-image-wrap">
          <img
            class="product-image"
            src="${escapeHTML(image)}"
            alt="${escapeHTML(product.title)}"
            loading="lazy"
          >
        </div>

        <div class="product-category">
          ${escapeHTML(product.brand || product.category || "Laptop")}
        </div>

        <h2 class="product-title">
          ${escapeHTML(product.title)}
        </h2>

        <div class="rating">
          <span class="stars">★★★★★</span>
          ${Number(product.rating || 0).toFixed(1)}
        </div>

        <div class="product-price">
          ${formatPrice(product.price)}
          <small>USD</small>
        </div>

        <p class="product-description">
          ${escapeHTML(product.description)}
        </p>

        <button
          class="add-button"
          type="button"
          data-add="${product.id}"
        >
          + Agregar al carrito
        </button>

      </article>
    `;
  }).join("");
}

// 4. MENSAJE TEMPORAL
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// 5. AGREGAR PRODUCTOS AL CARRITO
function addToCart(productId) {
  const product = products.find(
    item => item.id === Number(productId)
  );

  if (!product) return;

  const existingProduct = cart.find(
    item => item.id === product.id
  );

  if (existingProduct) {
    existingProduct.quantity++;
  } else {
    cart.push({
      ...product,
      quantity: 1
    });
  }

  renderCart();
  showToast("Producto agregado al carrito");
}

// 6. CAMBIAR CANTIDADES
function updateQuantity(productId, change) {
  const product = cart.find(
    item => item.id === Number(productId)
  );

  if (!product) return;

  product.quantity += change;

  if (product.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  renderCart();
}

// 7. ELIMINAR PRODUCTOS
function removeFromCart(productId) {
  cart = cart.filter(
    item => item.id !== Number(productId)
  );

  renderCart();
}

// 8. ACTUALIZAR EL CARRITO Y EL SUBTOTAL
function renderCart() {
  const totalQuantity = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  cartCount.textContent = totalQuantity;
  cartSubtotal.textContent = formatPrice(subtotal);

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <p>Tu carrito está vacío.</p>
    `;

    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <article class="cart-item">

      <img
        src="${escapeHTML(item.thumbnail || "")}"
        alt="${escapeHTML(item.title)}"
      >

      <div>
        <h3>${escapeHTML(item.title)}</h3>

        <p>${formatPrice(item.price)}</p>

        <div class="quantity-controls">
          <button
            type="button"
            data-quantity="${item.id}"
            data-change="-1"
            aria-label="Quitar una unidad"
          >−</button>

          <span>${item.quantity}</span>

          <button
            type="button"
            data-quantity="${item.id}"
            data-change="1"
            aria-label="Agregar una unidad"
          >+</button>
        </div>
      </div>

      <button
        class="remove-item"
        type="button"
        data-remove="${item.id}"
        aria-label="Eliminar producto"
      >×</button>

    </article>
  `).join("");
}

// 9. ABRIR Y CERRAR EL CARRITO
function openCart() {
  cartDrawer.classList.add("open");
  backdrop.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  cartDrawer.classList.remove("open");
  backdrop.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// 10. EVENTO DE BÚSQUEDA
searchForm.addEventListener("submit", event => {
  event.preventDefault();

  searchTerm = searchInput.value.trim().toLowerCase();

  renderProducts();

  document.getElementById("products").scrollIntoView({
    behavior: "smooth"
  });
});

// Actualizar resultados mientras se escribe
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();

  if (products.length > 0) {
    renderProducts();
  }
});

// 11. ORDENAR PRODUCTOS
sortSelect.addEventListener("change", renderProducts);

// 12. FILTRAR POR PRECIO
document.querySelectorAll(".chip").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(chip => {
      chip.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    renderProducts();
  });
});

// 13. AGREGAR AL CARRITO DESDE LAS TARJETAS
productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");

  if (button) {
    addToCart(button.dataset.add);
  }
});

// 14. BOTONES DEL CARRITO
cartItems.addEventListener("click", event => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");

  if (quantityButton) {
    updateQuantity(
      quantityButton.dataset.quantity,
      Number(quantityButton.dataset.change)
    );
  }

  if (removeButton) {
    removeFromCart(removeButton.dataset.remove);
  }
});

// 15. CONTROLES PARA ABRIR Y CERRAR
document.getElementById("open-cart")
  .addEventListener("click", openCart);

document.getElementById("close-cart")
  .addEventListener("click", closeCart);

backdrop.addEventListener("click", closeCart);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
  }
});

// 16. SIMULAR LA COMPRA
document.getElementById("checkout-button")
  .addEventListener("click", () => {
    if (cart.length === 0) {
      showToast("Tu carrito está vacío");
    } else {
      showToast("¡Compra de demostración! No se procesan pagos.");
    }
  });

// 17. VOLVER A CARGAR LA API
retryButton.addEventListener("click", loadProducts);

// INICIAR LA PÁGINA
loadProducts();
