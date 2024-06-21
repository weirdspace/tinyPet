// Configuration du routage
m.route(document.getElementById("app"), "/", {
    "/": Home,
    "/firstLogin": FirstLogin,
    "/createPetition": CreatePetition,
    "/signedPetitions": PetitionTabs,
    "/createdPetitions": PetitionTabs,
    "/userPetitions": PetitionTabs
});
