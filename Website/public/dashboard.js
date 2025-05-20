$(document).ready(async function() {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Decode token and set user info
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        $("#profileUsername").text(payload.username);
        $("#profileEmail").text(payload.email);
    } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return;
    }

    // Handle logout
    $("#logout").on("click", function() {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    });

    async function handleTokenExpiration(error) {
        if (error.response?.status === 401) {
            const errorData = await error.response.json();
            if (errorData.code === "TOKEN_EXPIRED") {
                alert("La tua sessione è scaduta. Effettua nuovamente il login.");
                localStorage.removeItem("token");
                window.location.href = "login.html";
                return;
            }
        }
        throw error;
    }

    // Fetch purchased EAs from server
    async function fetchPurchasedEAs() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "login.html";
                return [];
            }

            const response = await fetch('/api/payments/purchased', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const errorData = await response.json();
                    if (errorData.code === "TOKEN_EXPIRED") {
                        localStorage.removeItem("token");
                        window.location.href = "login.html";
                        return [];
                    }
                }
                throw new Error('Failed to fetch purchased EAs');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching purchased EAs:", error);
            return [];
        }
    }

    // Display purchased EAs
    async function displayPurchasedEAs() {
        const container = $("#purchasedEAList");
        container.empty();

        const purchasedEAs = await fetchPurchasedEAs();
        
        if (purchasedEAs.length === 0) {
            container.html(`
                <div class="text-center text-white p-4">
                    <i class="fas fa-shopping-bag fa-3x mb-3"></i>
                    <p>Non hai ancora acquistato nessun Expert Advisor</p>
                </div>
            `);
            return;
        }

        purchasedEAs.forEach(ea => {
            const stars = '★'.repeat(Math.floor(ea.stars)) + 
                         '☆'.repeat(5 - Math.floor(ea.stars));
            
            const card = `
                <div class="ea-card">
                    <div class="card">
                        <img src="${ea.image}" alt="${ea.name}">
                        <div class="card-body">
                            <h5 class="card-title">${ea.name}</h5>
                            <div class="stars">${stars}</div>
                            <button class="btn btn-primary card-button" onclick="window.location.href='ea.html?id=${ea.id}'">
                                <i class="fas fa-chart-line me-2"></i>Performance
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(card);
        });
    }

    // Fetch published EAs from server
    async function fetchPublishedEAs() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "login.html";
                return [];
            }

            const response = await fetch('/api/experts/published', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const errorData = await response.json();
                    if (errorData.code === "TOKEN_EXPIRED") {
                        localStorage.removeItem("token");
                        window.location.href = "login.html";
                        return [];
                    }
                }
                throw new Error('Expert Advisor non trovato.');
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Error fetching published EAs:", error);
            return [];
        }
    }

    // Display published EAs
    async function displayPublishedEAs() {
        const container = $("#publishedEAList");
        container.empty();

        const publishedEAs = await fetchPublishedEAs();
        
        if (publishedEAs.length === 0) {
            container.html(`
                <div class="text-center text-white p-4">
                    <i class="fas fa-upload fa-3x mb-3"></i>
                    <p>Non hai ancora pubblicato nessun Expert Advisor</p>
                </div>
            `);
            return;
        }

        publishedEAs.forEach(ea => {
            const stars = '★'.repeat(Math.floor(ea.stars)) + 
                         '☆'.repeat(5 - Math.floor(ea.stars));
            
            const card = `
                <div class="ea-card">
                    <div class="card">
                        <img src="${ea.image}" alt="${ea.name}">
                        <div class="card-body">
                            <h5 class="card-title">${ea.name}</h5>
                            <div class="stars">${stars}</div>
                            <div class="price">${ea.price} USD</div>
                            <button class="btn btn-primary card-button" onclick="editEA(${ea.id})">
                                <i class="fas fa-edit me-2"></i>Modifica
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(card);
        });
    }

    // Initialize dashboard
    await Promise.all([
        displayPurchasedEAs(),
        displayPublishedEAs()
    ]);

    // Form submissions
    $("#changePasswordForm").on("submit", function(e) {
        e.preventDefault();
        // Implement password change logic here
        alert("Funzionalità in sviluppo");
    });

    $("#uploadEAForm").on("submit", function(e) {
        e.preventDefault();
        // Implement EA upload logic here
        alert("Funzionalità in sviluppo");
    });

    // Navbar scroll effect
    $(window).scroll(function() {
        if ($(this).scrollTop() > 50) {
            $('.navbar').addClass('navbar-scrolled');
        } else {
            $('.navbar').removeClass('navbar-scrolled');
        }
    });
});