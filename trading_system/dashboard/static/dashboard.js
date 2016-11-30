'use strict';

// Create a name space 
let JPTrader = {
  // current orders array saves an object in each element with one attribute id 
  // and a method binded on the corresponding div 
  currentOrders  : [],
  finishedOrders : [],
  canceledOrders  : [],
  
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
Refactored function for testing, seperate collecting data from user and the real checking part
@param {None}
@return {JSON} 
*/
JPTrader._collectOrderInput = function(){

  console.log('in _collected order input');

  let quantity = document.getElementById("quantity").value;
  let orderSize = document.getElementById("order_size").value;
  let discount = document.getElementById("discount").value;

  return [quantity, orderSize, discount];

}



/**
Refactored function for testing, this is the real checking part. 
@param {Number} quantity 
@param {Number} orderSize
@param {Number} discount
@return {JSON/Array} result/ errorMessage 
*/
JPTrader._validateCollectedOrderInput = function(quantity, orderSize, discount){
  
  // console.log('in _validateCollectedOrderInput');
  quantity = parseInt(quantity);
  orderSize = parseInt(orderSize);
  discount = parseInt(discount);

  const errorMessage = [];

  if ( isNaN(quantity) ) errorMessage.push("Your quantity is not a valid number");
  if ( quantity <= 0 ) errorMessage.push("Your quantity should be a positive number");
  if ( isNaN(orderSize) ) errorMessage.push("Your order size is not a valid number");
  if ( orderSize <= 0 ) errorMessage.push("Your order size should be a positive number");
  if ( orderSize > quantity ) errorMessage.push("Your child order size is bigger than total");
  if ( isNaN(discount) ) errorMessage.push("Your discount is not a valid number");
  if ( discount < 0 || discount > 100 ) errorMessage.push("Your discount should in 0-100");

  if ( errorMessage.length > 0 ) {
    
    return errorMessage;
  
  } else {

    const result = {
      "order_discount": discount,
      "order_size": orderSize,
      "quantity": quantity
    };

    console.log(result);
    return result;
  }

}



/**
Validate form value, include checking missing data and mal-format data.
@return {JSON} result - will only return a json object if all input are validated, otherwise, return null.
*/
JPTrader.validateOrderInput = function(){

  let collectedInput = this._collectOrderInput();
  let result = this._validateCollectedOrderInput.apply(null, collectedInput);

  if (result instanceof Array) {
    // show error message
    document.querySelector("#input-error-message").innerHTML = result.join("<br>");
    return null;
  } 
  else {
    // this is a correct JSON result, update the ui and return it.

    // clean the error message 
    document.querySelector("#input-error-message").innerHTML = "";
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
    tableBody.innerHTML = this._tableRowHelper("collapse", "", "") + this._tableRowHelper("Start", orderData["quantity"], 0);

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

    // set the collapse attribute so when a user want to see detail of a trade
    // we won't hide it while update, init with true, meaning, usually we hide it.
    orderWrap.dataset.collapse = true;

    // put this div element into orderDOM array for easier future access
    this.orderDOM.push(orderWrap);

    this._clearForm();

  };

  if ( typeof this.ws === 'undefined' ){
    this.initWebSocket( sendMessageAndDisplayOrder.bind( this ) );
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
    const instrumentId = +d["instrument_id"];
    const orderWrap = JPTrader.orderDOM[instrumentId];

    tableBody.innerHTML = JPTrader._tableRowHelper( soldPrice, remainingQuantity, parseFloat(pnl).toFixed(2) ) + tableBody.innerHTML;

    // update the table body to show only the latest latest trade-detail
    if ( orderWrap.dataset.collapse === "true" ) {
      const detailRows = Array.prototype.slice.apply(tableBody.querySelectorAll("tr.trade-detail"));
      detailRows.forEach(function(row){
        row.style.display = "none";
      });
      const latest = detailRows[0];
      latest.style.display = "table-row";  
    }
    
    // if the order is finished, move the order from currentOrders to finishedOrders
    // and remove the cancel button
    if ( remainingQuantity === 0 ){

      const indexToRemove = JPTrader.currentOrders.findIndex(function(ele){
        return ele['instrument_id'] === instrumentId;
      });

      try {

        JPTrader._removeCancelButton(instrumentId);
        const objectToMove = JPTrader.currentOrders.splice(indexToRemove, 1)[0];
        if ( objectToMove !== null ){
          JPTrader.finishedOrders.push(objectToMove);  
        }

      } catch(e) {
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

  if ( soldPrice === "collapse" ) {
    return `<tr class="collapse-row"><td class="collapse-row"></td><td class="collapse-row"><img class="collapse-row" src="../static/img/more.png"></td><td class="collapse-row"></td></tr>`
  }

  if ( +remaining === 0 || soldPrice === "Start" ){
    return `<tr class="success"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
  }
  if ( soldPrice === "Canceled" ){
    return `<tr class="danger"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
  }
  return `<tr class="trade-detail"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 

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

      console.log(`index to remove: ${indexToRemove}`);
      console.log(`canceled id: ${canceledId}`);
      this._removeCancelButton(canceledId);

      var objectToMove = this.currentOrders.splice(indexToRemove, 1)[0];
      console.log(this.currentOrders)

      if ( objectToMove !== null ){
        this.canceledOrders.push(objectToMove);  
      }

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



JPTrader._collapseTradeDetailHandler = function(e){
  // find the closest row
  let tr = e.target;
  console.log(e.target);
  while( tr.tagName !== "TR" ) {
    tr = tr.parentNode;
  }

  if (tr === null) return;

  // check if it's clicking on the child of collapse row
  if ( tr.classList.contains("collapse-row") ) {

    // show all the detail after clicking this...
    let orderWrap = e.target.parentNode;
    while( !orderWrap.classList.contains("order-wrap") ){
      orderWrap = orderWrap.parentNode;
    }

    // if there are no detail yet, we return
    let tradeDetails = orderWrap.querySelectorAll(".trade-detail");
    if ( tradeDetails.length === 0 ) return;

    // console.log('order wrap after clicking on the three dots...');
    // console.log(orderWrap);
    orderWrap.dataset.collapse = false;

    tradeDetails.forEach(function(row){
      row.style.display = "table-row";
    });

    const collapseRow = orderWrap.querySelector("tr.collapse-row");
    collapseRow.style.display = "none";

  } else if ( tr.classList.contains("trade-detail") ) {

    console.log(' in the trade detail part...');
    // hide all the detail, if collapse == false

    // look for order wrap dom.
    let orderWrap = tr.parentNode;
    while( !orderWrap.classList.contains("order-wrap") ){
      orderWrap = orderWrap.parentNode;
    }
    
    // if the collapse state is true, don't do anything
    if ( orderWrap.dataset.collapse === 'true' ) return;
    // else, hide all but the last one
    if ( orderWrap.dataset.collapse === 'false' ) {

      orderWrap.dataset.collapse = true;
      // if there are two success rows already, which means that the trade has finished 
      // successfully, we hide all the trade detail.
      if ( orderWrap.querySelectorAll("tr.success").length >= 2 ) {
        orderWrap.querySelectorAll("tr.trade-detail").forEach(function(tradeDetail){
          tradeDetail.style.display = "none";
        });
      }
      // otherwise we keep the latest trading detail visible
      else {

        const detailToHide = Array.prototype.slice.call( orderWrap.querySelectorAll("tr.trade-detail"), 1);
        detailToHide.forEach(function(detailRow){
          detailRow.style.display = "none";
        });

      }

      // show the three dot icon, so that user can show the detail again
      const collapseRow = orderWrap.querySelector("tr.collapse-row");
      collapseRow.style.display = "table-row";

    }
  }
}


/**
A function to setup all the interactions, linkage and connections
@return {undefined}
*/
JPTrader.init = function(){

  // this is probably testing...
  if ( document.getElementById("make-order-btn") === null ) return;

  document.getElementById("make-order-btn").addEventListener("click", this.makeOrder.bind(this) );
  
  window.onbeforeunload = function(){
    JPTrader.ws.close();
  }

  window.onunload = function(){
    console.log('in window on unload...');
    JPTrader.ws.close();
  }

  this.quoteData = Array(243);
  this.quoteData.fill(0);

  // set delegate for all collapse button and trade detail button
  // so when users click on the three dots icon, the table collapse
  // when they click on trade-detail rows, trade detail hides.
  const leftCol = document.querySelector(".right-col");
  leftCol.addEventListener( "click", this._collapseTradeDetailHandler );

  JPTrader.drawChart(100);

};

JPTrader.init();
