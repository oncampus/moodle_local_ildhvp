// ILD iframe Resizer
(function () {
  if (!window.postMessage || !window.addEventListener || window.ildResizerInitialized) {
    return; // Not supported
  }
  window.ildResizerInitialized = true;

  // Map actions to handlers
  var actionHandlers = {};

  var isResizing = false;
  var resizeDelay;
  var resizeDelayFallback;

  /**
   * Prepare iframe resize.
   *
   * @private
   * @param {Object} iframe Element
   * @param {Object} data Payload
   * @param {Function} respond Send a response to the iframe
   */
  actionHandlers.hello = function (iframe, data, respond) {
    // Make iframe responsive
    iframe.style.width = '100%';

    const h5pFrame = getH5PFrame(iframe);
    if (h5pFrame) {
      const h5pContainer = getH5PContainer(iframe);

      // Need to inform div inside ILD iframe to resize
      if (h5pContainer.tagName.toLowerCase() === 'div') {
        window.addEventListener('resize', function () {
          h5pFrame.contentWindow.H5P.instances[0].trigger('resize');
        });
      }

      // Add resize listener
      h5pFrame.contentWindow.H5P.instances[0].on('resize', function () {
        setTimeout(function () {
          iframe.style.height = getH5PContainerHeight(h5pContainer);
        }, 25);
      });
    }

    // Bugfix for Chrome: Force update of iframe width. If this is not done the
    // document size may not be updated before the content resizes.
    iframe.getBoundingClientRect();

    // Respond to let the iframe know we can resize it
    respond('hello');
  };

  /**
   * Prepare iframe resize.
   *
   * @private
   * @param {Object} iframe Element
   * @param {Object} data Payload
   * @param {Function} respond Send a response to the iframe
   */
  actionHandlers.prepareResize = function (iframe, data, respond) {
    if (isResizing) {
      return;
    }
    setTimeout(function () {
      const h5pFrame = getH5PFrame(iframe);
      if (h5pFrame) {
        const h5pContainer = getH5PContainer(iframe);
        iframe.style.height = getH5PContainerHeight(h5pContainer);
        respond('resizePrepared');
      }
    }, 50);
  };

  /**
   * Resize parent and iframe to desired height.
   *
   * @private
   * @param {Object} iframe Element
   * @param {Function} respond Send a response to the iframe
   */
  actionHandlers.resize = function (iframe) {
    isResizing = true;

    clearTimeout(resizeDelay);
    resizeDelay = setTimeout(function () {
      const h5pFrame = getH5PFrame(iframe);
      if (h5pFrame) {
        const h5pContainer = getH5PContainer(iframe);
        iframe.style.height = getH5PContainerHeight(h5pContainer);

        // H5P iframe might not have resized yet
        if (parseInt(h5pFrame.style.height) <= 1) {
          fallbackResize(iframe, 100, 50); // Try re-resizing 5o times with 100ms delay
        }
        else {
          isResizing = false;
        }
      }
    }, 100);
  };

  /**
   * Fallback resize if h5pframe just wasn't ready yet.
   * @param {HTML5Element} iframe ILD iframe.
   * @param {number} [delay=50] Delay for re-resizing.
   * @param {number} [maxTries=40] Maximum number of retries.
   */
  var fallbackResize = function (iframe, delay, maxTries) {
    if (!iframe) {
      return; // skip
    }

    // Sanitization
    if (!delay || typeof delay !== 'number' || delay < 50) {
      delay = 50;
    }

    if (!maxTries || typeof maxTries !== 'number' || maxTries < 1) {
      maxTries = 40;
    }

    // Resize after delay as long as
    clearTimeout(resizeDelayFallback);
    resizeDelayFallback = setTimeout(function () {
      const h5pFrame = getH5PFrame(iframe);
      if (h5pFrame) {
        const h5pContainer = getH5PContainer(iframe);
        const h5pHeight = getH5PContainerHeight(h5pContainer);

        const h5pFrameHeight = parseInt(h5pHeight);
        if (h5pFrameHeight !== 1 && maxTries > 0) {
          iframe.style.height = h5pHeight;
          isResizing = false;
        }
        else {
          fallbackResize(iframe, delay, maxTries - 1);
        }
      }
    }, delay);
  };

  /**
   * Get iframe that should hold the H5P object.
   * @param {HTMLElement} iframe Iframe.
   * @return {HTMLElement} Iframe.
   */
  var getH5PFrame = function (iframe) {
    if (!iframe) {
      return null;
    }

    return iframe.contentDocument.querySelector('.h5p-iframe') || iframe;
  };

  /**
   * Get H5P container that should hold the relevant H5P object.
   * @param {HTMLElement} iframe Iframe.
   * @return {HTMLElement} Iframe or div depending on mode.
   */
  var getH5PContainer = function (iframe) {
    if (!iframe) {
      return null;
    }

    return (
      iframe.contentDocument.querySelector('.h5p-iframe') ||
      iframe.contentDocument.querySelector('.h5p-frame') || // DIV with H5P frame
      iframe.contentDocument.querySelector('.h5p-no-frame') // DIV without H5P frame
    );
  };

  /**
   * Get height of H5P container.
   * @param {HTMLElement} iframe Iframe.
   * @param {string} Height CSS value of height.
   */
  var getH5PContainerHeight = function (container) {
    if (!container || typeof container.tagName !== 'string') {
      return '0';
    }

    if (container.tagName.toLowerCase() === 'iframe') {
      return container.style.height;
    }

    if (container.tagName.toLowerCase() === 'div') {
      return container.getBoundingClientRect().height + 'px';
    }

    return '0';
  };

  // Listen for messages from iframes
  window.addEventListener('message', function receiveMessage(event) {
    if (event.data.context !== 'h5p') {
      return; // Only handle h5p requests.
    }

    // Find out who sent the message
    var iframe, iframes = document.querySelectorAll('.ild-h5p-iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        iframe = iframes[i];
        break;
      }
    }

    if (!iframe) {
      return; // Cannot find sender
    }

    // Find action handler handler
    if (actionHandlers[event.data.action]) {
      actionHandlers[event.data.action](iframe, event.data, function respond(action, data) {
        if (data === undefined) {
          data = {};
        }
        data.action = action;
        data.context = 'h5p';
        event.source.postMessage(data, event.origin);
      });
    }
  }, false);

  // Let h5p iframes know we're ready!
  var iframes = document.getElementsByTagName('iframe');
  var ready = {
    context: 'h5p',
    action: 'ready'
  };
  for (var i = 0; i < iframes.length; i++) {
    if (iframes[i].src.indexOf('h5p') !== -1) {
      iframes[i].contentWindow.postMessage(ready, '*');
    }
  }
})();
