const paymentWelcome = document.querySelector("#paymentWelcome");
const paymentForm = document.querySelector("#paymentForm");
const paymentAmount = document.querySelector("#paymentAmount");
const paymentAmountError = document.querySelector("#paymentAmountError");
const paymentMessage = document.querySelector("#paymentMessage");
const paymentPhone = document.querySelector("#paymentPhone");
const confirmAmount = document.querySelector("#confirmAmount");
const paymentStatusTitle = document.querySelector("#paymentStatusTitle");
const paymentStatusText = document.querySelector("#paymentStatusText");
const sendPaymentButton = document.querySelector("#sendPaymentButton");
const logoutButton = document.querySelector("#logoutButton");
const menuToggle = document.querySelector(".menu-toggle");
const portalNav = document.querySelector(".portal-nav");
const suggestedButtons = document.querySelectorAll("[data-amount]");
const dailyInstallmentAmount = 300;
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function getNotifications() {
  return JSON.parse(localStorage.getItem("bumuNotifications") || "null") || [
    {
      id: "not-001",
      title: "Payment Reminder",
      message: "Your remaining balance is KES 116,000. You are supposed to pay KES 300 every day.",
      date: "28 May 2026",
      unread: true
    }
  ];
}

function buildPaymentNotice(amount) {
  const currentNotice = getPaymentNotice();
  const totalPaid = Number(String(currentNotice.totalPaid).replace(/[^\d]/g, "")) + amount;
  const balance = Math.max(0, Number(String(currentNotice.balance).replace(/[^\d]/g, "")) - amount);
  const startIndex = Math.max(0, weekDays.indexOf(currentNotice.nextPaymentDay));
  const coveredDayCount = Math.max(1, Math.floor(amount / dailyInstallmentAmount));
  const coveredDays = Array.from({ length: coveredDayCount }, (_, index) => weekDays[(startIndex + index) % weekDays.length]);
  const nextPaymentDay = weekDays[(startIndex + coveredDayCount) % weekDays.length];
  const paymentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return {
    ...currentNotice,
    totalPaid: `KES ${totalPaid.toLocaleString()}`,
    balance: `KES ${balance.toLocaleString()}`,
    lastAmount: `KES ${amount.toLocaleString()}`,
    paymentDate,
    coveredDays,
    nextPaymentDay
  };
}

function buildPaymentNotification(notice) {
  return {
    id: `not-${Date.now()}`,
    title: "Payment Received",
    message: `You have paid ${notice.lastAmount}. Your remaining balance is ${notice.balance}. Keep paying ${notice.dailyAmount} every day. This payment covers ${notice.coveredDays.join(", ")}. Your next payment should start on ${notice.nextPaymentDay}.`,
    date: notice.paymentDate,
    unread: true
  };
}

const session = getSession();

if (!session || session.role !== "customer") {
  window.location.href = "./login.html";
} else {
  paymentWelcome.textContent = `${session.name}, pay your motorcycle installment using M-Pesa STK Push.`;
  paymentPhone.textContent = session.phone;
}

suggestedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    paymentAmount.value = button.dataset.amount;
    confirmAmount.textContent = `KES ${Number(button.dataset.amount).toLocaleString()}`;
    paymentAmountError.textContent = "";
  });
});

paymentAmount.addEventListener("input", () => {
  const amount = Number(paymentAmount.value);
  confirmAmount.textContent = amount ? `KES ${amount.toLocaleString()}` : "KES 0";
});

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number(paymentAmount.value);
  paymentAmountError.textContent = "";
  paymentMessage.textContent = "";
  paymentMessage.className = "form-message";

  if (!amount || amount < 100) {
    paymentAmountError.textContent = "Enter an amount of at least KES 100.";
    return;
  }

  sendPaymentButton.disabled = true;
  sendPaymentButton.textContent = "Sending STK Push...";
  paymentStatusTitle.textContent = "Processing";
  paymentStatusText.textContent = "Waiting for M-Pesa confirmation on your phone.";
  paymentMessage.textContent = "STK Push sent. Check your phone and enter your M-Pesa PIN.";

  window.setTimeout(() => {
    const nextNotice = buildPaymentNotice(amount);
    const nextNotifications = [buildPaymentNotification(nextNotice), ...getNotifications()];
    localStorage.setItem("bumuPaymentNotice", JSON.stringify(nextNotice));
    localStorage.setItem("bumuNotifications", JSON.stringify(nextNotifications));
    sendPaymentButton.disabled = false;
    sendPaymentButton.textContent = "Send STK Push";
    paymentStatusTitle.textContent = "Payment Successful";
    paymentStatusText.textContent = `KES ${amount.toLocaleString()} received. Receipt will be generated.`;
    paymentMessage.textContent = "Payment successful. Your balance will update after backend connection.";
    paymentMessage.classList.add("success-message");
  }, 1800);
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
