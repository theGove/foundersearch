//:8123248186365035307:1348435392098232568: this is the blog id and post id
const  appKey = atob("YjBLN1JXUVNKVUQ4QQ")
const redirect = encodeURIComponent(window.location.origin + "/1970/01/auth.html")
const authUrl = `https://ident.familysearch.org/cis-web/oauth2/v3/authorization?response_type=code&client_id=${appKey}&redirect_uri=${redirect}`
let searches_started = 0
let searches_complete = 0
let relatives_found = 0


async function initialize(){
 // check to see if we have a localStorage item of  apiCode
 // if so, we are coming in from a authRedirect.  need to get the token
 const apiCode = localStorage.getItem("apiCode")
 if(apiCode){
    await setFsToken(apiCode)
 }



    tag("login").setAttribute("href", authUrl);
    showPage()
}

async function setFsToken(code){

 
        let rsp = await fetch('https://ident.familysearch.org/cis-web/oauth2/v3/token?redirect_uri='+redirect, {
              method: "POST",
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
              body: `grant_type=authorization_code&code=${code}&client_id=${appKey}`
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
     // //console.log("person-------",JSON.stringify(obj))
     //console.log("about to fetch")
      google_form(obj)

      user.person=obj.users[0]
      user.person.id=user.person.personId
      user.person.name = user.person.displayName
      //console.log("user",user)
      localStorage.setItem("user", JSON.stringify(user))
      localStorage.removeItem("apiCode")










 
}


function showPage(){
 console.log("at showpage") 
  const data = JSON.parse(tag(`post-json`).innerHTML)
console.log("data",data)
  if(!data.searchMethods){data.searchMethods=["living","dead"]}
  tag("location").replaceChildren(data.locationLabel)
  tag("head-location").replaceChildren(data.locationLabel)
  tag("location").style.fontSize=data.locationSize
  let setName = data.searchSets[0].set_id  // the default search set
  console.log("setname 1", setName)
  if(window.location.search){
      possibleSetName = getSetNameFromSearch()
      console.log(possibleSetName)
      if(possibleSetName){
          setName=possibleSetName
      }
  }
  console.log("setName",setName)

//now we have a set name, fetch the set
  localStorage.setItem("personSet", setName)
  //set the current index path in case we need to redirect
  localStorage.setItem("setIndex", window.location.origin + window.location.pathname)
  const pathArray = location.pathname.split("/") 
  pathArray.length=3
  pathArray.push(setName+ ".html")
  console.log("url-->",pathArray.join("/"))
  console.log("location.pathname-->",location.pathname)
  console.log("setName-->",setName)
  fetch(pathArray.join("/")).then(function(response){return response.text()})
        .then(function(html){
              console.log("set---", html)		
            doc = new DOMParser().parseFromString(html,`text/xml`)
            const setData = JSON.parse(doc.getElementById("post-json").innerHTML)
            console.log(setData)
            tag("heading").style.display="block"
            tag("center-box").style.display="none"

            //decide what to show
              if(localStorage.getItem('searchMethod')){
               // a search method is already established, show results
               console.log("trying to show results")  
            }else{
               tag("search-method").style.display="block"
               // no search method established, show person selector
               console.log(data)
               for(const searchMethod of data.searchMethods){
                    tag("search-" + searchMethod).style.display="block"
               }
               if(data.searchMethods.length>1){
                    tag("search-or").style.display="block"
                 }
            }

        })

}//end of show page

function search(){}



function getSetNameFromSearch(){
  // returns the frist name/value pair with no equal sign
  const params = window.location.search.slice(1).split("&")
  for(const param of params){
    if(!param.includes("=")){return param}
  }
  return null
}

function tag(id){return document.getElementById(id)}
function nam(id){return document.getElementsByName(id)[0]}
function hide(elem){show(elem,"none")}
function show(elem_or_query_selector, display=""){
    // takes an element or tag array or querySelector string and shows or hides all matching
    let elems=elem_or_query_selector
    if(typeof elems === 'string'){
        elems=document.querySelectorAll(elem_or_query_selector)
    }
    if(elems.length){
        for(const elem of elems){
            elem.style.display=display
        }
    }else{
       elems.style.display=display
    }
}
async function searchAncestor() {
    console.log("searching for ancestors", nam('given'))


   hide(".invalid-feedback")

   const ancestors=get_remembered_ancestors()

//    //if form is empty and we have a remembered ancestor, then search
//    if(
//                     nam('given').value === ""  &&
//        nam('birthLikeDateBegin').value === ""  &&
//            nam('birthLikePlace').value === ""  &&
//        nam('deathLikeDateBegin').value === ""  &&
//            nam('deathLikePlace').value === ""  &&
//                   nam('surname').value === ""  &&
//        ancestors &&
//        Object.keys(ancestors).length>0
   
//    ){
//        location.href="/relatives.html"
//    }


   //validate
   let invalid_count=0
   if( nam('surname').value === "" ){
       show(tag("surname-missing"))
       invalid_count++
   }
   if(isNaN(nam('birthLikeDateBegin').value)){
       show(tag("birth-year-invalid"))
       invalid_count++
   }
   if(isNaN(nam('deathLikeDateBegin').value)){
       show(tag("death-year-invalid"))
       invalid_count++
   }

   if(invalid_count>0){
       return
   }

//    $('.results, .related').empty();
//    $('.result-list').empty();
//    $('').show();
//    $('.ancestor-list').html("Select your ancestor below");

   URL = "q.surname=" + nam('surname').value
   if (nam('given'             ).value !== "") URL += '&q.givenName='      + nam('given'             ).value
   if (nam('birthLikeDateBegin').value !== "") URL += "&q.birthLikeDate="  + nam('birthLikeDateBegin').value
   if (nam('birthLikePlace'    ).value !== "") URL += "&q.birthLikePlace=" + nam('birthLikePlace'    ).value
   if (nam('deathLikeDateBegin').value !== "") URL += "&q.deathLikeDate="  + nam('deathLikeDateBegin').value
   if (nam('deathLikePlace'    ).value !== "") URL += "&q.deathLikePlace=" + nam('deathLikePlace'    ).value


   let  authenticated=false
   if(await logged_in()){
       authenticated = localStorage.getItem("authenticatedToken")
   }

   const search=await api('platform/tree/search?' + URL + "&count=20",authenticated, {headers:{Accept: "application/json"}})
   //console.log("search", search)
   for (let i = 0; i < search.entries.length; i++) {
       p = search.entries[i].content.gedcomx.persons[0].display;
       p.id = search.entries[i].content.gedcomx.persons[0].id;
       place_ancestor(p, ancestors, authenticated)
      
   }
}


function get_remembered_ancestors(){
  ancestors=localStorage.getItem("ancestors")||"{}"
  return JSON.parse(ancestors)
}

async function api(path, authenticated="either", options={method:"GET"}){
    // path is the part of the URL that goes after familysearch.org/
    console.log("at api",path, authenticated, options)
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
    debugger
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

    const{li,div,img,span,br}=van.tags()
    
    let image_clause = null
    if(authenticated===true){
       image_clause = img({class:"portrait", src:`https://api.familysearch.org/platform/tree/persons/${p.id}/portrait?default=${portrait}&access_token=${access_token}`})
    }else if(authenticated){
        image_clause = img({class:"portrait", src:`https://api.familysearch.org/platform/tree/persons/${p.id}/portrait?default=${portrait}&access_token=${authenticated}`})
    }else{
        image_clause = img({ class:`"portrait" src:"${portrait}"`,onerror:"this.onerror = null; this.src = 'https://miro.medium.com/v2/resize:fit:720/format:webp/1*2B0CcKDE1hAm7cJErdp5XA.png"})
    }
    

    tag("results").appendChild(
        li({class:"result", "data-record":btoa(JSON.stringify(p)), "data-id":p.id},
            div({class:"person"},
                div(image_clause),
                div(
                    div({class:"name"},`${p.name} ${age}`),
                    div(span({style:"text-decoration:underline"},"Born:"),`${p.birthDate||""}${p.birthPlace?", ":""}`),
                    div(span({style:"text-decoration:underline"},"Died:"),`${p.deathDate||""}${p.deathPlace?", ":""}`),
                )
            )
        )
    )
    
    
    // " ${ancestors[p.id]?' style="background-color:#eee;padding:5px 10px;"':''}>
    // <div class="person">${image_clause}
    // <div><span class="name">${p.name} ${age}</span>
    // <br /><span class="lifespan"><u>Born:</u> ${p.birthDate||""}${p.birthPlace?", ":""}${p.birthPlace||""}</span>
    // <br /><span class="lifespan"><u>Died:</u> ${p.deathDate||""}${p.deathPlace?", ":""}${p.deathPlace||""}</span>
    // <br /><br /><span  class="msg"${ancestors[p.id]?"":' style="display:none"'}>This ancestor has been remembered (<span style="text-decoration: underline;color:blue;" onclick="forget(event)" >forget</style>)</span>
    // </div></div>
    // </li>`)
    }
    

    ///////////////////////////////////////////////////////////////////////
   //                                                                   //
  //             Old Common Functions                                  //
 //                                                                   //
///////////////////////////////////////////////////////////////////////


function remember_ancestors(ancestors){
  localStorage.setItem("ancestors",JSON.stringify(ancestors))
  google_form(ancestors)
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
          path = 'platform/tree/persons/CURRENT/relationships/' + key.pid
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
                  let message=`<h2>No Relationship found</h2><p>Well, we did not find any relationships.  But don't feel too bad; here in America, we care more about what <b>you</b> do than what your ancestors have done.</p><p style="font-weight:bold">Be someone great.</p>`
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

  //find first id with higher number

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



    ///////////////////////////////////////////////////////////////////////
   //                                                                   //
  //             Old config Functions                                  //
 //                                                                   //
///////////////////////////////////////////////////////////////////////


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

initialize()
