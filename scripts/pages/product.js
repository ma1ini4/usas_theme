require([
    "modules/jquery-mozu",
    "underscore",
    "bxslider",
    "elevatezoom",
    'modules/block-ui',
    "hyprlive",
    "modules/backbone-mozu",
    "modules/cart-monitor",
    "modules/models-product",
    "modules/views-productimages",
    "hyprlivecontext",
    "pages/family",
    "modules/api",
    "async",
    'slick'
],
function ($, _, bxslider, elevatezoom, blockUiLoader, Hypr, Backbone, CartMonitor, ProductModels, ProductImageViews, HyprLiveContext, FamilyItemView, api, async, slickSlider) {
    var sitecontext = HyprLiveContext.locals.siteContext;
    var cdn = sitecontext.cdnPrefix;
    var siteID = cdn.substring(cdn.lastIndexOf('-') + 1);
    var imagefilepath = cdn + '/cms/' + siteID + '/files';
    var slider;
    var slider_mobile;
    var productInitialImages;
    var priceModel;
    var width_thumb = HyprLiveContext.locals.themeSettings.maxProductImageThumbnailSize;
    var width_pdp = HyprLiveContext.locals.themeSettings.productImagePdpMaxWidth;
    var width_zoom = HyprLiveContext.locals.themeSettings.productZoomImageMaxWidth;
    var colorSwatchesChangeAlternate = HyprLiveContext.locals.themeSettings.colorSwatchesChangeAlternate;
    var colorSwatchesChangeMain = HyprLiveContext.locals.themeSettings.colorSwatchesChangeMain;
    var current_zoom_id_added;
    var deviceType = navigator.userAgent.match(/Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile/i);
    var pageContext = require.mozuData('pagecontext');
    var isMobile;
    var mobileZoomEnabled = HyprLiveContext.locals.themeSettings.pdpMobileZoomEnabled || false;


    function initSlider() {
        slider = $('#productpager-Carousel').bxSlider({
            slideWidth: 90,
            minSlides: 4,
            maxSlides: 4,
            moveSlides: 1,
            slideMargin: 15,
            nextText: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
            prevText: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            infiniteLoop: false,
            hideControlOnEnd: true,
            pager: false,
            touchEnabled: pageContext.isMobile || pageContext.isTablet
        });

        window.slider = slider;
    }

    function initslider_mobile() {
        if ($('#productmobile-Carousel.slick-initialized').length > 0) {
            $('#productmobile-Carousel').slick('unslick');
        }

        slider_mobile = $('#productmobile-Carousel').slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: false,
            infinite: false,
            dots: true
        });
      }

    //using GET request CheckImage function checks whether an image exist or not
    var checkImage = function(imagepath, callback) {
        $.get(imagepath).done(function() {
            callback(true); //return true if image exist
        }).error(function() {
            callback(false);
        });
    };


    function updateImages(productInitialImages) {
      console.log('updateImages width_pdp',width_pdp,' width_zoom ', width_zoom );
        var mainImage = productInitialImages.mainImage.src + '?maxWidth=' + width_pdp;
        var zoomImage = productInitialImages.mainImage.src + '?maxWidth=' + width_zoom;
        $('body div.zoomContainer').remove();
        $('#zoom').removeData('elevateZoom');
        $('.mz-productimages-mainimage').attr('src', mainImage).data('zoom-image', zoomImage);
        //$('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair" });
        try {
            slider.destroySlider();
        } catch (e) {}
        var slideCount = productInitialImages.thumbImages.length;
        for (var i = 1; i <= productInitialImages.thumbImages.length; i++) {
            $(".mz-productimages-thumbs li:eq(" + (i - 1) + ") .mz-productimages-thumb img")
                .attr({
                    "src": productInitialImages.thumbImages[i - 1].src + '?maxWidth=' + width_thumb,
                    "data-orig-src": productInitialImages.thumbImages[i - 1].src + '?maxWidth=' + width_pdp,
                    "data-orig-zoom": productInitialImages.thumbImages[i - 1].src + '?maxWidth=' + width_zoom
                });
        }
        if (slideCount > 4) {
            initSlider();
        }
        initslider_mobile();
    }
    window.family = [];
    var ProductView = Backbone.MozuView.extend({
        requiredBehaviors: [1014],
        templateName: 'modules/product/product-detail',
        autoUpdate: ['quantity'],
        renderOnChange: [
            'quantity',
            'stockInfo'
        ],
        additionalEvents: {
            "change [data-mz-product-option]": "onOptionChange",
            "blur [data-mz-product-option]": "onOptionChange",
            "click [data-mz-product-option-attribute]": "onOptionChangeAttribute",
            "click [data-mz-qty-minus]": "quantityMinus",
            "click [data-mz-qty-plus]": "quantityPlus",
            'mouseenter .color-options': 'onMouseEnterChangeImage',
            'mouseleave .color-options': 'onMouseLeaveResetImage'
        },
        render: function() {
            isMobile = ($(window).width() <= 992) ? true : false;
            var me = this;
            var id = Hypr.getThemeSetting('oneSizeAttributeName'),
                oneSizeOption = this.model.get('options').get(id);
            if (oneSizeOption) {
                var onlyEnabledOneSizeOption = _.find(oneSizeOption.get('values'), function(value) { return value.isEnabled; });
                oneSizeOption.set('value', onlyEnabledOneSizeOption.value);
            }
            Backbone.MozuView.prototype.render.apply(this);
            this.$('[data-mz-is-datepicker]').each(function(ix, dp) {
                $(dp).dateinput().css('color', Hypr.getThemeSetting('textColor')).on('change  blur', _.bind(me.onOptionChangeAttribute, me));
            });
            $('#details-accordion').find('.panel-heading a').first().click();
            $(".family-details [data-mz-action='addToCart']").addClass('hide');
            $(".mz-productdetail-conversion-buttons").removeClass('hide');
            

            if (this.model.get('productType') === Hypr.getThemeSetting('familyProductType')) {
                try {
                    blockUiLoader.globalLoader();
                    $('.family-details .mz-productdetail-shortdesc, .family-details .stock-info, .family-details .mz-reset-padding-left, .family-details #SelectValidOption').remove();
                    var familyData = me.model.get('family');
                    $("#mz-family-container .family-members").empty();
                    var familyItemModelOnready = function() {
                        var product = familyData.models[this.index];
                        if (typeof product.get('inventoryInfo').onlineStockAvailable !== 'undefined' && product.get('inventoryInfo').onlineStockAvailable === 0 && product.get('inventoryInfo').outOfStockBehavior === "HideProduct") {
                            //if all family members are out of stock, disable add to cart button.
                            if (window.outOfStockFamily) {
                                $(".family-details [data-mz-action='addToCart']").addClass('hide');
                                $("[data-mz-action='addToCart']").addClass('button_disabled').attr("disabled", "disabled");
                            }
                        } else {
                            var productCode = product.get('productCode');
                            var view = new FamilyItemView({
                                model: product,
                                messagesEl: $('#family-item-error-' + productCode + " [data-mz-message-bar]")
                            });
                            window.family.push(view);
                            var renderedView = view.render().el;
                            $("#mz-family-container").find("#" + productCode).append(renderedView);
                            $(".family-details [data-mz-action='addToCart']").removeClass('hide');
                            //if all family members are out of stock, disable add to cart button.
                            if (window.outOfStockFamily) {
                                $("[data-mz-action='addToCart']").addClass('button_disabled').attr("disabled", "disabled");
                            }
                        }
                    };
                    if (familyData.models.length) {
                        for (var i = 0; i < familyData.models.length; i++) {
                            //var x = this.model.checkVariationCode(familyData.models[i]);
                            var familyItemModel = familyData.models[i];
                            if (familyItemModel.get("isReady")) {
                                familyItemModel.off('ready');
                                familyItemModelOnready.call({ index: i });
                            } else {
                                familyItemModel.on('ready', familyItemModelOnready.bind({ index: i }));
                                if (i === (familyData.models.length - 1)) {
                                    blockUiLoader.unblockUi();
                                }
                            }
                        }
                    } else {
                        $(".family-details [data-mz-action='addToCart']").addClass('hide');
                        $("[data-mz-action='addToCart']").addClass('button_disabled').attr("disabled", "disabled");
                        blockUiLoader.unblockUi();
                    }
                } catch (e) {}
            }
        },
        quantityMinus: function() {
            this.model.messages.reset();
            var qty = this.model.get('quantity');
            if (qty === 1) {
                return;
            }
            this.model.set('quantity',--qty);
            setTimeout(function(){
                if (typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined" && window.productView.model.attributes.inventoryInfo.outOfStockBehavior != "AllowBackOrder") {
                    var onlineStock = window.productView.model.attributes.inventoryInfo.onlineStockAvailable;
                    if (onlineStock >= window.productView.model.get('quantity')) {
                        $("[data-mz-action='addToCart']").removeClass("button_disabled");
                        $('#plus').removeClass('disabled btn-disable-color');
                    }
                    if (onlineStock !== 0 && onlineStock < window.productView.model.get('quantity')) {
                        $('[data-mz-validationmessage-for="quantity"]').css('visibility', "visible").text("*Only " + onlineStock + " left in stock.");
                        $("[data-mz-action='addToCart']").addClass("button_disabled");
                        $('#plus').addClass('disabled btn-disable-color');
                    }
                }
            },500);
        },
        quantityPlus: function() {
            if(!$("#plus").hasClass('disabled')){
                this.model.messages.reset();
                var qty = this.model.get('quantity');
                this.model.set('quantity',++qty);
                setTimeout(function(){
                    if (typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined" && window.productView.model.attributes.inventoryInfo.outOfStockBehavior != "AllowBackOrder") {
                        var onlineStock = window.productView.model.attributes.inventoryInfo.onlineStockAvailable;
                        if (onlineStock < window.productView.model.get('quantity')) {
                            $('[data-mz-validationmessage-for="quantity"]').css('visibility', "visible").text("*Only " + onlineStock + " left in stock.");
                            $("[data-mz-action='addToCart']").addClass("button_disabled");
                            $('#plus').addClass('disabled btn-disable-color');
                        }
                        if (onlineStock >= window.productView.model.get('quantity')) {
                            $("[data-mz-action='addToCart']").removeClass("button_disabled");
                        }
                    }
                },500);
            }
        },
        onOptionChangeAttribute: function(e) {
            return this.configureAttribute($(e.currentTarget));
        },
        configureAttribute: function($optionEl) {
            var $this = this;
            if (!$optionEl.hasClass("active")) {
                if ($optionEl.attr('disabled') == 'disabled') {
                    return false;
                } else {
                    blockUiLoader.globalLoader();
                    var newValue = $optionEl.data('value'),
                        oldValue,
                        id = $optionEl.data('mz-product-option-attribute'),
                        optionEl = $optionEl[0],
                        isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
                        option = this.model.get('options').get(id);
                    if (!option) {
                        var byIDVal = JSON.parse(JSON.stringify(this.model.get('options')._byId));
                        for (var key in byIDVal) {
                            if (id === byIDVal[key].attributeFQN) {
                                option = this.model.get('options').get(key);
                            }
                        }
                    }
                    if (option) {
                        if (option.get('attributeDetail').inputType === "YesNo") {
                            option.set("value", isPicked);
                        } else if (isPicked) {
                            oldValue = option.get('value');
                            if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                                option.set('value', newValue);
                                this.render();
                            }
                        }
                    }
                    this.model.whenReady(function() {
                        setTimeout(function() {
                            if (window.productView.model.get('variationProductCode') && typeof window.productView.model.get('variationProductCode') !== "undefined") {
                                $(".mz-productcodes-productcode").text(Hypr.getLabel('item')+" #" + window.productView.model.get('variationProductCode'));
                            }
                            $('.mz-productdetail-price.prize-mobile-view').html($('.mz-l-stack-section.mz-productdetail-conversion .mz-productdetail-price').html());
                            blockUiLoader.unblockUi();
                            $this.isColorClicked = false;
                        }, 1000);
                    });
                }
            } else {
                if ($optionEl.attr('disabled') == 'disabled') {
                    return false;
                } else { 
                    this.model.whenReady(function () {
                        setTimeout(function () {
                            if (window.productView.model.get('variationProductCode') && typeof window.productView.model.get('variationProductCode') !== "undefined") {
                                $(".mz-productcodes-productcode").text(Hypr.getLabel('item') + " #" + window.productView.model.get('variationProductCode'));
                            }
                            $('.mz-productdetail-price.prize-mobile-view').html($('.mz-l-stack-section.mz-productdetail-conversion .mz-productdetail-price').html());
                            blockUiLoader.unblockUi();
                            $this.isColorClicked = false;
                        }, 1000);
                    });
                }
            }
        },
        onOptionChange: function(e) {
            return this.configure($(e.currentTarget));
        },
        configure: function($optionEl, optionObj) {
            var newValue = $optionEl ? $optionEl.val() : optionObj.value,
                oldValue,
                id = $optionEl ? $optionEl.data('mz-product-option') : optionObj.attributeFQN,
                optionEl = $optionEl ? $optionEl[0] : {},
                isPicked = $optionEl ? (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked : true,
                option = this.model.get('options').get(id);
            if (option) {
                if (option.get('attributeDetail').inputType === "YesNo") {
                    option.set("value", isPicked);
                } else if (isPicked) {
                    oldValue = option.get('value');
                    if (oldValue !== newValue && !(oldValue === undefined && newValue === '')) {
                        option.set('value', newValue);
                    }
                }
            }
        },
        addToCart: _.debounce(function() {
            var me = this;
            me.model.messages.reset();
            //If Family Products
            if (this.model.get('productType') === Hypr.getThemeSetting('familyProductType')) {
                blockUiLoader.globalLoader();
                /* jshint ignore:start */
                var promises = [];
                var productsAdded = [];
                for (var i = 0; i < this.model.get('family').models.length; i++) {
                    promises.push((function(callback) {
                        var familyItem = me.model.get('family').models[this.index];
                        var productCode = familyItem.get('productCode');
                        familyItem.addToCart().then(function(e) {
                            //Clear options and set Qty to 0
                            for (var j = 0; j < window.family.length; j++) {
                                if (window.family[j].model.get('productCode') === productCode) {
                                    var optionModels = window.family[j].model.get('options').models;
                                    for (var k = 0; k < optionModels.length; k++) {
                                        optionModels[k].unset('value');
                                    }
                                    window.family[j].model.set('quantity', 0);
                                    window.family[j].model.unset('stockInfo');
                                    window.family[j].model.set('addedtocart', true);
                                }
                            }
                            productsAdded.push(e);
                            callback(null, e);
                        }, function(e) {
                            callback(null, e);
                        });
                    }).bind({ index: i }))
                }
                var errors = { "items": [] };
                async.series(promises, function(err, results) {
                        var resp = results.reduce(
                            function(flag, value) {
                                return flag && results[0] === value;
                            },
                            true
                        );
                        if (resp === true) {
                            window.productView.model.trigger('error', { message: Hypr.getLabel('selectValidOption') });
                            blockUiLoader.unblockUi();
                            return;
                        }
                        if (results) {
                            var failureNames = [];
                            var successNames = [];
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].errorCode) {
                                    var errorMessage = results[i].message.split(':');
                                    failureNames.push(errorMessage[2]);
                                } else if (typeof results[i].attributes === 'undefined' && results[i].indexOf("Please enter quantity of ") !== -1) {
                                    failureNames.push(results[i]);
                                } else if (typeof results[i].attributes === 'undefined' && results[i].indexOf("Select Valid Option(s) for ") !== -1) {
                                    failureNames.push(results[i]);
                                } else if (typeof results[i].attributes !== 'undefined') {
                                    successNames.push(results[i].get('content').get('productName'));
                                }
                            }
                            if (failureNames.length) {
                                errors.items.push({
                                    "name": "error",
                                    "message": Hypr.getLabel('productaddToCartError') + ": " + failureNames.join(', ')
                                });
                            }
                            if (successNames.length) {
                                errors.items.push({
                                    "name": 'success',
                                    "message": Hypr.getLabel('successfullyAddedItems') + ": " + successNames.join(', '),
                                    "messageType": "success"
                                });
                            }
                            if (failureNames.length || successNames.length)
                                me.model.trigger("error", errors);
                        }
                        if (productsAdded.length)
                            CartMonitor.update('showGlobalCart');
                        if (!deviceType) {
                            $('html,body').animate({
                                scrollTop: $('figure.mz-productimages-main').offset().top
                            }, 1000);
                        } else {
                            $('html,body').animate({
                                scrollTop: $('.mz-product-top-content').offset().top
                            }, 1000);
                        }
                        blockUiLoader.unblockUi();
                    })
                    /* jshint ignore:end */
            }else if(typeof me.model.get('inventoryInfo').onlineStockAvailable !== 'undefined' && me.model.get('inventoryInfo').outOfStockBehavior === "AllowBackOrder"){
                me.model.addToCart();
            }else if(!me.model.get('inventoryInfo').manageStock){
                me.model.addToCart();
            }else if (typeof me.model.get('inventoryInfo').onlineStockAvailable !== "undefined" && me.model.get('inventoryInfo').onlineStockAvailable === 0 && me.model.get('inventoryInfo').outOfStockBehavior === "DisplayMessage") {
                blockUiLoader.productValidationMessage();
                $('#SelectValidOption').children('span').html(Hypr.getLabel('productOutOfStock'));
            }else if (typeof me.model.get('inventoryInfo').onlineStockAvailable === "undefined" && me.model.get('inventoryInfo').manageStock ){
                blockUiLoader.productValidationMessage();
                $('#SelectValidOption').children('span').html(Hypr.getLabel('productUnavailable'));
            } else if ($(".mz-productoptions-optioncontainer").length != $(".mz-productoptions-optioncontainer .active").length) {
              blockUiLoader.productValidationMessage();
            }
            else if (me.model.get('inventoryInfo').onlineStockAvailable) {
                if (me.model.get('inventoryInfo').onlineStockAvailable < me.model.get('quantity')) {
                    $('[data-mz-validationmessage-for="quantity"]').css('visibility', "visible").text("*Only " + me.model.get('inventoryInfo').onlineStockAvailable + " left in stock.");
                    return false;
                }
                this.model.addToCart();
            }
        }, 1500),
        addToWishlist: function() {
            this.model.addToWishlist();
        },
        checkLocalStores: function(e) {
            var me = this;
            e.preventDefault();
            this.model.whenReady(function() {
                var $localStoresForm = $(e.currentTarget).parents('[data-mz-localstoresform]'),
                    $input = $localStoresForm.find('[data-mz-localstoresform-input]');
                if ($input.length > 0) {
                    $input.val(JSON.stringify(me.model.toJSON()));
                    $localStoresForm[0].submit();
                }
            });

        },
        onMouseEnterChangeImage: function(_e) {
           if (!deviceType && colorSwatchesChangeMain) {
               this.mainImage = $('.mz-productimages-mainimage').attr('src');
               var colorCode = $(_e.currentTarget).data('mz-swatch-color');
               colorCode = ( colorCode ) ? colorCode.replace('/','').toLowerCase() : colorCode;
               this.changeImages(colorCode, ( colorSwatchesChangeAlternate ) ? 'Y' : 'N' );
           }
       },
       onMouseLeaveResetImage: function(e) {
           if (!this.isColorClicked && !deviceType && colorSwatchesChangeMain) {
               var colorCode = $("ul.product-color-swatches").find('li.active').data('mz-swatch-color');
               colorCode = ( colorCode ) ? colorCode.replace('/','').toLowerCase() : colorCode;
               if (typeof colorCode != 'undefined') {
                   //this.changeImages(colorCode, ( colorSwatchesChangeAlternate ) ? 'Y' : 'N' );
                   this.changeImages(colorCode, 'N' );
                   if( colorSwatchesChangeAlternate ){
                       this.restoreMainAltImage( this.mainImage );
                   }
               } else if (typeof this.mainImage != 'undefined') {
                   $('.mz-productimages-mainimage').attr('src', this.mainImage);
                   if( colorSwatchesChangeAlternate ){
                       if( this.model.get('content') && this.model.get('content').get('productImages')[0] && this.model.get('content').get('productImages').length > 0 ){
                           this.restoreMainAltImage( this.model.get('content').get('productImages')[0].src );
                       }
                   }
               } else {
                   $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
               }
           }
       },
       selectSwatch: function(e) {
           this.isColorClicked = true;
           var colorCode = $(e.currentTarget).data('mz-swatch-color');
           colorCode = ( colorCode ) ? colorCode.replace('/','').toLowerCase() : colorCode;
           this.changeImages(colorCode, ( colorSwatchesChangeAlternate ) ? 'Y' : 'N' );
       },
       changeImages: function(colorCode, _updateThumbNails) {
             var self = this;
             var version = 1;
             if (deviceType && $("figure.mz-productimages-thumbs ul.products_list_mobile li img.active").length > 0) {
                 version = $("figure.mz-productimages-thumbs ul.products_list_mobile li img.active").data("mz-productimage-mobile");
             } else if ($("figure.mz-productimages-thumbs ul.products_list li.active").length > 0) {
                 version = $("figure.mz-productimages-thumbs ul.products_list li.active").data("mz-productimage-thumb");
             }
             var pdpMainImageNameSwatch = HyprLiveContext.locals.themeSettings.pdpMainImageNameSwatch;
             if(pdpMainImageNameSwatch){
                 if(pdpMainImageNameSwatch.indexOf("{0}") != -1){
                     pdpMainImageNameSwatch = pdpMainImageNameSwatch.replace("{0}", this.model.attributes.productCode);
                 }
                 if(pdpMainImageNameSwatch.indexOf("{1}") != -1){
                     pdpMainImageNameSwatch = pdpMainImageNameSwatch.replace("{1}", colorCode);
                 }
                 if(pdpMainImageNameSwatch.indexOf("{2}") != -1){
                     pdpMainImageNameSwatch = pdpMainImageNameSwatch.replace("{2}", version);
                 }
             }
             var imagepath = imagefilepath + '/' + pdpMainImageNameSwatch +'?maxWidth=';
             var mainImage = imagepath + width_pdp;
             var zoomimagepath = imagepath + width_zoom;
             var _this = this;
             console.log('changeImage width_pdp',width_pdp,' width_zoom ', width_zoom );
             //TODO: following function is checking if images exist on server or not
             checkImage(imagepath, function(response) {
                 var mobileZoomEnabled = HyprLiveContext.locals.themeSettings.pdpMobileZoomEnabled || false;
                 var enableZoom = ( deviceType || pageContext.isMobile ) ? mobileZoomEnabled : true;
                 var zoomSelector = '#zoom';
                 if (response) {
                     if (!$('#zoom').length) {
                         $('.mz-productimages-main').html('<img class="mz-productimages-mainimage" data-mz-productimage-main="" id="zoom" itemprop="image">');
                     }
                     if (_updateThumbNails == 'Y') {
                         $('body div.zoomContainer').remove();
                         if (deviceType && $('ul.products_list_mobile').length) {
                             //slider_mobile.goToSlide(0);
                             $('body div.zoomContainer').remove();
                             $("img").removeData('elevateZoom');
                             $(current_zoom_id_added).attr('src', imagepath).data('zoom-image', zoomimagepath).elevateZoom({ zoomType: "inner", cursor: "crosshair" });
                         } else {
                             $('#zoom').removeData('elevateZoom');
                             $('.mz-productimages-mainimage').attr('src', mainImage).data('zoom-image', zoomimagepath);
                             $('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair" });
                             $('.mz-productimages-mainimage').attr('src', mainImage);
                         }
                     } else {
                         $('.mz-productimages-mainimage').attr('src', mainImage);
                     }

                     if ($("figure.mz-productimages-thumbs").length && $("figure.mz-productimages-thumbs").data("length") && _updateThumbNails == 'Y') {
                         _this.updateAltImages(colorCode);
                     }

                     if( enableZoom ){
                         if ( pageContext.isMobile ) {
                             zoomSelector = '#zoom_1';
                         }
                         $.removeData($('img'), 'elevateZoom');
                         $('.zoomContainer').remove();
                         $  ( zoomSelector ).bind( 'touchstart', function(){
                             $( zoomSelector  ).unbind( 'touchmove' );
                         });

                         setTimeout( function() {
                             $( zoomSelector ).elevateZoom(
                                 {
                                     zoomType: "inner",
                                     cursor: "crosshair",
                                     responsive: true
                                 }
                             );
                         }, 10);
                     }

                 } else if ( !response || typeof self.mainImage === 'undefined' ) {
                     // ignore missing images
                     if( enableZoom ){
                         if ( pageContext.isMobile ) {
                             zoomSelector = '#zoom_1';
                         }
                         $.removeData($('img'), 'elevateZoom');
                         $('.zoomContainer').remove();
                         $( zoomSelector ).bind( 'touchstart', function(){
                             $( zoomSelector  ).unbind( 'touchmove' );
                         });

                         setTimeout( function() {
                             $( zoomSelector ).elevateZoom(
                                 {
                                     zoomType: "inner",
                                     cursor: "crosshair",
                                     responsive: true
                                 }
                             );
                         }, 10);
                     }
               }
             });
         },
        updateAltImages: function(colorCode) {
            try {
                slider.destroySlider();
            } catch (e) {}
            try {
                slider_mobile.destroySlider();
            } catch (e) {}
            //var slideCount = parseInt($("figure.mz-productimages-thumbs").data("length"), 10);
            var slideCount = 1;
            var productCode = this.model.attributes.productCode;
            var pdpAltImageName = HyprLiveContext.locals.themeSettings.pdpAltImageName;
            for (var i = 1; i <= slideCount; i++) {
                if(pdpAltImageName){
                    if(pdpAltImageName.indexOf("{0}") != -1){
                        pdpAltImageName = pdpAltImageName.replace("{0}", this.model.attributes.productCode);
                    }
                    if(pdpAltImageName.indexOf("{1}") != -1){
                        pdpAltImageName = pdpAltImageName.replace("{1}", colorCode);
                    }
                    if(pdpAltImageName.indexOf("{2}") != -1){
                        pdpAltImageName = pdpAltImageName.replace("{2}", i);
                    }
                }
                $(".mz-productimages-thumbs .products_list li:eq(" + (i - 1) + ") .mz-productimages-thumb img")
                    .attr({
                        "src": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_thumb,
                        "data-orig-src": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_pdp,
                        "data-orig-zoom": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_zoom
                    });
                $(".mz-productimages-thumbs .products_list_mobile li:eq(" + (i - 1) + ") img")
                    .attr({
                        "src": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_pdp,
                        "data-orig-src": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_pdp,
                        "data-orig-zoom": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_zoom,
                        "data-zoom-image": imagefilepath + '/' + pdpAltImageName +'?maxWidth=' + width_zoom
                    });
            }
            if (slideCount > 4) {
               initSlider();
           }
           initslider_mobile();
       },
       restoreMainAltImage: function( mainImgSrc ) {
           try {
               slider.destroySlider();
           } catch (e) {}
           try {
               slider_mobile.destroySlider();
           } catch (e) {}
           var slideCount = 1;
           var productCode = this.model.attributes.productCode;
           var pdpAltImageName = mainImgSrc;
           for (var i = 1; i <= slideCount; i++) {
               $(".mz-productimages-thumbs .products_list li:eq(" + (i - 1) + ") .mz-productimages-thumb img")
               .attr({
                   "src": mainImgSrc +'?maxWidth=' + width_thumb,
                   "data-orig-src": mainImgSrc +'?maxWidth=' + width_pdp,
                   "data-orig-zoom": mainImgSrc +'?maxWidth=' + width_zoom
               });
               $(".mz-productimages-thumbs .products_list_mobile li:eq(" + (i - 1) + ") img")
               .attr({
                   "src": mainImgSrc +'?maxWidth=' + width_pdp,
                   "data-orig-src": mainImgSrc +'?maxWidth=' + width_pdp,
                   "data-orig-zoom": mainImgSrc +'?maxWidth=' + width_zoom,
                   "data-zoom-image": mainImgSrc +'?maxWidth=' + width_zoom
               });
           }
           if (slideCount > 4) {
               initSlider();
           }
           initslider_mobile();
       },
        initialize: function() {
            // handle preset selects, etc
            var me = this;
            isMobile = ($(window).width() <= 992) ? true : false;

            //create div for family members
            if(this.model.get('family').models.length){
                for(var i=0; i < this.model.get('family').models.length; i++){
                    var html="";
                    html+='<div id="'+this.model.get('family').models[i].get('productCode')+'" class="family-members"></div>';
                    $("#mz-family-container").append(html);
                }
            }
            me.isColorClicked = false;
            me.mainImage = '';
            // enable image zoom?
            var zoomSelector = '#zoom';
            if ( isMobile ) {
                zoomSelector = '';
            }
            if ( ( deviceType || pageContext.isMobile ) && me.model.get('content').get('productImages').length > 1 ){
                if( HyprLiveContext.locals.themeSettings.pdpMobileZoomEnabled ){
                    $.removeData($('img'), 'elevateZoom');
                    $('.zoomContainer').remove();

                    $( zoomSelector ).bind('touchstart', function(){
                        $( zoomSelector ).unbind('touchmove');
                    });
                    setTimeout( function() {
                        $( zoomSelector ).elevateZoom(
                            {
                                zoomType: "inner",
                                cursor: "crosshair",
                                responsive: true
                            }
                        );
                    }, 10);
                }
                else{
                    console.log('disable zoom for mobile');
                    $('body div.zoomContainer').remove();
                    $("img").removeData('elevateZoom');
                }

            }
            else {
                //$('#zoom').elevateZoom({zoomType: "inner", cursor: "crosshair", responsive: true});
                $( zoomSelector ).bind('touchstart', function(){
                    $( zoomSelector ).unbind('touchmove');
                });
                setTimeout( function() {
                    $( zoomSelector ).elevateZoom(
                        {
                            zoomType: "inner",
                            cursor: "crosshair",
                            responsive: true
                        }
                    );
                }, 10);
            }
            this.$('[data-mz-product-option]').each(function() {
                var $this = $(this),
                    isChecked, wasChecked;
                if ($this.val()) {
                    switch ($this.attr('type')) {
                        case "checkbox":
                        case "radio":
                            isChecked = $this.prop('checked');
                            wasChecked = !!$this.attr('checked');
                            if ((isChecked && !wasChecked) || (wasChecked && !isChecked)) {
                                me.configure($this);
                            }
                            break;
                        default:
                            me.configure($this);
                    }
                }
            });
            if ($.cookie('searchProductOptions')) {
                var preselectedOptions = JSON.parse($.cookie('searchProductOptions'));
                if (preselectedOptions) {
                    $(preselectedOptions.options).each(function() {
                        me.configure(null, this);
                    });
                    $.cookie('searchProductOptions', null, {path: '/'});
                }
            }
            
            me.model.on( 'updateSwatchImage', function(){
               me.selectSwatchImage();
           });
        },
        selectSwatchImage: function(e) {
            this.isColorClicked = true;
            var colorCode = $( '.color-options.active' ).data('mz-swatch-color');
            if( colorCode ) {
                colorCode = (colorCode) ? colorCode.replace('/', '').toLowerCase() : colorCode;
                this.changeImages(colorCode, (colorSwatchesChangeAlternate) ? 'Y' : 'N');
            }
        }
    });

    function destroyZoom() {
        isMobile = ($(window).width() <= 992) ? true : false;

        if (isMobile) {
            setInterval(function() {
                $('.zoomContainer').addClass('hidden');
            }, 777);
        }
    }

    $(window).resize(function(){
        destroyZoom();
    });

    $(document).ready(function() {
        if ($('.mz-product-detail-tabs ul.tabs li').length === 0)
            $('.mz-product-detail-tabs').remove();

        $('body').on('click', '#add-to-cart', function() {
            blockUiLoader.globalLoader();
        });

        destroyZoom();

        $('.mz-productimages-thumb').click(function () {
            destroyZoom();
        });
            var product = ProductModels.Product.fromCurrent();

        product.on('addedtocart', function (cartitem, stopRedirect) {
            if (cartitem && cartitem.prop('id')) {
                //product.isLoading(true);
                CartMonitor.addToCount(product.get('quantity'));
                $('html,body').animate({
                    scrollTop: $('header').offset().top
                }, 1000);
                product.set('quantity', 1);
                if(product.get('options')){
                    var optionModels = product.get('options').models;
                    for(var k = 0; k< product.get('options').models.length; k++){
                        optionModels[k].set('value', null);
                    }
                }
                product.unset('stockInfo');
                var priceDiscountTemplate = Hypr.getTemplate("modules/product/price-stack");
                $('.mz-productdetail-price').html(priceDiscountTemplate.render({
                    model: priceModel
                }));
                if (product.get('options').length)
                    $("[data-mz-action='addToCart']").addClass('button_disabled');
                $(".mz-productcodes-productcode").text(Hypr.getLabel('item')+" # " + product.get('productCode'));
                stopRedirect = true; // manually set, as from models-products.js property does not apply
                if(!stopRedirect) {
                    window.location.href = (HyprLiveContext.locals.pageContext.secureHost || HyprLiveContext.locals.siteContext.siteSubdirectory) + "/cart";
                }
            } else {
                product.trigger("error", { message: Hypr.getLabel('unexpectedError') });
            }
            blockUiLoader.unblockUi();
        });

        product.on('addedtowishlist', function(cartitem) {
            $('#add-to-wishlist').prop('disabled', 'disabled').text(Hypr.getLabel('addedToWishlist'));
        });

        initSlider();
        initslider_mobile();
        //Custom Functions related to slider
        // function createPager(carousal) {
        //     var totalSlides = carousal.getSlideCount();
        //     var newPager = $(".mz-productimages-pager");
        //     for (var i = 0; i < totalSlides; i++) {
        //         if (i === 0) {
        //             newPager.append("<div data-mz-productimage-thumb=" + (i + 1) + " class=\"activepager\"></div>");
        //         } else {
        //             newPager.append("<div data-mz-productimage-thumb=" + (i + 1) + " class=\"\"></div>");
        //         }
        //     }
        //     newPager.find('div').on('click touchstart' ,function() {
        //         var indx = $(".mz-productimages-pager div").index($(this));
        //         slider_mobile.goToSlide(indx);
        //         $(".mz-productimages-pager div").removeClass("activepager").eq(indx).addClass("activepager");
        //     });
        // }
        // if ($('#productmobile-Carousel').length) {
        //      createPager(slider_mobile);
        // }

        var productImagesView = new ProductImageViews.ProductPageImagesView({
            el: $('[data-mz-productimages]'),
            model: product
        });

        var productView = new ProductView({
            el: $('.product-detail'),
            model: product,
            messagesEl: $('[data-mz-message-bar]')
        });

        window.productView = productView;
        window.familyLength = window.productView.model.attributes.family.models.length;

        productView.render();

        var activeOptions = $('.mz-productoptions li.active');
        
        if (activeOptions.length > 0) {
            activeOptions.each(function() {
                productView.configureAttribute($(this));
            });
        }

        //IF on page laod Variation code is available then Displays UPC messages
        if (window.productView.model.get('variationProductCode')) {
            var sp_price = "";
            if (window.productView.model.get('inventoryInfo').onlineStockAvailable && typeof window.productView.model.get('inventoryInfo').onlineStockAvailable !== "undefined") {
                if (typeof window.productView.model.get('price').get('salePrice') != 'undefined')
                    sp_price = window.productView.model.get('price').get('salePrice');
                else
                    sp_price = window.productView.model.get('price').get('price');
                var price = Hypr.engine.render("{{price|currency}}", { locals: { price: sp_price } });
                $('.stock-info').show().html("In Stock <span class='stock-price'>" + price + "</span>");
            }
        }
        productInitialImages = {
            mainImage: product.attributes.mainImage,
            thumbImages: product.attributes.content.attributes.productImages
        };
        if (product.attributes.hasPriceRange) {
            priceModel = {
                hasPriceRange: product.attributes.hasPriceRange,
                priceRange: {
                    lower: product.attributes.priceRange.attributes.lower.attributes,
                    upper: product.attributes.priceRange.attributes.upper.attributes
                },
                price: product.attributes.price.attributes
            };
        } else {
            priceModel = {
                hasPriceRange: product.attributes.hasPriceRange,
                price: product.attributes.price.attributes
            };
        }

        var productData = product.apiModel.data;
        var recentProduct = {
            code:productData.productCode
        };
        var existingProducts = $.cookie("recentProducts");
        var recentProducts = existingProducts ? $.parseJSON(existingProducts) : [];
        recentProducts = recentProd(recentProducts, recentProduct);
        $.cookie("recentProducts", JSON.stringify(recentProducts), {path: '/', expires: 21 });

        //destroyZoom();
    });
    /*$(window).resize(function(){
        destroyZoom();
    });
    $('body').on('click touchstart', '.mz-productimages-thumb',function(){
        setTimeout(destroyZoom, 555);
    });*/

    function recentProd(json, product) {
        var found = false;
        var maxItems = HyprLiveContext.locals.themeSettings.maxRecentlyViewedItems;

        for (var i = 0 ; i < json.length; i++) {
            if (json[i].code == product.code){
                found = true;
                json.splice(i, 1);
                break;
            }
        }
        json.unshift(product);

        if(json.length == maxItems+2){
            json.splice(maxItems+1, 1);
        }
        return json;
    }
    $('body').on('click', '#mz-close-button', function(e) {
        e.preventDefault();
        blockUiLoader.unblockUi();
    });
});
