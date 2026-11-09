
document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    const page = document.body.dataset.page;

    const message = document.getElementById("message");

    // Show messages
    function showMessage(text, success = false) {
        if (!message) return;

        message.textContent = text;
        message.style.color = success ? "green" : "red";
    }

    // Registration
    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const student = {
                name: document.getElementById("name").value.trim(),
                email: document.getElementById("email").value.trim(),
                department: document.getElementById("department").value,
                year: document.getElementById("year").value,
                password: document.getElementById("password").value
            };

            try {
                const response = await fetch("/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(student)
                });

                const data = await response.json();

                if (!response.ok) {
                    showMessage(data.error || "Registration failed.");
                    return;
                }

                showMessage("Registration successful! Redirecting to login...", true);
                registerForm.reset();

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1200);

            } catch (error) {
                showMessage("Server connection failed.");
            }
        });
    }

    // Login
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const credentials = {
                email: document.getElementById("email").value.trim(),
                password: document.getElementById("password").value
            };

            try {
                const response = await fetch("/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(credentials)
                });

                const data = await response.json();

                if (!response.ok) {
                    showMessage(data.error || "Login failed.");
                    return;
                }

                localStorage.setItem("token", data.token);
                localStorage.setItem("name", data.name);

                window.location.href = "events.html";

            } catch (error) {
                showMessage("Server connection failed.");
            }
        });
    }

    // All remaining pages require login
    if (page === "events" || page === "my-events") {
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        checkLogin();
    }

    // Verify login and load page
    async function checkLogin() {
        try {
            const response = await fetch("/api/me", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                localStorage.removeItem("token");
                localStorage.removeItem("name");
                window.location.href = "login.html";
                return;
            }

            const student = await response.json();

            const welcome = document.getElementById("welcome");

            if (welcome) {
                welcome.textContent = "Welcome, " + student.name + "!";
            }

            if (page === "events") {
                loadEvents();
            }

            if (page === "my-events") {
                loadMyEvents();
            }

        } catch (error) {
            showMessage("Could not connect to the server.");
        }
    }

    // Load all events
    async function loadEvents() {
        const container = document.getElementById("eventsContainer");

        showMessage("Loading events...");

        try {
            const response = await fetch("/api/events", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const events = await response.json();

            if (!response.ok) {
                showMessage(events.error || "Could not load events.");
                return;
            }

            container.innerHTML = "";

            if (events.length === 0) {
                showMessage("No events available right now.");
                return;
            }

            showMessage("");

            events.forEach(event => {
                const card = document.createElement("div");
                card.className = "event-card";

                const category = document.createElement("span");
                category.className = "category";
                category.textContent = event.category;

                const title = document.createElement("h3");
                title.textContent = event.title;

                const description = document.createElement("p");
                description.textContent = event.description;

                const date = document.createElement("p");
                date.textContent = "📅 " + event.date;

                const venue = document.createElement("p");
                venue.textContent = "📍 " + event.venue;

                const button = document.createElement("button");
                button.textContent = "Join Event";

                button.addEventListener("click", () => {
                    joinEvent(event._id, button);
                });

                card.append(
                    category,
                    title,
                    description,
                    date,
                    venue,
                    button
                );

                container.appendChild(card);
            });

        } catch (error) {
            showMessage("Could not load events.");
        }
    }

    // Join an event
    async function joinEvent(eventId, button) {
        button.disabled = true;
        button.textContent = "Joining...";

        try {
            const response = await fetch(`/api/events/${eventId}/join`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                button.textContent = "Joined ✓";
                showMessage(data.message, true);
            } else {
                button.textContent = "Join Event";
                showMessage(data.error || "Could not join event.");
                button.disabled = false;
            }

        } catch (error) {
            button.textContent = "Join Event";
            button.disabled = false;
            showMessage("Server connection failed.");
        }
    }

    // Load student's joined events
    async function loadMyEvents() {
        const container = document.getElementById("myEventsContainer");

        showMessage("Loading your events...");

        try {
            const response = await fetch("/api/my-events", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const events = await response.json();

            if (!response.ok) {
                showMessage(events.error || "Could not load your events.");
                return;
            }

            container.innerHTML = "";

            if (events.length === 0) {
                showMessage("You haven't joined any events yet.");
                return;
            }

            showMessage("");

            events.forEach(event => {
                const card = document.createElement("div");
                card.className = "event-card";

                const category = document.createElement("span");
                category.className = "category";
                category.textContent = event.category;

                const title = document.createElement("h3");
                title.textContent = event.title;

                const description = document.createElement("p");
                description.textContent = event.description;

                const date = document.createElement("p");
                date.textContent = "📅 " + event.date;

                const venue = document.createElement("p");
                venue.textContent = "📍 " + event.venue;

                const status = document.createElement("p");
                status.textContent = "✓ Successfully Registered";
                status.style.color = "green";

                card.append(category, title, description, date, venue, status);
                container.appendChild(card);
            });

        } catch (error) {
            showMessage("Could not load your registered events.");
        }
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            localStorage.removeItem("name");
            window.location.href = "login.html";
        });
    }

});
