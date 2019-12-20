$("#submit-button").on('click', function () { 
    $.ajax({
      url: '/upload',
      type: 'POST',
      // Form data
      data: new FormData($('#upload-form')[0]),
      cache: false,
      contentType: false,
      processData: false,
      success: function (data) {
        alert(data)
      },
      error: function (error) {
        alert(error)
      },
      // Custom XMLHttpRequest
      xhr: function () {
        var myXhr = $.ajaxSettings.xhr();
        if (myXhr.upload) {
          myXhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
              $('progress').attr({
                value: e.loaded,
                max: e.total,
              });
            }
          }, false);
        }
        return myXhr;
      }
    });
  });