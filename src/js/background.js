// Copyright (c) 2009 The Chromium Authors. All rights reserved.  Use of this
// source code is governed by a BSD-style license that can be found in the
// LICENSE file.

var screenshot = {
  tab: 0,
  canvas: document.createElement("canvas"),
  startX: 0,
  startY: 0,
  scrollX: 0,
  scrollY: 0,
  docHeight: 0,
  docWidth: 0,
  visibleWidth: 0,
  visibleHeight: 0,
  scrollXCount: 0,
  scrollYCount: 0,
  scrollBarX: 17,
  scrollBarY: 17,
  captureStatus: true,
  screenshotName: null,

  /**
  * Receive messages from content_script, and then decide what to do next
  */
  addMessageListener: function() {
    chrome.extension.onMessage.addListener(function(request, sender, response) {
      console.log(request);
      var obj = request;
      switch (obj.msg) {
        case 'capture_selected':
          screenshot.captureSelected();
          break;
        case 'capture_window':
          screenshot.captureWindow();
          break;
        case 'capture_area':
          screenshot.showSelectionArea();
          break;
        case 'capture_webpage':
          screenshot.captureWebpage();
          break;
      }
    });
  },

  /**
  * Send the Message to content-script
  */
  sendMessage: function(message, callback) {
    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.sendMessage(tab.id, message, callback);
    });
  },

  showSelectionArea: function() {
    screenshot.sendMessage({msg: 'show_selection_area'}, null);
  },

  captureWindow: function() {
    screenshot.sendMessage({msg: 'capture_window'},
        screenshot.onResponseVisibleSize);
  },

  captureSelected: function() {
    screenshot.sendMessage({msg: 'capture_selected'},
        screenshot.onResponseVisibleSize);
  },

  captureWebpage: function() {
    screenshot.sendMessage({msg: 'scroll_init'},
        screenshot.onResponseVisibleSize);
  },

  onResponseVisibleSize: function(response) {
    switch (response.msg) {
      case 'capture_window':
        screenshot.captureVisible(response.docWidth, response.docHeight);
        break;
      case 'scroll_init_done':
        screenshot.startX = response.startX,
        screenshot.startY = response.startY,
        screenshot.scrollX = response.scrollX,
        screenshot.scrollY = response.scrollY,
        screenshot.canvas.width = response.canvasWidth;
        screenshot.canvas.height = response.canvasHeight;
        screenshot.visibleHeight = response.visibleHeight,
        screenshot.visibleWidth = response.visibleWidth,
        screenshot.scrollXCount = response.scrollXCount;
        screenshot.scrollYCount = response.scrollYCount;
        screenshot.docWidth = response.docWidth;
        screenshot.docHeight = response.docHeight;
        screenshot.zoom = response.zoom;
        setTimeout("screenshot.captureAndScroll()", 100);
        break;
      case 'scroll_next_done':
        screenshot.scrollXCount = response.scrollXCount;
        screenshot.scrollYCount = response.scrollYCount;
        setTimeout("screenshot.captureAndScroll()", 100);
        break;
      case 'scroll_finished':
        screenshot.captureAndScrollDone();
        break;
    }
  },

  captureSpecialPage: function() {
    var formatParam = localStorage.screenshootQuality || 'png';
    chrome.tabs.captureVisibleTab(
        null, {format: formatParam, quality: 50}, function(data) {
      var image = new Image();
      image.onload = function() {
        screenshot.canvas.width = image.width;
        screenshot.canvas.height = image.height;
        var context = screenshot.canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        screenshot.postImage();
      };
      image.src = data;
    });
  },

  captureScreenCallback: function(data) {
    var image = new Image();
    image.onload = function() {
      screenshot.canvas.width = image.width;
      screenshot.canvas.height = image.height;
      var context = screenshot.canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      screenshot.postImage();
    };
    image.src = "data:image/bmp;base64," + data;
  },

  /**
  * Use drawImage method to slice parts of a source image and draw them to
  * the canvas
  */
  capturePortion: function(x, y, width, height,
                           visibleWidth, visibleHeight, docWidth, docHeight) {
    var formatParam = localStorage.screenshootQuality || 'png';
    chrome.tabs.captureVisibleTab(
        null, {format: formatParam, quality: 50}, function(data) {
      var image = new Image();
      image.onload = function() {
        var curHeight = image.width < docWidth ?
            image.height - screenshot.scrollBarY : image.height;
        var curWidth = image.height < docHeight ?
            image.width - screenshot.scrollBarX : image.width;
        var zoomX = curWidth / visibleWidth;
        var zoomY = curHeight / visibleHeight;
        screenshot.canvas.width = width * zoomX;
        screenshot.canvas.height = height * zoomY;
        var context = screenshot.canvas.getContext("2d");
        context.drawImage(image, x * zoomX, y * zoomY, width * zoomX,
            height * zoomY, 0, 0, width * zoomX, height * zoomY);
        screenshot.postImage();
      };
      image.src = data;
    });
  },

  captureVisible: function(docWidth, docHeight) {
    var formatParam = localStorage.screenshootQuality || 'png';
    chrome.tabs.captureVisibleTab(
        null, {format: formatParam, quality: 50}, function(data) {
      var image = new Image();
      image.onload = function() {
        var width = image.height < docHeight ?
            image.width - 17 : image.width;
        var height = image.width < docWidth ?
            image.height - 17 : image.height;
        screenshot.canvas.width = width;
        screenshot.canvas.height = height;
        var context = screenshot.canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height, 0, 0, width, height);
        screenshot.postImage();
      };
      image.src = data;
    });
  },

  /**
  * Use the drawImage method to stitching images, and render to canvas
  */
  captureAndScroll: function() {
    var formatParam = localStorage.screenshootQuality || 'png';
    chrome.tabs.captureVisibleTab(
        null, {format: formatParam, quality: 50}, function(data) {
      var image = new Image();
      image.onload = function() {
        var context = screenshot.canvas.getContext('2d');
        var width = 0;
        var height = 0;

        // Get scroll bar's width.
        screenshot.scrollBarY =
            screenshot.visibleHeight < screenshot.docHeight ? 17 : 0;
        screenshot.scrollBarX =
            screenshot.visibleWidth < screenshot.docWidth ? 17 : 0;

        // Get visible width and height of capture result.
        var visibleWidth =
            (image.width - screenshot.scrollBarY < screenshot.canvas.width ?
            image.width - screenshot.scrollBarY : screenshot.canvas.width);
        var visibleHeight =
            (image.height - screenshot.scrollBarX < screenshot.canvas.height ?
            image.height - screenshot.scrollBarX : screenshot.canvas.height);

        // Get region capture start x coordinate.
        var zoom = screenshot.zoom;
        var x1 = screenshot.startX - Math.round(screenshot.scrollX * zoom);
        var x2 = 0;
        var y1 = screenshot.startY - Math.round(screenshot.scrollY * zoom);
        var y2 = 0;

        if ((screenshot.scrollYCount + 1) * visibleWidth >
            screenshot.canvas.width) {
          width = screenshot.canvas.width % visibleWidth;
          x1 = (screenshot.scrollYCount + 1) * visibleWidth -
              screenshot.canvas.width + screenshot.startX - screenshot.scrollX;
        } else {
          width = visibleWidth;
        }

        if ((screenshot.scrollXCount + 1) * visibleHeight >
            screenshot.canvas.height) {
          height = screenshot.canvas.height % visibleHeight;
          if ((screenshot.scrollXCount + 1) * visibleHeight +
              screenshot.scrollY < screenshot.docHeight) {
            y1 = 0;
          } else {
            y1 = (screenshot.scrollXCount + 1) * visibleHeight +
                screenshot.scrollY - screenshot.docHeight;
          }

        } else {
          height = visibleHeight;
        }
        x2 = screenshot.scrollYCount * visibleWidth;
        y2 = screenshot.scrollXCount * visibleHeight;
        context.drawImage(image, x1, y1, width, height, x2, y2, width, height);
        screenshot.sendMessage({msg: 'scroll_next', visibleWidth: visibleWidth,
            visibleHeight: visibleHeight}, screenshot.onResponseVisibleSize);
      };
      image.src = data;
    });
  },

  captureAndScrollDone: function() {
    screenshot.postImage();
  },

  /**
  * Post the image to 'showimage.html'
  */
  postImage: function() {
    chrome.tabs.getSelected(null, function(tab) {
      screenshot.tab = tab;
    });
    var date = new Date();
    screenshot.screenshotName = "Screenshot "+dateFormat(date, 'Y-m-d H.i.s');
    chrome.tabs.create({'url': 'showimage.html'});
    var popup = chrome.extension.getViews({type: 'popup'})[0];
    if (popup)
      popup.close();
  },

  isThisPlatform: function(operationSystem) {
    return navigator.userAgent.toLowerCase().indexOf(operationSystem) > -1;
  },

  init: function() {
    localStorage.screenshootQuality = localStorage.screenshootQuality || 'png';
    screenshot.addMessageListener();
  }
};

screenshot.init();
