define(['shim!vendor/typeahead.js/typeahead.bundle[modules/jquery-mozu=jQuery]>jQuery', 'swiper'], function($, Swiper) {
    var swiper = new Swiper('#product-carousel-slider.swiper-container-4', {
        slidesPerView: 6,
        spaceBetween: 20,
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        preventClicks: false,
        preventClicksPropagation: false,
        breakpoints: {
            1024: {
                slidesPerView: 5,
                spaceBetween: 20
              },
              768: {
                slidesPerView: 4,
                spaceBetween: 15
              },
              640: {
                slidesPerView: 2,
                spaceBetween: 10
              },
              320: {
                slidesPerView: 1,
                spaceBetween: 10
            }
        }
    });
});
