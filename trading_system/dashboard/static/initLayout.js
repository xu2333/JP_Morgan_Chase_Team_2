// this file is to setup the layout of golden layout plugin
// and call JPTrader init after the layout is complete.

const config = {
  content: [{
    type: 'row',
    content:[
    {
      type: 'column',
      content: [{
      	type: 'component',
      	componentName: 'chartView',
      	componentState: { label: 'chart_view'},

      	title: "Market Price",
      	width: 720,
        height: 328
      },{
        type: 'component',
        componentName: 'chartView2',
        componentState: { label: 'chart_view_2'},

        title: "Market Volume",
        width: 720,
        height: 120,
        
      },
      {
      	type: 'stack',
      	componentName: 'order-setting',
      	activeItemIndex: 0,
      	content: [
			    {
			    type:'component',
			    componentName: 'makeOrdersView',
			    componentState: { text: 'Component 1' },

          title: "Make Orders",
          isClosable: false
			    },
			    {
			    type:'component',
			    componentName: 'userSettingsView',
			    componentState: { text: 'Component 2' },

          title: "User Setting"
			    }
			  ],
			  width: 720,
        height: 376
      }],

      width: 720
		},
		{
      type: 'stack',
      content:[{
        type: 'component',
        componentName: "todayOrdersView",
        componentState: { label: 'B' },
        title: "Today's Orders"

      },{
        type: 'component',
        componentName: 'historyView',
        componentState: { label: 'C' },

        title: "History"
      }],
      width: 720,
      height: 834
    }]
  }]
};

const myLayout = new GoldenLayout( config , $("#panels") );

myLayout.registerComponent( 'chartView', function( container, componentState ){
	const section = container.getElement()[0];
	container.getElement().html('<div id="chartContainer"></div>');
});

myLayout.registerComponent( 'chartView2', function( container, componentState ){
  container.getElement().html('<div id="chartContainer2"></div>');
});


myLayout.registerComponent( "todayOrdersView", function( container, componentState ){
	container.getElement().html( '<div id="order-list">' );
});

myLayout.registerComponent( "historyView", function( container, componentState ){
	// container.getElement().html( '<h2>' + componentState.label + '</h2>' );
	container.getElement().html('<iframe style="width: 100%; height: 100%;" src="../history/"></iframe>');

});

myLayout.registerComponent( "makeOrdersView", function( container, componentState ){
	const makeOrderHTML = '<div id="make-order-layout">' +
      '<!--h3 class="form-signin-heading">Make Order</h3-->' + 
      '<div>' +
        '<div class="form-group">' +
          '<label for="ParentOrder">Total Quantity (Parent Order)</label>' + 
          '<input type="text" class="input-block-level form-control" placeholder="Quantity" name="Quantity" id="quantity">' + 
        '</div>' +  
        '<div class="form-group">' + 
          '<label for="ChildOrder">Order Size (Child Order)</label>' + 
          '<input type="text" class="input-block-level form-control" placeholder="Order size" id="order_size">' + 
        '</div>' + 
        '<div class="form-group">' + 
          '<label for="Discount">Discount</label>' + 
          '<input type="text" class="input-block-level form-control" placeholder="Discount" name="Discount" id="discount">' + 
        '</div>' +
        '<div class="form-group">' + 
          '<label for="sell-duration">Sell Duration (minutes)</label>' + 
            '<input type="text" class="input-block-level form-control" placeholder="Duration" name="Time" id="sell_duration">' +   
        '</div>' + 
      '</div>' + 
      '<button class="btn btn-large btn-primary" type="submit" id="make-order-btn">Make Order</button>' + 
      '<div id="input-error-message"></div>' + 
    '</div>';
	container.getElement().html( makeOrderHTML );
});

myLayout.registerComponent( "userSettingsView", function( container, componentState ){
	container.getElement().html( '<h2>' + componentState.text + '</h2>' );
});


// myLayout.on("initialised", function(){
// });

// init JPTrader after all the html tags are rendered in the golden layout.
myLayout.on("itemCreated", function(e){
	if (e.componentName == "historyView" ) JPTrader.init();
});

myLayout.init();