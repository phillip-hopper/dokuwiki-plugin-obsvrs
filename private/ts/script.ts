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
class Door43FileUploader {

    public uploader: JQuery;
    private sorting: JQuery;

    private sortTimer: number = 0;

    /**
     * Class constructor
     */
    constructor() {

        var self: Door43FileUploader = this;

        self.getBucketConfig(self);
    }

    private getBucketConfig(self: Door43FileUploader): void {

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
    }

    private initUploader(self: Door43FileUploader, bucketInfo: BucketInfo): void {

        var sigEndpoint: string = DOKU_BASE + 'doku.php?do=obsvrs_signature_request';

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
            text : {
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
        self.uploader.on('statusChange', function() {

            // This will fire at least once for each file that is dropped or selected,
            // so we are using a delay timer to wait for the operation to finish before
            // the list is padded.
            self.delayPadFileList();
        });

        self.sorting = jQuery('.obsvrs-sortable').sortable({
            start: function() { this.style.cursor = 'move'; },
            stop: function() { this.style.cursor = ''; }
        });

        jQuery('#obsvrs-uploadButton').on('click', function() {
            self.sorting.sortable('disable');
            Door43FileUploader.uploadNow(self);
        });

        Door43FileUploader.initializeChapters();
    }

    static uploadNow(self: Door43FileUploader): void {

        var ulFiles: JQuery = jQuery('#obsvrs-files');
        var allItems: JQuery = ulFiles.find('li');
        var items: JQuery = ulFiles.find('[qq-file-id]');
        var batch: string = 'batch-' + Date.now().toString();

        // target directory
        var targetDir: string = 'media/obs-vrs-inbox/';
        targetDir += NS ? NS : 'unknown';
        targetDir += '/' + batch + '/';

        // set the file name to the name of the chapter (ex. chapter_01.mp3)
        for (var i:number = 0; i < items.length; i++) {
            var chapterId: number = allItems.index(items[i]) + 1;
            var fileId: number = parseInt(items[i].getAttribute('qq-file-id'));

            var file: Object = self.uploader.fineUploaderS3('getUploads', { id: fileId });
            var ext: string = (<string>file['name']).substring(file['name'].lastIndexOf('.'));
            file['uuid'] = targetDir + 'chapter_' + Door43FileUploader.formatChapterNumber(chapterId);
            file['name'] = file['uuid'] + ext;

            //console.log(file);
        }

        self.uploader.fineUploaderS3('uploadStoredFiles');
    }

    static formatChapterNumber(chapterNum: number): string {
        return ('00' + chapterNum.toString()).slice(-2);
    }

    static initializeChapters(): void {

        var ul = jQuery('#obsvrs-chapters');

        for (var i = 1; i < 51; i++) {
            ul.append('<li>' + Door43FileUploader.formatChapterNumber(i) + '</li>')
        }
    }

    public delayPadFileList(): void {

        if (this.sortTimer) {
            clearTimeout(this.sortTimer);
            this.sortTimer = 0;
        }

        this.sortTimer = setTimeout(function() {
            Door43FileUploader.padFileList();
        }, 100);
    }

    /**
     * Ensures the file list is the same length as the chapter list
     */
    public static padFileList(): void {

        var ulFiles: JQuery = jQuery('#obsvrs-files');
        var ulChapters: JQuery = jQuery('#obsvrs-chapters');

        var numChapters: number = ulChapters.children('li').length;
        var numFiles: number = ulFiles.children('li').length;
        var numPlaceHolders: number = ulFiles.children('li.obsvrs-placeholder').length;

        if (numChapters > numFiles) {

            // add more place holders
            Door43FileUploader.addPlaceHolders(ulFiles, numChapters - numFiles);
        }
        else if (numFiles > numChapters) {

            // remove place holders and/or files
            var toRemove: number = numFiles - numChapters;
            var placeHoldersToRemove = (numPlaceHolders > toRemove) ? toRemove : numPlaceHolders;
            toRemove -= placeHoldersToRemove;
            var filesToRemove = (toRemove > 0) ? toRemove : 0;

            if (placeHoldersToRemove > 0)
                Door43FileUploader.replacePlaceHolders(ulFiles, 'li.obsvrs-placeholder', placeHoldersToRemove, 50);

            if (filesToRemove > 0)
                Door43FileUploader.removeListItems(ulFiles, 'li.obsvrs-draggable', filesToRemove);
        }
    }

    private static addPlaceHolders(ulFiles: JQuery, numberToAdd: number): void {

        for (var i = 0; i < numberToAdd; i++) {
            ulFiles.append('<li class="obsvrs-placeholder">&nbsp;</li>')
        }
    }

    private static removeListItems(ul: JQuery, selector: string, numberToRemove: number): void {

        var items = ul.children(selector);
        var index: number, count: number;

        for (index = items.length - 1, count = 0;
             index >= 0 && count < numberToRemove;
             index--, count++) {

            jQuery(items[index]).remove();
        }
    }

    private static replacePlaceHolders(ul: JQuery, placeHolderSelector: string, numberToReplace: number, finalListLength: number): void {

        var placeHolders: JQuery = ul.children(placeHolderSelector);

        for (var count: number = 0; count < numberToReplace; count++) {
            var file = ul.find('li').eq(finalListLength);
            var placeHolder = jQuery(placeHolders[count]);
            file.insertBefore(placeHolder);
            placeHolder.remove();
        }
    }
}

var door43FileUploader: Door43FileUploader;

jQuery().ready(function () {
    door43FileUploader = new Door43FileUploader();
});
