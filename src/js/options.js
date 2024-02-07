// Copyright (c) 2009 The Chromium Authors. All rights reserved.  Use of this
// source code is governed by a BSD-style license that can be found in the
// LICENSE file.

function $(id) {
  return document.getElementById(id);
}

function isHighVersion() {
  var version = navigator.userAgent.match(/Chrome\/(\d+)/)[1];
  return version > 9;
}

function init() {
  i18nReplace('optionTitle', 'options');
  i18nReplace('saveAndClose', 'save_and_close');
  i18nReplace('screenshootQualitySetting', 'quality_setting');
  i18nReplace('lossyScreenShot', 'lossy');
  i18nReplace('losslessScreenShot', 'lossless');
  if (isHighVersion()) {
    $('lossyScreenShot').innerText += ' (JPEG)';
    $('losslessScreenShot').innerText += ' (PNG)';
  }
  $('saveAndClose').addEventListener('click', saveAndClose);
  initScreenCaptureQuality();
}

function save(callback) {
  var screenshotQuality = $('lossy').checked ? 'jpeg' : '' ||
      $('lossless').checked ? 'png' : '';
  chrome.storage.local.set({
    screenshotQuality,
  }, _ => {
    callback(true);
  });
}

function saveAndClose() {
  save(_ => {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.remove(tab.id);
    });
  });
}

function initScreenCaptureQuality() {
  chrome.storage.local.get('screenshotQuality', value => {
    $('lossy').checked = value['screenshotQuality'] == 'jpeg';
    $('lossless').checked = value['screenshotQuality'] == 'png';
  });
}

function i18nReplace(id, name) {
  return $(id).innerText = chrome.i18n.getMessage(name);
}

const CURRENT_LOCALE = chrome.i18n.getMessage('@@ui_locale');
if (CURRENT_LOCALE != 'zh_CN') {
  UI.addStyleSheet('./i18n_styles/en_options.css');
}

var ErrorInfo = (function() {
  return {
    show: function(msgKey) {
      var infoWrapper = $('error-info');
      var msg = chrome.i18n.getMessage(msgKey);
      infoWrapper.innerText = msg;
      UI.show(infoWrapper);
    },

    hide: function() {
      var infoWrapper = $('error-info');
      if (infoWrapper) {
        UI.hide(infoWrapper);
      }
    }
  };
})();

document.addEventListener('DOMContentLoaded', init);
