define(['shim!vendor/typeahead.js/typeahead.bundle[modules/jquery-mozu=jQuery]>jQuery','swiper'], function($, Swiper) {
    var swiper = new Swiper('#homepage-banner-slider.swiper-container.swiper-container-hero', {
        slidesPerView: 1,
        loop: true,
        spaceBetween: 0,
        breakpoints: {
            1024: {
                slidesPerView: 1
            },
            768: {
                slidesPerView: 1
            },
            640: {
                slidesPerView: 1
            },
            320: {
                slidesPerView: 1
            }
        },
        navigation: {
            nextEl: '.swiper-btn-next',
            prevEl: '.swiper-btn-prev'
        },
        pagination: {
            el: '.swiper-pagination',
            type: 'bullets'
        }
    });
});
