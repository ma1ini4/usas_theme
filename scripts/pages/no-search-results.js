define(['modules/jquery-mozu'], function ($) {
    $(document).ready(function () {
        var searchResults = $('.mz-searchresults-query').text(),
            regEx = /^\d{8}$/g;

        if (regEx.test(searchResults)) {
            $('.mz-searchresults-query').text(searchResults.replace(/(.{4})/, '$1-'));
        }
    });
});