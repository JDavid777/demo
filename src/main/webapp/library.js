/**
  * Creates a list item. see https://www.w3.org/TR/REC-html40/struct/lists.html#edef-LI
  * Adds an attribute, "data", that holds the text data, and also
  * puts the text in as the inner text node
  */
function createItemForList(text) {
    let item = document.createElement('li');
    item.setAttribute("data",text);
    item.appendChild(document.createTextNode(text));
    return item;
}

/**
  * Adds the behavior that takes place when a user clicks on 
  * an item in the autocomplete search box.  That behavior
  * is to put the item in the text input field
  * @param item an item in the autocomplete list, like a book for example
  * @param the base id on which to select parts of the searchbox
  */
function addItemClickBehavior(item, input_id) {
    // if the user clicks, put the value in the input field
    item.addEventListener('click', function(event) {
      let input_field = document.getElementById(input_id);
      input_field.value = event.target.innerText;
      deleteSearchBox(input_id);
    });
}

/**
  * given an id, find and remove a searchbox from the page
  */
function deleteSearchBox(input_id) {
  let searchbox = document.getElementById(input_id+"_searchbox");
  if (searchbox != null) {
    searchbox.remove();
  }
}

/**
  * creates a unordered list to contain the autocomplete items
  */
function createList(input_id) {
    var innerList = document.createElement('ul');
    innerList.setAttribute("id", input_id+"_searchlist");
    return innerList;
}

/**
  * creates a div that sits under a given input, as a
  * container to the autocomplete functionality
  */
function createSearchBox(input_id) {
    let searchbox = document.createElement('div');
    searchbox.setAttribute("id", input_id+"_searchbox");
    searchbox.setAttribute("class", "searchbox");
    return searchbox;
}

function addDropdown(id, getdata) {
    let element = document.getElementById(id);
    let nameOfElement = element.getAttribute("name");
    let parent = element.parentNode;
    parent.removeChild(element);
    let select = document.createElement('select');
    select.setAttribute("id", id);
    select.setAttribute("name", nameOfElement);
    let option;

    getdata().forEach(function( item ) {
        option = document.createElement('option');
        option.value = option.textContent = item;
        select.appendChild( option );
    });
    let defaultOption = document.createElement('option');
    defaultOption.textContent = "Choose here";
    defaultOption.setAttribute("selected", "");
    defaultOption.setAttribute("disabled", "");
    defaultOption.setAttribute("hidden", "");
    select.appendChild(defaultOption)

    parent.appendChild(select);
}

/**
  * adds an autocomplete functionality to a given input.
  * this allows a nicer user experience for the user - as they type,
  * the possibilties are narrowed down, and they click on an item to 
  * select it.
  */
function addAutoComplete(id, getdata) {

    let element = document.getElementById(id);

    /**
      * If the autocomplete searchbox is open and the user presses
      * the escape key, remove the searchbox
      */
    function considerRemovingSearchBoxOnPressingEscape(event) {
        if (event.key === "Escape") {
            deleteSearchBox(id);
        }
    }

    function handleBlurEvent(event) {
        // if we tab from this input to another, we'll get a "relatedTarget", and that's
        // the only situation where we would want to close the searchbox - tabbing to another field.
        // so if it's null, ignore the blur event.
        if (event.relatedTarget === null) {
            return;
        } else {
            deleteSearchBox(id);
        }

    }

    function considerKillingThisModalIfOutsideClick(event) {
      if (event.target != document.getElementById(id+"searchbox")) {
        deleteSearchBox(id);
      }
    }

    document.addEventListener('keydown', considerRemovingSearchBoxOnPressingEscape);
    document.addEventListener('click', considerKillingThisModalIfOutsideClick);
    element.addEventListener('blur', handleBlurEvent);

    function openAutoComplete(event) {
        if (event.key === "Escape") return;
        // as the user presses keys, we keep checking what is current
        // and we provide a search box for that.

        let currentContent = element.value;
        if (currentContent.length == 0) {
            // if there's no text in the input box, don't show a searchbox.

            // delete it if it exists
             deleteSearchBox(id);
        } else {
            // if there's more than one item in the input...
             
           let list = createList(id);

            // if the searchbox doesn't exist, create it...
            if (document.getElementById(id+"_searchbox") == null) {
                let searchbox = createSearchBox(id);
                element.insertAdjacentElement('afterend',searchbox);
                searchbox.appendChild(list);
            }

            // get data for the list.
            let mydata = getdata();

            addFilteredData(list, mydata, currentContent, id);

        }
    }

    // if the user clicks, open the autocomplete
    element.addEventListener('keyup', openAutoComplete);
    element.addEventListener('click', openAutoComplete);

}

/**
  * fills the list with data depending on what the user has typed into 
  * the input field.  
  * @param list the list in the searchbox which holds the results
  * @param data the whole set of data from which to filter
  * @param currentContent what the user has currently typed into the input field
  * @param id the core identifier passed around.  other components build off that,
  *        e.g. if the id is abc, then the list item might be 
  */
function addFilteredData(list, data, currentContent, id) {
    let maxSearchListSize = 5;
    let filteredList = 
        data.filter(text => text.includes(currentContent))
            .slice(0,maxSearchListSize);
    for (var i = 0; i < filteredList.length; i++) {
        let item = createItemForList(filteredList[i]);
        // if the user clicks, put the value in the input field
        addItemClickBehavior(item, id);
        list.appendChild(item);
    }
    return list;
}

/**
  * disables an input if there's no data for it.  I mean, there's 
  * no point then, is there?
  */
function lockInput(id) {
    let input = document.getElementById(id);
    input.placeholder = "locked - no data";
    input.disabled = true;
}

/**
  * Communicates with the server.  
  * @param verb - GET or POST
  * @param path - the "action", the route to the endpoint.  e.g. "fib" or "math"
  * @param data - if posting, the data to send to the server.
  */ 
function talk(verb, path, data) {
  return new Promise((resolve, reject) => {
    let r = new XMLHttpRequest();
    r.open(verb, path, true);
    //Send the proper header information along with the request
    r.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    r.onreadystatechange = function () {
      if (r.readyState != 4 || r.status != 200) {
        return;
      } else {
          resolve(r.responseText);
      }

    }
    r.send(data);
  });
}

/**
  *  converts a json object to an array of strings
  *  given a lambda (extractor) to use in the map function
  *  to extract the string desired.  if parsing fails, do nothing.
  */
let extractData = function(value, extractor) {
  try {
    return JSON.parse(value).map(extractor).sort();
  } catch (error) {
    // do nothing
    // console.log("unable to parse the following as JSON: " + value);
  }
}

// Add an autocomplete to the book input for lending
talk("GET", "book")
.then(function(v){
  betterUserExperienceForInput(v, book => book.Title, "lend_book");
});

// Add an autocomplete to the borrower input for lending
talk("GET", "borrower")
.then(function(v) {
    betterUserExperienceForInput(v, borrower => borrower.Name, "lend_borrower");
});

function betterUserExperienceForInput(v, extractor, input_id) {
  let receivedData = extractData(v, extractor);
  if (receivedData == null) {
    lockInput(input_id);
  } else if (receivedData && receivedData.length > 0 && receivedData.length < 10) {
    addDropdown(input_id, function() {return receivedData});
  } else {
    addAutoComplete(input_id, function() {return receivedData});
  }
}



function integration_tests() {
console.log("WARNING: integration tests running - these affect state");

// clean the database to begin
talk("GET", "flyway")
.then(function(v){
  return talk("POST", "registerborrower", "borrower=alice");
})
.then(function(v){
  return talk("GET", "borrower");  
})
.then(function(v){
  console.assert(v === '[{"Name": "alice", "Id": "1"}]', 'result was ' + v);  
  return JSON.parse(v).map(borrower => borrower.Name);
})
.then(function(v) {
    console.assert(v[0] === "alice", "result was " + v[0])
    return v;
})
.then(function(v) {
    talk("GET", "flyway");
});
}
// uncomment the function below to run integration tests
// integration_tests();

function unit_tests() {
// testing the createItemForList basics
let item = createItemForList("abc");
console.assert(item.getAttribute("data") === "abc", "data attribute was " + item.getAttribute("data") );
console.assert(item.innerText === "abc", "the inner text was " + item.innerText )

// testing createList
let list = createList("abc")
console.assert(list.id === "abc_searchlist", "list id was " + list.id);

// testing createSearchBox
let searchbox = createSearchBox("abc");
console.assert(searchbox.id === "abc_searchbox")

// testing addFilteredData
let mydata = ['a','b','c'];
let currentContent = 'a';
let filteredDataList = addFilteredData(list, mydata, currentContent, "abc");

}
// uncomment the function below to run unit tests
// unit_tests();


   