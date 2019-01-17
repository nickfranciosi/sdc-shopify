import '../../styles/theme.scss';

import $ from 'jquery';
import {pageLinkFocus} from '@shopify/theme-a11y';
import {cookiesEnabled} from '@shopify/theme-cart';
import {formatMoney} from '@shopify/theme-currency';
import Cookies from 'js-cookie';
import createSticky from './stickyElement';
import setupVhHelper, {setVhProperty} from './vhHelper';

window.slate = window.slate || {};
window.theme = window.theme || {};

$(document).ready(() => {

  createSticky($('header'), $('[data-section-type="header"]'));
  setupVhHelper();

  if (window.location.hash !== '#') {
    pageLinkFocus($(window.location.hash));
  }

  $('.in-page-link').on('click', (evt) => {
    pageLinkFocus($(evt.currentTarget.hash));
  });

  // Apply a specific class to the html element for browser support of cookies.
  if (cookiesEnabled()) {
    document.documentElement.className = document.documentElement.className.replace(
      'supports-no-cookies',
      'supports-cookies',
    );
  }

  // add target blank to external links
  openExternalLinksInNewTab();
});

function openExternalLinksInNewTab() {
  $('a[href^="http"]').not(`a[href^="${$(window.location).attr('hostname')}"]`).attr('target', '_blank');
}


// Modal Actions

const $mobileMenu = $('#mobile-menu');
const $body = $('body');
const $hamburger = $('.hamburger');
const $modalCart = $('#modalCart');
const $cartTriggers = $('.modalCartTrigger');

function hideMobileMenu() {
  $mobileMenu.removeClass('open');
  $body.removeClass('modalOpen');
  $body.removeClass('modalDesktop-scroll');
  $hamburger.removeClass('open');
}

function toggleCart() {
  // close mobile menu if open
  hideMobileMenu();
  $body.toggleClass('modalDesktop');
  $body.removeClass('modalDesktop-scroll');
  $modalCart.toggleClass('isOpen');

  // recalc the window height due to an issue
  // when the keyboard is open on ios
  // and the user opens the cart
  setVhProperty();
}

function toggleMobileMenu() {
  $body.toggleClass('modalOpen');
  $hamburger.toggleClass('open');
  $mobileMenu.toggleClass('open');
}

function setMenuHeight(){
  var headerHeight = $('[data-section-type="header"]').height();
  var windowHeight = (window.outerHeight != 0) ? window.outerHeight : window.innerHeight;
  $(".mobile-menu").css('height', windowHeight - headerHeight);
}

// Clipboard logic

function showClipboardMessage(classToAdd, removeDelay = 1000) {
  $('.copy-messages').addClass(classToAdd);
  window.setTimeout(() => {
    $('.copy-messages').removeClass(classToAdd);
  }, removeDelay);
}

function bindClipboardEvents() {
  const clipboard = new ClipboardJS('.copy-button');
  clipboard.on('success', (e) => {
    showClipboardMessage('copy__success');
    e.clearSelection();
  });

  clipboard.on('error', (e) => {
    showClipboardMessage('copy__error', 2000);
  });
}


// Promo modal logic
const SDC_DISCOUNT_COOKIE = 'discount_code';
const SDC_EMAIL_SOURCE = 'sdc_from_crm';
const SDC_DEFAULT_PROMO_CODE = 'requiredCode';
const HONEY_POT_KEY = 'contact_me_by_fax';

function prefillDiscountCode(discount) {
  $('#cartForm').attr('action', `/cart?discount=${discount}`);
}

function rememberDiscountCodeForSession(discount) {
  Cookies.set(SDC_DISCOUNT_COOKIE, discount, {expires: 1});
}

function addSavedDiscountCode() {
  const discountCode = Cookies.get(SDC_DISCOUNT_COOKIE);
  if (discountCode) {
    // if we are receiving a discount code set from the url
    // lets reset it here with so we can expire it
    // in one day
    rememberDiscountCodeForSession(discountCode);
    prefillDiscountCode(discountCode);
  } else {
    var queryString = parse_query_string(window.location.search.substring(1));
    if (typeof queryString.discount !== 'undefined'){
      // XSS prevention
      var urlDiscountCode = encodeURIComponent(queryString.discount);
      rememberDiscountCodeForSession(urlDiscountCode);
      prefillDiscountCode(urlDiscountCode);
    }
  }
}

function showPromoSuccess() {
  const discountCode = $('#promo-modal').data('promo');
  if (discountCode !== SDC_DEFAULT_PROMO_CODE) {
    rememberDiscountCodeForSession(discountCode);
    prefillDiscountCode(discountCode);
  }
  bindClipboardEvents();
  $('.modal').addClass('showSuccess');
}

function showPromoError() {
  $('.modal').addClass('showError');
}

function showPromoModal() {
  $body.addClass('modalDesktop-scroll');
  $('.modal').addClass('open');
  const promoCode = $('.modal').data('promo');
  Cookies.set(`sdc_seen_promo_${promoCode}`, true, {expires: 365});
}

function promoLoading(isLoading = true) {
  if (isLoading) {
    $('.modal').addClass('loading');
  } else {
    $('.modal').removeClass('loading');
  }
}

function validateHoneyPot() {
  return $(`input[name="${HONEY_POT_KEY}"]`).val().length <= 0;
}

function submitPromoEmail(data) {
  promoLoading();
  $.ajax({
    type: 'POST',
    url: '/contact',
    async: true,
    data,
    beforeSend() {
      if (!validateHoneyPot()) {
        showPromoError();
        return false;
      }
    },
    error() {
      promoLoading(false);
      showPromoError();
    },
    success() {
      promoLoading(false);
      showPromoSuccess();
    },
  });
}

function isUserFromDirectEmailList() {
  const urlParams = new URLSearchParams(window.location.search);
  const fromEmail = Cookies.get(SDC_EMAIL_SOURCE) || (urlParams.has('source') && urlParams.get('source') === 'email');

  return fromEmail;
}

function shouldShowPromoModal() {
  const $promoModal = $('#promo-modal');
  if ($promoModal.length) {
    const promoCode = $promoModal.data('promo');
    const hasCookie = Cookies.get(`sdc_seen_promo_${promoCode}`);
    const fromEmail = isUserFromDirectEmailList();
    if (fromEmail) {
      Cookies.set(SDC_EMAIL_SOURCE, true);
    }

    return !hasCookie && !fromEmail;
  }

  return false;

}

/**
 * Parse a query string and return an object with the keys and values
 * @param  {string} query Query string like `a=1&b=3&c=m2`
 * @return {Object}       Object with keys and values from supplied query string. Eg `{'a': '1', 'b': '3', ...}`
 */
function parse_query_string(query) {
  var vars = query.split("&");
  var query_string = {};
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    var key = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);
    // If first entry with this name
    if (typeof query_string[key] === "undefined") {
      query_string[key] = decodeURIComponent(value);
      // If second entry with this name
    } else if (typeof query_string[key] === "string") {
      var arr = [query_string[key], decodeURIComponent(value)];
      query_string[key] = arr;
      // If third or later entry with this name
    } else {
      query_string[key].push(decodeURIComponent(value));
    }
  }
  return query_string;
}


$(document).ready(() => {
  $hamburger.on('click', () => {
    toggleMobileMenu();
  });
  $(window).resize(setMenuHeight);
  $(window).on('scroll-sticky-change', setMenuHeight);
  setMenuHeight();

  $cartTriggers.on('click', (event) => {
    event.preventDefault();
    toggleCart();
  });

  $('.modalTrigger').on('click', (e) => {
    showPromoModal();
  });

  $('.modalCloseTrigger').on('click', (e) => {
    hideMobileMenu();
    $body.removeClass('modalDesktop');
    $('.modal').removeClass('open');
    $modalCart.removeClass('isOpen');
  });

  // Promo modal logic
  $('#promoEntry').on('submit', (e) => {
    e.preventDefault();
    const $form = $('#promoEntry');
    const data = $form.serialize();
    submitPromoEmail(data);
    // showPromoSuccess();
  });

  if (shouldShowPromoModal()) {
    setTimeout(() => {
      showPromoModal();
    }, 6000);
  }

  addSavedDiscountCode();
});


// Product Cart actions

function addToCartFail(error) {
  window.console.log('fail', error);
}

function updateExistingCartItem(id, quantity) {
  $(`#product-${id} [data-product-quantity]`).text(quantity);
  // console.log($(`#product-${id} .cart-item--incrementer button`));
  $(`#product-${id} .cart-item--incrementer button`).each(function() {
    $(this).data('productCurrentQuantity', quantity);
  });
}

function addNewCartItem(product) {
  const prodTemplate = `
    <div class="cart-item" id="product-${product.id}" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.title}" />
      <div class="cart-item--content">
        <div class="cart-item--info">
          <h4>${product.product_title}</h4>
          ${product.variant_title ? `<p class="cart-item--sub-title">${product.variant_title}</p>` : ''}
          <p>${formatMoney(product.price).replace(',', '')}</p>
        </div>
        <div class="cart-item--actions">
          <div class="cart-item--incrementer">
            <button
              class="button button--text button--no-padding"
              data-product-id="${product.id}"
              data-product-current-quantity="${product.quantity}"
              data-product-increment-type="decrement"
            >
              -
            </button>
            <p data-product-quantity>${product.quantity}</p>
            <button
              class="button button--text button--no-padding"
              data-product-id="${product.id}"
              data-product-current-quantity="${product.quantity}"
              data-product-increment-type="increment"
            >
              +
            </button>
          </div>
          <a href="#">Remove</a>
        </div>
      </div>
    </div>
  `;
  $('.cart-items').prepend(prodTemplate);
}

function syncCartItems(product) {
  if ($(`#product-${product.id}`).length) {
    updateExistingCartItem(product.id, product.quantity);
  } else {
    addNewCartItem(product);
  }
}

function toggleEmptyCartMessage(itemCount) {
  const $cartContainer = $('.modal-content-container');
  if (itemCount > 0) {
    $cartContainer.removeClass('--empty');
  } else {
    $cartContainer
      .delay(250)
      .queue(function(next) {
        $(this).addClass('--empty');
        next();
      });
  }
}

function addToCartSuccess(product) {
  updateCartInfo();
  syncCartItems(product);
  toggleCart();
}

function cartFetchSuccess(cart) {
  toggleEmptyCartMessage(cart.item_count);
  $('.cart-subtotal p:last-of-type').text(formatMoney(cart.total_price));
  $('.cart-count-wrapper').text(`(${cart.item_count})`);
}

function updateCartInfo() {
  $.ajax({
    type: 'GET',
    url: '/cart.js',
    dataType: 'json',
    success: cartFetchSuccess,
    error: (error) => window.console.log({error}),
  });
}

$(document).ready(() => {
  $('#product-form').on('submit', (event) => {
    event.preventDefault();
    $.ajax({
      type: 'POST',
      url: '/cart/add.js',
      dataType: 'json',
      data: $('#product-form').serialize(),
      success: addToCartSuccess,
      error: addToCartFail,
    });
  });

  const MAX_CART_COUNT = 99;

  $('.cart-items').on('click', '.cart-item--incrementer button', (event) => {
    event.preventDefault();
    const $item = $(event.target);
    const $itemData = $item.data();
    let updatedQuantity = $itemData.productIncrementType === 'increment' ? $itemData.productCurrentQuantity + 1 : $itemData.productCurrentQuantity - 1;

    if (updatedQuantity > MAX_CART_COUNT) {
      updatedQuantity = MAX_CART_COUNT;
    }

    const data = {
      quantity: updatedQuantity,
      id: $itemData.productId,
    };
    if (updatedQuantity >= 1) {
      updateExistingCartItem($itemData.productId, updatedQuantity);
      $.ajax({
        type: 'POST',
        url: '/cart/change.js',
        dataType: 'json',
        data,
        success: cartFetchSuccess,
        error: addToCartFail,
      });
    } else {
      updateExistingCartItem($itemData.productId, 0);
      const $cartItem = $item.closest('.cart-item');
      removeCartItem($cartItem);
    }
  });

  function removeCartItem($item) {
    const $itemData = $item.data();
    $item.addClass('removing');
    window.setTimeout(() => {
      $item.remove();
    }, 550);
    const data = {
      quantity: 0,
      id: $itemData.productId,
    };

    $.ajax({
      type: 'POST',
      url: '/cart/change.js',
      dataType: 'json',
      data,
      success: cartFetchSuccess,
      error: addToCartFail,
    });
  }

  $('.cart-items').on('click', '.cart-item--actions a', function(event) {
    event.preventDefault();
    const $cartItem = $(this).closest('.cart-item');
    removeCartItem($cartItem);
  });
});
