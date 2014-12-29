/// <reference path="jquery.d.ts"/>

interface JQuery {
	fineUploader(fnName: string, parameters?: Object): any;
	fineUploader(options: Object): JQuery;
}

interface qqStatus {
	SUBMITTING: string;
	SUBMITTED: string;
	REJECTED: string;
	QUEUED: string;
	CANCELED: string;
	PAUSED: string;
	UPLOADING: string;
	UPLOAD_RETRYING: string;
	UPLOAD_SUCCESSFUL: string;
	UPLOAD_FAILED: string;
	DELETE_FAILED: string;
	DELETING: string;
	DELETED: string;
}

interface QQ {
	status: qqStatus;
}

declare var qq: QQ;
