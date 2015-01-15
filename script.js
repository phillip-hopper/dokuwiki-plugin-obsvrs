/// <reference path="d/jquery.d.ts" />
/// <reference path="d/jqueryui.d.ts" />
/// <reference path="d/jquery.fineuploader.d.ts" />
/// <reference path="d/interfaces.d.ts" />
/* DOKUWIKI:include_once private/fineuploader/s3.jquery.fineuploader.js */
/**
 * Name: script.ts
 * Description: Script to support OBS audio upload
 *
 * Author: Phil Hopper
 * Date:   2014-12-22
 */
var Door43FileUploader = (function () {
    /**
     * Class constructor
     */
    function Door43FileUploader() {
        this.sortTimer = 0;
        this.languages = [];
        var self = this;
        self.initLanguageList(self);
        self.getBucketConfig(self);
    }
    Door43FileUploader.prototype.initLanguageList = function (self) {
        setTimeout(function () {
            var request = { type: 'GET', url: 'https://door43.org:9096/?q=' };
            jQuery.ajax(request).done(function (data) {
                if (!data.results)
                    return;
                for (var i = 0; i < data.results.length; i++) {
                    var langData = data.results[i];
                    self.languages.push(langData['ln'] + ' (' + langData['lc'] + ')');
                }
                var langList = jQuery('#obsvrs-selectLanguageCode').autocomplete({
                    source: self.languages
                });
                if (NS) {
                    var searchFor = '(' + NS + ')';
                    var match = self.languages.filter(function (element) {
                        return (element.indexOf(searchFor) > -1);
                    });
                    if (match)
                        langList.val(match[0]);
                }
            });
        }, 100);
    };
    Door43FileUploader.prototype.getBucketConfig = function (self) {
        var url = DOKU_BASE + 'lib/exe/ajax.php';
        var dataValues = {
            call: 'obsvrs_bucket_config_request'
        };
        var ajaxSettings = {
            type: 'POST',
            url: url,
            data: dataValues
        };
        jQuery.ajax(ajaxSettings).done(function (data) {
            self.initUploader(self, data);
        });
    };
    Door43FileUploader.prototype.initUploader = function (self, bucketInfo) {
        var sigEndpoint = DOKU_BASE + 'doku.php?do=obsvrs_signature_request';
        self.uploader = jQuery('#obs-fine-uploader').fineUploaderS3({
            debug: false,
            maxConnections: 1,
            request: {
                endpoint: bucketInfo.endPoint,
                accessKey: bucketInfo.accessKey
            },
            signature: {
                endpoint: sigEndpoint
            },
            retry: {
                enableAuto: true,
                showButton: true,
                showAutoRetryNote: true,
                autoRetryNote: LANG.plugins['door43obsvrs']['autoRetryNote']
            },
            text: {
                failUpload: LANG.plugins['door43obsvrs']['failUpload'],
                formatProgress: LANG.plugins['door43obsvrs']['formatProgress'],
                paused: LANG.plugins['door43obsvrs']['paused'],
                waitingForResponse: LANG.plugins['door43obsvrs']['waitingForResponse']
            },
            template: "qq-template",
            autoUpload: false,
            validation: { allowedExtensions: ['mp3', 'wav'] },
            editFilename: { enabled: false },
            button: document.getElementById('obsvrs-selectButton')
        });
        // self.uploader.on('statusChange', function(event: Event, id: number, oldStatus: string, newStatus: string) {
        self.uploader.on('statusChange', function () {
            // This will fire at least once for each file that is dropped or selected,
            // so we are using a delay timer to wait for the operation to finish before
            // the list is padded.
            self.delayPadFileList();
        });
        self.sorting = jQuery('.obsvrs-sortable').sortable({
            start: function () {
                this.style.cursor = 'move';
            },
            stop: function () {
                this.style.cursor = '';
            }
        });
        jQuery('#obsvrs-uploadButton').on('click', function () {
            self.sorting.sortable('disable');
            Door43FileUploader.uploadNow(self);
        });
        Door43FileUploader.initializeChapters();
    };
    Door43FileUploader.uploadNow = function (self) {
        var langText = document.getElementById('obsvrs-selectLanguageCode').value;
        if (!langText)
            return;
        var langCodes = langText.match(/\(([a-z]+)\)/i);
        if (langCodes.length !== 2)
            return;
        var userText = jQuery('.user').first().text();
        var userNames = userText.match(/\((.+)\)/i);
        if (userNames.length !== 2)
            return;
        var ulFiles = jQuery('#obsvrs-files');
        var allItems = ulFiles.find('li');
        var items = ulFiles.find('[qq-file-id]');
        // target directory
        // requested structure: media/[langCode]/mp3/[door43userName]/[batches]/
        var targetDir = 'media/' + langCodes[1] + '/mp3/' + userNames[1] + '/batches/' + Date.now().toString() + '/';
        for (var i = 0; i < items.length; i++) {
            var chapterId = allItems.index(items[i]) + 1;
            var fileId = parseInt(items[i].getAttribute('qq-file-id'));
            var file = self.uploader.fineUploaderS3('getUploads', { id: fileId });
            var ext = file['name'].substring(file['name'].lastIndexOf('.'));
            file['uuid'] = targetDir + Door43FileUploader.formatChapterNumber(chapterId);
            file['name'] = file['uuid'] + ext;
        }
        self.uploader.fineUploaderS3('uploadStoredFiles');
    };
    Door43FileUploader.formatChapterNumber = function (chapterNum) {
        return ('00' + chapterNum.toString()).slice(-2);
    };
    Door43FileUploader.initializeChapters = function () {
        var ul = jQuery('#obsvrs-chapters');
        for (var i = 1; i < 51; i++) {
            ul.append('<li>' + Door43FileUploader.formatChapterNumber(i) + '</li>');
        }
    };
    Door43FileUploader.prototype.delayPadFileList = function () {
        if (this.sortTimer) {
            clearTimeout(this.sortTimer);
            this.sortTimer = 0;
        }
        this.sortTimer = setTimeout(function () {
            Door43FileUploader.padFileList();
        }, 100);
    };
    /**
     * Ensures the file list is the same length as the chapter list
     */
    Door43FileUploader.padFileList = function () {
        var ulFiles = jQuery('#obsvrs-files');
        var ulChapters = jQuery('#obsvrs-chapters');
        var numChapters = ulChapters.children('li').length;
        var numFiles = ulFiles.children('li').length;
        var numPlaceHolders = ulFiles.children('li.obsvrs-placeholder').length;
        if (numChapters > numFiles) {
            // add more place holders
            Door43FileUploader.addPlaceHolders(ulFiles, numChapters - numFiles);
        }
        else if (numFiles > numChapters) {
            // remove place holders and/or files
            var toRemove = numFiles - numChapters;
            var placeHoldersToRemove = (numPlaceHolders > toRemove) ? toRemove : numPlaceHolders;
            toRemove -= placeHoldersToRemove;
            var filesToRemove = (toRemove > 0) ? toRemove : 0;
            if (placeHoldersToRemove > 0)
                Door43FileUploader.replacePlaceHolders(ulFiles, 'li.obsvrs-placeholder', placeHoldersToRemove, 50);
            if (filesToRemove > 0)
                Door43FileUploader.removeListItems(ulFiles, 'li.obsvrs-draggable', filesToRemove);
        }
    };
    Door43FileUploader.addPlaceHolders = function (ulFiles, numberToAdd) {
        for (var i = 0; i < numberToAdd; i++) {
            ulFiles.append('<li class="obsvrs-placeholder">&nbsp;</li>');
        }
    };
    Door43FileUploader.removeListItems = function (ul, selector, numberToRemove) {
        var items = ul.children(selector);
        var index, count;
        for (index = items.length - 1, count = 0; index >= 0 && count < numberToRemove; index--, count++) {
            jQuery(items[index]).remove();
        }
    };
    Door43FileUploader.replacePlaceHolders = function (ul, placeHolderSelector, numberToReplace, finalListLength) {
        var placeHolders = ul.children(placeHolderSelector);
        for (var count = 0; count < numberToReplace; count++) {
            var file = ul.find('li').eq(finalListLength);
            var placeHolder = jQuery(placeHolders[count]);
            file.insertBefore(placeHolder);
            placeHolder.remove();
        }
    };
    return Door43FileUploader;
})();
var door43FileUploader;
jQuery().ready(function () {
    door43FileUploader = new Door43FileUploader();
});
//# sourceMappingURL=script.js.map