const riderWelcome = document.querySelector("#riderWelcome");
const riderOwner = document.querySelector("#riderOwner");
const logoutButton = document.querySelector("#logoutButton");
const menuToggle = document.querySelector(".menu-toggle");
const portalNav = document.querySelector(".portal-nav");

function getSession() {
  const localSession = localStorage.getItem("bumuCustomerSession");
  const browserSession = sessionStorage.getItem("bumuCustomerSession");
  return JSON.parse(localSession || browserSession || "null");
}

const session = getSession();

if (!session || session.role !== "customer") {
  window.location.href = "./login.html";
} else {
  riderWelcome.textContent = `${session.name}, view your motorcycle account and ownership progress.`;
  riderOwner.textContent = `Active repayment account linked to ${session.name}.`;
}

logoutButton?.addEventListener("click", () => {
  localStorage.removeItem("bumuCustomerSession");
  sessionStorage.removeItem("bumuCustomerSession");
  window.location.href = "./login.html";
});

menuToggle.addEventListener("click", () => {
  const isOpen = portalNav.classList.toggle("menu-open");
  portalNav.classList.toggle("menu-hidden", !isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
