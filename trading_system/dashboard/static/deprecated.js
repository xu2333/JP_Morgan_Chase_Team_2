/***************** DEPRECATED *********************/

JPTrader._collapseTradeDetailHandler = function(e){

  // find the closest row
  let tr = e.target;
  while( tr.tagName !== "TR" ) {
    tr = tr.parentNode;
    if ( !tr ) return;
  }

  // check if it's clicking on the child of collapse row
  // we show all detail
  if ( tr.classList.contains("collapse-row") ) {

    // show all the detail after clicking this...
    let orderWrap = e.target.parentNode;
    while( !orderWrap.classList.contains("order-wrap") ){
      orderWrap = orderWrap.parentNode;
    }

    // if there are no detail yet, which means that this order just started, we return.
    let tradeDetails = orderWrap.querySelectorAll(".trade-detail");
    if ( tradeDetails.length === 0 ) return;

    orderWrap.dataset.collapse = false;

    tradeDetails.forEach(function(row){
      row.style.display = "table-row";
    });

    const collapseRow = orderWrap.querySelector("tr.collapse-row");
    collapseRow.style.display = "none";

  // check if the user is clicking on any detail row
  // if so, we collapse all detail
  } else if ( tr.classList.contains("trade-detail") ) {

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



JPTrader.drawChart = function() {

  
  // var n = 243,
  //     duration = 1000,
  //     now = new Date(Date.now() - duration),
  //     count = 0;
  // let dataLength = JPTrader.quoteData.length;
  // let data = JPTrader.quoteData.slice(dataLength - n);
  // console.log(data);

  // var margin = {top: 6, right: 0, bottom: 20, left: 40},
  //     width = 960 - margin.right,
  //     height = 190 - margin.top - margin.bottom;

  // var x = d3.time.scale()
  //     .domain([now - (n - 2) * duration, now - duration])
  //     .range([0, width]);

  // var y = d3.scale.linear()
  //     .range([height, 0]);

  // var line = d3.svg.line()
  //     // .interpolate("basis")
  //     .x(function(d, i) { return x(now - (n - 1 - i) * duration); })
  //     .y(function(d, i) { return y(d); });

  // var svg = d3.select("#quote-chart-wrap").select("svg")
  //     .attr("width", width + margin.left + margin.right)
  //     .attr("height", height + margin.top + margin.bottom)
  //     .style("margin-left", margin.left + "px")
  //   .append("g")
  //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // svg.append("defs").append("clipPath")
  //     .attr("id", "clip")
  //   .append("rect")
  //     .attr("width", width)
  //     .attr("height", height);

  // var axis = svg.append("g")
  //     .attr("class", "x axis")
  //     .attr("transform", "translate(0," + height + ")")
  //     .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

  // var path = svg.append("g")
  //     .attr("clip-path", "url(#clip)")
  //   .append("path")
  //     .datum(data)
  //     .attr("class", "line");

  // var transition = d3.select({}).transition()
  //     .duration(duration)
  //     .ease("linear");

  // d3.select(window)
  //     .on("scroll", function() { ++count; });

  // (function tick() {

  //   transition = transition.each(function() {
      
  //     // update the domains
  //     now = new Date();
  //     x.domain([now - (n - 2) * duration, now - duration]);
      
  //     // y.domain([0, d3.max(data)]);
  //     y.domain([firstQuote - 12, firstQuote + 12]);

  //     // push the accumulated count onto the back, and reset the count
  //     data.push(JPTrader.quoteData.slice(-1)[0]);

  //     count = 0;

  //     // redraw the line
  //     svg.select(".line")
  //         .attr("d", line)
  //         .attr("transform", null);

  //     // slide the x-axis left
  //     axis.call(x.axis);

  //     // slide the line left
  //     path.transition()
  //         .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")");

  //     // pop the old data point off the front
  //     data.shift();

  //   }).transition().each("start", tick);

  // })();

//   var data = [
// {
// "id": 1,
// "message_type": "sold_message",
// "remaining_quantity": 950,
// "sold_price": 137.72,
// "sold_quantity": 50,
// "pnl": 6886.0,
// "timestamp": "2016-09-26 11:14:57" // the number of %S must be an integer
// }
//        ];
  
}