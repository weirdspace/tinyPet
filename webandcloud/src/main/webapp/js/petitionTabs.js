var PetitionTabs = {
    signedPetitions: [],
    createdPetitions: [],
    activeTab: "createdPetitions",
    cursorPet: null, // Variable pour sauvegarder le curseur
    oninit: function() {
        PetitionTabs.fetchCreatedPetitions();
        PetitionTabs.fetchSignedPetitions();
    },
    fetchSignedPetitions: function() {
        if (isTokenExpired(User.token)) {
            NotificationSystem.createNotification("Votre session a expiré. Veuillez vous reconnecter.", "error");
            logout();
            return;
        }
        m.request({
            method: "GET",
            url: "https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/petitionSignedUser/" + User.email
        })
        .then(function(result) {
            if (result && result.items) {
                PetitionTabs.signedPetitions = result.items.map(function(petition) {
                    return {
                        id: petition.id,
                        namePetition: petition.namePetition,
                        description: petition.description,
                        nbsignataires: petition.nbsignataires,
                        pseudo: petition.pseudo,
                        formattedDate: petition.formattedDate,
                        tags: petition.tags || []
                    };
                });
            } else {
                console.error("Format de réponse invalide ou vide:", result);
            }
        })
        .catch(function(error) {
            console.error("Erreur, format de réponse invalide ou vide:", error);
        });
    },
    fetchCreatedPetitions: function() {
        if (isTokenExpired(User.token)) {
            NotificationSystem.createNotification("Votre session a expiré. Veuillez vous reconnecter.", "error");
            logout();
            return;
        }

        var url = "https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/petitionCreatedUser/" + User.email;
        if (PetitionTabs.cursorPet) {
            url += "?cursor=" + PetitionTabs.cursorPet;
        }

        m.request({
            method: "GET",
            url: url
        })
        .then(function(result) {
            if (result && result.items) {
                result.items.forEach(function(petition) {
                    PetitionTabs.createdPetitions.push({
                        id: petition.id,
                        namePetition: petition.namePetition,
                        description: petition.description,
                        signataires: petition.signataires || [], // Default to an empty array if signataires is not provided
                        nbsignataires: petition.nbsignataires,
                        pseudo: petition.pseudo,
                        formattedDate: petition.formattedDate,
                        tags: petition.tags || [],
                        cursor: petition.cursor || ""
                    });
                });
                PetitionTabs.cursorPet = result.cursor || null;
                if (!PetitionTabs.cursorPet) {
                    PetitionTabs.cursorPet = -1; 
                    NotificationSystem.createNotification("Plus de pétitions à afficher.", "error");
                }
            } else {
                NotificationSystem.createNotification("Plus de pétitions à afficher.", "error"); 
                console.error("Format de réponse invalide ou vide:", result);
            }
        })
        .catch(function(error) {
            NotificationSystem.createNotification("Plus de pétitions à afficher.", "error"); 
            console.error("Erreur, format de réponse invalide ou vide:", error);
        });
    },
    fetchMoreSignataires: function(petition) {
        if (isTokenExpired(User.token)) {
            NotificationSystem.createNotification("Votre session a expiré. Veuillez vous reconnecter.", "error");
            logout();
            return;
        }
        if (petition.cursor) {
            m.request({
                method: "GET",
                url: `https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/usersSigned/${petition.id}?cursor=${petition.cursor}`
            })
            .then(function(result) {
                if (result && result.userPseudos) {
                    petition.signataires = petition.signataires.concat(result.userPseudos);
                    petition.cursor = result.cursor || "";
                    m.redraw();
                } else {
                    console.error("Format de réponse invalide ou vide:", result);
                    NotificationSystem.createNotification("Pas d'autres signataires à afficher", "error");
                }
            })
            .catch(function(error) {
                console.error("Erreur lors de la requête:", error);
                NotificationSystem.createNotification("Une erreur est survenue lors de la requête sur les signataires", "error");
            });
        } else {
            NotificationSystem.createNotification("Pas de signataire à afficher", "error");
        }
    },
    view: function() {
        return [
            m(Header),
            m("section", { class: "section" }, [
                m("div", { class: "container" }, [
                    m("h1", { class: "title" }, "Mes Pétitions"),
                    m("div", { class: "tabs is-boxed" }, [
                        m("ul", [
                            m("li", { class: PetitionTabs.activeTab === "createdPetitions" ? "is-active" : "" }, [
                                m("a", { onclick: () => { PetitionTabs.activeTab = "createdPetitions"; } }, "Pétitions Créées")
                            ]),
                            m("li", { class: PetitionTabs.activeTab === "signedPetitions" ? "is-active" : "" }, [
                                m("a", { onclick: () => { PetitionTabs.activeTab = "signedPetitions"; } }, "Pétitions Signées")
                            ])
                        ])
                    ]),
                    m("div", { class: "content" }, [
                        PetitionTabs.activeTab === "signedPetitions" ? 
                        (PetitionTabs.signedPetitions.length ? 
                            PetitionTabs.signedPetitions.map(function(petition) {
                                return m("div", { class: "box" }, [
                                    m("p", { class: "title" }, `Nom: ${petition.namePetition}`),
                                    m("p", `Description: ${petition.description}`),
                                    m("p", `Signatures: ${petition.nbsignataires}`),
                                    m("p", `Créée par: ${petition.pseudo}`),
                                    m("p", `Date de création: ${petition.formattedDate}`),
                                    m("p", `Tags: ${petition.tags.join(', ')}`)
                                ]);
                            }) :
                            m("p", "Pas de pétition signée trouvée")
                        ) : 
                        (PetitionTabs.createdPetitions.length ? 
                            PetitionTabs.createdPetitions.map(function(petition) {
                                return m("div", { class: "box" }, [
                                    m("p", { class: "title" }, `Nom: ${petition.namePetition}`),
                                    m("p", `Description: ${petition.description}`),
                                    m("p", `Signataires: ${petition.signataires.join(', ')}`),
                                    m("button", {
                                        class: "button is-info",
                                        onclick: function() {
                                            PetitionTabs.fetchMoreSignataires(petition);
                                        }
                                    }, "Afficher plus de signataires"),
                                    m("p", `Nombre de signatures: ${petition.nbsignataires}`),
                                    m("p", `Créée par: ${petition.pseudo}`),
                                    m("p", `Date de création: ${petition.formattedDate}`),
                                    m("p", `Tags: ${petition.tags.join(', ')}`)
                                ]);
                            }).concat([
                                m("button", {
                                    class: "button is-primary",
                                    onclick: function() {
                                        PetitionTabs.fetchCreatedPetitions();
                                    }
                                }, "Pétitions suivantes")
                            ]) :
                            m("p", "Pas de pétition créée trouvée")
                        )
                    ])
                ])
            ]),
            m(Footer)
        ];
    }
};
