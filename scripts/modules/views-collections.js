/**
 * Unidirectional dispatch-driven collection views, for your pleasure.
 */


define([
    'backbone',
    'modules/jquery-mozu',
    'underscore',
    'modules/url-dispatcher',
    'modules/intent-emitter',
    'modules/get-partial-view',
    'modules/color-swatches',
     'modules/block-ui',
    'modules/category/infinite-scroller'
], function(Backbone, $ , _, UrlDispatcher, IntentEmitter, getPartialView,colorSwatch,blockUiLoader,InfiniteScroller) {

    function factory(conf) {

        var _$body = conf.$body;
        var _dispatcher = UrlDispatcher;
        var _isColorClicked = false;
        var ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND';

        function showError(error) {
            // if (error.message === ROUTE_NOT_FOUND) {
            //     window.location.href = url;
            // }
            _$body.find('[data-mz-messages]').text(error.message);
        }

        function intentToUrl(e) {
            var elm = e.target;
            var url;
            if (elm.tagName.toLowerCase() === "select") {
                elm = elm.options[elm.selectedIndex];
            }
            url = elm.getAttribute('data-mz-url') || elm.getAttribute('href') || '';
            if (url && url[0] != "/") {
                var parser = document.createElement('a');
                parser.href = url;
                url = window.location.pathname + parser.search;
            }
            return url;
        }

        var navigationIntents = IntentEmitter(
            _$body,
            [
                'click [data-mz-pagingcontrols] a',
                'click [data-mz-pagenumbers] a',
                'click a[data-mz-facet-value]',
                'click [data-mz-action="clearFacets"]',
                'change input[data-mz-facet-value]',
                'change [data-mz-value="pageSize"]',
                'change [data-mz-value="sortBy"]'
            ],
            intentToUrl
        );

        var toggleView = IntentEmitter(
            _$body, [
                'click [data-btn-view-toggle]'
            ],
            toggleProductView
        );

        navigationIntents.on('data', function(url, e) {
            if (url && _dispatcher.send(url)) {
                _$body.addClass('mz-loading');
                e.preventDefault();
            }
        });


         //create facets and append them in list
        function updateFacetFilter(path) {

            if (path.indexOf("facetValueFilter") > -1) {
                var pathArray = path.substring(1).split("&");
                var facetValue = "";
                for (var i = 0; i < pathArray.length; i++) {
                    var currentElmnt = pathArray[i].split("=");
                    if (currentElmnt[0] === "facetValueFilter") {
                        facetValue = currentElmnt[1];
                        break;
                    }
                }
                if (facetValue !== "") {
                    facetValue = decodeURIComponent(facetValue).split(",");
                    var available_facets = "";
                    for (var j = 0; j < facetValue.length; j++) {
                        var facetKey = facetValue[j].split(":")[0];
                        var facetVal = facetValue[j] !== "" ? facetValue[j].split(":")[1].replace(/\+/g, ' ') : "";
                        if (facetVal === "") {
                            continue;
                        }
                        if (facetVal.indexOf("&#38") != facetVal.indexOf("&#38;")) {
                            facetVal = facetVal.replace(/\&#38/g, '&amp;');
                        }
                        var displayValue = facetVal;
                        if (facetKey === 'price') {
                            displayValue = displayValue.replace("[", "$").replace("]", "").replace(/to/gi, "-");
                        }
                        available_facets += '<li><i class="fa fa-times-circle remove-facet" data-mz-facet="' + facetKey + '" data-mz-facet-value="' + facetValue[j].split(":")[1] + '" data-mz-purpose="remove" data-mz-action="clearFacet"></i> <u>' + displayValue + '</u></li>';
                    }
                    if (available_facets !== '') {
                        var filterOptionList = $("#filterOptionList");
                        filterOptionList.append(available_facets);
                    }
                    return true;
                }
            }
        }

        //get facets from the href
        function getFacet() {
            var path = window.location.search;
            return path;
        }


         function updateUi(response) {
            var url = response.canonicalUrl;
            if (url && url.substr(url.length - 2) === '&&')
                url = url.substring(0, url.length - 1);
            _$body.html(response.body);
            if (url) _dispatcher.replace(url);
            _$body.removeClass('mz-loading');
             InfiniteScroller.update();
            //add facet filter to list if any
            var path = getFacet();
            updateFacetFilter(path);
            //check default view
            if ($.cookie("currentView") === "listView") {
                $("#listView").trigger("click");
            } else {
                $("#gridView").trigger("click");
            }
        }


         //Toggle View GRID/LIST
        function toggleProductView(_e) {
            var _self = $(_e.currentTarget);
            var toggleButtons = $("button[data-btn-view-toggle]");
            var toggleListView = $(".ml-list-view-toggle");
            //check if already active
            if (_self.hasClass("active")) {
                return;
            } else {
                //check which view is enable
                if (_self.attr("id") == "gridView" && !toggleListView.hasClass("grid-view")) {
                    toggleListView.addClass("grid-view").removeClass("list-view");
                    $.cookie("currentView", "gridView");
                } else {
                    toggleListView.addClass("list-view").removeClass("grid-view");
                    $.cookie("currentView", "listView");
                }
            }
            //make selected view icon active
            toggleButtons.removeClass("active");
            _self.addClass("active");
        }


         //Select color Swatch
        var selectSwatch = IntentEmitter(
            _$body, [
                'click #product-list-ul [data-mz-swatch-color]',
                'click #more-product-list [data-mz-swatch-color]'
            ],
            changeColorSwatch
        );

        //Change color swatch
        function changeColorSwatch(_e) {
            _isColorClicked = true;
            colorSwatch.changeColorSwatch(_e);
            _isColorClicked = false;
        }

        _dispatcher.onChange(function(url) {
            getPartialView(url, conf.template).then(updateUi, showError);
        });

    }

    return {
        createFacetedCollectionViews: factory
    };

});