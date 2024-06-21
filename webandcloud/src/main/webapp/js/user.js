var User = {
    name: "",
    email: "",
    id: "",
    token: "",
    isAuthenticated: false
};

function isTokenExpired(token) {
    const decodedToken = jwt_decode(token);
    const currentTime = Math.floor(Date.now() / 1000);    
    return decodedToken.exp < currentTime;
}


function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {   
    document.cookie = name + '=; Max-Age=-99999999;';  
}

function handleCredentialResponse(response) {
    console.log("callback called:", response.credential);
    const data_response = jwt_decode(response.credential);
    console.log("ID: " + data_response.sub);
    console.log('Given Name: ' + data_response.given_name + " " + data_response.family_name);
    console.log("Email: " + data_response.email);
    
    if(getCookie('pseudo')){
        // Vérifier et créer l'utilisateur si nécessaire
        m.request({
            method: "POST",
            url: "https://projet-test-414213.nw.r.appspot.com/ressources/api/myTinyPet/v666/addUser",
            body: {
                pseudo: getCookie('pseudo') || data_response.given_name + " " + data_response.family_name, // Utilise le pseudo stocké ou le prénom + nom de l'utilisateur Google
                userId: data_response.sub,
                token: response.credential
            }
        })
        .then(function(result) {
            console.log("Utilisateur ajouté:", result);
            // Mettre à jour l'état utilisateur
            User.isAuthenticated = true;
            User.token = response.credential;
            User.email = data_response.email;
            User.name = data_response.given_name + " " + data_response.family_name;
            User.id = data_response.sub;
            // Sauvegarde des informations de l'utilisateur dans les cookies
            setCookie('user', JSON.stringify(User), 1);
            eraseCookie('pseudo');
            m.route.set("/authenticatedView");
            m.redraw();
        })
        .catch(function(error) { // Une utilisateur ne sait pas qu'il a déjà compte zzzzz
            if (error.code === 409) {
                // L'utilisateur existe déjà, traiter cela comme une connexion réussie
                console.log("Utilisateur existe déjà:", error);
                User.isAuthenticated = true;
                User.token = response.credential;
                User.email = data_response.email;
                User.name = data_response.given_name + " " + data_response.family_name;
                User.id = data_response.sub;
                setCookie('user', JSON.stringify(User), 1);
                eraseCookie('pseudo');
                m.route.set("/authenticatedView");
                m.redraw();
            } else {
                console.error("Erreur lors de l'ajout de l'utilisateur:", error);
                NotificationSystem.createNotification("Erreur lors de l'ajout de l'utilisateur: " + error.message,"error");
            }
        });
    }
    else{
        User.isAuthenticated = true;
        User.token = response.credential;
        User.email = data_response.email;
        User.name = data_response.given_name + " " + data_response.family_name;
        User.id = data_response.sub;
        setCookie('user', JSON.stringify(User), 1);
        m.route.set("/authenticatedView");
        m.redraw();
    }
    
}

function loadUserFromCookies() {
    const userCookie = getCookie('user');
    if (userCookie) {
        const user = JSON.parse(userCookie);
        User.name = user.name;
        User.email = user.email;
        User.id = user.id;
        User.token = user.token;
        User.isAuthenticated = user.isAuthenticated;
        if (isTokenExpired(User.token)) {
            logout();
        }
    }
}

function logout() {
    User.name = "";
    User.email = "";
    User.id = "";
    User.token = "";
    User.isAuthenticated = false;
    eraseCookie('user');
    window.location.href = "https://projet-test-414213.nw.r.appspot.com";
    m.redraw();
}

// Charger dynamiquement le script Google Sign-In
function loadGoogleScript(callback) {
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.head.appendChild(script);
}

// Charger l'utilisateur depuis les cookies au démarrage
loadUserFromCookies();
