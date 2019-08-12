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

    function ellipsisInfoTabs(height) {

        $('.tab-content .tab-pane').each(function () {
            var self = $(this);
            var isActive = self.hasClass('active') ? true : false;

            if (!isActive) {
                self.addClass('active');
            }

            var tabContent = self.children('[class^="tab-content-"]');

            if (tabContent.outerHeight() >= height) {

                tabContent.addClass('truncated');
                tabContent.append('<i class="fas fa-ellipsis-h"></i>');

            }

            if(!isActive) {
                self.removeClass('active');
            }            
        });
        $('.truncated').css({height : height});
    }

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

        ellipsisInfoTabs(100);

        $('.info-tabs-details .tabs-desktop i').click(function(){
            $(this).closest('[class^="tab-content-"]').removeClass('truncated');
            $(this).closest('[class^="tab-content-"]').addClass('expanded');
            $(this).closest('[class^="tab-content-"]').animate({
                height: "100%"
            }, 300);

            $(this).hide();
        });
    });

});
