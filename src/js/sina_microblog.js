const APPKEY = '1350884563';
const AUTHORIZE_URL = 'https://api.weibo.com/oauth2/authorize';
const REDIRECT_URL = 'https://api.weibo.com/oauth2/default.html'
const SINA_USER_INFO_URL = 'https://api.weibo.com/2/users/show.json';
const SINA_PHOTO_UPLOAD_URL = 'https://upload.api.weibo.com/2/statuses/upload.json';
const SINA_LOGOUT_URL = 'https://api.weibo.com/2/account/end_session.json';

var SinaMicroblog = {
  siteId: 'sina',
  currentUserId: null,
  accessTokenCallback: null,

  isRedirectUrl: function() {},

  getAccessToken: function(callback) {
    SinaMicroblog.accessTokenCallback = callback;
    var url = AUTHORIZE_URL + '?client_id=' + APPKEY +
      '&redirect_uri=' + REDIRECT_URL + '&response_type=token';
    chrome.tabs.create({url: url});
  },
  
  parseAccessToken: function(url) {
    var result = 'failure';
    var msgOrUser = 'sina_failed_to_get_access_token';
    var hash = url.split('#')[1];
    if (hash && typeof hash == 'string') {
      var keyValues = hash.split('&');
      var response = {};

      for (var keyValue, i = 0, l = keyValues.length; i < l; i++) {
        keyValue = keyValues[i].split('=');
        response[keyValue[0]] = keyValue[1];
      }

      if (!response.error && response.access_token && response.uid) {
        result = 'success';
        msgOrUser = new User({
          id: response.uid,
          accessToken: response.access_token
        });
      }
    }

    SinaMicroblog.accessTokenCallback(result, msgOrUser);
    SinaMicroblog.accessTokenCallback = null;
  },

  getUserInfo: function(user, callback) {
    ajax({
      url: SINA_USER_INFO_URL,
      parameters: {
        access_token: user.accessToken,
        uid: user.id
      },
      success: function(data) {
        if (callback) {
          user.name = data.screen_name;
          callback('success', user);
        }
      },
      status: {
        others: function(data) {
          callback('failure', 'failed_to_get_user_info');
        }
      }
    });
  },

  upload: function(user, caption, imageData, callback) {
    caption = encodeURIComponent(caption);
    var params = {
      access_token: user.accessToken,
      status: caption
    };
    var binaryData = {
      boundary: MULTIPART_FORMDATA_BOUNDARY,
      name: 'pic',
      value: 'test.png',
      data: imageData,
      type: 'image/png'
    };
    
    ajax({
      url: SINA_PHOTO_UPLOAD_URL,
      parameters: params,
      multipartData: binaryData,
      success: function(microblog) {
        callback('success', microblog.id);
      },
      status: {
        others: function(res) {
          var message = 'failed_to_upload_image';
          var errorCode = res.error_code;
          var invalidAccessTokenCodes = 
            [21332, 21314, 21315, 21316, 21317, 21319, 21327];
          if (invalidAccessTokenCodes.indexOf(errorCode) >= 0) {
            message = 'bad_access_token';
          }
          callback('failure', message);
        }
      }
    });
  },

  getPhotoLink: function(user, microblogId, callback) {
    var photoLink = 'http://weibo.com/' + user.id + '/profile';
    callback('success', photoLink);
  },
  
  logout: function(callback) {
    var params = {source: APPKEY};
    ajax({
      url: SINA_LOGOUT_URL,
      parameters: params,
      complete: function(statusCode, data) {
        // Response status 403 means no user signed in
        if ((statusCode == 200 || statusCode == 403) && callback)
          callback(data);
      }
    });
  }
};