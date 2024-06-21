var Footer = {
    view: function() {
        return m("footer", { class: "footer" }, [
            m("div", { class: "content has-text-centered" }, [
                m("p", "Projet étudiant de MASTER 1"),
                m("li", "CHEVALET Romain"),
                m("li", "PAVION Bastien"),
                m("li", "SEJOURNE Quentin"), 
                m("div", { class: "logos" }, [
                    m("img", { src: "MIAGE_LOGO.png", alt: "Logo 1" }),
                    m("img", { src: "UNIV_NANTES_LOGO.png", alt: "Logo 2" })
                ])
            ])
        ]);
    }
};
