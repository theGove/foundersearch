var appKey = atob('YTAyajAwMDAwMEtUUmpwQUFI'),
redirect = "https://cousin.surge.sh",
authUrl = "https://ident.familysearch.org/cis-web/oauth2/v3/authorization?response_type=code&scope=openid%20profile%20email%20qualifies_for_affiliate_account%20country&client_id=" + appKey + "&redirect_uri=" + redirect;

function get_remembered_ancestors(){
    ancestors=localStorage.getItem("ancestors")||"{}"
    return JSON.parse(ancestors)
}

function remember_ancestors(ancestors){
    localStorage.setItem("ancestors",JSON.stringify(ancestors))
}

function tag(id){
    return document.getElementById(id)
}