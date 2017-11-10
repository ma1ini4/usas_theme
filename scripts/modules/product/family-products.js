define([
    'modules/jquery-mozu',
    'underscore',
    "modules/api",
    "modules/backbone-mozu",
    'hyprlivecontext',
    "bxslider",
    'modules/block-ui',
    "hyprlive"
], function($, _, api, Backbone, HyprLiveContext, bxslider, blockUiLoader, Hypr) {

	var FamilyItemView = Backbone.MozuView.extend({
        tagName: 'div',
        className: 'mz-familylist-item col-xs-12',
        templateName: 'modules/product/family/family-item',
        initialize: function() {
            var self = this;
            self.listenTo(self.model, 'change', self.render);
        },
        render: function() {
            Backbone.MozuView.prototype.render.apply(this);
            return this;
        }
    });

    var Model = Backbone.MozuModel.extend();

    var familyObject = "",
    showError = require.mozuData('pagecontext').isDebugMode||require.mozuData('pagecontext').isAdminMode||require.mozuData('pagecontext').isEditMode;
    

	function renderFamily() {
		var self = this;
		try {
	        familyObject = require.mozuData('family').stringValue;
	    }
	    catch(e){}

	    if (familyObject !== "") {
	        try {
	            familyObject = JSON.parse(familyObject);
	            var familyProducts = [];
	            for (var i=0;i<familyObject.length;i++) {
	                familyProducts.push(familyObject[i].productCode);
	            }
	            var filter = familyProducts.join(" or productCode+eq+");
	            if (filter !== "" && filter !== " or ") {
	                var serviceurl = '/api/commerce/catalog/storefront/productsearch/search/?startIndex=0&pageSize=20&filter=productCode+eq+'+filter;
	                api.request('GET', serviceurl).then(function(productslist){
	                    $("#mz-family-container").empty();
	                    for(var p=0;p<productslist.items.length;p++) {
	                        var view = new FamilyItemView({ model: new Model(checkVariationCode(productslist.items[p], familyObject)) });
	                        var renderedView = view.render().el;
	                        $("#mz-family-container").append(renderedView);
	                    }
	                });
	            }
	        }
	        catch(e){
	            if (showError) {
	                $("#mz-family-container").html("Family JSON is not correct!");
	            }
	            else {
	                console.log("Family JSON is not correct!");
	            }
	        }
	    }
	}
	function checkVariationCode(e, prod_arr){
		var options_arr = [];
        var item_code = e.productCode;
        var variations = e.variations;
        e.variations = [];
        //remove variations
        _.each(variations, function(valued) { 
            for(var j = 0; j < prod_arr.length; j++){
                if(prod_arr[j].productCode === item_code && prod_arr[j].variationCodes){
                    for(var k = 0; k < prod_arr[j].variationCodes.length; k++){
                        if(valued.productCode === prod_arr[j].variationCodes[k]){
                        	e.variations.push(valued);     
                        	e.variations = _.uniq(e.variations);    
                        	if(e.options){
	                        	for(var l = 0; l < valued.options.length; l++){
	                        		options_arr.push(valued.options[l].valueSequence);
	                        		options_arr = _.uniq(options_arr);
	                        	}
                        	}                   
                        }
                    }
                }
            }
        });
        //remove options
        if(e.options){
	        for(var a = 0; a < e.options.length; a++){
	        	var opt_values = e.options[a].values;
	        	e.options[a].values = [];
	        	for(var b = 0; b < opt_values.length; b++){
	        		for(var c = 0; c < options_arr.length; c++){
	        			if(opt_values[b].attributeValueId === options_arr[c]){
	        				e.options[a].values.push(opt_values[b]);
	        			}
	        		}
	        	}
	        }
	    }
        return e;
	}

	return {
		render: renderFamily
	};

});