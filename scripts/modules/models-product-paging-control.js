define(['modules/api', 'modules/backbone-mozu', 'underscore', 'modules/jquery-mozu', 'modules/models-orders', 'hyprlivecontext', 'hyprlive', 'modules/preserve-element-through-render'], function(api, Backbone, _, $, OrderModels, HyprLiveContext, Hypr, preserveElement) {
	var ProductPagingControl = Backbone.MozuModel.extend({
		getPrevAndNextProducts: function() {
			var self = this;
			if (self.get('parentCategory')) {
				var serviceurl = '/api/commerce/catalog/storefront/productsearch/search/';
				var apiData = require.mozuData('apicontext');
				delete apiData.headers['x-vol-user-claims'];
				delete apiData.headers['x-vol-app-claims'];
				var payload = {
					filter: 'categoryId eq ' + self.get('parentCategory'),
					responseFields: 'items/productCode',
					pageSize: 500,
					sortBy: 'createDate asc'
				};
				$.ajax({
					url: serviceurl,
					headers: apiData.headers,
					method: 'GET',
					data: payload,
					dataType: "json",
					cache: true,
					contentType: "application/json; charset=utf-8",
					success: function(res) {
						if (res) {
							var productCodes = _.flatten(_.pluck(res.items, 'productCode'));
							self.set("prevAndNextCodes", productCodes);
							self.trigger('productListAvailable', productCodes);
						}
					},
					error: function(error) {
						console.log("Error retrieving product list", error);
					}
				});
			}
		},
		setParentCategory: function() {
			var self = this;
			var navigation = require.mozuData('navigation');
			var breadcrumb = $('.mz-breadcrumb-link:last').attr("href");
			if (breadcrumb && breadcrumb.substring(breadcrumb.lastIndexOf("/") + 1, breadcrumb.length)) {
				self.set('parentCategory', breadcrumb.substring(breadcrumb.lastIndexOf("/") + 1, breadcrumb.length));
			} else if (navigation && navigation.breadcrumbs[navigation.breadcrumbs.length - 2]) {
				self.set('parentCategory', navigation.breadcrumbs[navigation.breadcrumbs.length - 2].originalId);
			}
		}
	});
    return {
        ProductPagingControl: ProductPagingControl
    };
});
