let data = null;
async function start_me_up() {
    // Get data set name
    const set = new URLSearchParams(window.location.search).get('set');
    const pid = new URLSearchParams(window.location.search).get('pid');
    if (set == null) {
        $('body').html('<center><h1 style="margin-top: 200px;">No Data :-(</h1><p>You must supply a data set to use.</p></center>');
        // throw new Error("No data set suplied!");
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

    // Tree Search
    $('.search').click(function() {
        $('.results, .related').empty();
        $('.searchInstructions').show();

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
                $('.results').append('<li class="result" data-id="' + p.id + '">\
        <div class="person"><div><img class="portrait" src="https://api.familysearch.org/platform/tree/persons/' + p.id + '/portrait?default=' + portrait + '&access_token=' + token2 + '"></div>\
        <div><span class="name">' + p.name + ' ' + age + '</span>\
        <br /><span class="lifespan">' + birthYear + ' -- ' + deathYear + '</span>\
        </div></div>\
        </li>');
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

    // if a pid was passed in, search immediately
    if(pid){
        find_relationships({currentTarget:{dataset:{id:pid}}})
    }    

}

async function find_relationships(evt) {
    
    console.log("clicked", data)
    let id =  evt.currentTarget.dataset.id;
    $('.relationInfo').show();
    $('.related').empty();
    $('.noRels').show();

    // TODO: If a user object is found, use it instead and skip search form
    // Problem: Unauthenticated session, OR pid-to-pid doesn't support living people
    let user = JSON.parse(localStorage.getItem('user'));
    if (user) {
     console.log("Found User: "+user.personId+", "+user.displayName+", "+user.jwt.sessionId);
     id = user.personId;
     token, token2 = user.jwt.sessionId;
    }

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
