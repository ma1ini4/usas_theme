define(['modules/jquery-mozu', "modules/views-collections"], function($, CollectionViewFactory) {
    $(document).ready(function() {
        window.facetingViews = CollectionViewFactory.createFacetedCollectionViews({
            $body: $('[data-mz-search]'),
            template: "search-interior"
        });
        var searchResults = $('.mz-searchresults-query').text(),
            regEx = /^\d{8}$/g;

        if (regEx.test(searchResults)) {
            $('.mz-searchresults-query').text(searchResults.replace(/(.{4})/, '$1-'));
        }
    });
});