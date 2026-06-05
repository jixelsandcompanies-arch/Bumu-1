const loginForm = document.querySelector("#loginForm");
const identifierInput = document.querySelector("#identifier");
const passwordInput = document.querySelector("#password");
const rememberMeInput = document.querySelector("#rememberMe");
const togglePasswordButton = document.querySelector("#togglePassword");
const identifierError = document.querySelector("#identifierError");
const passwordError = document.querySelector("#passwordError");
const formMessage = document.querySelector("#formMessage");

const demoCustomer = {
  id: "cus-demo-001",
  name: "Mustapha Foray",
  phone: "0702224731",
  email: "mustaphaforay444@gamil.com",
  password: "Mustapha123494",
  alternatePassword: "Mustapha123494@",
  role: "customer"
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^(?:\+254|254|0)?7\d{8}$/.test(value);
}

function normalizePhone(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith("+254")) {
    return `0${trimmed.slice(4)}`;
  }

  if (trimmed.startsWith("254")) {
    return `0${trimmed.slice(3)}`;
  }

  return trimmed;
}

function clearErrors() {
  identifierError.textContent = "";
  passwordError.textContent = "";
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function validateLogin(identifier, password) {
  let isValid = true;

  if (!identifier) {
    identifierError.textContent = "Enter your phone number or email.";
    isValid = false;
  } else if (!isValidEmail(identifier) && !isValidPhone(identifier)) {
    identifierError.textContent = "Use a valid email or Kenyan phone number.";
    isValid = false;
  }

  if (!password) {
    passwordError.textContent = "Enter your password.";
    isValid = false;
  } else if (password.length < 6) {
    passwordError.textContent = "Password must be at least 6 characters.";
    isValid = false;
  }

  return isValid;
}

function authenticateCustomer(identifier, password) {
  const normalizedIdentifier = normalizePhone(identifier).toLowerCase();
  const matchesPhone = normalizedIdentifier === demoCustomer.phone;
  const matchesEmail = normalizedIdentifier === demoCustomer.email.toLowerCase();
  const matchesPassword = password === demoCustomer.password || password === demoCustomer.alternatePassword;

  if ((matchesPhone || matchesEmail) && matchesPassword) {
    return {
      id: demoCustomer.id,
      name: demoCustomer.name,
      phone: demoCustomer.phone,
      email: demoCustomer.email,
      role: demoCustomer.role,
      loggedInAt: new Date().toISOString()
    };
  }

  return null;
}

togglePasswordButton.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordButton.textContent = isHidden ? "Hide" : "Show";
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();

  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  if (!validateLogin(identifier, password)) {
    return;
  }

  const customerSession = authenticateCustomer(identifier, password);

  if (!customerSession) {
    formMessage.textContent = "Login failed. Check your details and try again.";
    formMessage.classList.add("error-message");
    return;
  }

  const storage = rememberMeInput.checked ? localStorage : sessionStorage;
  storage.setItem("bumuCustomerSession", JSON.stringify(customerSession));
  formMessage.textContent = "Login successful. Opening your dashboard...";
  formMessage.classList.add("success-message");

  window.setTimeout(() => {
    window.location.href = "./dashboard.html";
  }, 600);
});
