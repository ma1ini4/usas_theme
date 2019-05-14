define(['modules/api', 'modules/backbone-mozu', 'underscore', 'modules/jquery-mozu', 'modules/models-product-paging-control', 'hyprlivecontext', 'hyprlive', 'modules/preserve-element-through-render'], function(api, Backbone, _, $, ProductPagingControlModel, HyprLiveContext, Hypr, preserveElement) {
	var ProductPagingControlView = Backbone.MozuView.extend({
		templateName: 'modules/product/product-paging-control',
		previous: function() {
			var productCode = this.model.get("prevAndNextCodes")[(this.model.get("prevAndNextCodes").indexOf(this.model.get('currentProductCode')) - 1)];
			if (productCode) {
				window.location.href = "/p/" + productCode + location.search;
			}
		},
		next: function() {
			var productCode = this.model.get("prevAndNextCodes")[(this.model.get("prevAndNextCodes").indexOf(this.model.get('currentProductCode')) + 1)];
			if (productCode) {
				window.location.href = "/p/" + productCode + location.search;
			}
		},
		render: function() {
			Backbone.MozuView.prototype.render.apply(this);
		}
	});
	$(document).ready(function() {
		var productPagingControlModel = new ProductPagingControlModel.ProductPagingControl();
		var product = require.mozuData('product');
		productPagingControlModel.set('currentProductCode', product.productCode);
		productPagingControlModel.setParentCategory();
		productPagingControlModel.getPrevAndNextProducts();
		productPagingControlModel.on('productListAvailable', function(productCodes) {
			if (productCodes.indexOf(product.productCode) === 0 && productCodes.length - 1 > 0) {
				$('.mz-next-button').show();
			} else if (productCodes.indexOf(product.productCode) === productCodes.length - 1 && productCodes.length - 1 > 0) {
				$('.mz-previous-button').show();
			} else if (productCodes.indexOf(product.productCode) < productCodes.length - 1) {
				$('.mz-previous-button').show();
				$('.mz-next-button').show();
			}
		});
		var productPagingControlView = new ProductPagingControlView({
			el: $('.product-paging-control'),
			model: productPagingControlModel
		});
		window.productPagingControlView = productPagingControlView;
		productPagingControlView.render();
	});
});
