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
    "modules/product/family-products"
], function($, _, bxslider, elevatezoom, blockUiLoader, Hypr, Backbone, CartMonitor, ProductModels, ProductImageViews, HyprLiveContext, FamilyModel) {

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
    var current_zoom_id_added;
    var deviceType = navigator.userAgent.match(/Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile/i);

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
            pager: false
        });
        window.slider = slider;
    }

    function initslider_mobile() {
        var id;
        if (current_zoom_id_added)
            id = $(current_zoom_id_added)[0].attributes.id.value.replace('zoom_', '') - 1;
        slider_mobile = $('#productmobile-Carousel').bxSlider({
            slideWidth: 300,
            minSlides: 1,
            maxSlides: 1,
            moveSlides: 1,
            preloadImages: 'all',
            onSliderLoad: function(currentIndex) {
                $('ul#productmobile-Carousel li').eq(currentIndex).find('img').addClass("active");
                $("#productmobile-Carousel,#productCarousel-pager").css("visibility", "visible");
            },
            onSlideAfter: function($slideElement, oldIndex, newIndex) {
                $('.zoomContainer').remove();
                current_zoom_id_added.elevateZoom({ zoomType: "inner", cursor: "crosshair" }).addClass('active');
                var bkimg = $(current_zoom_id_added)[0].attributes['data-zoom-image'].value;
                $(".mz-productimages-pager div").removeClass("activepager").eq(newIndex).addClass("activepager");
                setTimeout(function() {
                    $('div.zoomWindowContainer div').css({ 'background-image': 'url(' + bkimg + ')' });
                }, 500);

            },
            onSlideBefore: function(currentSlide, totalSlides, currentSlideHtmlObject) {
                var current_zoom_id = '#' + $('#productmobile-Carousel>li').eq(currentSlideHtmlObject).find('img').attr('id');
                $('.zoomContainer').remove();
                $(current_zoom_id).removeData('elevateZoom');
                current_zoom_id_added = $('#productmobile-Carousel>li').eq(currentSlideHtmlObject).find('img');
                $('ul#productmobile-Carousel li img').removeClass('active');
            },
            startSlide: id ? id : 0,
            nextText: '<i class="fa fa-angle-right" aria-hidden="true"></i>',
            prevText: '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            infiniteLoop: false,
            hideControlOnEnd: true,
            pager: true,
            pagerCustom: '#productCarousel-pager'
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
        var mainImage = productInitialImages.mainImage.src + '?maxWidth=' + width_pdp;
        var zoomImage = productInitialImages.mainImage.src + '?maxWidth=' + width_zoom;
        $('body div.zoomContainer').remove();
        $('#zoom').removeData('elevateZoom');
        $('.mz-productimages-mainimage').attr('src', mainImage).data('zoom-image', zoomImage);
        $('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair" });
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
    var ProductView = Backbone.MozuView.extend({
        templateName: 'modules/product/product-detail',
        additionalEvents: {
            "change [data-mz-product-option]": "onOptionChange",
            "blur [data-mz-product-option]": "onOptionChange",
            "click [data-mz-product-option-attribute]": "onOptionChangeAttribute",
            "change [data-mz-value='quantity']": "onQuantityChange",
            "keyup input[data-mz-value='quantity']": "onQuantityChange",
            "click [data-mz-qty-minus]": "quantityMinus",
            "click [data-mz-qty-plus]": "quantityPlus",
            'mouseenter .color-options': 'onMouseEnterChangeImage',
            'mouseleave .color-options': 'onMouseLeaveResetImage'
        },
        render: function() {
            var me = this;
            Backbone.MozuView.prototype.render.apply(this);
            this.$('[data-mz-is-datepicker]').each(function(ix, dp) {
                $(dp).dateinput().css('color', Hypr.getThemeSetting('textColor')).on('change  blur', _.bind(me.onOptionChange, me));
            });
            $('#details-accordion').find('.panel-heading a').first().click();
        },
        quantityMinus: function() {
            $('[data-mz-validationmessage-for="quantity"]').text('');
            var value = parseInt($('.mz-productdetail-qty').val(), 10);
            if (value == 1) {
                $('[data-mz-validationmessage-for="quantity"]').text("Quantity can't be zero.");
                return;
            }
            value--;
            $('.mz-productdetail-qty').val(value);
            if (typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                if (window.productView.model.attributes.inventoryInfo.onlineStockAvailable >= value)
                    $("#add-to-cart").removeClass("button_disabled");
                if (window.productView.model.attributes.inventoryInfo.onlineStockAvailable < value)
                    $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.productView.model.get('inventoryInfo').onlineStockAvailable + " left in stock.");
            }
        },
        quantityPlus: function() {
            $('[data-mz-validationmessage-for="quantity"]').text('');
            var value = parseInt($('.mz-productdetail-qty').val(), 10);
            if (value == 99) {
                $('[data-mz-validationmessage-for="quantity"]').text("Quantity can't be greater than 99.");
                return;
            }
            value++;
            $('.mz-productdetail-qty').val(value);
            if (typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined" && window.productView.model.attributes.inventoryInfo.onlineStockAvailable < value) {
                $("#add-to-cart").addClass("button_disabled");
                $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.productView.model.get('inventoryInfo').onlineStockAvailable + " left in stock.");
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
                            var sp_price = "";
                            if (window.productView.model.attributes.inventoryInfo.onlineStockAvailable && typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                                if (typeof window.productView.model.attributes.price.get('salePrice') != 'undefined')
                                    sp_price = window.productView.model.attributes.price.get('salePrice');
                                else
                                    sp_price = window.productView.model.attributes.price.get('price');
                                var price = Hypr.engine.render("{{price|currency}}", { locals: { price: sp_price } });
                                $('.stock-info').show().html("In Stock <span class='stock-price'>" + price + "</span>");

                            }
                            if (window.productView.model.attributes.variationProductCode && typeof window.productView.model.attributes.variationProductCode !== "undefined") {
                                $(".mz-productcodes-productcode").text("Sku # " + window.productView.model.attributes.variationProductCode);
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
        configure: function($optionEl) {
            var newValue = $optionEl.val(),
                oldValue,
                id = $optionEl.data('mz-product-option'),
                optionEl = $optionEl[0],
                isPicked = (optionEl.type !== "checkbox" && optionEl.type !== "radio") || optionEl.checked,
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
        addToCart: function() {
            if (typeof window.productView.model.get('inventoryInfo').onlineStockAvailable === "undefined" || $(".mz-productoptions-optioncontainer").length != $(".mz-productoptions-optioncontainer .active").length) {
                blockUiLoader.productValidationMessage();
            } else if (window.productView.model.get('inventoryInfo').onlineStockAvailable) {
                if (window.productView.model.get('inventoryInfo').onlineStockAvailable < $('.mz-productdetail-qty').val()) {
                    $('[data-mz-validationmessage-for="quantity"]').text("*Only " + window.productView.model.get('inventoryInfo').onlineStockAvailable + " left in stock.");
                    return false;
                }
                this.model.set({ quantity: $('.mz-productdetail-qty').val() });
                this.model.addToCart();
            }
        },
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
            if (!deviceType) {
                this.mainImage = $('.mz-productimages-mainimage').attr('src');
                var colorCode = $(_e.currentTarget).data('mz-swatch-color');
                this.changeImages(colorCode, 'N');
            }
        },
        onMouseLeaveResetImage: function(_e) {
            if (!this.isColorClicked && !deviceType) {
                var colorCode = $("ul.product-color-swatches").find('li.active').data('mz-swatch-color');
                if (typeof colorCode != 'undefined') {
                    this.changeImages(colorCode, 'N');
                } else if (typeof this.mainImage != 'undefined') {
                    $('.mz-productimages-mainimage').attr('src', this.mainImage);
                } else {
                    $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
            }
        },
        selectSwatch: function(e) {
            this.isColorClicked = true;
            var colorCode = $(e.currentTarget).data('mz-swatch-color');
            if(colorSwatchesChangeAlternate)
                this.changeImages(colorCode, 'Y');
            else
                this.changeImages(colorCode, 'N');
        },
        changeImages: function(colorCode, _updateThumbNails) {
            var self = this;
            var version = 1;
            if (deviceType && $("figure.mz-productimages-thumbs ul.products_list_mobile li img.active").length > 0) {
                version = $("figure.mz-productimages-thumbs ul.products_list_mobile li img.active").data("mz-productimage-mobile");
            } else if ($("figure.mz-productimages-thumbs ul.products_list li.active").length > 0) {
                version = $("figure.mz-productimages-thumbs ul.products_list li.active").data("mz-productimage-thumb");
            }
            var imagepath = imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + version + '.jpg?maxWidth=';
            var mainImage = imagepath + width_pdp;
            var zoomimagepath = imagepath + width_zoom;
            var _this = this;
            //TODO: following function is checking if images exist on server or not
            checkImage(imagepath, function(response) {
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
                } else if (typeof self.mainImage === 'undefined') {
                    $('.mz-productimages-main').html('<span class="mz-productlisting-imageplaceholder img-responsive"><span class="mz-productlisting-imageplaceholdertext">[no image]</span></span>');
                }
                if ($("figure.mz-productimages-thumbs").length && $("figure.mz-productimages-thumbs").data("length") && _updateThumbNails == 'Y') {
                    _this.updateAltImages(colorCode);
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
            var slideCount = parseInt($("figure.mz-productimages-thumbs").data("length"), 10);
            var productCode = this.model.attributes.productCode;
            for (var i = 1; i <= slideCount; i++) {
                $(".mz-productimages-thumbs .products_list li:eq(" + (i - 1) + ") .mz-productimages-thumb img")
                    .attr({
                        "src": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_thumb,
                        "data-orig-src": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_pdp,
                        "data-orig-zoom": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_zoom
                    });
                $(".mz-productimages-thumbs .products_list_mobile li:eq(" + (i - 1) + ") img")
                    .attr({
                        "src": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_pdp,
                        "data-orig-src": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_pdp,
                        "data-orig-zoom": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_zoom,
                        "data-zoom-image": imagefilepath + '/' + this.model.attributes.productCode + '_' + colorCode + '_v' + i + '.jpg?maxWidth=' + width_zoom
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
            me.isColorClicked = false;
            me.mainImage = '';

            if (deviceType && me.model.get('content').get('productImages').length > 1)
                $('#zoom_1').elevateZoom({ zoomType: "inner", cursor: "crosshair", responsive: true });
            else
                $('#zoom').elevateZoom({ zoomType: "inner", cursor: "crosshair", responsive: true });
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
        }
    });

    $(document).ready(function() {
        var product = ProductModels.Product.fromCurrent();

        product.on('addedtocart', function(cartitem) {
            if (cartitem && cartitem.prop('id')) {
                //product.isLoading(true);
                CartMonitor.addToCount(product.get('quantity'));
                //window.location.href = "/cart";
                $('.mz-productdetail-qty').val(1);
                $("ul.product-color-swatches li").removeClass('active');
                $("ul.product-swatches li").removeClass('active');
                $('.mz-productoptions-option option:selected').removeAttr('selected');
                updateImages(productInitialImages);
                //check which option was selected before clicking 'Add to cart' and update option labels to default text('Select A Color/Size').
                var optArr = [];
                _.each(product.attributes.options.models, function(e) {
                    _.each(e.get('values'), function(valued) {
                        _.each(valued, function(value, key) {
                            if (key === 'isSelected' && value === true) {
                                var atfqn = e.get('attributeFQN');
                                if (e.get('attributeDetail').name === "OTHER") {
                                    $('[data-mz-product-option="' + atfqn + '"]').parents('.mz-productoptions-optioncontainer').find('.mz-productoptions-optionlabel').addClass('text-uppercase').text("Select a Option");
                                } else {
                                    $('[data-mz-product-option="' + atfqn + '"]').parents('.mz-productoptions-optioncontainer').find('.mz-productoptions-optionlabel').addClass('text-uppercase').text("Select a " + e.get('attributeDetail').name);
                                }
                                valued.isSelected = false;
                            }
                        });
                    });
                    e.attributes = _.omit(e.attributes, 'value');
                    optArr.push(e);
                });
                product.get('options').models = optArr;
                $('.mz-productoptions li').removeClass('disabled').attr('disabled', false);
                $('.stock-info').html('');
                var priceDiscountTemplate = Hypr.getTemplate("modules/product/price-stack");
                $('.mz-productdetail-price').html(priceDiscountTemplate.render({
                    model: priceModel
                }));
            } else {
                product.trigger("error", { message: Hypr.getLabel('unexpectedError') });
            }
        });

        product.on('addedtowishlist', function(cartitem) {
            $('#add-to-wishlist').prop('disabled', 'disabled').text(Hypr.getLabel('addedToWishlist'));
        });

        initSlider();
        initslider_mobile();
        //Custom Functions related to slider
        function createPager(carousal) {
            var totalSlides = carousal.getSlideCount();
            var newPager = $(".mz-productimages-pager");
            for (var i = 0; i < totalSlides; i++) {
                if (i === 0) {
                    newPager.append("<div data-mz-productimage-thumb=" + (i + 1) + " class=\"activepager\"></div>");
                } else {
                    newPager.append("<div data-mz-productimage-thumb=" + (i + 1) + " class=\"\"></div>");
                }
            }
            newPager.find('div').click(function() {
                var indx = $(".mz-productimages-pager div").index($(this));
                slider_mobile.goToSlide(indx);
                $(".mz-productimages-pager div").removeClass("activepager").eq(indx).addClass("activepager");
            });
        }
        if ($('#productmobile-Carousel').length) {
            createPager(slider_mobile);
        }        

        var productImagesView = new ProductImageViews.ProductPageImagesView({
            el: $('[data-mz-productimages]'),
            model: product
        });

        var productView = new ProductView({
            el: $('#product-detail'),
            model: product,
            messagesEl: $('[data-mz-message-bar]')
        });

        window.productView = productView;

        productView.render();

        //IF on page laod Variation code is available then Displays UPC messages
        if (window.productView.model.get('variationProductCode')) {
            var sp_price = "";
            if (window.productView.model.get('inventoryInfo').onlineStockAvailable && typeof window.productView.model.attributes.inventoryInfo.onlineStockAvailable !== "undefined") {
                if (typeof window.productView.model.attributes.price.get('salePrice') != 'undefined')
                    sp_price = window.productView.model.attributes.price.get('salePrice');
                else
                    sp_price = window.productView.model.attributes.price.get('price');
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

    });
    //Code for Family Page
    if ($("#mz-family-container").length) {
        FamilyModel.render();
    }
});
