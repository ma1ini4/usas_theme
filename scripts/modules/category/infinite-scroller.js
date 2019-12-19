define([
    'modules/backbone-mozu',
    'modules/jquery-mozu',
    "hyprlive",
    'underscore',
    "hyprlivecontext",
    "modules/api",
    "modules/get-partial-view",
    "modules/block-ui"
], function (Backbone, $, Hypr, _, HyprLiveContext, api, getPartialView, blockUiLoader) {
    var items = require.mozuData('facetedproducts').items;
    var sitecontext = HyprLiveContext.locals.siteContext;
    var cdn = sitecontext.cdnPrefix;
    var isLoadMore = true;
    var firstLoad = true;
    var siteID = cdn.substring(cdn.lastIndexOf('-') + 1);
    var imagefilepath = cdn + '/cms/' + siteID + '/files';
    // var startIndex = require.mozuData('facetedproducts').startIndex; 
    var startIndex = require.mozuData('facetedproducts').pageSize;
    var pageSize = require.mozuData('facetedproducts').pageSize;

    var ProductListItemView = Backbone.MozuView.extend({
        tagName: 'li',
        className: 'mz-productlist-item col-xs-6 col-sm-4',
        templateName: 'modules/product/product-listing',
        initialize: function () {
            var self = this;
            self.listenTo(self.model, 'change', self.render);
        },
        render: function () {
            Backbone.MozuView.prototype.render.apply(this);

            this.$el.attr("data-mz-product", this.$el.find(".mz-productlisting").data("mz-product"));
            this.$el.find('.primary-btn.quick-view-btn').attr('data-mz-product-data', JSON.stringify(this.model));

            return this;
        }
    });

    var Model = Backbone.MozuModel.extend();

    var ProductsListView = Backbone.MozuView.extend({
        templateName: 'modules/category/infinity-scroll',
        initialize: function () {
            var self = this;
            
            $(document).ready(function() {
                var totalFooterHeight = 0;
                $('.mz-pagefooter').each(function () {
                    totalFooterHeight += $(this).height();
                });
                totalFooterHeight += $('footer').height() + $('.mz-pagefooter-copyright ').height();

                $(window).scroll(function () {
                    if ($(window).scrollTop() >= $(document).height() - $(window).height() - totalFooterHeight - 100) {
                        if ($(".view-all.selected").length) {
                            $("#more-item-container").show();
                            self.loadMoreProducts();
                        } else {
                            $("#more-item-container").hide();
                        }
                    }
                });
            });
        },
        render: function () {
            var me = this;
            items = require.mozuData('facetedproducts').items;
            me.model.attributes.products = items;
            Backbone.MozuView.prototype.render.apply(this);
            $('#more-product-list').empty();
        },
        addProduct: function (prod) {
            var view = new ProductListItemView({
                model: new Model(prod)
            });
            var renderedView = view.render().el;
            $('#more-product-list').append(renderedView);
        },
        loadMoreProducts: function () {
            var me = this;
            var totalProducts = require.mozuData('facetedproducts').totalCount;

            if (totalProducts > startIndex && isLoadMore) {
                isLoadMore = false;
                $("#loaderIcon").show();
                var url = window.location.pathname;
                var search = window.location.search;
                var customPageSize = (search.indexOf('pageSize') !== -1) ? getPageSize(search) : false;
                if (firstLoad && customPageSize) {
                    firstLoad = false;
                    startIndex = (customPageSize !== pageSize) ? customPageSize : startIndex;
                    pageSize = (customPageSize !== pageSize) ? customPageSize : pageSize;
                }
                search += (search.indexOf('?') == -1) ? '?' : '&';
                if (startIndex !== 0) {
                    blockUiLoader.globalLoader();
                    getPartialView(url + search + 'startIndex=' + startIndex, 'category-interior-json').then(function (response) {

                        var products = JSON.parse(response.body);
                        try {
                            _.each(products.items, me.addProduct.bind(me));
                        } catch (err) {
                            console.log(err);
                        }
                        blockUiLoader.unblockUi();
                        $("#loaderIcon").hide();
                        isLoadMore = true;
                        startIndex += pageSize;
                    }, function (error) {
                        $("#loaderIcon").hide();
                        blockUiLoader.unblockUi();
                        isLoadMore = true;
                        console.log(error);
                    });
                } else {
                    startIndex += pageSize;
                }
            }
        }
    });

    function getPageSize(arr) {
        if (arr.indexOf('?') === 0) {
            arr = arr.split('?');
            arr = arr[1];
        }
        arr = arr.split('&');
        var pageSize;
        for (var i = arr.length; i--;) {
            if (arr[i].indexOf("pageSize") >= 0) {
                pageSize = arr[i];
                break;
            }
        }
        if (pageSize) {
            pageSize = pageSize.split('=');
        }

        return parseInt(pageSize[1], 10);
    }
    return {
        update: function () {
            var productsListView = new ProductsListView({
                model: new Model({
                    products: items
                }),
                el: '#more-item-container'
            });
            startIndex = pageSize;
            productsListView.render();
        }
    };
});