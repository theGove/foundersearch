let data = null;
async function start_me_up() {
    // Get data set name
    let set = new URLSearchParams(window.location.search).get('set');
    let event = new URLSearchParams(window.location.search).get('event');
    if(set){  // as set was passed in, see if it needs adjusting
        if(!set.startsWith("http")){
            set = "sets/"+set+".json"
        }
    }else {  // no set was passed in, check local storage
        set=localStorage.getItem("personSet")
        if(!set){//no set in local storage.  Use default
            set="/sets/mayflower.json"
        }
        
    }

    // remember the set
    localStorage.setItem("personSet",set)

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
    
    if(!localStorage.getItem("searchMethod") || (localStorage.getItem("searchMethod")==='ancestor' && Object.keys(ancestors).length===0)){
        location.href = `config.html`
        return
    }

    $('.adj-ancestors').click(function() {
        console.log("xset",set)

        if(set.startsWith("sets/")){
            set=set.substring(5)
        }
        location.href = `config.html`
    })

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


    if(localStorage.getItem("searchMethod")==="myself"){
        const user=JSON.parse(sessionStorage.getItem("user"))
        find_relationships(user.person)
    }else{
        for(const ancestor of Object.values(ancestors) ){
            find_relationships(ancestor)
        }
    }
}

async function find_relationships(ancestor) {
    const id=ancestor.id
    console.log("clicked", ancestor)
    $('.relationInfo').append(`<h3 class="searchInstructions">${ancestor.name} is related to</h3><ul id="${ancestor.id}" class="related"></ul>`);
    $('.noRels').show();

    // Iterate person list
    data.people.forEach(async function(key, idx, array) {
        if (key.pid == "") return;

        // Calculate relationship
        let url=null
        if(localStorage.getItem("searchMethod")==="myself"){
            url = 'https://api.familysearch.org/platform/tree/my-relationships?pid=' + key.pid
        }else{
            url = 'https://api.familysearch.org/platform/tree/persons/' + id + '/relationships/' + key.pid
        }
        
        const options = {headers: {Authorization: 'Bearer ' + sessionStorage.getItem("accessToken")}}
        console.log("checking relationship", url, options)
        await fetch(url, options).then(function(rsp) {
                // Handle no relationship case
                if (rsp.status == 204){ 
                    return {persons: []};
                }
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
    <img class="portrait" src="https://api.familysearch.org/platform/tree/persons/' + key.pid + '/portrait?default=' + portrait + '&access_token=' + sessionStorage.getItem("accessToken") + '">\
    </div><div><span class="name">' + key.name + '</span>\
    <span> (' + type + ')</span>\
    <br /><span class="cousinDesc">' + key.desc + '</span>\
    </div></div></a>\
    </li>');
            });
    });
}
