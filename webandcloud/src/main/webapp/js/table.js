var sizeDescription = 150;
var Table = {
    data: [],
    expandedDescriptions: new Set(),
    
    oninit: function() {
        m.request({
            method: "GET",
            url: "https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/top100Petitions"
        })
        .then(function(result) {
            if (result && result.items) {
                Table.data = result.items;
            } else {
                console.error("Format de réponse invalide ou vide:", result);
                NotificationSystem.createNotification("Erreur de récupération des 100 pétitions les plus récentes","error");
            }
        })
        .catch(function(error) {
            console.error("Format de réponse invalide ou vide:", result);
            NotificationSystem.createNotification("Erreur de récupération des 100 pétitions les plus récentes : " + error.message,"error");
        });
    },

    toggleDescription: function(id) {
        if (Table.expandedDescriptions.has(id)) {
            Table.expandedDescriptions.delete(id);
        } else {
            Table.expandedDescriptions.add(id);
        }
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
            // Augmenter la valeur du champ nbsignataires sans recharger la page web
            const petition = Table.data.find(p => p.id === petitionId);
            if (petition) {
                petition.nbsignataires++;
                m.redraw();
            }
            NotificationSystem.createNotification("Pétition signée avec succès!","success");
        })
        .catch(error => {
            console.error("Erreur lors de la signature de la pétition : ", error);
            NotificationSystem.createNotification("Erreur lors de la signature de la pétition : " + error.message,"error");
        });
    },

    view: function() {
        return m("section", { class: "section" }, [
            m("div", { class: "container table-container" }, [
                m("h1", { class: "title" }, "Liste des Pétitions les plus récentes"),
                m("table", { class: "table is-striped is-fullwidth" }, [
                    m("thead", [
                        m("tr", [
                            m("th", "Pseudo Créateur"),
                            m("th", "Nom de la Pétition"),
                            m("th", "Description"),
                            m("th", "Total signatures"),
                            m("th", "Date de création"),
                            m("th", "Tags"),
                            m("th", "Actions")
                        ])
                    ]),
                    m("tbody", Table.data.map(function(petition) {
                        var isExpanded = Table.expandedDescriptions.has(petition.id);
                        var description = petition.description;
                        if (!isExpanded && description.length > sizeDescription) {
                            description = description.substring(0, sizeDescription) + "...";
                        }
                        return m("tr", { "data-id": petition.id }, [
                            m("td", petition.pseudo),
                            m("td", petition.namePetition),
                            m("td", { class: "description" }, [
                                m("div", description),
                                petition.description.length > sizeDescription ? m("button", {
                                    class: "button is-small is-link",
                                    onclick: function() {
                                        Table.toggleDescription(petition.id);
                                    }
                                }, isExpanded ? "Réduire" : "Tout afficher") : null
                            ]),
                            m("td", petition.nbsignataires.toString()),
                            m("td", petition.formattedDate),
                            m("td", `${petition.tags.join(', ')}`),
                            m("td", [
                                m("button", { class: "button is-success", onclick: function() {
                                    var petitionId = this.parentNode.parentNode.getAttribute("data-id");
                                    Table.signPetition(petitionId);
                                } }, "Signer")
                            ])
                        ]);
                    }))
                ])
            ])
        ]);
    }  
};
