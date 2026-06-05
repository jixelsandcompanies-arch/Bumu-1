const historyWelcome = document.querySelector("#historyWelcome");
const logoutButton = document.querySelector("#logoutButton");
const menuToggle = document.querySelector(".menu-toggle");
const portalNav = document.querySelector(".portal-nav");
const receiptButtons = document.querySelectorAll(".receipt-button");
const completePaymentStatus = document.querySelector("#completePaymentStatus");
const completePaymentText = document.querySelector("#completePaymentText");

function getSession() {
  const localSession = localStorage.getItem("bumuCustomerSession");
  const browserSession = sessionStorage.getItem("bumuCustomerSession");
  return JSON.parse(localSession || browserSession || "null");
}

function getPaymentNotice() {
  return JSON.parse(localStorage.getItem("bumuPaymentNotice") || "null") || {
    totalPaid: "KES 84,000",
    balance: "KES 116,000",
    paymentDate: "28 May 2026"
  };
}

function parseKes(value) {
  return Number(String(value).replace(/[^\d]/g, ""));
}

function downloadTextFile(filename, lines) {
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const session = getSession();
const paymentNotice = getPaymentNotice();

if (!session || session.role !== "customer") {
  window.location.href = "./login.html";
} else {
  historyWelcome.textContent = `${session.name}, review your payment dates, receipts, and status.`;

  if (parseKes(paymentNotice.balance) === 0) {
    const completeStatus = document.createElement("strong");
    completeStatus.className = "status-success";
    completeStatus.textContent = "Complete";

    const completeReceiptButton = document.createElement("button");
    completeReceiptButton.className = "complete-receipt-button";
    completeReceiptButton.type = "button";
    completeReceiptButton.textContent = "Download Complete Receipt";
    completeReceiptButton.addEventListener("click", () => {
      downloadTextFile(`complete-payment-receipt-${session.id}.txt`, [
        "Bumu PayGo Complete Payment Receipt",
        `Customer: ${session.name}`,
        `Phone Number: ${session.phone}`,
        "Rider Account: BPG-2026-001",
        "Motorcycle Model: Boxer 150",
        "Total Price: KES 200,000",
        `Total Paid: ${paymentNotice.totalPaid}`,
        `Remaining Balance: ${paymentNotice.balance}`,
        `Final Payment Date: ${paymentNotice.paymentDate}`,
        "Payment Status: Complete",
        "Ownership Status: Paid in full"
      ]);
    });
    completePaymentStatus.append(completeStatus, completeReceiptButton);
    completePaymentText.textContent = "The account is fully paid. Download the complete payment receipt from the right side of this status row.";
  } else {
    const pendingStatus = document.createElement("strong");
    pendingStatus.className = "status-pending";
    pendingStatus.textContent = "Not Yet Complete";
    completePaymentStatus.appendChild(pendingStatus);
  }
}

receiptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const row = button.closest(".history-table-row");
    const cells = row.querySelectorAll("[role='cell']");
    const receipt = button.dataset.receipt;
    const receiptText = [
      "Bumu PayGo Payment Receipt",
      `Customer: ${session.name}`,
      `Date: ${cells[0].textContent}`,
      `Phone Number Used: ${cells[2].textContent}`,
      `Amount Paid: ${cells[3].textContent}`,
      `Remaining Balance: ${cells[4].textContent}`,
      `M-Pesa Receipt: ${receipt}`,
      "Status: Paid"
    ];
    downloadTextFile(`receipt-${receipt}.txt`, receiptText);
  });
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
