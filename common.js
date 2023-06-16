const  appKey = atob("YjBLN1JXUVNKVUQ4QQ")
const redirect = `${window.location.protocol}//${window.location.host}/config.html`;
var authUrl = "https://ident.familysearch.org/cis-web/oauth2/v3/authorization?response_type=code&client_id="+appKey+"&redirect_uri="+redirect;
let searches_started = 0
let searches_complete = 0
let relatives_found = 0
function get_remembered_ancestors(){
    ancestors=localStorage.getItem("ancestors")||"{}"
    return JSON.parse(ancestors)
}

function remember_ancestors(ancestors){
    localStorage.setItem("ancestors",JSON.stringify(ancestors))
    google_form(ancestors)
}

function tag(id){
    return document.getElementById(id)
}

async function logged_in(){
    // cannot use api function because api calls this
    const access_token = localStorage.getItem("authenticatedToken")
    //console.log("access_token",access_token)
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
    if(new Date().valueOf() - localStorage.getItem("authenticatedTokenTime") < 36000000){ //
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
        localStorage.removeItem("authenticatedToken")
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
    //console.log("authenticated",authenticated)
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
    }else if(authenticated){
        token = authenticated
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
    await set_unauthenticated_token()
    
    return localStorage.getItem("unauthenticatedToken") 

}

async function set_unauthenticated_token(){

    const rsp = await fetch('https://ident.familysearch.org/cis-web/oauth2/v3/token', {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=unauthenticated_session&ip_address=${window.location.host}&client_id=` + atob('YTAyajAwMDAwMEtUUmpwQUFI')
    })
    obj=await  rsp.json()

    localStorage.setItem("unauthenticatedToken", obj.token)
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
        //console.log("less than an hour")
        return true
    }

    // its been more than an hour since we last checked  
    const user = JSON.parse(localStorage.getItem("user"))
    const url="https://api.familysearch.org/platform/tree/persons/KWHM-PDN"// + user.person.id
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
        localStorage.setItem("unauthenticatedTokenTime", 0)
        localStorage.setItem("unauthenticatedToken", null)
        return false
    }
    

}

function get_path_direct(elem){ 

    const table=[`<table class="tree" style="margin:1rem 0">`]
    
    for(let x=elem.persons.length-1;x>0;x--){
        const person = elem.persons[x]
        //console.log("person", person.display.name)
        table.push(`<tr><td class="${person.gender.type.endsWith("Female")?"female":"male"}"><a target="_blank" href="https://ancestors.familysearch.org/en/${person.id}">${person.display.name}</a></td></tr>`)
        table.push(`<tr><td>|</td></tr>`)

    }
    table.pop()
    table.push("</table>")
    return table.join("")

}

function get_path_cousin(elem){ 

    const rels=elem.relationships
    const lines=[[],[]]
    let workingon=0
    for(let x=0;x<rels.length-1;x++){
        lines[workingon].push(elem.persons[x])
        if(rels[x].person1.resourceId===rels[x+1].person1.resourceId){
            // the common ancestor
            //console.log(x, rels[x].person1.resourceId, elem.persons[x] )
            //lines[workingon].push(elem.persons[x+1])
            workingon=1
        }
    }
    lines[1].push(elem.persons[rels.length-1])
    lines[1].push(elem.persons[elem.persons.length-1])
    //console.log(lines)
    const pappy=lines[1].shift()
    const table=[`<table class="tree" style="margin:1rem 0"><tr><td class="${pappy.gender.type.endsWith("Female")?"female":"male"}" colspan="3" style="text-align:center"><a target="_blank" href="https://ancestors.familysearch.org/en/${pappy.id}">${pappy.display.name}</a></td></tr>`]
    for(let x=0;x<lines[0].length;x++){
        table.push(`<tr><td>|</td><td>&nbsp;</td><td>${x<lines[1].length?"|":""}</td></tr>`)
        table.push(`<tr><td class="${lines[0][lines[0].length-1-x].gender.type.endsWith("Female")?"female":"male"}"><a target="_blank" href="https://ancestors.familysearch.org/en/${lines[0][lines[0].length-1-x].id}">${lines[0][lines[0].length-1-x].display.name}</a></td><td>&nbsp;</td>`)
        if(x<lines[1].length){
            table.push(`<td class="${lines[1][x].gender.type.endsWith("Female")?"female":"male"}"><a target="_blank" href="https://ancestors.familysearch.org/en/${lines[1][x].id}">${lines[1][x].display.name}</a>`)
        }else{
            table.push("<td>")
        }
        table.push("</td></tr>")

    }
    table.push("</table>")
    return table.join("")

}


function get_path(elem){ 
    const rel_name = elem.persons[elem.persons.length-1].display.relationshipDescription 
    if(rel_name.endsWith("father") || rel_name.endsWith("mother")){
        return get_path_direct(elem)
    }else{
        return get_path_cousin(elem)
    }

}

function show_path(span){ 
    let elem=span
    while(elem.className !== "person"){
        elem=elem.parentElement
    }
    const tree_div=elem.querySelector(".tree")
    //console.log(tree_div.style.display, tree_div.style.display==="none")
    if(tree_div.style.display==="none"){
        //console.log("changing")
        tree_div.style.display="block"
    }else{
        tree_div.style.display="none"
    }
    
}

async function find_relationships(id) {
    //console.log("find rels", id)
    // Iterate person list
    searches_started=0
    searches_complete=0
    relatives_found=0
    //console.log("start", relatives_found)        
    

    let access_token=null
    if(localStorage.getItem("searchMethod")==="myself"){
        access_token = await get_access_token(true)
        if(!access_token){
            return
        }
    }else{
        
        access_token = await get_access_token()
    }


    data.people.forEach(async function(key, idx, array) {
        if (key.pid == "") return;

        let path=null
        if(localStorage.getItem("searchMethod")==="myself"){
            path = 'platform/tree/my-relationships?pid=' + key.pid
        }else{
            path = 'platform/tree/persons/' + id + '/relationships/' + key.pid
        }



        //console.log("key----->", key)
        // Calculate relationship
        //console.log("source pid", id, access_token)
        const options = {headers: {Authorization: 'Bearer ' + access_token}}
        searches_started++
        await fetch("https://api.familysearch.org/" + path, options).then(function(rsp) {
            searches_complete++

            if(searches_complete===searches_started){
                // we are done
                //console.log("done", relatives_found)        
                if(relatives_found===0){
                    let message=`<h2>No Relationship found</h2><p>Well, we did not findy any relatoinships.  But don't feel too bad; here in America, we care more about what <b>you</b> do than what your ancestors have done.</p><p style="font-weight:bold">Be someone great.</p>`
                    let event_data = localStorage.getItem("eventData")
                    if(event_data){ 
                        event_data=JSON.parse(event_data)
                        if(event_data.notFound){
                            message += event_data.notFound 
                        }
                    }
                    $('.relationInfo').html(message)    
                    $('.searchInstructions').hide()    
                }
            }
                // Handle no relationship case
                if (rsp.status === 204){ 
                    return {persons: []};
                }else if(rsp.status === 401){
                    //console.log("========================unauthorized====================")
                    if(localStorage.getItem("searchMethod")==="myself"){
                        localStorage.removeItem("authenticatedToken")
                        localStorage.removeItem("authenticatedTokenTime")
                    }else{
                        localStorage.removeItem("unauthenticatedToken")
                        localStorage.removeItem("unauthenticatedTokenTime")
                    }
                    location.reload()
                }
                
                return rsp.json();
            })
            .then(async function(rsp) {
                //console.log("---------------------------",rsp.persons.length)
                //console.log(rsp)
                if (rsp.persons.length === 0) return;
                relatives_found++
                $('.noRels').hide();

                // Get relationship title
                let type = rsp.persons[rsp.persons.length - 1].display.relationshipDescription.split("My ")[1];

                const level=key.level||get_level(type)
                //console.log("level", level)
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
                const image_url = "https://ancestors.familysearch.org/en/" + key.pid

                place_relative(id,level,`<li data-id="${key.pid}" id="rel-${key.pid}" data-level="${level}">
    <div class="person"><div>
    <a href="${key.url?key.url:image_url}" target="_blank">
    ${image_clause}</a><a href="https://ancestors.familysearch.org/en/${key.pid}" target="_blank">
    </div><div><div><span class="name">${key.name}</span></a>
    <span onclick="show_path(this)" class="show-tree"> (${type})</span></div>
    <div class="tree" style="display:none">${get_path(rsp)}</div>
    <div><span class="cousinDesc">${key.desc}</span></div>
    </div></div>
    </li>`)
            })
    })
}

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function get_sesion_id(){
    let session_id=localStorage.getItem("sessionId")
    if(!session_id){
        session_id=uuidv4()
        localStorage.setItem("sessionId",session_id)
    }
    return session_id
}

function google_form(obj={}){
    // form owned by gove.allen named foundersearch
    obj.sessionId = get_sesion_id()
    obj.set=localStorage.getItem("personSet")
    const google_url="https://docs.google.com/forms/d/e/1FAIpQLScW5De35WzEkgV-iwGPHerRKqVG1hSN3HpAN20q9Dat5-sBTw/formResponse"
    fetch(google_url, {
      method: `POST`,
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'//;charset=UTF-8'
      },
      body:"entry.372178544=" + encodeURIComponent(btoa(JSON.stringify(obj)))
    })
   

}

function place_relative(id,level, div_html){

    //find first id with higer number

    let elem=null
    let node_count=0
    for(const div of tag(id).childNodes){
        node_count ++
        //console.log ("node level",div.dataset.level)
        if(parseInt(div.dataset.level)>level){
            elem=div
            break
        }
    }
    //console.log("nodes", node_count,tag(id))
    
    if(elem===null){
        //console.log("appending")
        $('#'+id).append(div_html)
    }else{
        //console.log("inserting",elem.dataset.id,$("#" + elem.dataset.id))
        $("#rel-" + elem.dataset.id).before(div_html)
    }
}

function get_level(rel_name){
    const num=[]
    for(const digit of rel_name.split("")){
        if(isNaN(digit)){
           break
        }
        num.push(digit)
    }
    
    if(rel_name.includes("mother")||rel_name.includes("father")){
        return 0
    }else if(num.length===0){
        return 20
    }
    
    return (parseInt(num.join(""))+2)*10
}

function test(){
    //console.log(get_level("10th great grandfather"))
    //console.log(get_level("10th great grandmother"))
    //console.log(get_level("great uncle"))
}