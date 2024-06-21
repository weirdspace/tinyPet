var FirstLogin = {
    pseudo: "",
    showMessage: false,
    view: function() {
        return [
            m(Header),
            m("section", { class: "section" }, [
                m("div", { class: "container" }, [
                    m("h1", { class: "title" }, "Première Connexion"),
                    FirstLogin.showMessage ? 
                        m("p", { class: "notification is-success" }, "Vous pouvez maintenant vous connecter avec Google.") :
                        [
                            m("div", { class: "field has-addons" }, [
                                m("div", { class: "control is-expanded" }, [
                                    m("input[type=text][placeholder=Pseudo]", {
                                        class: "input",
                                        oninput: (e) => { FirstLogin.pseudo = e.target.value; },
                                        value: FirstLogin.pseudo
                                    })
                                ]),
                                m("div", { class: "control" }, [
                                    m("button.button.is-primary", { onclick: () => { 
                                        setCookie('pseudo', FirstLogin.pseudo, 1);
                                        FirstLogin.showMessage = true;
                                        m.redraw();
                                    }}, "Valider")
                                ])
                            ])
                        ]
                ])
            ]),
            m(Footer)
        ];
    }
};
