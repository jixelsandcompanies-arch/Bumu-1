const profileWelcome = document.querySelector("#profileWelcome");
const profileAvatar = document.querySelector("#profileAvatar");
const profileName = document.querySelector("#profileName");
const profileFullName = document.querySelector("#profileFullName");
const profileEmail = document.querySelector("#profileEmail");
const profilePhone = document.querySelector("#profilePhone");
const profilePassword = document.querySelector("#profilePassword");
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
  profileWelcome.textContent = `${session.name}, view your customer profile information.`;
  profileName.textContent = session.name;
  profileFullName.textContent = session.name;
  profileEmail.textContent = session.email;
  profilePhone.textContent = session.phone;
  profilePassword.textContent = session.customerPassword || "Mustapha123494@";

  if (session.profilePhoto) {
    profileAvatar.innerHTML = `<img src="${session.profilePhoto}" alt="${session.name} profile">`;
  } else {
    profileAvatar.textContent = session.name.charAt(0);
  }
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
