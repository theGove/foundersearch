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
    google_form()
    if(event){
        if(!event.startsWith("http")){event = "events/"+event+".json"}
        fetch(event)
        .then(response => response.json())
        .then(event_data => {
            localStorage.eventData=JSON.stringify(event_data)
        });

    }    

    refresh_unauthenticated_token()

    const ancestors=get_remembered_ancestors()
    //console.log("ancestors",ancestors)
    const search_method=localStorage.getItem("searchMethod")
    if(!search_method || 
      (search_method==='ancestor' && Object.keys(ancestors).length===0) ||
      (search_method==='myself' && !await logged_in()) 
    ){
        location.href = `config.html`
        return
    }

    $('.adj-ancestors').click(function() {
        //console.log("xset",set)
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
    let image_url=data.banner
    if(!image_url.startsWith("http")){
        image_url="/images/"+image_url
    }
    $('.banner').attr('style', 'background-image: url(' + image_url + '); background-size: cover;');
    $('body').attr('style', 'background-color: ' + data.backgroundColor + '; color: ' + data.textColor + ';');

    // Ensure smaller than 100 PIDs
    if (data.people.length > 400) {
        alert("Data set too large! Must be fewer than 400 people :-(");
        $('.search').hide();
    }


    if(localStorage.getItem("searchMethod")==="myself"){
        const user=JSON.parse(localStorage.getItem("user"))
        launch_relationships(user.person)
    }else{
        for(const ancestor of Object.values(ancestors) ){
            launch_relationships(ancestor)
        }
    }
}

function launch_relationships(ancestor){
    //console.log("clicked", ancestor)
    $('.relationInfo').append(`<div class="relative-header">${ancestor.name} is related to:</div><div id="results-${ancestor.id}"><ul id="${ancestor.id}" class="related"></ul></id>`);
    $('.noRels').show();
    find_relationships(ancestor.id)
}
