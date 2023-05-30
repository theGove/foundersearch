let data = null;
async function start_me_up() {
    // Get data set name
    const set = new URLSearchParams(window.location.search).get('set');
    const pid = new URLSearchParams(window.location.search).get('pid');
    
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
    $('.banner').attr('style', 'background-image: url(' + data.banner + '); background-size: cover;');
    $('body').attr('style', 'background-color: ' + data.backgroundColor + '; color: ' + data.textColor + ';');

    // Ensure smaller than 100 PIDs
    if (data.people.length > 100) {
        alert("Data set too large! Must be fewer than 100 people :-(");
        $('.search').hide();
    }

    // search style
    const search_method=localStorage.getItem("searchMethod")
    if(search_method){
        show_panel("panel-"+search_method)
    }

    // list remembered
    const ancestors=get_remembered_ancestors()


    // Tree Search
    $('.search').click(function() {
        $('.results, .related').empty();
        $('.result-list').empty();
        $('').show();
        $('.ancestor-list').html("Select your ancestor below");
        const ancestors=get_remembered_ancestors()
        URL = "q.surname=" + $("[name='surname']").val();
        if ($("[name='given']").val() != "") URL += '&q.givenName=' + $("[name='given']").val();
        if ($("[name='birthLikeDateBegin']").val() != "") URL += "&q.birthLikeDate=" + $("[name='birthLikeDateBegin']").val();
        if ($("[name='birthLikePlace']").val() != "") URL += "&q.birthLikePlace=" + $("[name='birthLikePlace']").val();
        if ($("[name='deathLikeDateBegin']").val() != "") URL += "&q.deathLikeDate=" + $("[name='deathLikeDateBegin']").val();
        if ($("[name='deathLikePlace']").val() != "") URL += "&q.deathLikePlace=" + $("[name='deathLikePlace']").val();
        fetch('https://api.familysearch.org/platform/tree/search?' + URL + "&count=10", {
            headers: {
                Authorization: "Bearer " + token,
                Accept: "application/json"
            }
        }).then(function(rsp) {
            return rsp.json()
        }).then(function(search) {
            for (let i = 0; i < search.entries.length; i++) {
                p = search.entries[i].content.gedcomx.persons[0].display;
                p.id = search.entries[i].content.gedcomx.persons[0].id;
                place_ancestor(p, ancestors)
               
            }
        });
    });

    // Find relationships (Click on search result)
    console.log("data", data)
    $('.results').on('click', '.result', find_relationships);

    // Get unauthenticated access token
    rsp = await fetch('https://ident.familysearch.org/cis-web/oauth2/v3/token', {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=unauthenticated_session&ip_address=127.0.0.1&client_id=' + atob('YTAyajAwMDAwMEtUUmpwQUFI')
        })
    obj=await  rsp.json()
    token = obj.token;

    // Get user session
    rsp = await fetch('https://strategicsolutions.herokuapp.com/tree/api/fs')
    obj = await  rsp.json()
    token2 = obj.token
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
    console.log(ancestors)
    for(const key of Object.keys(ancestors)){
        console.log("entry", ancestors[key])
        place_ancestor(ancestors[key], ancestors)
    }
}

function place_ancestor(p, ancestors){
    console.log("at place ancestors")
    if (p.birthPlace == undefined) p.birthPlace = "";

    let birthYear = (p.birthDate) ? new Date(p.birthDate).getUTCFullYear() : "";
    let deathYear = (p.deathDate) ? new Date(p.deathDate).getUTCFullYear() : "";
    let age = (birthYear && deathYear) ? "(Age " + Math.abs(deathYear - birthYear) + ")" : "";

    // Check for NaN (Safari won't parse dates like "October 1893")
    if (isNaN(birthYear)) birthYear = p.birthDate;
    if (isNaN(deathYear)) deathYear = p.deathDate;

    // Get gender portrait
    let portrait = "https://cousin.surge.sh/male.svg";
    if (p.gender == "Female") portrait = "https://cousin.surge.sh/female.svg";

    // Can't get portraits with unauthenticated session :-(
    $('.results').append(`<li class="result" data-record="${btoa(JSON.stringify(p))}" data-id="${p.id}" ${ancestors[p.id]?' style="background-color:#eee;padding:5px 10px;"':''}>
<div class="person"><div><img class="portrait" src="https://api.familysearch.org/platform/tree/persons/${p.id}/portrait?default=${portrait}&access_token=${token2}"></div>
<div><span class="name">${p.name} ${age}</span>
<br /><span class="lifespan">${birthYear} -- ${deathYear}</span>
<br /><span  class="msg"${ancestors[p.id]?"":' style="display:none"'}>This ancestor has been remembered (<span style="text-decoration: underline;color:blue;" onclick="forget(event)" >forget</style>)</span>
</div></div>
</li>`);
}


function forget(evt){
    evt.stopPropagation()
    let elem = evt.currentTarget
    elem.parentElement.style.display="none"
    while(elem.tagName!=="LI"){
        console.log(elem.tagName)
        elem = elem.parentElement
    }
    elem.style.backgroundColor=""
    elem.style.padding=""
    console.log("e", elem.dataset.id)
    const ancestors=get_remembered_ancestors()
    delete ancestors[elem.dataset.id]
    remember_ancestors(ancestors)
    if(Object.keys(ancestors).length===0){
        tag("show-remembered-ancestors").style.display="none"
    }
}




async function find_relationships(evt) {
    tag("show-remembered-ancestors").style.display=""
    console.log("clicked", data)
    const li = evt.currentTarget
    let p =  JSON.parse(atob(li.dataset.record))
    let id=p.id
    li.style.padding = "5px 10px"
    li.style.backgroundColor = "#eee"
    li.querySelector(".msg").style.display=""
    console.log("record",p)
    console.log("id",id)
    $('.relationInfo').show();
    $('.related').empty();
    $('.noRels').show();
    $('.result-list').show();
    $('.result-list').html(p.name + " " + " is realted to:")
    ancestors=get_remembered_ancestors()
    ancestors[id]=p
    remember_ancestors(ancestors)



    // TODO: If a user object is found, use it instead and skip search form
    // Problem: Unauthenticated session, OR pid-to-pid doesn't support living people
    // let user = JSON.parse(localStorage.getItem('user'));
    // if (user) {
    //  console.log("Found User: "+user.personId+", "+user.displayName+", "+user.jwt.sessionId);
    //  id = user.personId;
    //  token, token2 = user.jwt.sessionId;
    // }

    // Iterate person list
    data.people.forEach(async function(key, idx, array) {
        if (key.pid == "") return;

        // Calculate relationship
        await fetch('https://api.familysearch.org/platform/tree/persons/' + id + '/relationships/' + key.pid, {
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }).then(function(rsp) {
                // Handle no relationship case
                if (rsp.status == 204) return {
                    persons: []
                };
                return rsp.json();
            })
            .then(function(rsp) {
                if (rsp.persons.length == 0) return;
                $('.noRels').hide();

                // Get relationship title
                let type = rsp.persons[rsp.persons.length - 1].display.relationshipDescription.split("My ")[1];

                // Get gender portrait
                let portrait = "https://cousin.surge.sh/male.svg";
                // if (p.gender == "Female") portrait = "https://cousin.surge.sh/female.svg";

                $('.related').append('<li data-id="' + key.pid + '">\
    <div class="person"><div>\
    <a href="https://ancestors.familysearch.org/en/' + key.pid + '" target="_blank">\
    <img class="portrait" src="https://api.familysearch.org/platform/tree/persons/' + key.pid + '/portrait?default=' + portrait + '&access_token=' + token2 + '">\
    </div><div><span class="name">' + key.name + '</span>\
    <span> (' + type + ')</span>\
    <br /><span class="cousinDesc">' + key.desc + '</span>\
    </div></div></a>\
    </li>');
            });
    });
}

function fill(){
    console.log("fill")
    document.getElementsByName("given")[0].value="Gary"
    document.getElementsByName("surname")[0].value="Allen"
    document.getElementsByName("birthLikeDateBegin")[0].value="1937"
    document.getElementsByName("deathLikeDateBegin")[0].value="1996"
}

function show_panel(panel_id){
    $(".panel").hide()
    $("#"+panel_id).show()
}

function remember_search_method(search_method){
    localStorage.setItem("searchMethod", search_method)
}