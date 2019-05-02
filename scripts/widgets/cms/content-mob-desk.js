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

    function checkHasContent() {
        var hasContent = $('[id*="content"');

        if (hasContent) {
            return true;
        }
    }

    function checkHasImage() {
        var hasImage = $('[id*="image"');

        if (hasImage) {
            return true;
        }
    }

    function toggleContent(mode) {

        if (mode === 'mobile') {
            if (checkHasContent()) {
                $('#mobile-content').removeClass('hidden');
                $('#desktop-content').addClass('hidden');
            }
            if (checkHasImage()) {
                $('#mobile-image').removeClass('hidden');
                $('#desktop-image').addClass('hidden');
            }
        } else if (mode === 'desktop') {
            if (checkHasContent()) {
                $('#desktop-content').removeClass('hidden');
                $('#mobile-content').addClass('hidden');
            }
            if (checkHasImage()) {
                $('#desktop-image').removeClass('hidden');
                $('#mobile-image').addClass('hidden');
            }
        }
    }

    $(document).ready(function() {
        changeMode();
    });

    $(window).resize(function() {
        changeMode();
    });
});