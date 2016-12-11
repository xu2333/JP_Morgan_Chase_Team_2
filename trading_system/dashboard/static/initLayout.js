// this file is to setup the layout of golden layout plugin

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
      	
      	width: 720,
        height: 450
      },{
      	type: 'stack',
      	componentName: 'order-setting',
      	activeItemIndex: 0,
      	content: [
			    {
			    type:'component',
			    componentName: 'makeOrdersView',
			    componentState: { text: 'Component 1' },

			    },
			    {
			    type:'component',
			    componentName: 'userSettingsView',
			    componentState: { text: 'Component 2' }
			    }
			  ],
			  width: 720,
        height: 450
      }],

      width: 720
		},
		{
      type: 'stack',
      content:[{
        type: 'component',
        componentName: "todayOrdersView",
        componentState: { label: 'B' }
      },{
        type: 'component',
        componentName: 'historyView',
        componentState: { label: 'C' }
      }],
      width: 720,
      height: 900
    }]
  }]
};

const myLayout = new GoldenLayout( config , $("#panels") );

myLayout.registerComponent( 'chartView', function( container, componentState ){

	const section = container.getElement()[0];
	// console.log(container.getElement());
	// console.log(componentState);
	// section.innerHTML = "Charts...";
	// console.log(section)
	container.getElement().html('<div id="chartContainer"></div>');

  // container.getElement().html( '<h2>' + componentState.label + '</h2>' );
});


myLayout.registerComponent( "todayOrdersView", function( container, componentState ){
	container.getElement().html( '<h2>' + componentState.label + '</h2>' );
});

myLayout.registerComponent( "historyView", function( container, componentState ){
	container.getElement().html( '<h2>' + componentState.label + '</h2>' );
});

myLayout.registerComponent( "makeOrdersView", function( container, componentState ){
	// container.getElement().html( '<h2>' + componentState.text + '</h2>' );
	const makeOrderHTML = '<div id="make-order-layout">' +
      '<h2 class="form-signin-heading">Make order here</h2>' + 
      '<div>' +
        '<div class="form-group">' +
          '<label for="ParentOrder">Total Quantity (Parent Order)</label>' + 
          '<input type="text" class="input-block-level form-control" placeholder="Quantity" name="Quantity" id="quantity">' + 
        '</div>' +  
        '<div class="form-group"' + 
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
      '<button class="btn btn-large btn-primary" type="submit" id="make-order-btn">Make order</button>' + 
      '<div id="input-error-message"></div>' + 
    '</div>';
	container.getElement().html( makeOrderHTML );
});

myLayout.registerComponent( "userSettingsView", function( container, componentState ){
	container.getElement().html( '<h2>' + componentState.text + '</h2>' );
});



myLayout.init();