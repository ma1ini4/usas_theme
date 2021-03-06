define([
  "modules/jquery-mozu",
  'modules/api',
  "underscore",
  "hyprlive",
  "modules/backbone-mozu",
  "hyprlivecontext",
  'modules/mozu-grid/mozugrid-view',
  'modules/mozu-grid/mozugrid-pagedCollection',
  "modules/views-paging",
  "modules/models-product",
  "modules/models-wishlist",
  "modules/search-autocomplete",
  "modules/models-cart",
  "modules/product-picker/product-picker-view",
  "modules/backbone-pane-switcher",
  "modules/product-picker/product-modal-view",
  "modules/mozu-utilities",
  "modules/message-handler",
  'modules/block-ui'
],
function ($, api, _, Hypr, Backbone, HyprLiveContext, MozuGrid, MozuGridCollection, PagingViews, ProductModels, WishlistModels, SearchAutoComplete, CartModels, ProductPicker, PaneSwitcher, ProductModalViews, MozuUtilities, MessageHandler, blockUiLoader) {
    var ALL_LISTS_FILTER = "";
    var USER_LISTS_FILTER = "userId eq " + require.mozuData('user').userId;
    var WishlistModel = WishlistModels.Wishlist.extend({
        handlesMessages: true,
        defaults: {
            'pickerItemQuantity': 1,
            'isProductSelected': false
        },
        deleteWishlist: function (id) {
            if (id) {
                return this.apiModel['delete']({ id: id });
            }
        },
        saveWishlist: function () {
            this.set('customerAccountId', require.mozuData('user').accountId);
            if (!this.get('name') || this.get('name') === " ") {
                this.set('name', 'New List - ' + Date.now());
            }
            if(!this.get('userId')) {
                this.set('userId', require.mozuData('user').userId);
            }
            this.set('customerAccountId', require.mozuData('user').accountId);

            if (this.get('id')) {
                this.syncApiModel();
                return this.apiModel.update();
            }
              return this.apiModel.create(this.model);
        },
        addWishlistItem: function (item, quantity) {
            var self = this;
            self.isLoading(true);
            if (!this.get('id')) {

                return this.saveWishlist().then(function () {
                    var payload = {
                            wishlistId: self.get('id'),
                            id: self.get('id'),
                            quantity: quantity,
                            product: item
                    };
                    self.apiModel.addItemTo(payload, { silent: true }).then(function (data) {
                        //self.get('items').add(new WishlistModels.WishlistItem(data.data), { merge: true });
                        return self.apiGet();
                    }).ensure(function () {
                        self.isLoading(false);
                    });
                });
            }
            var payload = {
                wishlistId: this.get('id'),
                quantity: quantity || 1,
                product: item
            };

            return this.apiModel.addItemTo(payload, { silent: true }).then(function (data) {
                //self.get('items').add(new WishlistModels.WishlistItem(data.data), { merge: true });
                return self.apiGet();
            }).ensure(function () {
                self.isLoading(false);
            });
        },
        addWishlistItems: function(listOfItems){
            // This is only called when saving a quick order as a list.
            var payloadItems = [];
            listOfItems.forEach(function(item){
                payloadItems.push({
                    product: item.get('product'),
                    quantity: item.get('quantity')
                });
            });
            var self = this;
            if (!this.get('id')){
                this.set('items', payloadItems);
                this.set('wishlistId', self.get('id'));
                return this.saveWishlist().then(function(){
                  var payload = {
                          wishlistId: self.get('id'),
                          id: self.get('id'),
                          items: payloadItems,
                          name: self.get('name')
                  };
                  return self.apiModel.update(payload, { silent: true }).then(function (data) {
                      return self.apiGet();
                  }).ensure(function () {
                      self.isLoading(false);
                  });
                });
            }
            var payload = {
                wishlistId: this.get('id'),
                items: payloadItems
            };

            return this.apiModel.update(payload, { silent: true }).then(function (data) {
                return self.apiGet();
            }).ensure(function () {
                self.isLoading(false);
            });

        },
        addToCart: function (selectedItems) {
          blockUiLoader.globalLoader();
            this.isLoading(true);
            var self = this;
            var items = this.get('items').toJSON();

            if (selectedItems && selectedItems.length !== 0) {
                var newItems = [];

                _.each(items, function(item){
                    selectedItems.map(function(id) {
                        if (item.id === id) {
                            newItems.push(item);
                        }
                    });
                });
                items = newItems;
            } else {
                items = [];
            }

            var cart = CartModels.Cart.fromCurrent();
            var products = [];
            _.each(items, function(item) {
                var isItemDigital = _.contains(item.product.fulfillmentTypesSupported, "Digital");

                products.push({
                    quantity : item.quantity,
                    data: item.data,
                    fulfillmentMethod : (!isItemDigital ? "Ship" : "Digital"),
                    product: {
                        productCode : item.product.productCode,
                        variationProductCode : item.product.variationProductCode,
                        bundledProducts : item.product.bundledProducts,
                        options : item.product.options || []
                    }
                });
            });
            cart.apiModel.addBulkProducts({ postdata: products, throwErrorOnInvalidItems: true}).then(function(){
                window.location = (HyprLiveContext.locals.siteContext.siteSubdirectory || '') + "/cart";
            }, function (error) {
                self.isLoading(false);
                blockUiLoader.unblockUi();
                if (error.items) {
                    var errorMessage = "";
                    _.each(error.items, function(error){
                        var errorProp = _.find(error.additionalErrorData, function(errorData){
                            return errorData.name === "Property";
                        });
                        errorMessage += (errorProp.value + ': ' + error.message);
                    });
                    self.messages.reset({ messageType: 'BulkAddToCartErrors', message: errorMessage });
                }
            });
        }
    });

    var WishlistsModel = Backbone.MozuModel.extend({
        defaults: {
            isEditMode: false
        },
        relations: {
            wishlist: WishlistModel
        },
        setWishlist: function (wishlist) {
            if (!(wishlist instanceof WishlistModel)) {
                if (wishlist.toJSON)
                    wishlist = wishlist.toJSON();
                wishlist = new WishlistModel(wishlist);
            }
            this.get('wishlist').clear();
            if (this.get('wishlist').get('items').length) {
                this.get('wishlist').get('items').reset();
            }
            wishlist.get('items').forEach(function(item){
                item.get('product').url = (HyprLiveContext.locals.siteContext.siteSubdirectory || '')+'/p/'+item.get('product').productCode;
            });
            this.set('wishlist', wishlist);
            this.get('wishlist').syncApiModel();
        },
        setEditMode: function (flag) {
            return this.set('isEditMode', flag);
        },
        toggleEditMode: function () {
            if (this.get('isEditMode')) {
                return this.setEditMode(false);
            }
            return this.setEditMode(true);
        }
    });

    var WishlistsMozuGrid = MozuGrid.extend({
        render: function(){
            var self = this;
            this.filterItemsByUserId();
            this.filterItemsWithPrefixes();
            MozuGrid.prototype.render.apply(self, arguments);
        },
        filterItemsWithPrefixes: function () {
            var self = this,
                invalidPrefix = 'up-',
                filteredItems = [];

            filteredItems = self.model.get('items').filter(function (item) {
                return item.get('name').indexOf(invalidPrefix) === -1;
            });
            self.model.set('items', filteredItems);
            return self;
        },
        filterItemsByUserId: function () {
            var self = this,
                currentUser = require.mozuData('user').userId,
                filteredItems = [];

            filteredItems = self.model.get('items').filter(function (item) {
                return item.get('userId') === currentUser;
            });
            self.model.set('items', filteredItems);
            return self;
        },
        populateWithUsers: function(){
            var self = this;
            self.model.get('items').models.forEach(function(list){
                var userInQuestion = window.b2bUsers.find(function(user){
                    return (user.userId === list.get('userId'));
                });
                list.set('fullName', userInQuestion.firstName+' '+userInQuestion.lastName);
            });
            return self.model;
        }
        });

    var WishlistsView = Backbone.MozuView.extend({
        templateName: 'modules/b2b-account/wishlists/my-wishlists',
        additionalEvents: {
            "change [data-mz-value='wishlist-quantity']": "onQuantityChange"
        },
        initialize: function(){
            var self = this;
            Backbone.MozuView.prototype.initialize.apply(this, arguments);
            this.model.set('viewingAllLists', true);
        },
        newWishlist: function () {
            this.model.setWishlist({});
            this.model.setEditMode(true);
            this.model.setWishlist({editingNew: true});
            this.render();
            //Just the Edit Page that is empty?
        },
        removeWishlist: function (id) {
            var self = this;
            return this.model.get('wishlist').deleteWishlist(id).then(function () {
                self.render();
            });
        },
        copyWishlist: function (wishlist) {
            var self = this;
            wishlist.unset('id');
            if (wishlist.toJSON) {
                wishlist = wishlist.toJSON();
            }
            self.model.isLoading(true);
            return this.model.get('wishlist').apiCreate(wishlist).then(function () {
                self.render();
            }, function(error){
                MessageHandler.saveMessage('CopyWishList', 'Error', error.message);
                MessageHandler.showMessage('CopyWishList');
            }).done(function () {
                self.model.isLoading(false);
            });
        },
        toggleViewAllLists: function (e) {
          this._wishlistsGridView.model.setPage(1);
            if (e.currentTarget.checked){
              this.model.set('viewingAllLists', true);
              this._wishlistsGridView.model.filterBy(ALL_LISTS_FILTER);
            } else {
              this.model.set('viewingAllLists', false);
              this._wishlistsGridView.model.filterBy(USER_LISTS_FILTER);
            }
        },
        viewQuote: function (e, data) {
            var self = this;
            $('[data-mz-validationmessage-for="quoteId"]').html('');

            var quoteId = data,
                customerId = $('[data-mz-value="customerId"]').val();
            if ( ! quoteId ) {
              quoteId = $('[data-mz-value="quoteId"]').val();
            }
            var regEx = /4000-\d{10}-\d+/;
            var isValidQuote = regEx.test(quoteId);
            if (isValidQuote) {
                blockUiLoader.globalLoader();
                self.model.isLoading(true);
                api.get('cart').then(function(cart) {
                    var url = '/pricelist/runSchedule?quoteId=' + quoteId + '&customerId=' + customerId + '&cartId=' + cart.data.id + '&userId=' + require.mozuData('user').userId;
                    var  userId = require.mozuData('user').userId;
                    //var userQuoteId = (quoteId + '-' + userId).substring(0,30);
                    var userQuoteId = (quoteId + '-' + userId);
                    console.log('userQuoteId', userQuoteId);
                    self.model.set('isEditMode', true);
                    $.ajax({
                        url: url,
                        method: 'GET',
                        success: function (res) {
                            setTimeout(function () {
                                self.render();

                                self.findQuoteByNumber(customerId, userQuoteId);
                            }, 500);
                        },
                        error: function(err) {
                            setTimeout(function(){
                                blockUiLoader.unblockUi();

                                self.model.isLoading(false);
                                self.findQuoteByNumber(customerId, userQuoteId);
                                self.render();
                            }, 500);
                        }
                    });
                });
            } else {
                $('[data-mz-validationmessage-for="quoteId"]').html(Hypr.getLabel('viewQuoteValidationError'));
            }
        },
        findQuoteByNumber: function (customerId, id) {
            var self = this;
            var url = 'api/commerce/wishlists/customers/' + customerId + '/' + id;

            $.ajax({
                url: url,
                method: 'GET',
                success: function (res) {
                    self.model.set('isEditMode', true);
                    self.model.set('wishlist', res);
                    self.model.get('wishlist').set('items', res.items).set('name', res.name);
                    window.views.currentPane.render();
                    self.model.isLoading(false);
                    blockUiLoader.unblockUi();
                },
                error: function (err) {
                    self.model.set('isEditMode', false);
                    self.model.get('wishlist').set('items', []).set('name', id);
                    self.render();
                    self.model.isLoading(false);
                    blockUiLoader.unblockUi();
                }
            });
        },
        viewAll: function () {
            blockUiLoader.globalLoader();

            $('[data-mz-action="cancelWishlistEdit"]').trigger('click');
        },
        render: function () {
            Backbone.MozuView.prototype.render.apply(this, arguments);
            var self = this;
            if (this._editWishlist) {
                this._editWishlist.stopListening();
            }
            var editWishlistView = new EditWishlistView({
                el: self.$el.find('.mz-b2b-wishlists-product-picker'),
                model: self.model.get('wishlist'),
                messagesEl: self.$el.find('.mz-b2b-wishlists-product-picker').parent().find('[data-mz-message-bar]')
            });

            var productModalView = new ProductModalViews.ModalView({
                el: self.$el.find("[mz-modal-product-dialog]"),
                model: new ProductModels.Product({}),
                messagesEl: self.$el.find("[mz-modal-product-dialog]").find('[data-mz-message-bar]')
            });

            this._editWishlist = editWishlistView;
            window.productModalView = productModalView;


            $(document).ready(function () {
                if (!self.model.get('isEditMode')) {
                    var collection = new MozuGridCollectionModel();

                    var wishlistsGrid = new WishlistsMozuGrid({
                        el: $('.mz-b2b-wishlists-grid'),
                        model: collection
                    });

                    self._wishlistsGridView = wishlistsGrid;
                    wishlistsGrid.render();
                    return;
                } else {
                    editWishlistView.render();
                }
            });
        }
    });

    var EditWishlistView = Backbone.MozuView.extend({
        templateName: 'modules/b2b-account/wishlists/edit-wishlist',
        autoUpdate: [
            'name',
            'pickerItemQuantity',
            'quoteId',
            'customerId'
        ],
        initialize: function() {
            var self = this;
            Backbone.MozuView.prototype.initialize.apply(this, arguments);

            try {
                this.originalData = this.model.toJSON() || {};
            } catch(e) {
                console.log(e);
            }
        },
        saveWishlist: function () {
            var self = this;
            return this.model.saveWishlist().then(function () {
                self.model.parent.setEditMode(false);
                self.model.parent.trigger('render');
            });

        },
        addWishlistToCart: function(e){
            var selectedItems = [];

            $('[data-mz-value="add-to-cart-quote"]:checked').each(function () {
               selectedItems.push($(this).data('mzItemId'));
            });
            this.model.addToCart(selectedItems);
        },
        saveAndCloseWishlistEdit: function () {
          // Name here is a bit misleading but the effect is the same -
          // wishlists auto-save constantly. This function closes the editor
          // without deleting any changes.
          // It gets also called when no changes have been made and the user clicks cancel.
            this.model.set('editingNew', false);
            this.model.parent.setEditMode(false);
            window.views.currentPane.render();
        },
        cancelWishlistEdit: function () {
            // Wishlists are typically saved automatically.
            // If we are in new wishlist mode, cancellation means we can simply delete
            // the wishlist we've begun. If we are editing an existing wishlist, we
            // save over the one we have with a copy of original data we stashed away on page load.
            var self = this;
            if (this.model.get('editingNew') && this.model.get('id')){
                this.model.deleteWishlist((this.model.get('id'))).then(function(){
                    self.saveAndCloseWishlistEdit();
                    blockUiLoader.unblockUi();
                });
            } else if (!this.model.get('id')){
                  self.saveAndCloseWishlistEdit();
                    blockUiLoader.unblockUi();
            } else {
                // if !this.model.get('id'), this.originalData should be an empty,
                // and there is no wishlist to save so this is fine.
                this.model.set(self.originalData);
                this.saveWishlist().then(function(){
                  self.saveAndCloseWishlistEdit();
                    blockUiLoader.unblockUi();
                });
            }

        },
        addWishlistItem: function (e) {
            var self = this;
            var product = self.model.get('selectedProduct');
            self.model.messages.reset();

            if (product.options) {

                if (!(product instanceof ProductModels.Product)) {
                    if (product.toJSON)
                        product = product.toJSON();
                    product = new ProductModels.Product(product);
                }
                this.stopListening();
                this.model.isLoading(true);
                this.listenTo(product, "configurationComplete", function () {
                    self.model.addWishlistItem(product.toJSON(), product.get('quantity')).then(function () {
                        self.model.unset('selectedProduct');
                        window.productModalView.handleDialogCancel();
                        $('.mz-b2b-wishlists .mz-searchbox-input.tt-input').val('');
                        $('.mz-b2b-wishlists #pickerItemQuantity').val(1);
                        self.model.isLoading(false);
                    }, function (error) {
                        window.productModalView.model.messages.reset({ message: error.message });
                        self.model.isLoading(false);
                    });
                });

                window.productModalView.loadAddProductView(product);
                window.productModalView.handleDialogOpen();
                return;
            }

            window.views.currentPane.model.get('wishlist').addWishlistItem(product, self.model.get('pickerItemQuantity')).then(function () { }, function (error) {
                self.model.messages.reset({ message: error.message });
            });
            self.model.unset('selectedProduct');
            $('.mz-b2b-wishlists .mz-searchbox-input.tt-input').val('');
            $('.mz-b2b-wishlists #pickerItemQuantity').val(1);
        },
        render: function () {
            Backbone.MozuView.prototype.render.apply(this, arguments);
            var self = this;
            $('#quoteId').focusout(function () {
                self.model.saveWishlist();
            });

            var wishlistListView = new WishlistListView({
                el: self.$el.find('.mz-b2b-wishlist-list'),
                model: self.model
            });
            wishlistListView.render();

            var productPickerView = new ProductPicker({
                el: self.$el.find('[mz-wishlist-product-picker]'),
                model: self.model
            });

            productPickerView.render();
        }
    });

    var WishlistListView = Backbone.MozuView.extend({
        templateName: 'modules/b2b-account/wishlists/wishlist-list',
        additionalEvents: {
            "change [data-mz-value='wishlist-quantity']": "onQuantityChange",
            "change [data-mz-value='check-all-quote']": "selectAll",
            "change [data-mz-value='add-to-cart-quote']": "itemCheckbox"

        },
        onQuantityChange: _.debounce(function (e) {
            var $qField = $(e.currentTarget),
                newQuantity = parseInt($qField.val(), 10);
            if (!isNaN(newQuantity)) {
                this.updateQuantity(e);
            }
        }, 500),
        updateQuantity: function (e) {
            var self = this,
                $qField = $(e.currentTarget),
                newQuantity = parseInt($qField.val(), 10),
                id = $qField.data('mz-cart-item'),
                item = this.model.get("items").get(id);

            if (item && !isNaN(newQuantity)) {
                item.set('quantity', newQuantity);
                var payload = item.toJSON();
                payload.id = self.model.get('id');
                payload.itemId = item.get('id');

                this.model.apiModel.editItem(payload, { silent: true }).then(function(){
                    self.model.apiGet();
                });

            }
        },
        beginRemoveItem: function (e) {
            var self = this;
            var id = $(e.currentTarget).data('mzItemId');
            if (id) {
                var removeWishId = id;
                return this.model.apiModel.deleteItem({ id: self.model.get('id'), itemId: id }, { silent: true }).then(function () {

                    self.model.apiGet();
                });
            }
        },
        selectAll: function(e) {
            var checkboxes = $('[data-mz-value="add-to-cart-quote"]');

            if (e.currentTarget.checked) {
                checkboxes.each(function() {
                    $(this).prop('checked', true);
                });

                $("[data-mz-value='check-all-quote']").each(function(){
                    $(this).prop('checked', true);
                });
            } else {
                checkboxes.each(function() {
                    $(this).prop('checked', false);
                });

                $("[data-mz-value='check-all-quote']").each(function(){
                    $(this).prop('checked', false);
                });
            }
        },
        itemCheckbox: function(e) {
            $(this).prop('checked', !e.target.checked);

            var checkboxes = $('[data-mz-value="add-to-cart-quote"]');
            var checkedItems = [];

            checkboxes.each(function() {
                checkedItems.push($(this).prop('checked'));
            });

            var allItemsSelected = checkedItems.every(function(val, i, arr) {
                return val === true;
            });
            var allItemsDeselected = checkedItems.every(function(val, i, arr) {
                return val === false;
            });


            if(allItemsSelected) {
                $("[data-mz-value='check-all-quote']").prop('checked', true);
            } else if(allItemsDeselected) {
                $("[data-mz-value='check-all-quote']").prop('checked', false);
            } else {
                $("[data-mz-value='check-all-quote']").prop('checked', false);
            }
        }
    });

    var MozuGridCollectionModel = MozuGridCollection.extend({
        mozuType: 'wishlists',
        filter: ALL_LISTS_FILTER,
        columns: [
            {
                index: 'name',
                displayName: 'Quote Number',
                sortable: true,
                displayTemplate: function (name) {
                  var startUserId = name.lastIndexOf('-');
                  return name.substring(0,startUserId);
                }
            },
            {
                index: 'auditInfo',
                displayName: 'Date Created',
                displayTemplate: function (auditInfo) {
                    if (auditInfo) {
                        var date = new Date(auditInfo.createDate);
                        return date.toLocaleDateString();
                    }
                    // console.log(this);
                }
            },
            {
                index: 'expirationDate',
                displayName: 'End Date',
                displayTemplate: function (expirationDate) {
                    if (expirationDate) {
                        var date = new Date(expirationDate);
                        return date.toLocaleDateString();
                    }
                    console.log(expirationDate);
                }
            }
        ],
        defaultSort: 'updateDate desc',
        rowActions: [
            {
                displayName: 'View',
                action: 'editWishlist'
            },
            {
                displayName: 'Delete',
                action: 'deleteWishlist'
            }
            // {
            //     displayName: 'Copy',
            //     action: 'copyWishlist'
            // },
            // {
            //     displayName: 'Add to Cart',
            //     action: 'addWishlistToCart',
            //     hidden: function () {
            //         // 1008 = Can place orders
            //         return !this.hasRequiredBehavior(1008);
            //     }
            // }
        ],
        relations: {
            items: Backbone.Collection.extend({
                model: WishlistModel
            })
        },
        deleteWishlist: function (e, row) {
            //var rowIndex = $(e.target).parents('.mz-grid-row').data('mzRowIndex');
            //var wishlistId = e.target.data("mzWishlistId");
            //Confirmation Modal
            window.views.currentPane.removeWishlist(row.get('id'));
        },
        editWishlist: function (e, row) {
            //var rowIndex = $(e.target).parents('.mz-grid-row').data('mzRowIndex');
            if ( row.get('name').indexOf('New') > -1 ){
               window.views.currentPane.model.setWishlist(row);
                window.views.currentPane.model.setEditMode(true);
                window.views.currentPane.render();
            } else {
              var startUserId = row.get('name').lastIndexOf('-');
              var name = row.get('name').substring(0,startUserId);
              $('[data-mz-action="viewQuote"]').trigger('click',[ name ]);
            }
        },
        addWishlistToCart: function (e, row) {
            row.addToCart();
        },
        copyWishlist: function (e, row) {
          var startUserId = row.get('name').lastIndexOf('-');
          var name = row.get('name').substring(0,startUserId);
          var wishlistName = 'copy - ' + name;

          row.set('name', wishlistName);
          row.set('userId', require.mozuData('user').userId);
          window.views.currentPane.copyWishlist(row);
        }
    });

    return {
        'WishlistsModel': WishlistsModel,
        'WishlistModel': WishlistModel,
        'WishlistsView': WishlistsView
    };
});
