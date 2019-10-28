define(["modules/jquery-mozu", 'modules/api', "underscore", "hyprlive", "modules/backbone-mozu", "hyprlivecontext", 'modules/mozu-grid/mozugrid-view', 'modules/mozu-grid/mozugrid-pagedCollection', "modules/views-paging", 'modules/editable-view', 'modules/models-customer'], function ($, api, _, Hypr, Backbone, HyprLiveContext, MozuGrid, MozuGridCollection, PagingViews, EditableView, CustomerModels) {
  var PaymentMethodsView = EditableView.extend({
      templateName: "modules/b2b-account/payment-information/payment-information",
      autoUpdate: [
          'editingCard.isDefaultPayMethod',
          'editingCard.paymentOrCardType',
          'editingCard.nameOnCard',
          'editingCard.cardNumberPartOrMask',
          'editingCard.expireMonth',
          'editingCard.expireYear',
          'editingCard.cvv',
          'editingCard.isCvvOptional',
          'editingCard.contactId',
          'editingContact.firstName',
          'editingContact.lastNameOrSurname',
          'editingContact.address.address1',
          'editingContact.address.address2',
          'editingContact.address.address3',
          'editingContact.address.cityOrTown',
          'editingContact.address.countryCode',
          'editingContact.address.stateOrProvince',
          'editingContact.address.postalOrZipCode',
          'editingContact.address.addressType',
          'editingContact.phoneNumbers.home',
          'editingContact.phoneNumbers.work',
          'editingContact.isBillingContact',
          'editingContact.isPrimaryBillingContact',
          'editingContact.isShippingContact',
          'editingContact.isPrimaryShippingContact'
      ],
      renderOnChange: [
          'editingCard.isDefaultPayMethod',
          'editingCard.contactId',
          'editingContact.address.countryCode'
      ],
    additionalEvents: {
        "blur #mz-payment-credit-card-number": "changeCardType",
        "input  [name='security-code'],[name='credit-card-number']": "allowDigit"
    },
    allowDigit:function(e){
        e.target.value= e.target.value.replace(/[^\d]/g,'');
    },
    changeCardType:function(e){
        var number = e.target.value;
        var cardType='';

        // visa
        var re = new RegExp("^4");
        if (number.match(re) !== null){
            cardType = "VISA";
        }

        // Mastercard
        // Updated for Mastercard 2017 BINs expansion
            if (/^(5[1-5][0-9]{14}|2(22[1-9][0-9]{12}|2[3-9][0-9]{13}|[3-6][0-9]{14}|7[0-1][0-9]{13}|720[0-9]{12}))$/.test(number))
            cardType = "MC";

        // AMEX
        re = new RegExp("^3[47]");
        if (number.match(re) !== null)
            cardType = "AMEX";

        // Discover
        re = new RegExp("^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)");
        if (number.match(re) !== null)
            cardType = "DISCOVER";

        $('.mz-card-type-images').find('span').removeClass('active');
        if(cardType){
            this.model.set('editingCard.paymentOrCardType',cardType);
            $('.mz-card-type-images').find('span[data-mz-card-type-image="'+cardType+'"]').addClass('active');
        }
        else{
            this.model.set('editingCard.paymentOrCardType',null);
        }

    },
    beginEditCard: function(e) {
        var self = this;
        this.model.apiGet().then(function(){
            var id = self.editing.card = e.currentTarget.getAttribute('data-mz-card');
            self.model.beginEditCard(id);
            self.render();
        });
    },
    finishEditCard: function() {
        var self = this;
        var operation = this.doModelAction('saveCard');
        if (operation) {
            operation.otherwise(function() {
                self.editing.card = true;
            });
            this.editing.card = false;
        }
    },
    cancelEditCard: function() {
        this.editing.card = false;
        this.model.endEditCard();
        this.render();
    },
    beginDeleteCard: function(e) {
        var self = this,
            id = e.currentTarget.getAttribute('data-mz-card'),
            card = this.model.get('cards').get(id);
        if (window.confirm(Hypr.getLabel('confirmDeleteCard', card.get('cardNumberPart')))) {
            this.doModelAction('deleteCard', id);
        }
    },
    render: function(){
        Backbone.MozuView.prototype.render.apply(this, arguments);
        var self = this;
        $(document).ready(function () {
            var collection = new TransactionGridCollectionModel({id: self.model.get('id')});
            var transactionsGrid = new MozuGrid({
                el: $('.mz-b2b-transactions-grid'),
                model: collection
            });
            transactionsGrid.render();
            return;
        });
    }
  });

  var PaymentMethodsModel = CustomerModels.EditableCustomer.extend({
      helpers: ['isLimited', 'blockCreditLimit', 'blockViewPurchaseOrders'],
      requiredBehaviors: [ 1003 ],
      isLimited: function(){
          return !this.hasRequiredBehavior();
      },
      blockCreditLimit: function(){
          return !this.hasRequiredBehavior(1007);
      },
      blockViewPurchaseOrders: function(){
          return !this.hasRequiredBehavior(1006);
      },
      hasRequiredBehavior: function(behaviorId){
          var userBehaviors = require.mozuData('user').behaviors || [];
          if (userBehaviors.includes(1014)) return true;
          var requiredBehaviors = this.requiredBehaviors || [];

          if (behaviorId) {
              requiredBehaviors = [behaviorId];
          }

          if (requiredBehaviors.length) {
              var match = _.intersection(userBehaviors, requiredBehaviors);
              if (this.requiredBehaviorsType === "AllOf") {
                  if (match.length !== this.requiredBehaviors.length) {
                      return false;
                  }
              }
              if (match.length < 1) {
                  return false;
              }
          }
          return true;
      }
  });

  var TransactionGridCollectionModel = MozuGridCollection.extend({
      mozuType: 'customer',
      apiGridRead: function(){
          return this.apiGetPurchaseOrderTransactions();
      },
      requiredBehaviors: [ 1006 ],
      requireBehaviorsToRender: true,
      columns: [
          {
              index: 'transactionDate',
              displayName: 'Date',
              sortable: true,
              displayTemplate: function(value){
                  var date = new Date(value);
                  return date.toLocaleDateString();
              }
          },
          // {
          //     index: 'orderNumber',
          //     displayName: 'Order Number',
          //     sortable: true,
          //     displayTemplate: function(value){
          //         return (value === undefined || value.length < 1) ? value : 'N/A';
          //     }
          // },
          {
              index: 'transactionTypeId',
              displayName: 'Order Type',
              sortable: false
          },
          {
              index: 'purchaseOrderNumber',
              displayName: 'PO #',
              sortable: false
          },
          {
              index: 'author',
              displayName: 'Author',
              sortable: false
          },
          {
              index: 'transactionDescription',
              displayName: 'Transaction Details',
              sortable: false
          },
          {
              index: 'transactionAmount',
              displayName: 'Amount',
              sortable: true,
              displayTemplate: function (amount){
                  if(amount){
                      return '$' + amount.toFixed(2);
                  }
                  return "";
              }
          }
      ],
      relations: {
          items: Backbone.Collection.extend({})
      }
  });

  return {
    'PaymentInformationView': PaymentMethodsView,
    'PaymentInformationModel': PaymentMethodsModel
  };
});
