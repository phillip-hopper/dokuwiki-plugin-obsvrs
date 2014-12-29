<?php
/**
 * Name: VrsUpload.php
 * Description: A Dokuwiki syntax plugin to display a page for uploading OBS audio files for VRS.
 *
 * Author: Phil Hopper
 * Date:   2015-01-04
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

$root = dirname(dirname(__FILE__));
require_once $root . '/private/php/plugin_base.php';

class syntax_plugin_door43obsvrs_VrsAudioUpload extends Door43obsvrs_Plugin_Base {

    function __construct() {
        parent::__construct('VrsAudioUpload', 'obsvrsaudioupload', 'vrs_audio_upload.html');
    }
}
