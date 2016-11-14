'use strict';

// Create a name space 
let JPTrader = {
  // current orders array saves an object in each element with one attribute id 
  // and a method binded on the corresponding div 
  currentOrders  : [],
  finishedOrders : [],
  canceledOrders  : [],
  quoteData:[],
  orderDOM: []
};


/**
a function that is called by clicking the button
@return {undefined}
*/
JPTrader.makeOrder = function(){

  console.log( this );

  // validate inputs
  const orderInput = this.validateOrderInput();
  if ( orderInput === null ) return;
  
  // generate an ID
  let orderId = this.currentOrders.length + this.finishedOrders.length + this.canceledOrders.length;

  orderId = orderId.toString();
  orderInput["instrument_id"] = orderId;
  orderInput["request_type"] = "order_request";

  console.log(orderInput);

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
  if ( orderSize > quantity ) errorMessage.push("Your child order size is bigger than total quantity");

  // Validate discount
  let discount = parseInt(document.getElementById("discount").value);
  if ( isNaN(discount) ) errorMessage.push("Your discount is not a valid number");
  if ( discount < 0 || discount > 100 ) errorMessage.push("Your discount should in 0-100");

  if ( errorMessage.length > 0 ) {
    // Insert the error message some where so the user can see...
    console.log(errorMessage);
    return null;
  } else {

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
    this.ws.send( JSON.stringify( orderData) );

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
      
      console.log('in cancel');
      console.log(this);
      console.log(orderData["instrument_id"]);

      const cancelRequest = {
        "request_type": "cancel_request",
        "instrument_id": orderData["instrument_id"]
      };

      this.ws.send(JSON.stringify(cancelRequest));

    }

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
    progressTable.appendChild(tableBody);

    orderWrap.appendChild( titleLabel );
    orderWrap.appendChild( chartWrap );
    orderWrap.appendChild( cancelButton );
    // orderWrap.appendChild( orderProgress );
    orderWrap.appendChild( progressTable );

    document.getElementsByClassName("right-col")[0].appendChild( orderWrap );
    // document.getElementsByClassName("right-col")[0].insertBefore(title_label, document.getElementById("test-chart"));


    let dataHandler = this.dataHandler.bind(orderWrap);

    this.currentOrders.push({
      "instrument_id": orderData["instrument_id"],
      "handler": dataHandler
    });

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
      console.log( receivedMessage );

      /********************/
      /* WORK IN PROGRESS */
      /********************/
      /** Recieve different kind of information from server should be done here */

      receivedMessage.forEach(function(message){

        const messageType = message['message_type'];

        switch (messageType) {
          case "quote":
            // statements_1
            console.log('Received a quote from server');
            break;

          case "sold_message":
            console.log('Received an order from server');
            // find corresponding handler from current orders array
            const _currentOrders = JPTrader.currentOrders;

            for (let i = 0; i < _currentOrders.length; i++){
              if (_currentOrders[i]["instrument_id"] === message["instrument_id"].toString()){
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
div tag, and saved in the currentOrder array.
@param {JSON} d - a json data responded from the server
@return {undefined}
*/
JPTrader.dataHandler = function( d ){
  
  // this in this function should be a div of order-wrap class
  let dataType = d['message_type'];
  let timestamp = d['timestamp'];


  // select the table to insert rows on data update
  // let p = this.querySelector("p.realtime-log");
  let tableBody = this.querySelector("tbody.p");

  console.log('dataType:' + dataType );

  if ( dataType === "quote" ){

    // code doesn't come here...
    let quote = d["quote"];
    tableBody.innerHTML = tableBody.innerHTML + "<span>quote:" + quote.toString() + "</span><br>";
    this.quoteData.push(quote);

  } else if ( dataType === "sold_message" ){
    let soldPrice = d['sold_price'];
    let remainingQuantity = d['remaining_quantity'];
    const pnl = d["pnl"];

    // console.log();
    tableBody.innerHTML = JPTrader._tableRowHelper( soldPrice, remainingQuantity, pnl ) + tableBody.innerHTML;

    // if the order is finished, move the order from currentOrders to finishedOrders
    if ( remainingQuantity === 0 ){

      /****************************/
      /***** WORK IN PROGRESS *****/
      /****************************/      
    
    }

  }

  /* DEPRECATED
  p.scrollTop = p.scrollHeight;
  */
}

JPTrader._tableRowHelper = function( soldPrice = "", remaining = "", pnl = "" ){

  if (+remaining === 0){
    return `<tr class="success"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
  }
  if (soldPrice === "Canceled"){
    return `<tr class="danger"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
  }
  return `<tr><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 

}


/**
One of the data handler that works specifically for ack of canceled orders. 
Moves the order into canceledOrder array of JPTrader and update the ui for that specific order.
@param {JSON} d - a json object return from the server
@return {undefined}
*/

JPTrader._canceledHandler = function(d){

    const canceledId = +d['instrument_id'];

    // move it from current order to canceledOrder
    const indexToRemove = this.currentOrders.findIndex(function(ele){
      return ele['instrument_id'] === canceledId;
    });

    try {

      var objectToMove = this.currentOrders.splice(indexToRemove, 1);

      if ( objectToMove.length > 0 ){
        this.canceledOrders.push(objectToMove);  
      }
      

    } catch(e) {
      // statements
      console.log(e);
      console.log("don't know what happened...");

    }

    /****************************/
    /***** WORK IN PROGRESS *****/
    /****************************/
    // update ui 
    // find the div
    const orderWrap = this.orderDOM[canceledId];
    const tableBody = orderWrap.querySelector("tbody.p");
    tableBody.innerHTML = this._tableRowHelper( "Canceled", d["remaining_quantity"], d["pnl"] ) + tableBody.innerHTML;

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

};

JPTrader.init();
