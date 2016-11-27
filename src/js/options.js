// Copyright (c) 2009 The Chromium Authors. All rights reserved.  Use of this
// source code is governed by a BSD-style license that can be found in the
// LICENSE file.

var bg = chrome.extension.getBackgroundPage();

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
  i18nReplace('shorcutSetting', 'shortcut_setting');
  i18nReplace('settingShortcutText', 'shortcutsetting_text');
  if (isHighVersion()) {
    $('lossyScreenShot').innerText += ' (JPEG)';
    $('losslessScreenShot').innerText += ' (PNG)';
  }
  $('saveAndClose').addEventListener('click', saveAndClose);
  initScreenCaptureQuality();
  HotKeySetting.setup();
}

function save() {
  localStorage.screenshootQuality =
      $('lossy').checked ? 'jpeg' : '' ||
      $('lossless').checked ? 'png' : '';

  return HotKeySetting.save();
}

function saveAndClose() {
  if (save())
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.remove(tab.id);
    });
}

function initScreenCaptureQuality() {
  $('lossy').checked = localStorage.screenshootQuality == 'jpeg';
  $('lossless').checked = localStorage.screenshootQuality == 'png';
}

function i18nReplace(id, name) {
  return $(id).innerText = chrome.i18n.getMessage(name);
}

const CURRENT_LOCALE = chrome.i18n.getMessage('@@ui_locale');
if (CURRENT_LOCALE != 'zh_CN') {
  UI.addStyleSheet('./i18n_styles/en_options.css');
}

var HotKeySetting = (function() {
  const CHAR_CODE_OF_AT = 64;
  const CHAR_CODE_OF_A = 65;
  const CHAR_CODE_OF_Z = 90;
  var hotKeySelection = null;

  var hotkey = {
    setup: function() {
      hotKeySelection = document.querySelectorAll('#hot-key-setting select');
      // i18n.
      $('area-capture-text').innerText =
        chrome.i18n.getMessage('capture_area');
      $('viewport-capture-text').innerText =
        chrome.i18n.getMessage('capture_window');
      $('full-page-capture-text').innerText =
        chrome.i18n.getMessage('capture_webpage');
      //$('screen-capture-text').innerText = chrome.i18n.getMessage('capture_screen');

      for (var i = 0; i < hotKeySelection.length; i++) {
        hotKeySelection[i].add(new Option('--', '@'));
        for (var j = CHAR_CODE_OF_A; j <= CHAR_CODE_OF_Z; j++) {
          var value = String.fromCharCode(j);
          var option = new Option(value, value);
          hotKeySelection[i].add(option);
        }
      }

      $('area-capture-hot-key').selectedIndex =
        HotKey.getCharCode('area') - CHAR_CODE_OF_AT;
      $('viewport-capture-hot-key').selectedIndex =
        HotKey.getCharCode('viewport') - CHAR_CODE_OF_AT;
      $('full-page-capture-hot-key').selectedIndex =
        HotKey.getCharCode('fullpage') - CHAR_CODE_OF_AT;
      $('screen-capture-hot-key').selectedIndex =
        HotKey.getCharCode('screen') - CHAR_CODE_OF_AT;

      $('settingShortcut').addEventListener('click', function() {
        hotkey.setState(this.checked);
      }, false);

      hotkey.setState(HotKey.isEnabled());
    },

    validate: function() {
      var hotKeyLength =
        Array.prototype.filter.call(hotKeySelection,
            function (element) {
              return element.value != '@'
            }
        ).length;
      if (hotKeyLength != 0) {
        var validateMap = {};
        validateMap[hotKeySelection[0].value] = true;
        validateMap[hotKeySelection[1].value] = true;
        validateMap[hotKeySelection[2].value] = true;
        if (hotKeyLength > 3 && hotKeySelection[3].value != '@') {
          hotKeyLength -= 1;
        }

        if (Object.keys(validateMap).length < hotKeyLength) {
          ErrorInfo.show('hot_key_conflict');
          return false;
        }
      }
      ErrorInfo.hide();
      return true;
    },

    save: function() {
      var result = true;
      if ($('settingShortcut').checked) {
        if (this.validate()) {
          HotKey.enable();
          HotKey.set('area', $('area-capture-hot-key').value);
          HotKey.set('viewport', $('viewport-capture-hot-key').value);
          HotKey.set('fullpage', $('full-page-capture-hot-key').value);
        } else {
          result = false;
        }
      } else {
        HotKey.disable(bg);
      }
      return result;
    },

    setState: function(enabled) {
      $('settingShortcut').checked = enabled;
      UI.setStyle($('hot-key-setting'), 'color', enabled ? '' : '#6d6d6d');
      for (var i = 0; i < hotKeySelection.length; i++) {
        hotKeySelection[i].disabled = !enabled;
      }
      ErrorInfo.hide();
    },

    focusScreenCapture: function() {
      $('screen-capture-hot-key').focus();
    }
  };
  return hotkey;
})();

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
