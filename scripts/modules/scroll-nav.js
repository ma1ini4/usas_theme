﻿define(['modules/jquery-mozu', 'hyprlive', 'underscore', 'modules/api', 'shim!vendor/bootstrap/js/affix[jquery=jQuery]', 'shim!vendor/bootstrap/js/scrollspy[jquery=jQuery]'], function ($, Hypr, _, api) {
    if (!Modernizr.mq('(max-width: 800px)')) {
        var gutterWidth = parseInt(Hypr.getThemeSetting('gutterWidth'), 10);
        $(document).ready(function () {
            $('[data-mz-scrollnav]').each(function () {
                var $this = $(this),
                    $nav = $($this.data('mzScrollnav')),
                    refreshFn = _.debounce(function () {
                        $nav.scrollspy('refresh');
                    }, 500);
                $this.on('click', 'a', function (e) {
                    if(!$(e.target).hasClass('logout')) {
                        e.preventDefault();
                        $(this.getAttribute('href')).ScrollTo({ axis: 'y', offsetTop: gutterWidth });
                    }
                }).affix({
                    offset: {
                        top: $this.offset().top - gutterWidth,
                        bottom: $('.mz-pagefooter.ml-global-footer.blueBG').outerHeight(true) + $('.mz-pagefooter.ml-global-footer').outerHeight(true) + $('.mz-pagefooter').outerHeight(true) + $('footer').outerHeight(true) + $('.mz-pagefooter-copyright').outerHeight(true)
                    }
                });
                $(window).on('resize', refreshFn);
                api.on('sync', refreshFn);
                api.on('spawn', refreshFn);
                var id = $this.attr('id');
                if (!id) {
                    id = "scrollnav-" + new Date().getTime();
                    $this.attr('id', id);
                }
                $nav.scrollspy({ target: '#' + id, offset: gutterWidth*1.2 });
            });
        });
    }
});
