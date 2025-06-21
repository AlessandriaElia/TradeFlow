$(document).ready(async function() {
    // Gestione alert post-pagamento
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        alert('Pagamento completato con successo!');
        setUserCart([]); // Svuota il carrello
        window.history.replaceState({}, document.title, "/dashboard.html");
    }

    // Controllo autenticazione utente
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // Decodifica token e aggiorna la UI
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        $("#profileUsername").text(payload.username);
        $("#profileEmail").text(payload.email);

        $("#loginSignupButtons").addClass("d-none");
        $("#userGreeting").removeClass("d-none");
        $("#username").text(payload.username);
        $("#dashboardLink").removeClass("d-none");
        $("#cartLink").removeClass("d-none");
        $("#logoutButton").removeClass("d-none");
    } catch (error) {
        console.error("Error decoding token:", error);
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return;
    }

    // Logout
    $("#logout").on("click", function() {
        localStorage.removeItem("token");
        window.location.href = "index.html";
    });

    // Gestione scadenza token
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

    // Cambio password usando inviaRichiesta
    $("#changePasswordForm").on("submit", async function(e) {
        e.preventDefault();
        
        const currentPassword = $("#currentPassword").val();
        const newPassword = $("#newPassword").val();
        const confirmPassword = $("#confirmPassword").val();
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert("Tutti i campi sono obbligatori");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("Le nuove password non coincidono");
            return;
        }
        if (newPassword.length < 6) {
            alert("La nuova password deve essere di almeno 6 caratteri");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "login.html";
                return;
            }

            const result = await inviaRichiesta(
                "POST",
                "/api/users/change-password",
                { currentPassword, newPassword }
            );

            if (result.status !== 200) {
                throw new Error(result.err || (result.data && result.data.error) || 'Errore nel cambio password');
            }

            alert("Password aggiornata con successo");
            $("#changePasswordModal").modal('hide');
            $("#changePasswordForm")[0].reset();
        } catch (error) {
            console.error("Errore:", error);
            alert(error.message);
        }
    });

    // Recupera gli EA acquistati dall'utente (usa inviaRichiesta)
    async function fetchPurchasedEAs() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "login.html";
                return [];
            }

            const result = await inviaRichiesta("GET", "/api/payments/purchased");
            if (result.status === 200 && Array.isArray(result.data)) {
                return result.data;
            }
            return [];
        } catch (error) {
            console.error("Error fetching purchased EAs:", error);
            return [];
        }
    }

    // Mostra gli EA acquistati
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

    // Recupera gli EA pubblicati dall'utente (usa inviaRichiesta)
    async function fetchPublishedEAs() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                window.location.href = "login.html";
                return [];
            }

            const result = await inviaRichiesta("GET", "/api/experts/user");
            return Array.isArray(result.data) ? result.data : [];
        } catch (error) {
            console.error("Error fetching published EAs:", error);
            return [];
        }
    }

    // Mostra gli EA pubblicati
    async function displayPublishedEAs() {
        const container = $("#publishedEAList");
        container.empty();

        const publishedEAs = await fetchPublishedEAs();

        if (!publishedEAs || publishedEAs.length === 0) {
            container.html(`
                <div class="text-center text-white p-4">
                    <i class="fas fa-upload fa-3x mb-3"></i>
                    <p>Non hai ancora pubblicato nessun Expert Advisor</p>
                </div>
            `);
            return;
        }

        publishedEAs.forEach(ea => {
            const card = createEACard(ea);
            container.append(card);
        });
    }

    // Funzione helper per creare la card dell'EA pubblicato
    function createEACard(ea) {
        const stars = '★'.repeat(Math.floor(ea.stars || 0)) + 
                     '☆'.repeat(5 - Math.floor(ea.stars || 0));
        
        return `
            <div class="ea-card" data-ea-id="${ea.id}">
                <div class="card">
                    <img src="${ea.image}" alt="${ea.name}" onerror="this.src='img/default-ea.png'">
                    <div class="card-body">
                        <h5 class="card-title">${ea.name}</h5>
                        <div class="stars">${stars}</div>
                        <div class="price">${ea.price} USD</div>
                        <div class="btn-group w-100">
                            <button class="btn btn-primary" onclick="window.location.href='ea.html?id=${ea.id}'">
                                <i class="fas fa-chart-line"></i> Dettagli
                            </button>
                            <button class="btn btn-danger delete-ea" onclick="deleteEA(${ea.id})">
                                <i class="fas fa-trash"></i> Elimina
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Funzione globale per eliminare un EA pubblicato (usa inviaRichiesta)
    window.deleteEA = async function(eaId) {
        if (!confirm('Sei sicuro di voler eliminare questo Expert Advisor?')) {
            return;
        }

        try {
            const result = await inviaRichiesta("DELETE", `/api/experts/${eaId}`);
            if (result.status !== 200) {
                throw new Error(result.err || (result.data && result.data.error) || "Errore nell'eliminazione dell'EA");
            }
            await displayPublishedEAs();
            alert('Expert Advisor eliminato con successo!');
        } catch (error) {
            console.error('Error:', error);
            alert('Errore durante l\'eliminazione dell\'EA');
        }
    }

    // Inizializza la dashboard mostrando EA acquistati e pubblicati
    await Promise.all([
        displayPurchasedEAs(),
        displayPublishedEAs()
    ]);

    // Funzione per upload su Cloudinary usando inviaRichiesta
    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'mioPreset'); 

        const result = await inviaRichiesta(
            "POST",
            "https://api.cloudinary.com/v1_1/dmu6njtxz/image/upload",
            formData
        );

        if (result.status === 200 && result.data && result.data.secure_url) {
            return result.data.secure_url;
        } else {
            throw new Error("Errore upload Cloudinary: " + (result.err || "Upload fallito"));
        }
    }

    // Gestione submit del form di pubblicazione EA (usa inviaRichiesta)
    $("#uploadEAForm").on("submit", async function(e) {
        e.preventDefault();
        
        try {
            // Recupera i dati dal form
            const name = $("#eaName").val();
            const description = $("#eaDescription").val();
            const price = Number($("#eaPrice").val());
            const eaFile = $("#eaFile")[0].files[0];
            const performanceFile = $("#eaPerformance")[0].files[0];
            const imageFile = $("#eaImage")[0].files[0];

            // Upload immagine su Cloudinary
            const imageUrl = await uploadToCloudinary(imageFile);

            // Leggi il file JSON delle performance
            const performanceJson = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(JSON.parse(e.target.result));
                reader.onerror = (e) => reject(e);
                reader.readAsText(performanceFile);
            });

            // Prepara i dati dell'EA
            const eaData = {
                name,
                description,
                price,
                creator: JSON.parse(atob(localStorage.getItem("token").split(".")[1])).username,
                stars: 0,
                reviews: 0,
                performance: {
                    roi: performanceJson.roi,
                    risk_level: performanceJson.risk_level,
                    win_rate: performanceJson.win_rate,
                    data: performanceJson.data
                },
                image: imageUrl
            };

            // Invia i dati al server usando inviaRichiesta
            const result = await inviaRichiesta(
                "POST",
                "/api/experts/create",
                eaData
            );

            if (result.status !== 201) {
                throw new Error(result.err || (result.data && result.data.error) || "Errore nella pubblicazione dell'EA");
            }

            alert('Expert Advisor pubblicato con successo!');
            $("#uploadEAModal").modal('hide');
            $("#uploadEAForm")[0].reset();
            await displayPublishedEAs(); // Aggiorna la lista
        } catch (error) {
            console.error('Error:', error);
            alert('Errore durante la pubblicazione dell\'EA');
        }
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

// Rende globale la funzione per aggiornare la lista degli EA pubblicati
window.displayPublishedEAs = async function() {
    const container = $("#publishedEAList");
    container.empty();
    
    const publishedEAs = await fetchPublishedEAs();
    
    if (!publishedEAs || publishedEAs.length === 0) {
        container.html(`
            <div class="text-center text-white p-4">
                <i class="fas fa-upload fa-3x mb-3"></i>
                <p>Non hai ancora pubblicato nessun Expert Advisor</p>
            </div>
        `);
        return;
    }

    publishedEAs.forEach(ea => {
        const card = createEACard(ea);
        container.append(card);
    });
}