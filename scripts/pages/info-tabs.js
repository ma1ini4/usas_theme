require([
    "modules/jquery-mozu",
    "underscore",
    "hyprlive",
    "modules/backbone-mozu",
    "modules/models-product",
    "hyprlivecontext"
], function($, _, Hypr, Backbone, ProductModels, HyprLiveContext) {

    var InfoTabsView = Backbone.MozuView.extend({
        templateName: 'modules/product/product-info-tabs',
        render: function() {
            Backbone.MozuView.prototype.render.call(this);
        }
    });

    $(document).ready(function() {

        var productInfoTab = ProductModels.Product.fromCurrent();
        var infoTabsView = new InfoTabsView({
            el: $('.info-tabs-details'),
            model: productInfoTab
        });

        window.infoTabsView = infoTabsView;
        productInfoTab.processInfoTabsContent();
        infoTabsView.render();

        window.infoTabsView.on('infoTabsCollectionViewReady', function() {
            this.render();
        });

    });

});
