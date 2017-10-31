require([
        'modules/jquery-mozu',
        'hyprlive',
        'modules/backbone-mozu',
        'modules/models-location',
        'modules/models-product'
    ],
    function($, Hypr, Backbone, LocationModels, ProductModels) {

        var defaults = {
            googleMapAPIKey: Hypr.getThemeSetting('googleMapAPIKey'),
            googleMapLatitude: Hypr.getThemeSetting('googleMapLatitude'),
            googleMapLongitude: Hypr.getThemeSetting('googleMapLongitude'),
            googleMapZoom: Hypr.getThemeSetting('googleMapZoom'),
            googleMapPinIcon: Hypr.getThemeSetting('googleMapPinIcon'),
            storesPageSize: Hypr.getThemeSetting('storesPageSize'),
            googleMapMaxNearbyDistance: Hypr.getThemeSetting('googleMapMaxNearbyDistance')
        };

        try {
            defaults.googleMapZoom = parseInt(defaults.googleMapZoom, 10);
        } catch (e) {}

        var map,
            google = window.google || {},
            infowindow,
            bounds,
            marker,
            currentMarker;

        var positionErrorLabel = Hypr.getLabel('positionError'),

            LocationsView = Backbone.MozuView.extend({
                templateName: 'modules/location/locations',
                initialize: function() {
                    var self = this;
                    this.populate();
                },
                populate: function(location) {
                    var self = this;
                    var show = function() {
                        self.render();
                        $('.mz-locationsearch-pleasewait').fadeOut();
                        self.$el.noFlickerFadeIn();
                        //Get URL Param for auto search
                        var url_string = window.location.href;
                        var url = new URL(url_string);
                        // console.log(url);
                        var isZipcode = url.searchParams.get("zipcode");
                        var isStoreId = url.searchParams.get("code");

                        if (isZipcode !== null) {
                            $("#searchTermView").val(isZipcode);
                            $(".empty-store-container").removeClass("active");
                            $(".search-view-container").addClass("active");
                            $(".btn-find-stores").trigger("click");
                            if (isZipcode === "Enter Zip") {
                                $("#searchTermView").val("");
                                $("#searchTermView").attr("placeholder", isZipcode);
                            }
                        }
                        if (isStoreId !== null) {
                            // console.log(storeId);
                            var items = window.lv.model.apiModel.data.items,
                                lat, lng, isValid = false;
                            for (var i = 0; i < items.length; i++) {
                                if (isStoreId === items[i].code) {
                                    lat = items[i].geo.lat;
                                    lng = items[i].geo.lng;
                                    isValid = true;
                                    // $(".empty-store-container").removeClass("active");
                                    // $(".search-view-container").addClass("active");
                                    $(".pagination-wrapper").hide();
                                    break;
                                    //console.log(items[i], items[i].geo.lat, items[i].geo.lng);
                                }
                            }
                            if (isValid) {
                                self.loadStoreDetailPage(1, lat, lng);
                            } else {
                                $("#searchTermView").val("enter+zip");
                                $(".btn-find-stores").trigger("click");
                                $("#searchTermView").val("");
                            }
                        }
                        //hide loading
                        $(".store-locator-overlay").removeClass("active");
                    };
                    if (location) {
                        this.model.apiGetByLatLong({ location: location }).then(show);
                    } else {                        
                        if(window.location.pathname.indexOf("store-details") > -1){
                            this.model.apiGet().then(show);
                        }else{
                            this.model.apiGet({ pageSize: defaults.storesPageSize}).then(show);
                        }                        
                    }
                },
                getRenderContext: function() {
                    var c = Backbone.MozuView.prototype.getRenderContext.apply(this, arguments);
                    c.model.positionError = this.positionError;
                    return c;
                },
                drawMap: function(locations) {
                    var center;

                    //if no item found draw empty map
                    if (locations.length === 0) {
                        center = new google.maps.LatLng(defaults.googleMapLatitude, defaults.googleMapLongitude);
                    } else {
                        center = new google.maps.LatLng(locations[0].geo.lat, locations[0].geo.lng);
                    }

                    //google map api
                    map = new google.maps.Map(document.getElementById('map'), {
                        zoom: defaults.googleMapZoom,
                        center: center,
                        mapTypeId: google.maps.MapTypeId.ROADMAP
                    });

                    infowindow = new google.maps.InfoWindow();
                    bounds = new google.maps.LatLngBounds();
                    google.maps.event.addListener(map, 'click', function() {
                        infowindow.close();
                    });

                    for (var i = 0; i < locations.length; i++) {
                        this.createMarker(locations[i], i);
                        this.bindMarkers(locations[i], currentMarker);
                    }
                    this.bindShowDetailPage();
                    //hide loading
                    $(".store-locator-overlay").removeClass("active");
                },
                createMarker: function(location, i) {
                    marker = new google.maps.Marker({
                        position: new google.maps.LatLng(location.geo.lat, location.geo.lng),
                        icon: defaults.googleMapPinIcon ? defaults.googleMapPinIcon : "",
                        title: location.description,
                        map: map
                    });
                    bounds.extend(marker.position);
                    //for marker event binding to DOM
                    currentMarker = marker;
                    var storeSearched = ($("#success-shops").text().length > 0) ? "hidden" : "";

                    google.maps.event.addListener(marker, 'click', (function(marker, i) {
                        return function() {
                            var dirQueryString = [
                                "Christmas Tree Shops" +
                                location.address.address1,
                                location.address.address2,
                                location.address.address2,
                                location.address.cityOrTown,
                                location.address.stateOrProvince,
                                location.address.postalOrZipCode,
                                location.address.countryCode
                            ];
                            dirQueryString = dirQueryString.join(" ");
                            var saddr = (window.location.pathname.indexOf("store-details") > -1) ? '<p class="start-address-label">Start address:</p> <input type="text" name="saddr">' : '';

                            //Info window content DOM
                            var infoWindowDOM = '<div class="mz-locationlisting">' +
                                '<div class="mz-locationlisting-locationdetails">' +
                                '<h4 data-store-url="store-details?code=' + location.code + '" class="mz-locationlisting-name" style="text-transform:uppercase;">' + location.description + '</h4>' +
                                '<div class="mz-addresssummary">' +
                                '<span>' + (typeof location.firstName == "undefined" ? "" : location.firstName) + (typeof location.lastNameOrSurname == "undefined" ? "" : location.lastNameOrSurname) + '</span>' +
                                '<span>' + location.address.address1 + '</span>' +
                                '<span>' + location.address.address2 + '</span>' +
                                '<span>' + location.address.address3 + '</span>' +
                                '<span>' + location.address.cityOrTown + ', ' + location.address.stateOrProvince + ' ' + location.address.postalOrZipCode + '</span>' +
                                '<span>' + location.phone + '</span>' +
                                '<span><a class="mz-store-hours" data-store-url="store-details?code=' + location.code + '" href="javascript:void(0);"><u>Hours & Info</u></a></span>' +
                                '</div>' +
                                '<form class="search-address-form" target="_blank" action="//maps.google.com/maps">' +
                                '<div class="search-address-container ' + storeSearched + '">' +
                                saddr +
                                '</div>' +
                                '<input type="hidden" name="daddr" value="' + dirQueryString + '">' +
                                '<div class="dir-btn-container">' +
                                '<input type="submit" class="btn button_primary btn-block" value="GET DIRECTIONS"></input>' +
                                '</div>' +
                                '</form>' +
                                '</div>' +
                                '</div>';

                            //Info window content DOM END
                            infowindow.setContent(infoWindowDOM);
                            infowindow.open(map, marker);
                            map.setCenter(marker.getPosition());
                        };
                    })(marker, i));

                    map.fitBounds(bounds);
                },
                bindMarkers: function(location, marker) {
                    var DOM = $("[data-marker-id='marker_" + location.code + "'");
                    DOM.on("click", function() {
                        google.maps.event.trigger(marker, 'click');
                    });
                },
                getGeoCode: function(zipCode, callback) {
                    var _self = this;
                    var geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ 'address': zipCode }, function(results, status) {
                        if (status == google.maps.GeocoderStatus.OK) {
                            //console.log(results);
                            callback(results);
                            document.getElementById("success-shops").innerHTML = "Stores near " + results[0].formatted_address;
                            document.getElementsByClassName("invalid-location")[0].classList.add("hidden");
                            document.getElementById("noNearbyStores").classList.add("hidden");
                        } else {
                            //get and render nearby stores
                            _self.getNearbyShops(defaults.storesPageSize, 30.375321, 69.34511599999996, 0, function() {
                                _self.drawMap(window.lv.model.apiModel.data.items);
                                document.getElementById("noNearbyStores").classList.add("hidden");
                                document.getElementsByClassName("invalid-location")[0].classList.remove("hidden");
                                document.getElementsByClassName("error-success-message-container")[0].classList.remove("hidden");
                                document.getElementById("location-list").classList.remove("hidden");
                            });
                        }
                    });
                },
                getNearbyShops: function(pageSize, lat, lng, startIndex, callback) {
                    //show loading
                    $(".store-locator-overlay").addClass("active");
                    this.model.apiGet({ pageSize: pageSize, startIndex: startIndex, filter: 'geo near(' + lat + ',' + lng + ',' + defaults.googleMapMaxNearbyDistance + ')' })
                        .then(function(data) {
                            if (data.length > 0) {
                                //draw map if there is any data available                               
                                if ($(".pagination-wrapper").hasClass("hidden"))
                                    $(".pagination-wrapper").removeClass("hidden");
                                if ($(".error-success-message-container").hasClass("hidden"))
                                    $(".error-success-message-container").removeClass("hidden");
                                if ($("#location-list").hasClass("hidden"))
                                    $("#location-list").removeClass("hidden");
                                //hide loading
                                $(".store-locator-overlay").removeClass("active");
                                $("#success-shops").show();
                                if (data.length < pageSize) {
                                    $(".pagination-wrapper").addClass("hidden");
                                }
                            } else {
                                $(".pagination-wrapper").addClass("hidden");
                                if ($(".error-success-message-container").hasClass("hidden"))
                                    $(".error-success-message-container").removeClass("hidden");
                                if ($("#location-list").hasClass("hidden"))
                                    $("#location-list").removeClass("hidden");
                                //hide loading
                                $(".store-locator-overlay").removeClass("active");
                                $("#success-shops").hide();
                                $(".invalid-location").addClass("hidden");
                                $("#noNearbyStores").removeClass("hidden");
                            }
                            callback();
                        });
                },
                bindShowDetailPage: function() {
                    var _self = this;
                    $(".show-store-detail").on("click", function() {
                        $(".pagination-wrapper").hide();
                        var storeId = $(this).attr("data-store-id"),
                            items = window.lv.model.apiModel.data.items,
                            lat, lng, isValid = false;
                        window.location.href = window.location.origin + "/store-details?code=" + $(this).attr("data-store-id");
                    });
                },
                loadStoreDetailPage: function(pageSize, lat, lng) {
                    var _self = this;
                    //get and render nearby stores
                    _self.getNearbyShops(pageSize, lat, lng, 0, function() {
                        _self.drawMap(window.lv.model.apiModel.data.items);
                        $(".dir-btn-container")
                            .css({ "padding": "5px 5px 5px 0" })
                            .removeClass("hidden");
                        $("#success-shops").text("Store Details");
                        $(".store-details").css({ "cursor": "text", "border-bottom": "none" });
                        $("#searchTermView").val("");
                        $(".social-share-container").removeClass("hidden");
                        $(".mz-locationlisting-locationdetails,.show-store-detail,div[data-marker-id]")
                            .off("click")
                            .css({ "cursor": "text", "padding": "0" });
                        $("#location-list")
                            .removeClass("mz-locationlist");
                        $(".mz-locationlist").css({ "max-height": "500px" });
                        $(".store-hours-heading").css({"font-weight":"bold"});
                        $(".search-address-container").removeClass("hidden");
                    });
                }
            }),

            LocationsSearchView = LocationsView.extend({
                templateName: 'modules/location/location-search',
                populate: function(location) {
                    var self = this;
                    this.model.apiGetForProduct({
                        productCode: this.product.get('variationProductCode') || this.product.get('productCode'),
                        location: location
                    }).then(function() {
                        self.render();
                        $('.mz-locationsearch-pleasewait').fadeOut();
                        self.$el.noFlickerFadeIn();
                    });
                },
                addToCartForPickup: function(e) {
                    var self = this,
                        $target = $(e.currentTarget),
                        loc = $target.data('mzLocation');
                    $target.parent().addClass('is-loading');
                    this.product.addToCartForPickup(loc);
                },
                setProduct: function(product) {
                    var me = this;
                    me.product = product;
                    this.listenTo(me.product, 'addedtocart', function() {
                        $(window).on('beforeunload', function() {
                            me.$('.is-loading').removeClass('is-loading');
                        });
                        window.location.href = "/cart";
                    });
                }
            });

        $(document).ready(function() {
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


            var $locationSearch = $('#location-list'),
                product = ProductModels.Product.fromCurrent(),
                productPresent = !!product.get('productCode'),
                locationsCollection = new LocationModels.LocationCollection();

            var ViewClass = productPresent ? LocationsSearchView : LocationsView,
                view = new ViewClass({
                    model: locationsCollection,
                    el: $locationSearch
                });

            if (productPresent){
                view.setProduct(product);
            } else{
                //hide loading
                $(".store-locator-overlay").removeClass("active");
            }
            window.lv = view;

            btnFindStoresEmpty.on("click", function() {
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

            btnFindStores.on("click", function() {
                //show loading
                $(".store-locator-overlay").addClass("active");
                var zipcode = $.trim(searchTermView.val());
                if (zipcode.length > 0) {
                    emptyStoreContainer.removeClass("active");
                    searchViewContainer.addClass("active");

                    showMoreStores.attr("data-start-index", defaults.storesPageSize);
                    showLessStores.attr("data-start-index", 0);

                    if ($("#map").length > 0) {
                        view.getGeoCode(zipcode, function(data) {
                            var lat = data[0].geometry.location.lat(),
                                lng = data[0].geometry.location.lng();
                            //get and render nearby stores
                            view.getNearbyShops(defaults.storesPageSize, lat, lng, 0, function() {
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

            showMoreStores.on("click", function(e) {
                e.preventDefault();
                var startIndex = parseInt($(this).attr("data-start-index"), 10),
                    zipcode = $.trim(searchTermView.val());

                if ((startIndex + defaults.storesPageSize) > window.lv.model.attributes.totalCount) {
                    startIndex = (window.lv.model.attributes.totalCount - defaults.storesPageSize);
                    $(this).addClass("hidden");
                }
                if (zipcode.length > 0) {
                    if ($("#map").length > 0) {
                        view.getGeoCode(zipcode, function(data) {
                            var lat = data[0].geometry.location.lat(),
                                lng = data[0].geometry.location.lng();
                            //get and render nearby stores
                            view.getNearbyShops(defaults.storesPageSize, lat, lng, startIndex, function() {
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

            showLessStores.on("click", function(e) {
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
                        view.getGeoCode(zipcode, function(data) {
                            var lat = data[0].geometry.location.lat(),
                                lng = data[0].geometry.location.lng();
                            //get and render nearby stores
                            view.getNearbyShops(defaults.storesPageSize, lat, lng, startIndex, function() {
                                view.drawMap(window.lv.model.apiModel.data.items);
                                showLessStores.attr("data-start-index", startIndex);
                                if (startIndex === 0)
                                    showLessStores.addClass("hidden");
                            });
                        });
                    }
                }
            });
            $("#map").on("click", ".mz-locationlisting-name,.mz-store-hours", function(e) {
                e.preventDefault();
                var storeURL = $(this).attr("data-store-url");
                window.location.href = storeURL;
            });
            $("#searchTermView,#searchTermEmpty").keyup(function(e) {
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
                } else if ($(this).val().length === 0) {
                    emptySearch.removeClass("hidden");
                    storeSearchContainer.addClass("has-error");
                }
            });
        });
    }
);