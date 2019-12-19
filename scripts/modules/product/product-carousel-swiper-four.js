define(['shim!vendor/typeahead.js/typeahead.bundle[modules/jquery-mozu=jQuery]>jQuery', 'swiper'], function($, Swiper) {
 var swiper;
  $(document).ready(function() {
    destroySlider();
  });
  $(window).resize(function() {
    destroySlider();
  });

  function createSlider() {
      swiper = new Swiper('#product-carousel-slider.swiper-container-4', {
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
            slidesPerView: 4,
            spaceBetween: 20
          },
          768: {
            slidesPerView: 3,
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
  }
  
  function destroySlider() {
    if ($('#product-carousel-slider').data('total-items') <= getMinSlideCount()) {
      if(swiper) {
        swiper.destroy(true, true);
      }
      $('#product-carousel-slider').addClass('no-swiper');
      $('.swiper-button-next, .swiper-button-prev').hide();
    } else {
      $('#product-carousel-slider').removeClass('no-swiper');
      createSlider();
      $('.swiper-button-next, .swiper-button-prev').show();
    }
  }

  function getMinSlideCount() {
    var width = $(window).width(),
        minSlides;

    if(width > 1024) {
      minSlides = 6;
    } else if (width <=1024 && width > 768) {
      minSlides = 4;
    } else if (width <= 768 && width > 640) {
      minSlides = 3;
    } else if (width <= 640 && width > 320) {
      minSlides = 2;
    } else if (width <= 320) {
      minSlides = 1;
    }

    return minSlides;
  }
});
