'use strict';

// Create a name space 
let JPTrader = {
  // current orders array saves an object in each element with one attribute id 
  // and a method binded on the corresponding div 
  currentOrders  : [],
  finishedOrders : []
};


/**
a function that is called by clicking the button
@return {undefined}
*/
JPTrader.makeOrder = function(){

  console.log(this);

  // validate inputs
  const orderInput = this.validateOrderInput();
  if(orderInput === null) return;
  
  // generate an ID
  let orderId = this.currentOrders.length + this.finishedOrders.length;

  orderId = orderId.toString();
  orderInput["instrument_id"] = orderId;

  console.log(orderInput);

  // send with socket.
  this.sendWithSocket(orderInput);

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
  var errorMessage = [];

  // Validate Quantity
  let quantity = parseInt(document.getElementById("quantity").value);
  if(isNaN(quantity)) errorMessage.push("Your quantity is not a valid number");
  if(quantity <= 0) errorMessage.push("Your quantity should be a positive number");

  // Validate order size
  let orderSize = parseInt(document.getElementById("order_size").value);
  if(isNaN(orderSize)) errorMessage.push("Your order size is not a valid number");
  if(orderSize <= 0) errorMessage.push("Your order size should be a positive number");
  if(orderSize > quantity) errorMessage.push("Your child order size is bigger than total quantity");

  // Validate discount
  let discount = parseInt(document.getElementById("discount").value);
  if(isNaN(discount)) errorMessage.push("Your discount is not a valid number");
  if(discount < 0 || discount > 100) errorMessage.push("Your discount should in 0-100");

  if (errorMessage.length > 0) {
    // Insert the error message some where so the user can see...
    console.log(errorMessage);
    return null;
  }
  else{

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
JPTrader.sendWithSocket = function(orderData){

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

    const chartWrap = document.createElement("div");
    chartWrap.setAttribute("class", "order-chart");

    const orderProgress = document.createElement("p");
    orderProgress.setAttribute("class", "realtime-log");

    orderWrap.appendChild(titleLabel);
    orderWrap.appendChild(chartWrap);
    orderWrap.appendChild(orderProgress);

    document.getElementsByClassName("right-col")[0].appendChild(orderWrap);
    // document.getElementsByClassName("right-col")[0].insertBefore(title_label, document.getElementById("test-chart"));

    let dataHandler = this.dataHandler.bind(orderWrap);

    this.currentOrders.push({
      "instrument_id": orderData["instrument_id"],
      "handler": dataHandler
    });

    this._clearForm();

  };

  if(typeof this.ws === 'undefined'){
    this.initWebSocket(sendMessageAndDisplayOrder.bind(this));
  }
  else{
    sendMessageAndDisplayOrder.call(this);
  }

}


/**
Will be called if the socket is not initialized
@param {function} callback - a callback function that sends the order to the server 
@return {undefined}
*/
JPTrader.initWebSocket = function(callback){

  if("WebSocket" in window){

    // open a websocket
    this.ws = new WebSocket("ws://" + window.location.host + "/chat/");
    this.ws.onopen = function(){
      callback();
    };

    this.ws.onmessage = function(evt){ 

      let receivedMessage = evt.data;
      receivedMessage = JSON.parse(receivedMessage);
      // alert("Message is received...");

      /* WORK IN PROGRESS */
      /** Recieve different kind of information from server should be done here */

      // find corresponding handler from current orders array
      const _currentOrders = JPTrader.currentOrders;

      for (let i = 0; i < _currentOrders.length; i++){

        // console.log(_currentOrders[i]["instrument_id"]);
        // console.log(typeof _currentOrders[i]["instrument_id"]);
        // console.log(receivedMessage['id']);
        // console.log(typeof receivedMessage['id']);

        if (_currentOrders[i]["instrument_id"] === receivedMessage["id"].toString()){
          _currentOrders[i].handler(receivedMessage);
        }
      };

     };

     this.ws.onclose = function(){ 

        // websocket is closed.
        console.log("connection closed");
     };
  }
  else{
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
JPTrader.dataHandler = function(d){
  
  // this in this function should be a div of order-wrap class
  var dataType = d['message_type'];
  var timestamp = d['timestamp'];

  let p = this.querySelector("p.realtime-log");

  if (dataType === "quote"){
    let quote = d["quote"];
    p.innerHTML = p.innerHTML + "<span>quote:" + quote.toString() + "</span><br>";

  }else if(dataType === "sold_message"){
    const soldPrice = d['sold_price'];
    const remainingQuantity = d['remaining_quantity'];
    p.innerHTML = p.innerHTML + "<span>sold price:" + soldPrice.toString() + ", Remaining: " + remainingQuantity.toString() + "</span><br>";
  }

  p.scrollTop = p.scrollHeight;

}

/**
A function to setup all the interactions, linkage and connections
*/
JPTrader.init = function(){

  document.getElementById("make-order-btn").addEventListener("click", this.makeOrder.bind(this) );
  
  window.onbeforeunload = function(){
    JPTrader.ws.close();
  }

};

JPTrader.init();
