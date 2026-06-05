const customerName = document.querySelector("#customerName");
const customerContact = document.querySelector("#customerContact");
const welcomeText = document.querySelector("#welcomeText");
const dashboardNoticeText = document.querySelector("#dashboardNoticeText");
const logoutButton = document.querySelector("#logoutButton");
const menuToggle = document.querySelector(".menu-toggle");
const portalNav = document.querySelector(".portal-nav");

function getSession() {
  const localSession = localStorage.getItem("bumuCustomerSession");
  const browserSession = sessionStorage.getItem("bumuCustomerSession");
  return JSON.parse(localSession || browserSession || "null");
}

function getPaymentNotice() {
  return JSON.parse(localStorage.getItem("bumuPaymentNotice") || "null") || {
    totalPaid: "KES 84,000",
    balance: "KES 116,000",
    dailyAmount: "KES 300",
    finalPaymentDate: "31 Dec 2028",
    paymentDate: "28 May 2026",
    coveredDays: ["Sunday", "Monday", "Tuesday"],
    nextPaymentDay: "Wednesday"
  };
}

const session = getSession();

if (!session || session.role !== "customer") {
  window.location.href = "./login.html";
} else {
  customerName.textContent = session.name;
  customerContact.textContent = `${session.phone} | ${session.email}`;
  welcomeText.textContent = `Welcome back, ${session.name}.`;
  const notice = getPaymentNotice();
  const amountText = notice.lastAmount ? ` for <strong>${notice.lastAmount}</strong>` : "";
  dashboardNoticeText.innerHTML = `
    <span class="notice-green">You have paid <strong>${notice.totalPaid}</strong>.</span>
    <span class="notice-blue">Your remaining balance is <strong>${notice.balance}</strong>.</span>
    <span class="notice-white">Make sure you pay <strong>${notice.dailyAmount} every day</strong>.</span>
    <span class="notice-green">Expected final payment date: <strong>${notice.finalPaymentDate}</strong>.</span>
    <span class="notice-blue">Your latest payment was on <strong>${notice.paymentDate}</strong>${amountText} and covers <strong>${notice.coveredDays.join(", ")}</strong>.</span>
    <span class="notice-green">Your next payment should start on <strong>${notice.nextPaymentDay}</strong>.</span>
  `;
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("bumuCustomerSession");
  sessionStorage.removeItem("bumuCustomerSession");
  window.location.href = "./login.html";
});

menuToggle.addEventListener("click", () => {
  const isOpen = portalNav.classList.toggle("menu-open");
  portalNav.classList.toggle("menu-hidden", !isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
