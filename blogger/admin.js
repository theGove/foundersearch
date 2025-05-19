//:8123248186365035307:2919519950978649374: this is the blog id and post id

const global = {
  group: null,
  set: null,
  person: null,
  deploymentId:
    "AKfycbwFq0KEKxOBw8DPl_1kGrEop7C1nKIgCkh6d7Z1GUGviEGJ_PcPItZ5Gje0FK1R4seW",
};

function pubEditToggle(evt) {
  console.log("ButtonTest clicked", evt.target.checked);

  if (evt.target.checked) {
    fillFromDynamoDB();
  } else {
    fillFromBlogger();
  }
}

function authInit() {
  // get the index for this group

  const params = new URLSearchParams(window.location.search); // get url params
  const auth = params.get("auth");
  console.log("auth", auth);
  if (!auth) {
    return;
  }
  //*but this back in later. it is out so i can see if calling from ddb works
  //fillFromBlogger();
}

function fillFromDynamoDB() {
  const url = `https://script.google.com/macros/s/${global.deploymentId}/exec`;

  const current_url_split = window.location.pathname.split("/");
  const year_month = `${current_url_split[1]}/${current_url_split[2]}`;

  //these are hard coded for now, but we will need to collect info form the user
  const body = JSON.stringify({
    // token: tag("auth").value,
    token: "v5eZobI5vD0NkY7",
    year_month: year_month,
    mode: "buildGroupInfoJson",
  });

  fetch(url, { body: body, method: "POST" })
    .then(function (a) {
      return a.text();
    })
    .then(function (response) {
      console.log("response---", response);
      const dataX = JSON.parse(response);
      console.log("data", dataX);

      // global.group = dataX.data.set_info.Items; //keep for now. this is how we access the list of searchSets
      global.group = dataX.data;

      //*Here is our issue. - TODO - we are remaking the DDB
      //DDB has labels that does not match blooger so the code to write to html (tag().x) don't work with it.
      //SOLUTION: take the DDB datablock and push it into a new datablock with consitant keys of blogger.
      //------- so far we are dealing with this in Google Apps Script, in Code.gs
      console.log("--------global.group-----------", global.group);
      fillGroupInformation(global.group);
    });
}

function fillFromBlogger() {
  const url =
    window.location.origin +
    window.location.pathname.split("admin").join("index");
  fetch(url)
    .then(function (a) {
      return a.text();
    })
    .then(function (response) {
      global.group = getPostJson(response);
      console.log("+++++++++++++global.group+++++++++++++", global.group);
      fillGroupInformation(global.group);

      const { option, div } = van.tags;

      // bring in the list of sets
      for (const set of global.group.searchSets) {
        const opt = option({ value: set.set_id }, set.title);
        tag("group-search-sets").appendChild(opt);
      }
      // Auto fill Set-Info
      chooseSearchSet();
    });
}

function fillGroupInformation(json) {
  tag("group-name").value = json.name;
  tag("group-name").dataset.id = "name";
  tag("group-location-label").value = json.locationLabel;
  tag("group-location-label").dataset.id = "locationLabel";
  tag("group-location-size").value = json.locationSize;
  tag("group-location-size").dataset.id = "locationSize";
}

function bringInSetDDB() {}
function bringInPersonDDB() {}

function chooseSearchSet() {
  tag("set-people").replaceChildren();
  const selectedValue = tag("group-search-sets").value;

  console.log("we are in chooseSearchSet", selectedValue);

  //fetching the json data//
  const url =
    window.location.origin +
    window.location.pathname.split("admin").join(selectedValue);
  fetch(url)
    .then(function (a) {
      return a.text();
    })
    .then(function (response) {
      //console.log(response); //curently prints the entire html page
      global.set = getPostJson(response);
      console.log("global.set", global.set);
      tag("set-title").value = global.set.title;
      tag("set-title").dataset.id = "title";
      tag("set-banner").value = global.set.banner;
      tag("set-banner").dataset.id = "banner";
      tag("set-text-color").value = global.set.textColor;
      tag("set-text-color").dataset.id = "textColor";
      tag("set-background-color").value = global.set.backgroundColor;
      tag("set-background-color").dataset.id = "backgroundColor";
      tag("set-desc").value = global.set.desc;
      tag("set-desc").dataset.id = "desc";

      const { option, div } = van.tags;
      // bring in the list of people
      for (const set of global.set.people) {
        const opt = option({ value: set.pid }, set.name);
        tag("set-people").appendChild(opt);
      }
      // AUTO FILL person-info
      choosePerson();
    });
}

function choosePerson() {
  global.person = global.set.people[tag("set-people").selectedIndex];
  console.log(global.person);
  tag("person-name").value = global.person.name;
  tag("person-name").dataset.id = "name";
  tag("person-gender").value = global.person.gender;
  tag("person-gender").dataset.id = "gender";
  tag("person-image-url").value = global.person.imageURL;
  tag("person-image-url").dataset.id = "imageURL";
  tag("person-url").value = global.person.url;
  tag("person-url").dataset.id = "url";
  tag("person-desc").value = global.person.desc;
  tag("person-desc").dataset.id = "desc";
}

function chooseSearchBy() {
  //*THis needs to be made so that the user can filter how they search, Both, Dead, Living
}

function getPostJson(html) {
  // gove tried to make this work with doc parser, but the json just disappeared.
  return JSON.parse(
    html
      .split(`<div id='post-json' style='display:none'>`)[1]
      .split("</div>")[0]
  );
}

function loadSet(button) {
  if (button.innerHTML.includes("Draft")) {
    // get data from Dynamo
    console.log("Getting Data from DynamoDB");
  } else {
    // get data from blogger
    console.log("Getting Data from Blogger");
  }
}

function checkDirty(element) {
  oldData = element.id.split("-")[0];
  if (global[oldData][element.dataset.id] === element.value) {
    //reomve dirty
    element.classList.remove("dirty");
  } else {
    //add dirty
    element.classList.add("dirty");
  }
}

function tag(id) {
  return document.getElementById(id);
}

authInit();

//
//
//
//
//
//
//
//
///////////////////////////////////////////////////////////////////////
//                                                                   //
//   Old Code.  let it age before it gets deleted....                //
//                                                                   //
///////////////////////////////////////////////////////////////////////

function authenticate() {
  tag("error").style.display = "none";
  console.log("token", tag("auth").value);

  const deployment_id =
    "AKfycbzoMi77G5sfjy0A1dBM6m-0z5PWNiVfesluL4LZUfCO1E0r0yUOPCq6I1NSpAUXrfYp";

  const url = `https://script.google.com/macros/s/${deployment_id}/exec`;
  const pathname = window.location.pathname.split("/");

  const body = JSON.stringify({
    system: `${pathname[1]}/${pathname[2]}`,
    token: tag("auth").value,
    mode: "auth",
  });

  fetch(url, { body: body, method: "POST" })
    .then(function (a) {
      return a.json();
    })
    .then(function (response) {
      console.log("response---", response);
      if (response.status === "success") {
        buildGroupEdit(response.data);
      } else {
        console.log("failed");
        tag("error").style.display = "block";
      }
    }); // end of fetch
  console.log("after fetch");
}

function buildGroupEdit(data) {
  const { a, div, table, tr, td, input } = van.tags;
  const table1 = table();
  table1.append(
    tr(td("Title"), td("Image"), td("Back Color"), td("Text Color"))
  );
  for (const searchSet of data.search_sets) {
    const line = {
      set_id: searchSet.set_id,
      title: searchSet.title,
    };
    table1.append(
      tr(
        td(searchSet.title),
        td(searchSet.banner),
        td(searchSet.backgroundColor),
        td(JSON.stringify(line) + ",")
      )
    );
  }

  const edit = div(
    div({ style: "height:10px" }),
    div(
      { style: "background-color:#eee;padding:4px;color:black" },
      "Location Label:",
      input({
        id: "location-label",
        value: data.location_label,
        type: "text",
        style: "width:300px",
      }),
      table1
    )
  );
  document.getElementsByTagName("article")[0].replaceChildren(edit);
}
