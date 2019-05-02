require([
    'modules/jquery-mozu',
    'underscore',
    'modules/backbone-mozu'
], function($, _, Backbone) {

    function checkWidth() {
        var width = $(window).width();

        if (width <= 767) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }

    function changeMode() {
        if (checkWidth() === 'mobile') {
            toggleContent('mobile');
        } else {
            toggleContent('desktop');
        }
    }

    function toggleContent(mode) {

        if (mode === 'mobile') {
            $('#mobile-content').removeClass('hidden');
            $('#desktop-content').addClass('hidden');

        } else if (mode === 'desktop') {
            $('#desktop-content').removeClass('hidden');
            $('#mobile-content').addClass('hidden');
        }
    }

    $(document).ready(function() {
        changeMode();
    });

    $(window).resize(function() {
        changeMode();
    });
});