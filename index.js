function start_me_up(){
    var appKey = atob('YTAyajAwMDAwMEtUUmpwQUFI'),
        redirect = "https://cousin.surge.sh",
        authUrl = "https://ident.familysearch.org/cis-web/oauth2/v3/authorization?response_type=code&scope=openid%20profile%20email%20qualifies_for_affiliate_account%20country&client_id=" + appKey + "&redirect_uri=" + redirect;
    document.getElementById("login").setAttribute("href", authUrl);
    var code = new URLSearchParams(window.location.search).get("code");
    code && fetch("https://ident.familysearch.org/cis-web/oauth2/v3/token?redirect_uri=" + redirect, {
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