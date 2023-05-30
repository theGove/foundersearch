function start_me_up(){

    document.getElementById("login").setAttribute("href", authUrl);
    var code = new URLSearchParams(window.location.search).get("code");
    if(code){
        process_code(code) 
    } 
}

function process_code(code){
    fetch("https://ident.familysearch.org/cis-web/oauth2/v3/token?redirect_uri=" + redirect, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=authorization_code&code=" + code + "&client_id=" + appKey
    }).then(function(e) {
        return e.json()
    }).then(function(e) {
        var t = JSON.parse(atob(e.id_token.split(".")[1]));
        fetch("https://api.familysearch.org/platform/users/current", {
            headers: {
                Authorization: "Bearer " + t.sessionId
            }
        }).then(function(e) {
            return e.json()
        }).then(function(e) {
            e.users[0].jwt = t, localStorage.setItem("user", JSON.stringify(e.users[0]))
        })
    });
}