var CreatePetition = {
    petition: {
        name: "",
        description: "",
        tags: ""
    },
    createPetition: () => {
        if (User.token == "") {
            console.error("Veuillez vous connecter pour créer une pétition");
            NotificationSystem.createNotification("Veuillez vous connecter pour créer une pétition", "error");
            return;
        }
        if (!CreatePetition.petition.name.trim() || !CreatePetition.petition.description.trim()) {
            NotificationSystem.createNotification("Le nom et la description ne doivent pas être vides.","error");
            return;
        }
        if (isTokenExpired(User.token)) {
            NotificationSystem.createNotification("Votre session a expiré. Veuillez vous reconnecter.","error");
            logout();
            return;
        }

        return m.request({
            method: "POST",
            url: "https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/createPetition/",
            body: {
                name: CreatePetition.petition.name,
                description: CreatePetition.petition.description,
                tags: CreatePetition.petition.tags,
                token: User.token,
                userId: User.id,
                email: User.email,
                pseudo: User.name
            }
        }).then(function(result) {
            console.log("Tags", CreatePetition.petition.tags.split(",").map(tag => tag.trim()));
            console.log("Pétition créée:", result);
            // Réinitialiser le formulaire après succès
            CreatePetition.petition.name = "";
            CreatePetition.petition.description = "";
            CreatePetition.petition.tags = "";
            m.redraw(); 
            NotificationSystem.createNotification("Pétition créée avec succès!","success");
        }).catch(function(error) {
            console.error("Erreur pour créer la pétition:", error);
            NotificationSystem.createNotification("Erreur pour créer la pétition: " + error.message,"error");
        });
    },
    view: function() {
        return [
            m(Header),
            m("section", { class: "section" }, [
                m("div", { class: "container" }, [
                    m("h1", { class: "title" }, "Créer une Pétition"),
                    m("div", { class: "field" }, [
                        m("label", { class: "label" }, "Nom"),
                        m("div", { class: "control" }, [
                            m("input[type=text][placeholder=Nom][maxlength=100]", {
                                class: "input",
                                oninput: (e) => { CreatePetition.petition.name = e.target.value; },
                                value: CreatePetition.petition.name
                            })
                        ])
                    ]),
                    m("div", { class: "field" }, [
                        m("label", { class: "label" }, "Description"),
                        m("div", { class: "control" }, [
                            m("textarea[placeholder=Description][maxlength=10000]", {
                                class: "textarea",
                                oninput: (e) => { CreatePetition.petition.description = e.target.value; },
                                value: CreatePetition.petition.description
                            })
                        ])
                    ]),
                    m("div", { class: "field" }, [
                        m("label", { class: "label" }, "Tags (séparés par des virgules)"),
                        m("div", { class: "control" }, [
                            m("input[type=text][placeholder=Tags, séparés par des virgules][maxlength=75]", {
                                class: "input",
                                oninput: (e) => { CreatePetition.petition.tags = e.target.value; },
                                value: CreatePetition.petition.tags
                            })
                        ])
                    ]),
                    m("div", { class: "field" }, [
                        m("div", { class: "control" }, [
                            m("button.button.is-primary", { onclick: CreatePetition.createPetition }, "Soumettre")
                        ])
                    ])
                ])
            ]),
            m(Footer)
        ];
    }
};
