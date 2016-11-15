
'use strict';

// Create a name space 
let JPTrader = {
  // current orders array saves an object in each element with one attribute id 
  // and a method binded on the corresponding div 
  currentOrders  : [],
  finishedOrders : [],
  canceledOrders  : [],
  // 
  quoteData:[],
  // this array gives you direct access to each orderWrap <div> element by using its instrument_id as index.
  orderDOM: [],

  haveFirstQuote: false 

};



/**
a function that is called by clicking the button
@return {undefined}
*/
JPTrader.makeOrder = function(){

  // validate inputs
  const orderInput = this.validateOrderInput();
  if ( orderInput === null ) return;
  
  // generate an ID
  let orderId = this.currentOrders.length + this.finishedOrders.length + this.canceledOrders.length;
  orderId = orderId.toString();
  orderInput["instrument_id"] = orderId;

  // set request type
  orderInput["request_type"] = "order_request";

  // send with socket.
  this.sendWithSocket( orderInput );

}

/**
A function that clear all the content in the form
Should be used as a call back only after we sent the request...
@return {undefined}
*/
JPTrader._clearForm = function(){
  // document.getElementById("instrument_id").value = "";
  document.getElementById("quantity").value   = "";
  document.getElementById("discount").value   = "";
  document.getElementById("order_size").value = "";
}


/**
Validate form value, include checking missing data and mal-format data.
@return {JSON} result - will only return a json object if all input are validated, otherwise, return null.
*/
JPTrader.validateOrderInput = function(){

  // const result = {};
  const DATA_FIELDS = [/*"instrument_id",*/ "quantity", "order_size", "discount"];
  const errorMessage = [];

  // Validate Quantity
  let quantity = parseInt(document.getElementById("quantity").value);
  if ( isNaN(quantity) ) errorMessage.push("Your quantity is not a valid number");
  if ( quantity <= 0 ) errorMessage.push("Your quantity should be a positive number");

  // Validate order size
  let orderSize = parseInt(document.getElementById("order_size").value);
  if ( isNaN(orderSize) ) errorMessage.push("Your order size is not a valid number");
  if ( orderSize <= 0 ) errorMessage.push("Your order size should be a positive number");
  if ( orderSize > quantity ) errorMessage.push("Your child order size is bigger than total");

  // Validate discount
  let discount = parseInt(document.getElementById("discount").value);
  if ( isNaN(discount) ) errorMessage.push("Your discount is not a valid number");
  if ( discount < 0 || discount > 100 ) errorMessage.push("Your discount should in 0-100");

  if ( errorMessage.length > 0 ) {
    // Insert the error message some where so the user can see...

    document.querySelector("#input-error-message").innerHTML = errorMessage.join("<br>");
    console.log(errorMessage);
    return null;
  } else {

    // clean the error message 
    document.querySelector("#input-error-message").innerHTML = "";

    const result = {
      "quantity": quantity,
      "order_size": orderSize,
      "order_discount": discount
    };

    return result;
  }

}


/**
A function that checks the existence of websocket, if not init, init it. Otherwise, use it.
@param {None}
@return {undefined}
*/
JPTrader.sendWithSocket = function( orderData ){

  let sendMessageAndDisplayOrder = function(){

    console.log('Message is sent...');
    this.ws.send( JSON.stringify( orderData ));

    // Make div space for a order...
    const orderWrap = document.createElement("div");
    orderWrap.className = 'order-wrap';
    orderWrap.setAttribute("id", orderData["instrument_id"]);

    const titleLabel = document.createElement("h3");
    // title_label.innerHTML = document.getElementById("instrument_id").value;
    titleLabel.className = "order-title";

    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = "Cancel Order";
    cancelButton.classList.add("cancel-button");
    cancelButton.classList.add("btn");
    cancelButton.classList.add("btn-danger");

    let cancel = function(){

      const cancelRequest = {
        "request_type": "cancel_request",
        "instrument_id": orderData["instrument_id"]
      };

      this.ws.send(JSON.stringify(cancelRequest));
    };

    cancelButton.addEventListener("click", cancel.bind(this));

    const chartWrap = document.createElement("div");
    chartWrap.setAttribute("class", "order-chart");

    /* DEPRECATED
    const orderProgress = document.createElement("p");
    orderProgress.setAttribute("class", "realtime-log");
    */

    const progressTable = document.createElement("table");
    progressTable.setAttribute("class", "table");

    const tableHeader = document.createElement("thead");
    tableHeader.innerHTML = "<tr><td>Sold Price</td><td>Remaining</td><td>PnL</td></tr>";
    progressTable.appendChild(tableHeader);

    const tableBody = document.createElement("tbody");
    tableBody.setAttribute("class", "p");
    tableBody.innerHTML = this._tableRowHelper("Start", orderData["quantity"], 0);

    progressTable.appendChild(tableBody);

    // collect all DOM in orderWrap div
    orderWrap.appendChild( titleLabel );
    orderWrap.appendChild( chartWrap );
    orderWrap.appendChild( cancelButton );
    orderWrap.appendChild( progressTable );

    // render this order
    document.getElementsByClassName("right-col")[0].appendChild( orderWrap );

    // attach a data handler to each order, will be called when we recieve information that
    // we need to update the ui.
    let dataHandler = this.dataHandler.bind(orderWrap);

    // put this order into current order arrays so we can keep track of it
    this.currentOrders.push({
      "instrument_id": orderData["instrument_id"],
      "handler": dataHandler
    });

    // put this div element into orderDOM array for easier future access
    this.orderDOM.push(orderWrap);

    this._clearForm();

  };

  if ( typeof this.ws === 'undefined' ){
    this.initWebSocket(sendMessageAndDisplayOrder.bind( this ));
  } else {
    sendMessageAndDisplayOrder.call( this );
  }

}


/**
Will be called if the socket is not initialized
@param {function} callback - a callback function that sends the order to the server 
@return {undefined}
*/
JPTrader.initWebSocket = function( callback ){

  if ( "WebSocket" in window ){

    // open a websocket
    this.ws = new WebSocket("ws://" + window.location.host + "/chat/");
    this.ws.onopen = function(){
      callback();
    };

    this.ws.onmessage = function( evt ){ 

      let receivedMessage = evt.data;
      receivedMessage = JSON.parse( receivedMessage );
      // console.log( receivedMessage );

      /********************/
      /* WORK IN PROGRESS */
      /********************/
      /** Recieve different kind of information from server should be done here */

      receivedMessage.forEach(function(message){

        const messageType = message['message_type'];

        switch (messageType) {
          case "quote":

            JPTrader.quoteData.push( message["quote"] );

            /**************************************/
            /********** WORK IN PROGRESS **********/
            /**************************************/

            // this is a bad implementation, consider sending quote data on start of application

            if ( !JPTrader.haveFirstQuote ) {

              JPTrader.drawChart( +message["quote"] );
              JPTrader.haveFirstQuote = true;
            
            }

            break;

          case "sold_message":

            console.log('Received an order from server');
            // find corresponding handler from current orders array
            const _currentOrders = JPTrader.currentOrders;

            for (let i = 0; i < _currentOrders.length; i++) {
              if ( _currentOrders[i]["instrument_id"] === message["instrument_id"].toString() ) {
                _currentOrders[i].handler(message);
              }
            };
            break;

          case "unfilled_order":

            console.log('Received an unfilled message from server');
            break;

          case "canceled_order":
            console.log('Received an canceled confirmation message from server');
            JPTrader._canceledHandler(message);
            break

          case "finished_order":
            console.log('Received an finished message from server');
            break;

          default:
            console.log('Data type not specified or not recognized');
            break;
        }

      });

     };

     this.ws.onclose = function(){ 

        // websocket is closed.
        console.log("connection closed");
     };
  } else {

    console.log("websocket is not supported by the browser...");
    // alert("WebSocket NOT supported by your Browser!");

  }
}


/**
A handler function that will be copied for each new order. New copied instance will bind to the order's 
div tag, and saved in the currentOrder array. this keyword in this function should be the 
@param {JSON} d - a json data responded from the server
@return {undefined}
*/
JPTrader.dataHandler = function( d ){
  
  // this in this function should be a div of order-wrap class
  let dataType = d['message_type'];
  let timestamp = d['timestamp'];


  // select the table to insert rows on data update
  let tableBody = this.querySelector("tbody.p");

  console.log('dataType:' + dataType );

  if ( dataType === "quote" ){
    // code doesn't come here...

  } else if ( dataType === "sold_message" ){

    let soldPrice = d['sold_price'];
    let remainingQuantity = d['remaining_quantity'];
    const pnl = +d["pnl"];
    const instrumentId = d["instrument_id"];

    tableBody.innerHTML = JPTrader._tableRowHelper( soldPrice, remainingQuantity, parseFloat(pnl).toFixed(2) ) + tableBody.innerHTML;

    // if the order is finished, move the order from currentOrders to finishedOrders
    if ( remainingQuantity === 0 ){

      const indexToRemove = JPTrader.currentOrders.findIndex(function(ele){
        return ele['instrument_id'] === instrumentId;
      });

      try {

        JPTrader._removeCancelButton(indexToRemove);

        const objectToMove = JPTrader.currentOrders.splice(indexToRemove, 1)[0];
        if ( objectToMove !== null ){
          JPTrader.finishedOrders.push(objectToMove);  
        }

        // checking the update of order status in the following two arrays.
        // console.log('JPTrader orders maintainance...');
        // console.log(JPTrader.currentOrders);
        // console.log(JPTrader.finishedOrders);

      } catch(e) {
        // statements
        console.log(e);
        console.log("move from currentOrders to finishedOrders failed...");

      }     
    
    }

  }

  /* DEPRECATED - future table scrolling can be implemented here
  p.scrollTop = p.scrollHeight;
  */
}

/**
A helper function that takes three value and return a table row element
@param {String} soldPrice - a string or number doesn't really matter. Sometimes the status of this order, sometimes the sold price
@param {String} remaining - the remaining amound of order that needs to be done
@param {String} pnl - a number/ String about the profit
*/
JPTrader._tableRowHelper = function( soldPrice = "", remaining = "", pnl = "" ){

  if ( +remaining === 0 || soldPrice === "Start" ){
    return `<tr class="success"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
  }
  if ( soldPrice === "Canceled" ){
    return `<tr class="danger"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
  }
  return `<tr><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 

}


/**
A helper function to remove the cancel button by a given id. Will be called if the order is canceled or the order is done.
@param {Number} instrument_id
@return {undefined}
*/
JPTrader._removeCancelButton = function( instrument_id ){
  this.orderDOM[+instrument_id].querySelector(".cancel-button").remove();
}


/**
One of the data handler that works specifically for ack of canceled orders. 
Moves the order into canceledOrder array of JPTrader and update the ui for that specific order.
@param {JSON} d - a json object return from the server
@return {undefined}
*/
JPTrader._canceledHandler = function( d ){

    const canceledId = +d['instrument_id'];

    // move it from current order to canceledOrder
    const indexToRemove = this.currentOrders.findIndex(function( ele ){
      return (+ele['instrument_id']) === canceledId;
    });

    try {

      // console.log('Check order maintainance status...');
      // console.log(this.currentOrders);
      // console.log(this.canceledOrders);

      console.log(`index to remove: ${indexToRemove}`);
      this._removeCancelButton(indexToRemove);

      var objectToMove = this.currentOrders.splice(indexToRemove, 1)[0];

      if ( objectToMove !== null ){
        this.canceledOrders.push(objectToMove);  
      }

      // console.log('Check order maintainance status...');
      // console.log(this.currentOrders);
      // console.log(this.canceledOrders);
      

    } catch(e) {
      // statements
      console.log(e);

    }

    // Insert data into corresponding table
    const orderWrap = this.orderDOM[canceledId];
    const tableBody = orderWrap.querySelector("tbody.p");

    tableBody.innerHTML = this._tableRowHelper( "Canceled", d["remaining_quantity"], (+d["pnl"]).toFixed(2) ) + tableBody.innerHTML;

}


/**
Plot the forever going chart for this stock
@param {Number} firstQuote - the first quote to set range for the chart
@return {undefined}
*/
JPTrader.drawChart = function( firstQuote ){

  var n = 243,
      duration = 1000,
      now = new Date(Date.now() - duration),
      count = 0;
  let dataLength = JPTrader.quoteData.length;
  let data = JPTrader.quoteData.slice(dataLength - n);
  console.log(data);

  var margin = {top: 6, right: 0, bottom: 20, left: 40},
      width = 960 - margin.right,
      height = 190 - margin.top - margin.bottom;

  var x = d3.time.scale()
      .domain([now - (n - 2) * duration, now - duration])
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var line = d3.svg.line()
      // .interpolate("basis")
      .x(function(d, i) { return x(now - (n - 1 - i) * duration); })
      .y(function(d, i) { return y(d); });

  var svg = d3.select("#quote-chart-wrap").select("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("margin-left", margin.left + "px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("defs").append("clipPath")
      .attr("id", "clip")
    .append("rect")
      .attr("width", width)
      .attr("height", height);

  var axis = svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

  var path = svg.append("g")
      .attr("clip-path", "url(#clip)")
    .append("path")
      .datum(data)
      .attr("class", "line");

  var transition = d3.select({}).transition()
      .duration(duration)
      .ease("linear");

  d3.select(window)
      .on("scroll", function() { ++count; });

  (function tick() {

    transition = transition.each(function() {
      
      // update the domains
      now = new Date();
      x.domain([now - (n - 2) * duration, now - duration]);
      
      // y.domain([0, d3.max(data)]);
      y.domain([firstQuote - 12, firstQuote + 12]);

      // push the accumulated count onto the back, and reset the count
      data.push(JPTrader.quoteData.slice(-1)[0]);

      count = 0;

      // redraw the line
      svg.select(".line")
          .attr("d", line)
          .attr("transform", null);

      // slide the x-axis left
      axis.call(x.axis);

      // slide the line left
      path.transition()
          .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")");

      // pop the old data point off the front
      data.shift();

    }).transition().each("start", tick);

  })();
}




/**
A function to setup all the interactions, linkage and connections
@return {undefined}
*/
JPTrader.init = function(){

  document.getElementById("make-order-btn").addEventListener("click", this.makeOrder.bind(this) );
  
  window.onbeforeunload = function(){
    JPTrader.ws.close();
  }

  this.quoteData = Array(243);
  this.quoteData.fill(0);

  JPTrader.drawChart(100);

};

JPTrader.init();
