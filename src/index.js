'use strict';

const initializeScreenShare = function (webstoreUrl) {
  if (!window.chrome || !window.chrome.webstore) {
    return; // this method works exclusively on chrome
  }
  const handleMessage = function (event) {
    if (!event || !event.data || event.data.type !== 'getScreen') {
      return;
    }
    const extId = window.sessionStorage.getScreenMediaJSExtensionId;
    if (!extId) {
      return window.chrome.webstore.install(webstoreUrl, function () {
        setTimeout(function () {
          window.sessionStorage.getScreenMediaJSExtensionId = webstoreUrl.split('/').pop();
          handleMessage(event);
        }, 2500);
      });
    }
    window.chrome.runtime.sendMessage(extId, event.data, function (data) {
      event.source.postMessage(data, '*');
    });
  };
  window.addEventListener('message', handleMessage);
};

const requestScreenShare = function (constraints) {
  if (!window.navigator || !window.navigator.mediaDevices ||
      !window.navigator.mediaDevices.getUserMedia) {
    if (!Promise) {
      throw new Error('requestScreenShare called in unsupported browser');
    }
    return Promise.reject('Unsupported');
  }
  if (!window.chrome) {
    const ffConstraints = (constraints && constraints.firefox) || {
      audio: false,
      video: { mediaSource: 'window' }
    };
    return window.navigator.mediaDevices.getUserMedia(ffConstraints);
  } else {
    return new Promise(function (resolve, reject) {
      window.addEventListener('message', function (event) {
        if (!event || !event.data.sourceId) {
          return reject(new Error('User Cancellation'));
        }
        const chromeConstraints = (constraints && constraints.chrome) || {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              maxWidth: window.screen.width,
              maxHeight: window.screen.height,
              maxFrameRate: 15,
              chromeMediaSourceId: event.data.sourceId
            }
          }
        };
        window.navigator.mediaDevices.getUserMedia(chromeConstraints).then(resolve, reject);
      });
      window.parent.postMessage({ type: 'getScreen', id: 1, url: window.location.origin }, '*');
    });
  }
};

export default {
  initializeScreenShare,
  requestScreenShare
};
