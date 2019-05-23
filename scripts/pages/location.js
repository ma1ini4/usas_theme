require([
    'modules/jquery-mozu',
    'hyprlive',
    'modules/backbone-mozu',
    'modules/models-location',
    'modules/models-product',
    'modules/views-location'
],
    function ($, Hypr, Backbone, LocationModels, ProductModels, LocationViews) {
        var positionErrorLabel = Hypr.getLabel('positionError');

        var defaults = {
            storesPageSize: Hypr.getThemeSetting('storesPageSize')
        };

        function getQueryStrings() {
            var assoc = {};
            var decode = function (s) { return decodeURIComponent(s.replace(/\+/g, " ")); };
            var queryString = location.search.substring(1);
            var keyValues = queryString.split('&');

            for (var i in keyValues) {
                var key = keyValues[i].split('=');
                if (key.length > 1) {
                    assoc[decode(key[0])] = decode(key[1]);
                }
            }

            return assoc;
        }
        $(document).ready(function () {
            //DOM used for binding events
            var btnFindStores = $(".btn-find-stores"),
                btnFindStoresEmpty = $(".btn-find-stores-empty"),
                searchTermEmpty = $("#searchTermEmpty"),
                searchTermView = $("#searchTermView"),
                emptyStoreContainer = $(".empty-store-container"),
                searchViewContainer = $(".search-view-container"),
                showMoreStores = $("#showMoreStores"),
                showLessStores = $("#showLessStores"),
                showStoreDetail = $(".show-store-detail"),
                emptySearch = $(".empty-search"),
                storeSearchContainer = $(".store-search-container");

            //Get URL Param for auto search
            var qs = getQueryStrings();
            var isZipcode = qs.zipcode;

            if (isZipcode) {
                //show loading
                $(".store-locator-overlay").addClass("active");
                searchViewContainer.addClass("active");
            } else {
                emptyStoreContainer.addClass("active");
            }

            var $locationSearch = $('#location-list'),
                product = ProductModels.Product.fromCurrent(),
                productPresent = !!product.get('productCode'),
                locationsCollection = new LocationModels.LocationCollection(),
                ViewClass = productPresent ? LocationViews.LocationsSearchView : LocationViews.LocationsView,
                view = new ViewClass({
                    model: locationsCollection,
                    el: $locationSearch
                });

            if (productPresent) {
                view.setProduct(product);
            } else {
                //hide loading
                $(".store-locator-overlay").removeClass("active");
            }
            window.lv = view;

            btnFindStoresEmpty.on("click", function () {
                var zipcode = $.trim(searchTermEmpty.val());
                if (zipcode.length > 0) {
                    searchTermView.val(zipcode);
                    btnFindStores.trigger("click");
                } else {
                    //display error message
                    emptySearch.removeClass("hidden");
                    storeSearchContainer.addClass("has-error");
                }
            });

            btnFindStores.on("click", function () {
                var zipcode = $.trim(searchTermView.val());
                if (zipcode.length > 0) {
                    if (window.location.pathname.indexOf("store-details") > -1) {
                        window.location.href = window.location.origin + "/store-locator?zipcode=" + zipcode;
                        return;
                    }
                    //show loading
                    $(".store-locator-overlay").addClass("active");
                    emptyStoreContainer.removeClass("active");
                    searchViewContainer.addClass("active");

                    showMoreStores.attr("data-start-index", defaults.storesPageSize);
                    showLessStores.attr("data-start-index", 0);

                    if ($("#map").length > 0) {
                        view.getGeoCode(zipcode, function (data) {
                            var lat = data[0].geometry.location.lat(),
                                lng = data[0].geometry.location.lng();
                            //get and render nearby stores
                            view.getNearbyShops(defaults.storesPageSize, lat, lng, 0, function () {
                                view.drawMap(window.lv.model.apiModel.data.items);
                                $(".pagination-wrapper").show();
                            });
                        });
                    }
                } else {
                    //display error message
                    emptySearch.removeClass("hidden");
                    storeSearchContainer.addClass("has-error");
                }
            });

            showMoreStores.on("click", function (e) {
                e.preventDefault();
                var startIndex = parseInt($(this).attr("data-start-index"), 10),
                    zipcode = $.trim(searchTermView.val());

                if ((startIndex + defaults.storesPageSize) > window.lv.model.attributes.totalCount) {
                    startIndex = (window.lv.model.attributes.totalCount - defaults.storesPageSize);
                    $(this).addClass("hidden");
                }
                if (zipcode.length > 0) {
                    if ($("#map").length > 0) {
                        view.getGeoCode(zipcode, function (data) {
                            var lat = data[0].geometry.location.lat(),
                                lng = data[0].geometry.location.lng();
                            //get and render nearby stores
                            view.getNearbyShops(defaults.storesPageSize, lat, lng, startIndex, function () {
                                view.drawMap(window.lv.model.apiModel.data.items);
                                showLessStores.attr("data-start-index", startIndex);
                                startIndex = startIndex + defaults.storesPageSize;
                                showMoreStores.attr("data-start-index", startIndex);
                                if (showLessStores.hasClass("hidden"))
                                    showLessStores.removeClass("hidden");
                            });
                        });
                    }
                }
            });

            showLessStores.on("click", function (e) {
                e.preventDefault();
                var startIndex = parseInt($(this).attr("data-start-index"), 10),
                    zipcode = $.trim(searchTermView.val());
                if (startIndex <= 0) {
                    $(this).addClass("hidden");
                    return;
                } else {
                    showMoreStores.attr("data-start-index", startIndex);
                    startIndex = startIndex - defaults.storesPageSize;
                    $(this).removeClass("hidden");
                    if (showMoreStores.hasClass("hidden"))
                        showMoreStores.removeClass("hidden");
                }
                if (zipcode.length > 0) {
                    if ($("#map").length > 0) {
                        view.getGeoCode(zipcode, function (data) {
                            var lat = data[0].geometry.location.lat(),
                                lng = data[0].geometry.location.lng();
                            //get and render nearby stores
                            view.getNearbyShops(defaults.storesPageSize, lat, lng, startIndex, function () {
                                view.drawMap(window.lv.model.apiModel.data.items);
                                showLessStores.attr("data-start-index", startIndex);
                                if (startIndex === 0)
                                    showLessStores.addClass("hidden");
                            });
                        });
                    }
                }
            });
            $("#map").on("click", ".mz-locationlisting-name,.mz-store-hours", function (e) {
                e.preventDefault();
                var storeURL = $(this).attr("data-store-url");
                window.location.href = storeURL;
            });
            $("#searchTermView,#searchTermEmpty").keyup(function (e) {
                if (e.which === 13) {
                    if ($(this).val().length > 0) {
                        if ($(this).attr("id") === "searchTermEmpty") {
                            btnFindStoresEmpty.trigger("click");
                        } else {
                            btnFindStores.trigger("click");
                        }
                        window.location.hash = "";
                    } else {
                        //display error message
                        emptySearch.removeClass("hidden");
                        storeSearchContainer.addClass("has-error");
                    }
                }
                if ($(this).val().length > 0 && !emptySearch.hasClass("hidden")) {
                    emptySearch.addClass("hidden");
                    storeSearchContainer.removeClass("has-error");
                }
            });
        });
    }
);
