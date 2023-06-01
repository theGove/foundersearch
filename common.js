const  appKey = atob("YjBLN1JXUVNKVUQ4QQ")
const redirect = "https://cousin.surge.sh"
const authUrl = "https://ident.familysearch.org/cis-web/oauth2/v3/authorization?response_type=code&scope=openid%20profile%20email%20qualifies_for_affiliate_account%20country&client_id=" + appKey + "&redirect_uri=" + redirect;

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

async function logged_in(){
    // cannot use api function because api calls this
    const access_token = localStorage.getItem("authenticatedToken")
    if(!access_token){
        //console.log ("Not logged in: No Access Token")
        return false
    }
    let user = localStorage.getItem("user")
    if(!user) {
        //console.log ("Not logged in: No user")
        return false
    }
    user=JSON.parse(user)

    //check the age of the token
    if(new Date().valueOf() - localStorage.getItem("authenticatedTokenTime") < 36000000){
        // it's been less than an hour since checking
        return true
    }
    
    // it's been more than an hour since checking, check again
    const url="https://api.familysearch.org/platform/tree/persons/" + user.person.id
    const options={
        method:"head",
        headers:{
            authorization:'Bearer ' + access_token
        }
    }
    const rsp = await fetch(url, options)
    //console.log("rsp.status",rsp.status, rsp.status===200)
    if(rsp.status===200){
        localStorage.setItem("authenticatedTokenTime", new Date().valueOf())
        return true
    }else{
        localStorage.setItem("authenticatedToken", null)
        return false
    }
    
}

async function api(path, authenticated="either", options={method:"GET"}){
    // path is the part of the URL that goes after familysearch.org/
    
    const url="https://api.familysearch.org/" + path
    if(!options.headers){
        options.headers={}
    }
    if(!options.headers.authorization){// only set the authoriation if an authroization header is not passed in
        let access_token = await get_access_token(authenticated)
        //console.log("get_access_token",get_access_token)
        options.headers.authorization = 'Bearer ' + access_token
    }
    //console.log(url,options)
    const  rsp = await fetch(url,options)
    //console.log("response.status",rsp.status)
    if(rsp.status!=200){return{status:rsp.status}}
    const data = await rsp.json() 
    data.status=200
    //console.log("data", data)
    return await data
    
}

async function get_access_token( authenticated="either"){
    let token = null
    if(authenticated===true){
        if(await logged_in()){
            token = localStorage.getItem("authenticatedToken")  
        }else{
            return false
        }
    }else if(authenticated==="either"){
        if(await logged_in()){
            token = localStorage.getItem("authenticatedToken")  
        }else{
            token =await get_unauthenticated_token()
        }
    }else if(authenticated===false){
        token =await get_unauthenticated_token()
    }
    return token
}

async function get_unauthenticated_token(){
    let token = localStorage.getItem("unauthenticatedToken") 
    if(unauthenticated_token_is_valid()){
        return token
    }

    token = await localStorage.getItem("unauthenticatedToken") 
    return token

}

async function set_unauthenticated_token(){
    // Get unauthenticated access token
    // google cloud function owned by gove@colonialherirage.org
    const rsp = await fetch("https://founder-search-access-token-ec7zr7o4nq-uw.a.run.app/")
    const token = await rsp.text()
    localStorage.setItem("unauthenticatedToken", token)
    localStorage.setItem("unauthenticatedTokenTime", new Date().valueOf())
}



async function refresh_unauthenticated_token(){
    if(!await unauthenticated_token_is_valid()){
        await set_unauthenticated_token()
    }
}



async function unauthenticated_token_is_valid(){
    
    const access_token = localStorage.getItem("unauthenticatedToken")
    if(!access_token){
        //console.log ("Not Valid: No Access Token")
        return false
    }

    //check the age of the token
    if(new Date().valueOf() - localStorage.getItem("unauthenticatedTokenTime") < 36000000){
        // it's been less than an hour since checking
        return true
    }

    // its been more than an hour since we last checked  
    const url="https://api.familysearch.org/platform/collections/dates" + user.person.id
    const options={
        method:"head",
        headers:{
            authorization:'Bearer ' + access_token
        }
    }
    const rsp = await fetch(url,options)
    //console.log("rsp",rsp)
    if(rsp.status===200){
        localStorage.setItem("unauthenticatedTokenTime", new Date().valueOf())
        return true
    }else{
        localStorage.setItem("unauthenticatedToken", null)
        return false
    }
    

}

async function find_relationships(id) {
    //console.log("find rels", id)
    // Iterate person list
    data.people.forEach(async function(key, idx, array) {
        if (key.pid == "") return;
        //console.log("key----->", key)
        // Calculate relationship
        let path=null
        let access_token=null
        if(localStorage.getItem("searchMethod")==="myself"){
            path = 'platform/tree/my-relationships?pid=' + key.pid
            access_token = await get_access_token(true)
            if(!access_token){
                    // not logged in
                //console.log("Not Logged In-------------")
                return

            }
        }else{
            path = 'platform/tree/persons/' + id + '/relationships/' + key.pid
            access_token = await get_access_token()
        }
        //console.log("source pid", id, access_token)
        const options = {headers: {Authorization: 'Bearer ' + access_token}}
        await fetch("https://api.familysearch.org/" + path, options).then(function(rsp) {
                // Handle no relationship case
                if (rsp.status == 204){ 
                    return {persons: []};
                }
                return rsp.json();
            })
            .then(async function(rsp) {
                if (rsp.persons.length == 0) return;
                $('.noRels').hide();

                // Get relationship title
                let type = rsp.persons[rsp.persons.length - 1].display.relationshipDescription.split("My ")[1];


                let portrait = "https://foundersearch.colonialheritage.org/images/male.svg";
                if (key.gender == "Female") portrait = "https://foundersearch.colonialheritage.org/images/female.svg";
            
                let image_clause = null

                if(await logged_in()){
                   image_clause = `<img class="portrait" src="https://api.familysearch.org/platform/tree/persons/${key.pid}/portrait?default=${portrait}&access_token=${access_token}">`
                }else{
                    // here we need to build the link to the local copy of the ancestor picture
                    if(key.imageURL){
                        image_clause = `<img class="portrait" src="${key.imageURL}">`
                    }else{
                        image_clause = `<img class="portrait" src="${portrait}">`
                    }
                    
                }
            



                $('#'+id).append(`<li data-id="${key.pid}">
    <div class="person"><div>
    <a href="https://ancestors.familysearch.org/en/${key.pid}" target="_blank">
    ${image_clause}
    </div><div><span class="name">${key.name}</span>
    <span> (${type})</span>
    <br /><span class="cousinDesc">${key.desc}</span>
    </div></div></a>
    </li>`);
            });
    });
}
