let data = null
async function start_me_up() {
    // Get data set name
    
    let set = localStorage.getItem("personSet")
    const pid = new URLSearchParams(window.location.search).get('pid');
    const code = new URLSearchParams(window.location.search).get('code');
      

    

    // Set Login link
    document.getElementById("login").setAttribute("href", authUrl);

    // Get the JWT
    if (code) {
        // cannot use api function because it is an anauthenticated request
        let rsp = await fetch('https://ident.familysearch.org/cis-web/oauth2/v3/token?redirect_uri='+redirect, {
                method: "POST",
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'grant_type=authorization_code&code='+code+'&client_id='+appKey
            })
        let obj = await rsp.json() 
        localStorage.setItem("authenticatedToken", obj.access_token)
        localStorage.setItem("unauthenticatedToken", obj.access_token)
        localStorage.setItem("authenticatedTokenTime", new Date().valueOf())
        localStorage.setItem("unauthenticatedTokenTime", new Date().valueOf())
        

        //console.log("obj",JSON.stringify(obj))
        //const user = JSON.parse(atob(obj.id_token.split('.')[1]));
        const user={}
        // get the current user's PID 

        // rsp = await fetch('https://api.familysearch.org/?access_token=' + obj.access_token)
        // obj = await rsp.json() 
        obj = await api("platform/users/current",true,{method:"GET",headers:{authorization:"Bearer " + obj.access_token}})
        user.person=obj.users[0]
        user.person.id=user.person.personId
        user.person.name = user.person.displayName
        //console.log("user",user)
        localStorage.setItem("user", JSON.stringify(user))
        //console.log("ready to redirect")
        //console.log("obj",JSON.stringify(obj))    
        location.href = `relatives.html`
    }

    refresh_unauthenticated_token()


    if (set === null) {
        $('body').html('<center><h1 style="margin-top: 200px;">No Data :-(</h1><p>You must supply a data set to use.</p></center>');
        // throw new Error("No data set suplied!");
    }
   
   
    let event_data = localStorage.getItem("eventData")
    if(event_data){ 
        event_data=JSON.parse(event_data)
        tag("help-clause").innerHTML=event_data.help
        tag("help-clause").style.display=""
    }

    // Load data set meta
    let rsp = await fetch(set)
    

    if (rsp.status != 200) {
        $('body').html('<h1>Invalid data set :-(</h1>');
    }
    let obj = await rsp.json();
    data = obj;

    $('.title').text(data.title);
    $('.desc').text(data.desc);
    let image_url=data.banner
    if(!image_url.startsWith("http")){
        image_url="/images/"+image_url
    }
    $('.banner').attr('style', 'background-image: url(' + image_url + '); background-size: cover;');
    $('body').attr('style', 'background-color: ' + data.backgroundColor + '; color: ' + data.textColor + ';');

    // Ensure smaller than 100 PIDs
    if (data.people.length > 400) {
        alert("Data set too large! Must be fewer than 100 people :-(");
        $('.search').hide();
    }

    // search style
    const search_method=localStorage.getItem("searchMethod")
    if(search_method==="myself"){
        set_search_myself(false)
    }else if(search_method==="ancestor"){
        set_search_ancestor(false)
    }

    // list remembered
    const ancestors=get_remembered_ancestors()


    // Tree Search
    $('.search').click(async function() {


         $(".invalid-feedback").hide()

        const ancestors=get_remembered_ancestors()

        //if form is empty and we have a remembered ancestor, then search
        if(
            $("[name='given']").val() === ""  &&
            $("[name='birthLikeDateBegin']").val() === ""  &&
            $("[name='birthLikePlace']").val() === ""  &&
            $("[name='deathLikeDateBegin']").val() === ""  &&
            $("[name='deathLikePlace']").val() === ""  &&
            $("[name='surname']").val() === ""  &&
            ancestors &&
            Object.keys(ancestors).length>0
        
        ){
            location.href="/relatives.html"
        }


        //validate
        let invalid_count=0
        if( $("[name='surname']").val() === "" ){
            $("#surname-missing").show()
            invalid_count++
        }
        if(isNaN($("[name='birthLikeDateBegin']").val())){
            $("#birth-year-invalid").show()
            invalid_count++
        }
        if(isNaN($("[name='deathLikeDateBegin']").val())){
            $("#death-year-invalid").show()
            invalid_count++
        }

        if(invalid_count>0){
            return
        }

        $('.results, .related').empty();
        $('.result-list').empty();
        $('').show();
        $('.ancestor-list').html("Select your ancestor below");
        URL = "q.surname=" + $("[name='surname']").val();
        if ($("[name='given']").val() != "") URL += '&q.givenName=' + $("[name='given']").val();
        if ($("[name='birthLikeDateBegin']").val() != "") URL += "&q.birthLikeDate=" + $("[name='birthLikeDateBegin']").val();
        if ($("[name='birthLikePlace']").val() != "") URL += "&q.birthLikePlace=" + $("[name='birthLikePlace']").val();
        if ($("[name='deathLikeDateBegin']").val() != "") URL += "&q.deathLikeDate=" + $("[name='deathLikeDateBegin']").val();
        if ($("[name='deathLikePlace']").val() != "") URL += "&q.deathLikePlace=" + $("[name='deathLikePlace']").val();


        let  autheticated=false
        if(await logged_in()){
            autheticated = localStorage.getItem("authenticatedToken")
        }

        const search=await api('platform/tree/search?' + URL + "&count=20",autheticated, {headers:{Accept: "application/json"}})
        //console.log("search", search)
        for (let i = 0; i < search.entries.length; i++) {
            p = search.entries[i].content.gedcomx.persons[0].display;
            p.id = search.entries[i].content.gedcomx.persons[0].id;
            place_ancestor(p, ancestors, autheticated)
           
        }
    });

    // Find relationships (Click on search result)
    //console.log("data", data)
    $('.results').on('click', '.result', go_to_relatives)//launch_relationships);
    //$('#login').on('click', login);

    //await set_unauthenticated_token()
    

    fill()

    if(Object.keys(ancestors).length>0){
        $('.remembered').css({ "display": ''});
        $('.remembered').click(show_remembered_ancestors)
        show_remembered_ancestors()
    }

}


function show_remembered_ancestors() {
        const ancestors=get_remembered_ancestors()
    $('.ancestor-list').html("Your remembered ancestors");
    $('.result-list').hide();
    $('.results, .related').empty();
    $('.ancestor-list').show();
    //console.log(ancestors)
    for(const key of Object.keys(ancestors)){
        //console.log("entry", ancestors[key])
        place_ancestor(ancestors[key], ancestors)
    }
}

async function place_ancestor(p, ancestors, authenticated){
    const access_token = await get_access_token()
    
    //console.log("at place ancestors")
    if (p.birthPlace == undefined) p.birthPlace = "";

    let birthYear = (p.birthDate) ? new Date(p.birthDate).getUTCFullYear() : "";
    let deathYear = (p.deathDate) ? new Date(p.deathDate).getUTCFullYear() : "";
    let age = (birthYear && deathYear) ? "(Age " + Math.abs(deathYear - birthYear) + ")" : "";

    // Check for NaN (Safari won't parse dates like "October 1893")
    if (isNaN(birthYear)) birthYear = p.birthDate;
    if (isNaN(deathYear)) deathYear = p.deathDate;

    // Get gender portrait
    let portrait = "/images/male.svg";
    if (p.gender == "Female") portrait = "/images/female.svg";

    let image_clause = null
    if(authenticated===true){
       image_clause = `<div><img class="portrait" src="https://api.familysearch.org/platform/tree/persons/${p.id}/portrait?default=${portrait}&access_token=${access_token}"></div>`
    }else if(authenticated){
        image_clause = `<div><img class="portrait" src="https://api.familysearch.org/platform/tree/persons/${p.id}/portrait?default=${portrait}&access_token=${authenticated}"></div>`
    }else{
        image_clause = `<div><img class="portrait" src="${portrait}"></div>`
    }


    $('.results').append(`<li class="result" data-record="${btoa(JSON.stringify(p))}" data-id="${p.id}" ${ancestors[p.id]?' style="background-color:#eee;padding:5px 10px;"':''}>
<div class="person">${image_clause}
<div><span class="name">${p.name} ${age}</span>
<br /><span class="lifespan"><u>Born:</u> ${p.birthDate||""}${p.birthPlace?", ":""}${p.birthPlace||""}</span>
<br /><span class="lifespan"><u>Died:</u> ${p.deathDate||""}${p.deathPlace?", ":""}${p.deathPlace||""}</span>
<br /><br /><span  class="msg"${ancestors[p.id]?"":' style="display:none"'}>This ancestor has been remembered (<span style="text-decoration: underline;color:blue;" onclick="forget(event)" >forget</style>)</span>
</div></div>
</li>`);
}


function forget(evt){
    evt.stopPropagation()
    let elem = evt.currentTarget
    elem.parentElement.style.display="none"
    while(elem.tagName!=="LI"){
        //console.log(elem.tagName)
        elem = elem.parentElement
    }
    elem.style.backgroundColor=""
    elem.style.padding=""
    //console.log("e", elem.dataset.id)
    const ancestors=get_remembered_ancestors()
    delete ancestors[elem.dataset.id]
    remember_ancestors(ancestors)
    if(Object.keys(ancestors).length===0){
        //tag("show-remembered-ancestors").style.display="none"
    }
}


function go_to_relatives(evt){
    const ancestors=get_remembered_ancestors()
    const li = evt.currentTarget
    let p =  JSON.parse(atob(li.dataset.record))
    ancestors[p.id]=p
    remember_ancestors(ancestors)
    //console.log("ancestore",ancestors)
    location.href="relatives.html"
}

async function launch_relationships(evt) {
    // show the relationships on the config page.    
    tag("show-remembered-ancestors").style.display=""
    const li = evt.currentTarget
    let p =  JSON.parse(atob(li.dataset.record))
    li.style.padding = "5px 10px"
    li.style.backgroundColor = "#eee"
    li.querySelector(".msg").style.display=""
    $('.relationInfo').show();
    $('.relationInfo').html(`<h3 class="searchInstructions">${p.name} is related to</h3><ul id="${p.id}" class="related"></ul>`);
    $('.noRels').show();
    $('.result-list').show();
    $('.result-list').html(p.name + " " + " is realted to:")

    ancestors=get_remembered_ancestors()
    ancestors[p.id]=p
    remember_ancestors(ancestors)
    //console.log("p.id",p.id)
    find_relationships(p.id)
}

function fill(){
    return
    //console.log("fill")
    document.getElementsByName("given")[0].value="Gary"
    document.getElementsByName("surname")[0].value="Allen"
    document.getElementsByName("birthLikeDateBegin")[0].value="1937"
    document.getElementsByName("deathLikeDateBegin")[0].value="1996"
}

async function set_search_ancestor(clicked=true){
    //console.log(0)

    if(localStorage.getItem("searchMethod")==="ancestor" && 
       localStorage.getItem("ancestors") && 
       Object.keys(localStorage.getItem("ancestors")).length>0 &&
       tag("panel-ancestor").style.display===""
      ){
        //console.log(1)
        if(clicked){
            //console.log(2)
            location.href = 'relatives.html'
        }
    }else{
        show_panel('panel-ancestor')
    }
    remember_search_method('ancestor')
}

async function set_search_myself(clicked=true){
    // check to see if see we are logged in
    const access_token = localStorage.getItem("accessToken")
    if(await logged_in()){
        //console.log("logged in =============================")
        if(localStorage.getItem("searchMethod")==="myself"){
            //we are logged in and we are searching as self, just search
            if(clicked){
                location.href = 'relatives.html'
            }
        }else{
            show_panel('panel-myself');
            $("#myself-login").hide()
            $("#myself-logout").show()
            $("#myself-search").show()                    
        }
    }else{
        //console.log("============================ logged out")
        show_panel('panel-myself');
    }
    remember_search_method('myself')

}

function show_panel(panel_id){
    $(".panel").hide()
    $("#"+panel_id).show()
}

function remember_search_method(search_method){
    //console.log("setting search method", search_method)
    localStorage.setItem("searchMethod", search_method)
}

function logout_from_familysearch(){
    //console.log("logging out")
    api("platform/logout","none",{method:"POST"})
    localStorage.setItem("unauthenticatedToken",localStorage.getItem("authenticatedToken"))
    localStorage.removeItem("authenticatedToken")
    $("#myself-login").show()
    $("#myself-logout").hide()
    $("#myself-search").hide()                    
}