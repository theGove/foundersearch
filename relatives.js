let data = null;
async function start_me_up() {
    // Get data set name
    let set = new URLSearchParams(window.location.search).get('set');
    let event = new URLSearchParams(window.location.search).get('event');
    if (set === null) {
        set="mayflower"
    }
    if(event){
        if(!event.startsWith("http")){event = "events/"+event+".json"}
        fetch(event)
        .then(response => response.json())
        .then(event_data => {
            localStorage.eventData=JSON.stringify(event_data)
        });

    }    

    const ancestors=get_remembered_ancestors()
    console.log("ancestors",ancestors)
    if(Object.keys(ancestors).length===0){
        location.href = `config.html?set=${set}`
        return
    }

    $('.adj-ancestors').click(function() {
        console.log("xset",set)

        if(set.startsWith("sets/")){
            set=set.substring(5)
        }
        location.href = `config.html?set=${set}`
    })

    // Load data set meta
    let rsp=null
    if(set.startsWith("http")){
        rsp = await fetch(set)
    }else{
        rsp = await fetch("sets/"+set+".json")
    }
    
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
    console.log("ancestors", ancestors)
    for(const ancestor of Object.values(ancestors) ){
        find_relationships(ancestor)
        
    }
    
    


}



async function find_relationships(ancestor) {
    const id=ancestor.id
    console.log("clicked", data)
    $('.relationInfo').append(`<h3 class="searchInstructions">${ancestor.name} is related to</h3><ul id="${ancestor.id}" class="related"></ul>`);
    $('.noRels').show();

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

                $('#'+id).append('<li data-id="' + key.pid + '">\
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
