"use strict";
    $(document).ready(function () {
        let bestEaList = $("#bestEaList");
        let eaData = []; // Store EA data globally

        // Fetch and display the Expert Advisors
        getEAs();

        // Function to make a GET request for fetching EAs
        async function getEAs() {
            let rq = await inviaRichiesta("GET", "/api/getEAs");
            if (rq.status == 401) {
                alert("Errore nella richiesta");
            } else if (rq.status == 200) {
                console.log("EA ricevuti");
                eaData = rq.data; // Store data globally
                displayEAs(eaData); // Display EAs when data is fetched

                // Event listener for hovering over EA cards
                $(".ea-card .card").hover(function () {
                    $(this).toggleClass("flipped");
                });
            }
        }

        // Function to display EAs
        function displayEAs(eas) {
            bestEaList.empty(); // Clear the current list
            eas.forEach(ea => {
                const stars = '★'.repeat(Math.round(ea.stars)) + '☆'.repeat(5 - Math.round(ea.stars));
                const card = `
                <div class="col-md-3 mb-4 ea-card">
                    <div class="card">
                        <div class="card-front">
                            <img src="img/EAs/${ea.name}.png" class="card-img-top" alt="${ea.name}">
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${ea.name}</h5>
                                <div class="stars">${stars}</div>
                                <button class="btn btn-gold mt-auto">${ea.price} USD</button>
                            </div>
                        </div>
                        <div class="card-back">
                            <h5>${ea.name}</h5>
                            <div class="stars">${stars} <span class="review-count">(${ea.reviews} recensioni)</span></div>
                            <p>${ea.description}</p>
                            <p>- ${ea.creator} -</p>
                            <button class="btn btn-gold mt-auto">${ea.price} USD</button>
                        </div>
                    </div>
                </div>
                `;
                bestEaList.append(card);
            });
        }

        // Filter button click handling
        $(".filter-btn").click(function () {
            $(".filter-btn").css("background-color", "gold"); // Reset all buttons to original color
            $(this).css("background-color", "#ffcc00"); // Highlight clicked button

            let filter = $(this).data("filter");

            // Apply filter
            let filteredEAs = eaData;
            if (filter !== "all") {
                filteredEAs = eaData.filter(ea => {
                    if (filter === "popular" && ea.stars >= 4) return true;
                    if (filter === "new" && ea.isNew) return true;
                    if (filter === "free" && ea.price === 0) return true;
                    if (filter === "paid" && ea.price > 0) return true;
                    return false;
                });
            }

            // Display filtered EAs
            displayEAs(filteredEAs);
        });

        // Search functionality
        $("#search").on("input", function () {
            let query = $(this).val().toLowerCase();
            let searchedEAs = eaData.filter(ea => {
                return ea.name.toLowerCase().includes(query) || ea.description.toLowerCase().includes(query);
            });
            displayEAs(searchedEAs); // Display the search results
        });
    });