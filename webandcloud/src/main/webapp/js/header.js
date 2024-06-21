var sizeDescription = 150;

var Header = {
    searchQuery: "",
    searchTimeout: null,
    searchResults: [],
    expandedDescriptions: new Set(),
    showSearchResults: true, // État pour afficher ou masquer les résultats de recherche

    oncreate: function() {
        loadGoogleScript(function() {
            google.accounts.id.initialize({
                client_id: '849633217364-6qmmvh5i7see24dv9ulb25hvkgqdb6jl.apps.googleusercontent.com',
                callback: handleCredentialResponse
            });
            google.accounts.id.renderButton(
                document.getElementById("google-signin-button"),
                { theme: 'outline', size: 'large' }
            );
            google.accounts.id.prompt();
        });
    },

    handleSearchInput: function(event) {
        Header.searchQuery = event.target.value;

        if (Header.searchTimeout) {
            clearTimeout(Header.searchTimeout);
        }

        Header.searchTimeout = setTimeout(function() {
            Header.performSearch(Header.searchQuery);
        }, 1500);
    },

    performSearch: function(query) {
        if (query.trim() === "") {
            console.log("Empty query, not performing search.");
            Header.searchResults = [];
            m.redraw();
            return;
        }

        VisualEffects.showLoadingSpinner();

        // Scroll to top of input element
        VisualEffects.scrollToTopInput();

        var searchUrl = "https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/petitionsByTags/" + encodeURIComponent(query);

        m.request({
            method: "GET",
            url: searchUrl
        })
        .then(function(result) {
            VisualEffects.hideLoadingSpinner();

            Header.searchResults = result.items || [];

            m.redraw();

            // Highlight all results
            VisualEffects.highlightResults();

            // Smooth scroll to top then to bottom
            VisualEffects.scrollToTop();
            setTimeout(function() {
                VisualEffects.scrollToBottom();
            }, 2000); // Adjust delay as necessary
        })
        .catch(function(error) {
            VisualEffects.hideLoadingSpinner();
            console.error("Search error:", error);
        });
    },

    clearSearchResults: function() {
        Header.searchResults = [];
        Header.searchQuery = "";  // Réinitialiser la requête de recherche
        if (document.querySelector(".input")) {
            document.querySelector(".input").value = "";  // Réinitialiser visuellement l'input
        }
        Header.expandedDescriptions.clear();
        m.redraw();
    },

    toggleSearchResults: function() {
        Header.showSearchResults = !Header.showSearchResults;
        m.redraw();
    },

    signPetition: function(petitionId) {
        if (User.token == "") {
            console.error("L'utilisateur n'est pas connecté.");
            NotificationSystem.createNotification("Vous devez être connecté pour signer une pétition","error");
            return;
        }

        var requestData = {
            id: petitionId,
            userId: User.id,
            token: User.token
        };

        console.log("Sending request with data:", requestData);
        if (isTokenExpired(User.token)) {
            NotificationSystem.createNotification("Votre session a expiré. Veuillez vous reconnecter.","error");
            logout();
            return;
        }

        fetch("https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/signer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    if (errData.error && errData.error.message) {
                        throw new Error(`${errData.error.message}`);
                    } else {
                        throw new Error(`Une erreur inconnue est survenue, réessayez plus tard`);
                    }
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Pétition signée", data);
            const petition = Table.data.find(p => p.id === petitionId);
            if (petition) {
                petition.nbsignataires++;
            }
            const petitionInSearchResults = Header.searchResults.find(p => p.id === petitionId);
            if (petitionInSearchResults) {
                petitionInSearchResults.nbsignataires++;
            }
            m.redraw();
            NotificationSystem.createNotification("Pétition signée avec succès!","success");
        })
        .catch(error => {
            console.error("Erreur lors de la signature de la pétition : ", error);
            NotificationSystem.createNotification("Erreur lors de la signature de la pétition : " + error.message,"error");
        });
    },

    view: function() {
        return m("header", { class: "header" }, [
            m("nav", { class: "navbar" }, [
                m("div", { class: "navbar-brand" }, [
                    m("a", { class: "navbar-item header-button header-button-info", href: "https://projet-test-414213.nw.r.appspot.com" }, "Accueil")
                ]),
                m("div", { class: "navbar-item navbar-start navbar-item-search" }, [
                    m("input", {
                        class: "input",
                        type: "text",
                        placeholder: "Rechercher,une,pétition,par,tag...",
                        oninput: Header.handleSearchInput,
                        value: Header.searchQuery  // Liaison bidirectionnelle pour conserver la valeur du champ
                    })
                ]),
                m("div", { class: "navbar-end" }, [
                    User.isAuthenticated ?
                    [
                        m("div", { class: "navbar-item user-info header-button header-button-disabled" }, `Vous êtes connecté : ${User.email}`),
                        m("button", { class: "button is-light header-button header-button-light", onclick: function() { logout(); } }, "Se déconnecter"),
                        m("button", { class: "button is-primary header-button header-button-primary", onclick: () => m.route.set("/createPetition") }, "Créer une pétition"),
                        m("button", { class: "button is-link header-button header-button-link", onclick: () => m.route.set("/userPetitions") }, "Mon compte")
                    ] :
                    m("div", { class: "navbar-end" }, [
                        m("button", { class: "button is-link header-button header-button-link", onclick: () => m.route.set("/firstLogin") }, "Première connexion"),
                        m("div", { id: "google-signin-button", class: "navbar-item-google" })
                    ])
                ])
            ]),
            Header.searchResults.length > 0 ? [
                m("button", {
                    class: "button is-info header-button header-button-info",
                    onclick: Header.toggleSearchResults
                }, Header.showSearchResults ? "Masquer les résultats de recherche" : "Afficher les résultats de recherche"),
                Header.showSearchResults ?
                m("section", { class: "section search-results" }, [
                    m("div", { class: "container" }, [
                        m("h1", { class: "title" }, "Résultats de recherche"),
                        Header.searchResults.map(function(petition) {
                            var isExpanded = Header.expandedDescriptions.has(petition.id);
                            var description = petition.description;
                            if (!isExpanded && description.length > sizeDescription) {
                                description = description.substring(0, sizeDescription) + "...";
                            }
                            return m("div", { class: "box search-result" }, [
                                m("p", { class: "title" }, `Nom: ${petition.namePetition}`),
                                m("p", `Description: ${description}`),
                                petition.description.length > sizeDescription ? m("button", {
                                    class: "button is-small is-link",
                                    onclick: function() {
                                        Header.toggleDescription(petition.id);
                                    }
                                }, isExpanded ? "Réduire" : "Tout afficher") : null,
                                m("p", `Signataires: ${petition.nbsignataires}`),
                                m("p", `Créée par: ${petition.pseudo}`),
                                m("p", `Date de création: ${petition.formattedDate}`),
                                m("p", `Tags: ${petition.tags.join(', ')}`),
                                m("button", { class: "button is-success header-button", onclick: function() {
                                    Header.signPetition(petition.id);
                                } }, "Signer")
                            ]);
                        })
                    ])
                ]) : null
            ] : null
        ]);
    },

    toggleDescription: function(id) {
        if (Header.expandedDescriptions.has(id)) {
            Header.expandedDescriptions.delete(id);
        } else {
            Header.expandedDescriptions.add(id);
        }
    }
};
