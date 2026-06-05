const notificationsWelcome = document.querySelector("#notificationsWelcome");
const notificationTimeline = document.querySelector("#notificationTimeline");
const logoutButton = document.querySelector("#logoutButton");
const menuToggle = document.querySelector(".menu-toggle");
const portalNav = document.querySelector(".portal-nav");

function getSession() {
  const localSession = localStorage.getItem("bumuCustomerSession");
  const browserSession = sessionStorage.getItem("bumuCustomerSession");
  return JSON.parse(localSession || browserSession || "null");
}

function getNotifications() {
  return JSON.parse(localStorage.getItem("bumuNotifications") || "null") || [
    {
      id: "not-001",
      title: "Payment Reminder",
      message: "Your remaining balance is KES 116,000. You are supposed to pay KES 300 every day.",
      date: "28 May 2026",
      unread: true
    },
    {
      id: "not-002",
      title: "Payment Received",
      message: "You paid KES 2,000. Your payment covered Sunday, Monday, and Tuesday.",
      date: "28 May 2026",
      unread: true
    }
  ];
}

const session = getSession();

if (!session || session.role !== "customer") {
  window.location.href = "./login.html";
} else {
  notificationsWelcome.textContent = `${session.name}, view your payment reminders and account alerts.`;
  notificationTimeline.innerHTML = getNotifications().map((notification) => `
    <article class="${notification.unread ? "notification-item unread" : "notification-item"}">
      <div>
        <span class="metric-label">${notification.date}</span>
        <h3>${notification.title}</h3>
        <p>${notification.message}</p>
      </div>
      ${notification.unread ? '<span class="status-badge">New</span>' : ""}
    </article>
  `).join("");
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
