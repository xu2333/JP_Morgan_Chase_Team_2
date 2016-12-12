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

  haveFirstQuote: false,
  totalQuantity: 0,
  totalPnL: 0,

  // this will be set once we start receiving quotes
  updateDeltaBoxesToken: null

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
  let orderId = this.getID.next().value;
  console.log(`new order id is: ${orderId}`);
  console.log(orderInput);
  orderId = orderId.toString();
  orderInput["instrument_id"] = orderId;

  // calculate the duration of each child order
  const quantity = orderInput["quantity"];
  const childOrder = orderInput["order_size"];
  const bidWindow = Math.floor(orderInput["sell_duration"]/ Math.ceil(quantity/childOrder) );
  orderInput["bid_window"] = bidWindow;
  // console.log(bidWindow);


  // set request type
  orderInput["request_type"] = "order_request";

  // add email into orderrequest
  orderInput["email"] = localStorage.getItem("email");

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
  document.getElementById("sell_duration").value = "";

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
  let timeDuration = document.getElementById("sell_duration").value;

  return [quantity, orderSize, discount, timeDuration];

}

/**
Refactored function for testing, this is the real checking part. 
@param {Number} quantity 
@param {Number} orderSize
@param {Number} discount
@return {JSON/Array} result/ errorMessage 
*/
JPTrader._validateCollectedOrderInput = function(quantity, orderSize, discount, sellDuration){
  
  quantity  = parseInt(quantity);
  orderSize = parseInt(orderSize);
  discount  = parseInt(discount);
  sellDuration = parseInt(sellDuration);

  const errorMessage = [];

  if ( isNaN(quantity) ) errorMessage.push("Your quantity is not a valid number");
  if ( quantity <= 0 ) errorMessage.push("Your quantity should be a positive number");
  if ( isNaN(orderSize) ) errorMessage.push("Your order size is not a valid number");
  if ( orderSize <= 0 ) errorMessage.push("Your order size should be a positive number");
  if ( orderSize > quantity ) errorMessage.push("Your child order size is bigger than total");
  if ( isNaN(discount) ) errorMessage.push("Your discount is not a valid number");
  if ( discount < 0 || discount > 100 ) errorMessage.push("Your discount should in 0-100");
  if ( isNaN(sellDuration) ) errorMessage.push("Your sellDuration is not valid");

  if ( errorMessage.length > 0 ) {
    
    return errorMessage;
  
  } else {

    const result = {
      "order_discount": discount,
      "order_size": orderSize,
      "quantity": quantity,
      "sell_duration": sellDuration
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

    // cancel button
    const cancelButton = document.createElement("button");
    cancelButton.innerHTML = "Cancel Order";
    cancelButton.classList.add("cancel-button");
    cancelButton.classList.add("btn");
    cancelButton.classList.add("btn-danger");
    let cancel = function(e){
      e.stopPropagation();
      const cancelRequest = {
        "request_type": "cancel_request",
        "instrument_id": orderData["instrument_id"]
      };
      this.ws.send( JSON.stringify(cancelRequest) );
    };
    cancelButton.addEventListener("click", cancel.bind(this));

    const resumeButton = document.createElement("button");
    resumeButton.textContent = "Resume Order";
    resumeButton.classList.add("btn");
    resumeButton.classList.add("btn-link");
    resumeButton.classList.add("resume-button");
    resumeButton.style.display = "none";
    const resume = function(e){
      e.stopPropagation();
      console.log('resume button clicked');
      const resumeRequest = {
        "request_type": "resume_request",
        "instrument_id": orderData["instrument_id"]
      };
      this.ws.send( JSON.stringify(resumeRequest) );
    }
    resumeButton.addEventListener("click", resume.bind(this));

    // customize button
    const customizeButton = document.createElement("button");
    customizeButton.innerHTML = "Customize Strategy";
    customizeButton.classList.add("custermize-button");
    customizeButton.classList.add("btn");
    customizeButton.classList.add("btn-primary");
    customizeButton.setAttribute("data-toggle", "modal");
    customizeButton.setAttribute("data-target", "#myModal");
    $('#stock_id').val(orderData["instrument_id"]);

    let customize = function(){
        const customizeRequest = {
        "request_type": "customize_request",
        "instrument_id": $("#stock_id").val(),
        "order_size" : $("#new_order_size").val(),
        "order_discount" : $("#new_discount").val(),
        "order_duration": $("#new_duration").val(),
      };

      console.log(customizeRequest);

      this.ws.send(JSON.stringify(customizeRequest));
      $('#myModal').modal('hide');
    } 
    document.getElementById("customize_btn").addEventListener("click",  customize.bind(this));

    const deltaBox = document.createElement("div");
    deltaBox.setAttribute("class", "delta-box");

    const chartWrap = document.createElement("div");
    chartWrap.setAttribute("class", "order-chart");

    const progressTable = document.createElement("table");
    progressTable.setAttribute("class", "table order-table");

    const tableHeader = document.createElement("thead");
    tableHeader.innerHTML = "<tr><td>Sold Price</td><td>Remaining</td><td>PnL</td></tr>";
    progressTable.appendChild(tableHeader);

    const tableBody = document.createElement("tbody");
    tableBody.setAttribute("class", "p");
    tableBody.innerHTML = /*this._tableRowHelper("collapse", "", "") +*/ this._tableRowHelper("Start", orderData["quantity"], 0);

    progressTable.appendChild(tableBody);

    // collect all DOM in orderWrap div
    orderWrap.appendChild( titleLabel );
    orderWrap.appendChild( chartWrap );
    orderWrap.appendChild( cancelButton );
    orderWrap.appendChild( resumeButton );
    orderWrap.appendChild( customizeButton );
    orderWrap.appendChild( deltaBox );
    orderWrap.appendChild( progressTable );
    
    // render this order
    // const orderList = document.querySelector(".right-col");
    const orderList = document.getElementById("order-list");
    if (orderList.firstElementChild){
      orderList.insertBefore( orderWrap, orderList.firstElementChild );
      // document.getElementsByClassName("right-col")[0].appendChild( orderWrap );

    } else {
      orderList.appendChild(orderWrap);
    }
    

    // attach a data handler to each order, will be called when we recieve information that
    // we need to update the ui.
    let dataHandler = this.dataHandler.bind(orderWrap);

    // put this order into current order arrays so we can keep track of it
    this.currentOrders.push({
      "instrument_id": orderData["instrument_id"],
      "quantity": orderData["quantity"],
      "remaining_quantity": orderData["quantity"],
      "pnl": 0,
      "handler": dataHandler,
      "last_price": null
    });

    // set the collapse attribute so when a user want to see detail of a trade
    // we won't hide it while update, init with true, meaning, usually we hide it.
    orderWrap.dataset.collapse = true;

    // put this div element into orderDOM array for easier future access
    this.orderDOM.push(orderWrap);
    this._clearForm();

  };

  if ( typeof this.ws === 'undefined' ){
    // start receiving quotes and draw charts...
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

  if ( this.ws != null ) return;

  if ( "WebSocket" in window ){

    // open a websocket
    this.ws = new WebSocket("ws://" + window.location.host + "/chat/");

    this.ws.onopen = function(){
      
      // send init message request so the server will start sending quote
      // also to bind user id to this session so the server knows which trader
      // this is.

      console.log("on open message sent...?");

      // I created a super user called cw2897 here...
      const initMessage = {
        "request_type": "init_system",
        "user_id": 1
      };

      JPTrader.ws.send( JSON.stringify(initMessage) );

      if ( callback )  callback();


    };

    this.ws.onmessage = function( evt ){ 

      let receivedMessage = evt.data;
      receivedMessage = JSON.parse( receivedMessage );
      // console.log( receivedMessage );

      /********************/
      /* WORK IN PROGRESS */
      /********************/

      // update chart sold volume (bar chart) only after the chart is initialized
      if ( JPTrader.quoteChart ) {
        const soldSum = receivedMessage.reduce( (agg, next)=>{
          if ( next["message_type"] == "sold_message" ) return agg + parseInt(next["sold_quantity"]);
          return agg;
        } ,0);

        // doesn't look really reliable.
        const firstTimeStamp = receivedMessage[0]["timestamp"];
        // const series1 = JPTrader.quoteChart.series[1];
        /*
        const series1 = JPTrader.volumnChart.series[0];
        series1.addPoint( [ (new Date(firstTimeStamp)).getTime(), soldSum ], true, true);
        
        const series0 = JPTrader.quoteChart.series[0];
        series0.addPoint( [ (new Date(message["timestamp"])).getTime(), parseFloat(message["quote"]) ], true, true);
        */
        
      }
      

      /** Recieve different kind of information from server should be done here */
      receivedMessage.forEach(function(message){

        const messageType = message['message_type'];

        switch (messageType) {
          case "quote":

            JPTrader.quoteData.push( message["quote"] );
            console.log(message);

            // Execute on first received quote
            // draw chart and set interval for updating delta.
            if ( !JPTrader.haveFirstQuote ) {

              (function setupOnFirstQuote(){

                JPTrader.drawChart( message );

                // setup a time interval to update all the order's delta box values.
                JPTrader.updateDeltaBoxesToken = setInterval(function updateDeltaBoxes(){

                  const lastQuote = JPTrader.quoteData[JPTrader.quoteData.length-1];
                  const lastQuoteObject = {lastQuote: lastQuote};

                  JPTrader.currentOrders.forEach(  JPTrader._updateDeltaBox.bind(lastQuoteObject) );
                  JPTrader.finishedOrders.forEach( JPTrader._updateDeltaBox.bind(lastQuoteObject) );
                  JPTrader.canceledOrders.forEach( JPTrader._updateDeltaBox.bind(lastQuoteObject) );

                }, 1000);

                // avoid coming back in
                JPTrader.haveFirstQuote = true;

              })();
            
            }
            else {
              // console.log(`in this part with timestamp: ${ (new Date(message["timestamp"])).getTime() }`);
              const series0 = JPTrader.quoteChart.series[0];
              series0.addPoint( [ (new Date(message["timestamp"])).getTime(), parseFloat(message["quote"]) ], true, true);

              const series1 = JPTrader.volumnChart.series[0];
              series1.addPoint( [ (new Date(message["timestamp"])).getTime(), parseFloat(message["size"]) ], true, true);
            
            }

            

            break;

          case "sold_message":

            console.log('Received a sold_message...');
            console.log(message);
            // find corresponding handler from current orders array
            const _currentOrders = JPTrader.currentOrders;

            for (let i = 0; i < _currentOrders.length; i++) {
              if ( _currentOrders[i]["instrument_id"] == message["instrument_id"].toString() ) {
                _currentOrders[i].handler(message);
                break;
              }
            };

            // update the aggregate view here.
            JPTrader._updateAggregateView();

            break;

          case "resume_order":
            JPTrader._resumeHandler( message );
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
  const dataType = d['message_type'];
  const timestamp = d['timestamp'];

  // select the table to insert rows on data update
  let tableBody = this.querySelector("tbody.p");

  console.log('dataType:' + dataType );
  
  if ( dataType === "sold_message" ){

    let soldPrice = d['sold_price'];
    let remainingQuantity = d['remaining_quantity'];

    console.log(d);

    const pnl = +d["pnl"];
    const instrumentId = +d["instrument_id"];
    const orderWrap = JPTrader.orderDOM[instrumentId];

    // update the data into JPTrader currentOrders...
    console.log("trying to update order object...");
    const order = JPTrader.currentOrders.find(order => order.instrument_id == instrumentId);
    // console.log(order);
    order.pnl = pnl;
    order.remainingQuantity = remainingQuantity;
    order.last_price = soldPrice;
    // console.log(JPTrader.currentOrders);


    tableBody.innerHTML = JPTrader._tableRowHelper( soldPrice, remainingQuantity, parseFloat(pnl).toFixed(2) ) + tableBody.innerHTML;

    // update the table body to show only the latest latest trade-detail
    if ( orderWrap.dataset.collapse === "true" ) {
      const detailRows = Array.prototype.slice.apply( tableBody.querySelectorAll("tr.trade-detail") );
      detailRows.forEach(function(row){
        row.style.display = "none";
      });
      const latest = detailRows[0];
      latest.style.display = "table-row";  
    }
    
    // if the order is finished, move the order from currentOrders to finishedOrders
    // and remove the cancel button
    if ( remainingQuantity === 0 ){

      const indexToRemove = JPTrader.currentOrders.findIndex(function( ele ){
        return ele['instrument_id'] == instrumentId;
      });

      try {

        JPTrader._removeCancelButton(instrumentId);
        JPTrader._removeResumeButton(instrumentId);
        JPTrader._removeStrategyButton(instrumentId);

        const objectToMove = JPTrader.currentOrders.splice(indexToRemove, 1)[0];
        if ( objectToMove !== null ){

          console.log(`Instrument Id that we should move: ${instrumentId}`);
          console.log(objectToMove);
          console.log("==================================================");

          JPTrader.finishedOrders.push(objectToMove);  
        }

      } catch(e) {
        console.log(e);
        console.log("move from currentOrders to finishedOrders failed...");
      }     
    
    }

  }

}

/**
A helper function that takes three value and return a table row element
@param {String} soldPrice - a string or number doesn't really matter. Sometimes the status of this order, sometimes the sold price
@param {String} remaining - the remaining amound of order that needs to be done
@param {String} pnl - a number/ String about the profit
*/
JPTrader._tableRowHelper = function( soldPrice = "", remaining = "", pnl = "" ){

  if ( soldPrice === "collapse" ) {
    return `<tr class="collapse-row"><td class="collapse-row"></td><td class="collapse-row"><img class="collapse-row" src="../static/img/more.png"></td><td class="collapse-row"></td></tr>`;
  }
  if ( soldPrice === "Resume" ) {
    return `<tr class="info"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`;
  }

  if ( +remaining === 0 || soldPrice === "Start" ){
    // return `<tr class="success"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
    return `<tr class="custom-start"><td>${soldPrice}</td><td>${remaining}</td><td>${pnl}</td></tr>`; 
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
  const cancelButton = this.orderDOM[+instrument_id].querySelector(".cancel-button");
  cancelButton.style.display = "none";
  //.remove();
}

JPTrader._removeResumeButton = function( instrument_id ){
  const removeButton = this.orderDOM[+instrument_id].querySelector(".resume-button");
  removeButton.style.display = "none";
}

JPTrader._removeStrategyButton = function( instrument_id ) {
  const strategyButton = this.orderDOM[+instrument_id].querySelector(".custermize-button");
  strategyButton.style.display = "none";
}

JPTrader._showCancelButton = function( instrument_id ) {
  const cancelButton = this.orderDOM[+instrument_id].querySelector(".cancel-button");
  cancelButton.style.display = "inline-block";
}

JPTrader._showResumeButton = function( instrument_id ) {
  const resumeButton = this.orderDOM[+instrument_id].querySelector(".resume-button");
  resumeButton.style.display = "inline-block";
}

JPTrader._showStrategyButton = function( instrument_id ) {
  const strategyButton = this.orderDOM[+instrument_id].querySelector(".custermize-button");
  strategyButton.style.display = "inline-block";
}


/**
One of the data handler that works specifically for ack of canceled orders. 
Moves the order into canceledOrder array of JPTrader and update the ui for that specific order.
Also add the resume button back
@param {JSON} d - a json object return from the server
@return {undefined}
*/
JPTrader._canceledHandler = function( d ){

    console.log(d);
    const canceledId = +d['instrument_id'];

    // move it from current order to canceledOrder
    const indexToRemove = this.currentOrders.findIndex(function( ele ){
      return (+ele['instrument_id']) == canceledId;
    });

    try {

      console.log(`index to remove from currentOrders: ${indexToRemove}`);
      console.log(`canceled id: ${canceledId}`);
      this._removeCancelButton( canceledId );
      this._showResumeButton( canceledId );

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

JPTrader._resumeHandler = function( d ){

  const resumeId = +d['instrument_id'];

  // move it from current order to canceledOrder
  const indexToRemove = this.canceledOrders.findIndex(function( ele ){
    return (+ele['instrument_id']) === resumeId;
  });

  try {

    console.log(`index to remove: ${indexToRemove}`);
    console.log(`canceled id: ${resumeId}`);
    this._removeResumeButton( resumeId );
    this._showCancelButton( resumeId );

    var objectToMove = this.canceledOrders.splice(indexToRemove, 1)[0];
    console.log(this.canceledOrders);

    if ( objectToMove !== null ){
      this.currentOrders.push(objectToMove);  
    }

  } catch(e) {
    // statements
    console.log(e);

  }

  // Insert data into corresponding table
  const orderWrap = this.orderDOM[resumeId];
  const tableBody = orderWrap.querySelector("tbody.p");

  // look for canceled message and remove it? 
  // add new resumed message

  tableBody.innerHTML = this._tableRowHelper( "Resume", d["remaining_quantity"], (+d["pnl"]).toFixed(2) ) + tableBody.innerHTML;
}



/**
Plot the forever going chart for this stock
@param {Number} firstQuote - the first quote to set range for the chart
@return {undefined}
*/
JPTrader.drawChart = function( firstQuote ){
console.log('checking existence of chart container');        
console.log(document.getElementById("chartContainer"));

$(function () {
  $(document).ready(function () {
    Highcharts.setOptions({
      global: {
        useUTC: false
      }
  });
            
  JPTrader.quoteChart = Highcharts.chart('chartContainer', {
    chart: {
      animation: Highcharts.svg,
      marginRight: 10,
      events: {
        load: function () {
        }
      }
    },
    credits: {
      enabled: false
    },
    title: {
      text: 'ETF Quote'
    },
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150
    },
    yAxis: [{
      title: {
        text: 'Price'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }]
    }],
    plotOptions: {
      series: {
        color: "#003dd7"
      }
    },
    tooltip: {
      shared: true
    },
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    series: [{
      type: 'spline',
      name: 'ETF',
      data: (function () {
        var data = [];
        const time = (new Date(firstQuote["timestamp"])).getTime();
        let i;
        for ( i = -59; i <= 0; i += 1 ) {
          data.push({
            x: time + i * 1000,
            y: 0
          });
        }
        return data;
      }())
    }]
  });


  // Highcharts.createElement('link', {
  //   href: 'https://fonts.googleapis.com/css?family=Unica+One',
  //   rel: 'stylesheet',
  //   type: 'text/css'
  // }, null, document.getElementsByTagName('head')[0]);

  // Highcharts.theme = {
  //    colors: ['#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066', '#eeaaee',
  //       '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
  //    chart: {
  //       backgroundColor: {
  //          linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
  //          stops: [
  //             [0, '#2a2a2b'],
  //             [1, '#3e3e40']
  //          ]
  //       },
  //       style: {
  //          fontFamily: '\'Unica One\', sans-serif'
  //       },
  //       plotBorderColor: '#606063'
  //    },
  //    title: {
  //       style: {
  //          color: '#E0E0E3',
  //          textTransform: 'uppercase',
  //          fontSize: '20px'
  //       }
  //    },
  //    subtitle: {
  //       style: {
  //          color: '#E0E0E3',
  //          textTransform: 'uppercase'
  //       }
  //    },
  //    xAxis: {
  //       gridLineColor: '#707073',
  //       labels: {
  //          style: {
  //             color: '#E0E0E3'
  //          }
  //       },
  //       lineColor: '#707073',
  //       minorGridLineColor: '#505053',
  //       tickColor: '#707073',
  //       title: {
  //          style: {
  //             color: '#A0A0A3'

  //          }
  //       }
  //    },
  //    yAxis: {
  //       gridLineColor: '#707073',
  //       labels: {
  //          style: {
  //             color: '#E0E0E3'
  //          }
  //       },
  //       lineColor: '#707073',
  //       minorGridLineColor: '#505053',
  //       tickColor: '#707073',
  //       tickWidth: 1,
  //       title: {
  //          style: {
  //             color: '#A0A0A3'
  //          }
  //       }
  //    },
  //    tooltip: {
  //       backgroundColor: 'rgba(0, 0, 0, 0.85)',
  //       style: {
  //          color: '#F0F0F0'
  //       }
  //    },
  //    plotOptions: {
  //       series: {
  //          dataLabels: {
  //             color: '#B0B0B3'
  //          },
  //          marker: {
  //             lineColor: '#333'
  //          }
  //       },
  //       boxplot: {
  //          fillColor: '#505053'
  //       },
  //       candlestick: {
  //          lineColor: 'white'
  //       },
  //       errorbar: {
  //          color: 'white'
  //       }
  //    },
  //    legend: {
  //       itemStyle: {
  //          color: '#E0E0E3'
  //       },
  //       itemHoverStyle: {
  //          color: '#FFF'
  //       },
  //       itemHiddenStyle: {
  //          color: '#606063'
  //       }
  //    },
  //    credits: {
  //       style: {
  //          color: '#666'
  //       }
  //    },
  //    labels: {
  //       style: {
  //          color: '#707073'
  //       }
  //    },

  //    drilldown: {
  //       activeAxisLabelStyle: {
  //          color: '#F0F0F3'
  //       },
  //       activeDataLabelStyle: {
  //          color: '#F0F0F3'
  //       }
  //    },

  //    navigation: {
  //       buttonOptions: {
  //          symbolStroke: '#DDDDDD',
  //          theme: {
  //             fill: '#505053'
  //          }
  //       }
  //    },

  //    // scroll charts
  //    rangeSelector: {
  //       buttonTheme: {
  //          fill: '#505053',
  //          stroke: '#000000',
  //          style: {
  //             color: '#CCC'
  //          },
  //          states: {
  //             hover: {
  //                fill: '#707073',
  //                stroke: '#000000',
  //                style: {
  //                   color: 'white'
  //                }
  //             },
  //             select: {
  //                fill: '#000003',
  //                stroke: '#000000',
  //                style: {
  //                   color: 'white'
  //                }
  //             }
  //          }
  //       },
  //       inputBoxBorderColor: '#505053',
  //       inputStyle: {
  //          backgroundColor: '#333',
  //          color: 'silver'
  //       },
  //       labelStyle: {
  //          color: 'silver'
  //       }
  //    },

  //    navigator: {
  //       handles: {
  //          backgroundColor: '#666',
  //          borderColor: '#AAA'
  //       },
  //       outlineColor: '#CCC',
  //       maskFill: 'rgba(255,255,255,0.1)',
  //       series: {
  //          color: '#7798BF',
  //          lineColor: '#A6C7ED'
  //       },
  //       xAxis: {
  //          gridLineColor: '#505053'
  //       }
  //    },

  //    scrollbar: {
  //       barBackgroundColor: '#808083',
  //       barBorderColor: '#808083',
  //       buttonArrowColor: '#CCC',
  //       buttonBackgroundColor: '#606063',
  //       buttonBorderColor: '#606063',
  //       rifleColor: '#FFF',
  //       trackBackgroundColor: '#404043',
  //       trackBorderColor: '#404043'
  //    },

  //    // special colors for some of the
  //    legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
  //    background2: '#505053',
  //    dataLabelsColor: '#B0B0B3',
  //    textColor: '#C0C0C0',
  //    contrastTextColor: '#F0F0F3',
  //    maskColor: 'rgba(255,255,255,0.3)'
  // };

  // // Apply the theme
  // JPTrader.quoteChart.setOptions(Highcharts.theme);





  });
  
  JPTrader.volumnChart = Highcharts.chart('chartContainer2', {
        chart: {
            animation: Highcharts.svg,
            marginRight: 10,
            events: {
                load: function () {
                }
            }
        },
        credits: {
            enabled: false
        },
        title: {
            text: ''
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150
        },
        yAxis: [{
            title: {
                text: 'Volumn',
                style: {
                    color: "#A0A0A3"/*Highcharts.getOptions().colors[1]*/
                }
            }
        }],
        plotOptions: {
          series: {
            borderWidth: 0,
            color: "#003dd7",
            marker: {
              enabled: false
            }
          }
        },
        tooltip: {
            shared: true
        },
        legend: {
            enabled: false
        },
        exporting: {
            enabled: false
        },
        series: [{
            type: 'column',
            name: 'Volume',
            type: 'area',
            data: (function () {
                var data = [];
                const time = (new Date(firstQuote["timestamp"])).getTime();
                                                         
                for (let i = -59; i <= 0; i += 1) {
                    data.push({
                        x: time + i * 1000,
                        y: 0
                    });
                }
                return data;
            }()),
            fillColor : {
                 linearGradient : {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                 },
                 stops : [
                    [0, Highcharts.getOptions().colors[0]],
                    [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                ]
            }
        }]
    });
  });




}


/**
A click delegate for all order wrap tables. This function will collapse and open the
trading details while user wants to look for more. This function should be added on the 
right-col div.
@param {Event} e
*/
JPTrader._collapseTradeDetailHandler = function(e){

  // find the closest row
  let orderWrap = e.target;
  while( !orderWrap.classList.contains("order-wrap") ) {
    orderWrap = orderWrap.parentNode;
    if ( !orderWrap ) return;
  }

  // show all 
  if ( orderWrap.dataset.collapse === "true" ) {

    let tableRows = Array.prototype.slice.call( orderWrap.querySelectorAll("tbody>tr") );
    tableRows.forEach(function(row){
      row.style.display = "table-row";
    });

    orderWrap.dataset.collapse = false;

  }
  // show the first and last
  else {

    let tableRows = Array.prototype.slice.call( orderWrap.querySelectorAll("tbody>tr") );

    for ( let i = 0; i < tableRows.length; i++ ) {

      const row = tableRows[i];
      if ( i === 0 || i === (tableRows.length - 1) ){
        row.style.display = "table-row";
      } 
      else {
        row.style.display = "none";
      }
      
    }
    orderWrap.dataset.collapse = true;
  }
  
}

/**
In this function we update the aggregate value of all orders including orders from
current, canceled and finished array.
*/
JPTrader._updateAggregateView = function(){
  
  let totalSoldQuantity = 0;
  let totalPnL = 0;

  this.currentOrders.forEach( order => {
    totalPnL += order.pnl;
    totalSoldQuantity += ( order.quantity - order.remainingQuantity );
  });

  this.finishedOrders.forEach( order => {
    totalPnL += order.pnl;
    totalSoldQuantity += ( order.quantity - order.remainingQuantity );
  });

  this.canceledOrders.forEach( order => {
    totalPnL += order.pnl;
    totalSoldQuantity += ( order.quantity - order.remainingQuantity );
  });

  const aggregateSoldTD = document.getElementById("aggregate-tqs");
  aggregateSoldTD.textContent = totalSoldQuantity;

  const aggregatePnLTD  = document.getElementById("aggregate-tpnl");
  aggregatePnLTD.textContent  = totalPnL.toFixed(2);

}


/**
A function that takes an order object, and this value binded with an 
last quote object with only one key "lastQuote". This function updates its delta box value.
@param {Object} order
@return {undefined}
*/
JPTrader._updateDeltaBox = function(order){

  // console.log('what is the this in here...');
  // console.log(this);

  // get the delta : ( last quote - this order's last order price )
  const instrumentId = order.instrument_id;

  // if this parent order doesn't have any successful sold order yet, we don't show anything.
  if ( order.last_price === null ) return;
  const delta = this.lastQuote - order.last_price;

  // update the text and color correspondingly
  const orderWrap = JPTrader.orderDOM[instrumentId];
  const deltaBox = orderWrap.querySelector(".delta-box");
  deltaBox.textContent = Math.abs(delta).toFixed(3);
  // console.log(delta);
  
  if ( delta > 0 ) { 
    deltaBox.classList.add("pos-delta");
    deltaBox.classList.remove("neg-delta");
  }
  else {
    deltaBox.classList.add("neg-delta");
    deltaBox.classList.remove("pos-delta");
  }

}


/**
A function to setup all the interactions, linkage and connections
@return {undefined}
*/
JPTrader.init = function(){

  // console.log('in init');
  console.log(document.getElementById("make-order-btn"));
  if ( document.getElementById("make-order-btn") === null ) return;

  document.getElementById("make-order-btn").addEventListener("click", this.makeOrder.bind(this) );

  
  window.onbeforeunload = function(){
    JPTrader.ws.close();
  }

  window.onunload = function(){
    console.log('in window on unload...');
    JPTrader.ws.close();
  }

  // check whether the user has logged in
  // save user name and id in the JPTrader object
  const _username = localStorage.getItem("username");
  const _userid = localStorage.getItem("userid");
  const _email = localStorage.getItem("email");

  if ( !_username ) {

    /***********************/
    //  WORK IN PROGRESS   //
    /***********************/
    
    // we can redirect the user back to log in page...
    // but that shouldn't happen tho

    alert("the user hasn't logged in yet...");
  }
  this.username = _username;
  this.userid = _userid;
  this.email = _email;

  this.quoteData = Array(243);
  this.quoteData.fill(0);

  // set delegate for all collapse button and trade detail button
  // so when users click on the three dots icon, the table collapse
  // when they click on trade-detail rows, trade detail hides.
  // const leftCol = document.querySelector(".right-col");
  const orderList = document.getElementById("order-list");
  orderList.addEventListener( "click", this._collapseTradeDetailHandler );

  // JPTrader.drawChart(100);
  JPTrader.getID = idGenerator();

  this.initWebSocket();

};

// JPTrader.init();


function* idGenerator(){
        let id = -1;
        while (true) {
          id++;
          yield id;
        }
      }

