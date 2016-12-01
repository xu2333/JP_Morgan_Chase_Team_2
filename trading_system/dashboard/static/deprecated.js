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