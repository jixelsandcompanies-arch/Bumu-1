const settingsWelcome = document.querySelector("#settingsWelcome");
const passwordForm = document.querySelector("#passwordForm");
const currentPassword = document.querySelector("#currentPassword");
const newPassword = document.querySelector("#newPassword");
const confirmPassword = document.querySelector("#confirmPassword");
const passwordMessage = document.querySelector("#passwordMessage");
const logoutButton = document.querySelector("#logoutButton");
const menuToggle = document.querySelector(".menu-toggle");
const portalNav = document.querySelector(".portal-nav");

function getSession() {
  const localSession = localStorage.getItem("bumuCustomerSession");
  const browserSession = sessionStorage.getItem("bumuCustomerSession");
  return JSON.parse(localSession || browserSession || "null");
}

function saveSession(nextSession) {
  const storage = localStorage.getItem("bumuCustomerSession") ? localStorage : sessionStorage;
  storage.setItem("bumuCustomerSession", JSON.stringify(nextSession));
}

const session = getSession();

if (!session || session.role !== "customer") {
  window.location.href = "./login.html";
} else {
  settingsWelcome.textContent = `${session.name}, manage your password and account preferences.`;
}

passwordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  passwordMessage.textContent = "";
  passwordMessage.className = "form-message";

  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordMessage.textContent = "Fill in all password fields.";
    passwordMessage.classList.add("error-message");
    return;
  }

  if (newPassword.value.length < 8) {
    passwordMessage.textContent = "New password must be at least 8 characters.";
    passwordMessage.classList.add("error-message");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordMessage.textContent = "New password and confirmation do not match.";
    passwordMessage.classList.add("error-message");
    return;
  }

  saveSession({ ...session, customerPassword: newPassword.value });
  passwordForm.reset();
  passwordMessage.textContent = "Password change saved for backend connection.";
  passwordMessage.classList.add("success-message");
});

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
